begin;

create table if not exists
  public.singer_competition_wins (
    id uuid primary key
      default gen_random_uuid(),

    singer_profile_id uuid not null
      references public.singer_profiles(id)
      on delete cascade,

    source_type text not null
      check (
        source_type in (
          'event_result',
          'tournament_event'
        )
      ),

    source_id uuid not null,

    event_id uuid
      references public.events(id)
      on delete set null,

    earned_at timestamptz
      not null
      default now(),

    metadata jsonb
      not null
      default '{}'::jsonb,

    unique (
      singer_profile_id,
      source_type,
      source_id
    )
  );

create index if not exists
  singer_competition_wins_profile_idx
on public.singer_competition_wins (
  singer_profile_id,
  earned_at desc
);

alter table
  public.singer_competition_wins
enable row level security;

drop policy if exists
  "Singers can read their competition wins"
on public.singer_competition_wins;

create policy
  "Singers can read their competition wins"
on public.singer_competition_wins
for select
to authenticated
using (
  exists (
    select 1
    from public.singer_profiles
    where singer_profiles.id =
      singer_competition_wins
        .singer_profile_id
      and singer_profiles.user_id =
        auth.uid()
  )
);

revoke insert, update, delete
on public.singer_competition_wins
from anon, authenticated;

grant select
on public.singer_competition_wins
to authenticated;

create or replace function
  public.evaluate_win_achievements(
    p_singer_profile_id uuid,
    p_triggering_performance_id uuid
      default null
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_win_count integer;
begin
  select count(*)
  into v_win_count
  from public.singer_competition_wins
  where singer_profile_id =
    p_singer_profile_id;

  insert into public.singer_achievements (
    singer_profile_id,
    achievement_id,
    triggering_performance_id,
    metadata
  )
  select
    p_singer_profile_id,
    definition.id,
    p_triggering_performance_id,
    jsonb_build_object(
      'win_count',
      v_win_count
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'win_count'
    and v_win_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;
end;
$$;

revoke all
on function
  public.evaluate_win_achievements(
    uuid,
    uuid
  )
from public, anon, authenticated;

create or replace function
  public.sync_event_result_winner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_performance_id uuid;
  v_event_is_tournament boolean;
begin
  if new.finished_at is null
    or nullif(
      trim(
        coalesce(
          new.judge_winner_name,
          ''
        )
      ),
      ''
    ) is null
  then
    return new;
  end if;

  select
    event.tournament_event_id
      is not null
  into v_event_is_tournament
  from public.events
    as event
  where event.id = new.event_id;

  if coalesce(
    v_event_is_tournament,
    false
  ) then
    return new;
  end if;

  select
    performance.singer_profile_id,
    performance.id
  into
    v_profile_id,
    v_performance_id
  from public.performances
    as performance
  where performance.event_id =
      new.event_id
    and performance.singer_profile_id
      is not null
    and lower(
      trim(performance.singer_name)
    ) = lower(
      trim(new.judge_winner_name)
    )
  order by
    coalesce(
      performance.completed_at,
      performance.created_at
    ) desc
  limit 1;

  if v_profile_id is null then
    return new;
  end if;

  insert into
    public.singer_competition_wins (
      singer_profile_id,
      source_type,
      source_id,
      event_id,
      earned_at,
      metadata
    )
  values (
    v_profile_id,
    'event_result',
    new.id,
    new.event_id,
    coalesce(
      new.finished_at,
      new.created_at,
      now()
    ),
    jsonb_build_object(
      'event_name',
      new.event_name,
      'winner_name',
      new.judge_winner_name,
      'judge_score',
      new.judge_score
    )
  )
  on conflict (
    singer_profile_id,
    source_type,
    source_id
  )
  do nothing;

  perform
    public.evaluate_win_achievements(
      v_profile_id,
      v_performance_id
    );

  return new;
end;
$$;

drop trigger if exists
  sync_event_result_winner
on public.event_results;

create trigger
  sync_event_result_winner
after insert or update
on public.event_results
for each row
execute function
  public.sync_event_result_winner();

create or replace function
  public.sync_tournament_event_winner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_event_id uuid;
  v_performance_id uuid;
begin
  if new.placement is distinct from 1 then
    return new;
  end if;

  select
    tournament_entry.singer_profile_id,
    tournament_event.event_id
  into
    v_profile_id,
    v_event_id
  from public.tournament_entries
    as tournament_entry
  join public.tournament_events
    as tournament_event
    on tournament_event.id =
      new.tournament_event_id
  where tournament_entry.id =
    new.tournament_entry_id;

  if v_profile_id is null then
    return new;
  end if;

  select performance.id
  into v_performance_id
  from public.performances
    as performance
  where performance.event_id =
      v_event_id
    and performance.singer_profile_id =
      v_profile_id
  order by
    coalesce(
      performance.completed_at,
      performance.created_at
    ) desc
  limit 1;

  insert into
    public.singer_competition_wins (
      singer_profile_id,
      source_type,
      source_id,
      event_id,
      earned_at,
      metadata
    )
  values (
    v_profile_id,
    'tournament_event',
    new.tournament_event_id,
    v_event_id,
    now(),
    jsonb_build_object(
      'placement',
      new.placement,
      'tournament_event_id',
      new.tournament_event_id
    )
  )
  on conflict (
    singer_profile_id,
    source_type,
    source_id
  )
  do nothing;

  perform
    public.evaluate_win_achievements(
      v_profile_id,
      v_performance_id
    );

  return new;
end;
$$;

drop trigger if exists
  sync_tournament_event_winner
on public.tournament_event_entries;

create trigger
  sync_tournament_event_winner
after insert or update of placement
on public.tournament_event_entries
for each row
execute function
  public.sync_tournament_event_winner();

insert into
  public.singer_competition_wins (
    singer_profile_id,
    source_type,
    source_id,
    event_id,
    earned_at,
    metadata
  )
select distinct
  tournament_entry.singer_profile_id,
  'tournament_event',
  tournament_event.id,
  tournament_event.event_id,
  coalesce(
    tournament_event.starts_at,
    tournament_entry.registered_at,
    now()
  ),
  jsonb_build_object(
    'placement',
    event_entry.placement,
       'tournament_event_id',
    tournament_event.id
  )
from public.tournament_event_entries
  as event_entry
join public.tournament_entries
  as tournament_entry
  on tournament_entry.id =
    event_entry.tournament_entry_id
join public.tournament_events
  as tournament_event
  on tournament_event.id =
    event_entry.tournament_event_id
where event_entry.placement = 1
on conflict (
  singer_profile_id,
  source_type,
  source_id
)
do nothing;

do $$
declare
  winner record;
  performance_row record;
begin
  for winner in
    select result.*
    from public.event_results
      as result
    join public.events
      as event
      on event.id = result.event_id
    where result.finished_at is not null
      and event.tournament_event_id
        is null
      and nullif(
        trim(
          coalesce(
            result.judge_winner_name,
            ''
          )
        ),
        ''
      ) is not null
  loop
    select
      performance.id,
      performance.singer_profile_id
    into performance_row
    from public.performances
      as performance
    where performance.event_id =
        winner.event_id
      and performance.singer_profile_id
        is not null
      and lower(
        trim(performance.singer_name)
      ) = lower(
        trim(winner.judge_winner_name)
      )
    order by
      coalesce(
        performance.completed_at,
        performance.created_at
      ) desc
    limit 1;

    if performance_row.singer_profile_id
      is not null
    then
      insert into
        public.singer_competition_wins (
          singer_profile_id,
          source_type,
          source_id,
          event_id,
          earned_at,
          metadata
        )
      values (
        performance_row
          .singer_profile_id,
        'event_result',
        winner.id,
        winner.event_id,
        winner.finished_at,
        jsonb_build_object(
          'event_name',
          winner.event_name,
          'winner_name',
          winner.judge_winner_name,
          'judge_score',
          winner.judge_score
        )
      )
      on conflict (
        singer_profile_id,
        source_type,
        source_id
      )
      do nothing;
    end if;
  end loop;

    for winner in
    select distinct on (
      singer_profile_id
    )
      singer_profile_id,
      event_id
    from public.singer_competition_wins
    where event_id is not null
    order by
      singer_profile_id,
      earned_at desc
  loop
    select performance.id
    into performance_row
    from public.performances
      as performance
    where performance.event_id =
        winner.event_id
      and performance.singer_profile_id =
        winner.singer_profile_id
    order by
      coalesce(
        performance.completed_at,
        performance.created_at
      ) desc
    limit 1;

    perform
      public.evaluate_win_achievements(
        winner.singer_profile_id,
        performance_row.id
      );
  end loop;
end;
$$;

commit;