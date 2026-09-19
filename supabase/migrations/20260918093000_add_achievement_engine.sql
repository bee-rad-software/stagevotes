begin;

alter table public.performances
add column if not exists completed_at timestamptz;

update public.performances
set completed_at = created_at
where status = 'completed'
  and completed_at is null;

create or replace function
  public.set_performance_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'completed'
    and (
      old.status is distinct from 'completed'
      or new.completed_at is null
    )
  then
    new.completed_at = coalesce(
      new.completed_at,
      now()
    );
  end if;

  return new;
end;
$$;

drop trigger if exists
  set_performance_completed_at
on public.performances;

create trigger
  set_performance_completed_at
before update
on public.performances
for each row
execute function
  public.set_performance_completed_at();

create or replace function
  public.evaluate_singer_achievements(
    p_singer_profile_id uuid,
    p_triggering_performance_id uuid
  )
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_performance record;
  v_performance_count integer := 0;
  v_venue_count integer := 0;
  v_distinct_song_count integer := 0;
  v_current_venue_count integer := 0;
  v_friday_count integer := 0;
  v_signup_position integer := 0;
  v_rated_performance_count integer := 0;
  v_average_score numeric := 0;
  v_has_perfect_score boolean := false;
  v_local_hour integer;
  v_normalized_title text;
  v_normalized_artist text;
  v_venue_key text;
begin
  if p_singer_profile_id is null
    or p_triggering_performance_id is null
  then
    return;
  end if;

  select
    performance.id,
    performance.event_id,
    performance.singer_profile_id,
    performance.song_title,
    performance.artist,
    performance.status,
    performance.created_at,
    performance.completed_at,
    performance.queue_order,
    event.venue_id,
    event.venue,
    event.tournament_event_id,
    coalesce(venue.timezone, 'UTC')
      as venue_timezone
  into v_performance
  from public.performances
    as performance
  join public.events
    as event
    on event.id = performance.event_id
  left join public.venues
    as venue
    on venue.id = event.venue_id
  where performance.id =
    p_triggering_performance_id;

  if not found
    or v_performance.status <> 'completed'
    or v_performance.singer_profile_id
      is distinct from p_singer_profile_id
  then
    return;
  end if;

  v_normalized_title :=
    regexp_replace(
      lower(
        coalesce(
          v_performance.song_title,
          ''
        )
      ),
      '[^a-z0-9]+',
      '',
      'g'
    );

  v_normalized_artist :=
    regexp_replace(
      lower(
        coalesce(
          v_performance.artist,
          ''
        )
      ),
      '[^a-z0-9]+',
      '',
      'g'
    );

  v_venue_key := coalesce(
    v_performance.venue_id::text,
    nullif(
      lower(
        trim(
          coalesce(
            v_performance.venue,
            ''
          )
        )
      ),
      ''
    )
  );

  select count(*)
  into v_performance_count
  from public.performances
  where singer_profile_id =
      p_singer_profile_id
    and status = 'completed';

  select count(
    distinct coalesce(
      event.venue_id::text,
      nullif(
        lower(
          trim(
            coalesce(event.venue, '')
          )
        ),
        ''
      )
    )
  )
  into v_venue_count
  from public.performances
    as performance
  join public.events
    as event
    on event.id = performance.event_id
  where performance.singer_profile_id =
      p_singer_profile_id
    and performance.status = 'completed';

  select count(
    distinct regexp_replace(
      lower(
        trim(
          coalesce(song_title, '')
        )
      ),
      '[^a-z0-9]+',
      '',
      'g'
    )
  )
  into v_distinct_song_count
  from public.performances
  where singer_profile_id =
      p_singer_profile_id
    and status = 'completed'
    and nullif(
      trim(
        coalesce(song_title, '')
      ),
      ''
    ) is not null;

  if v_venue_key is not null then
    select count(*)
    into v_current_venue_count
    from public.performances
      as performance
    join public.events
      as event
      on event.id =
        performance.event_id
    where performance.singer_profile_id =
        p_singer_profile_id
      and performance.status = 'completed'
      and coalesce(
        event.venue_id::text,
        nullif(
          lower(
            trim(
              coalesce(event.venue, '')
            )
          ),
          ''
        )
      ) = v_venue_key;
  end if;

  select count(
    distinct (
      timezone(
        coalesce(venue.timezone, 'UTC'),
        coalesce(
          performance.completed_at,
          performance.created_at
        )
      )
    )::date
  )
  into v_friday_count
  from public.performances
    as performance
  join public.events
    as event
    on event.id =
      performance.event_id
  left join public.venues
    as venue
    on venue.id = event.venue_id
  where performance.singer_profile_id =
      p_singer_profile_id
    and performance.status = 'completed'
    and extract(
      isodow
      from timezone(
        coalesce(venue.timezone, 'UTC'),
        coalesce(
          performance.completed_at,
          performance.created_at
        )
      )
    ) = 5;

  select count(*) + 1
  into v_signup_position
  from public.performances
  where event_id =
      v_performance.event_id
    and (
      created_at,
      id
    ) < (
      v_performance.created_at,
      v_performance.id
    );

  with performance_scores as (
    select
      performance.id,
      avg(vote.score)::numeric
        as average_score
    from public.performances
      as performance
    join public.votes
      as vote
      on vote.performance_id =
        performance.id
    where performance.singer_profile_id =
        p_singer_profile_id
      and performance.status =
        'completed'
    group by performance.id
  )
  select
    count(*),
    coalesce(
      avg(average_score),
      0
    ),
    coalesce(
      bool_or(average_score >= 5),
      false
    )
  into
    v_rated_performance_count,
    v_average_score,
    v_has_perfect_score
  from performance_scores;

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
      'performance_count',
      v_performance_count
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'performance_count'
    and v_performance_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

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
      'venue_count',
      v_venue_count
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'venue_count'
    and v_venue_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

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
      'distinct_song_count',
      v_distinct_song_count
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'distinct_song_count'
    and v_distinct_song_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

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
      'venue_performance_count',
      v_current_venue_count,
      'venue_key',
      v_venue_key
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'single_venue_performance_count'
    and v_current_venue_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

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
      'friday_count',
      v_friday_count
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'weekday_performance_count'
    and (
      definition.criteria_config
        ->> 'weekday'
    )::integer = 5
    and v_friday_count >=
      (
        definition.criteria_config
          ->> 'count'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

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
      'signup_position',
      v_signup_position
    )
  from public.achievement_definitions
    as definition
  where definition.is_active = true
    and definition.criteria_type =
      'early_signup'
    and v_signup_position <=
      (
        definition.criteria_config
          ->> 'maximum_position'
      )::integer
  on conflict (
    singer_profile_id,
    achievement_id
  )
  do nothing;

  if v_performance.tournament_event_id
    is not null
  then
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
        'tournament_event_id',
        v_performance.tournament_event_id
      )
    from public.achievement_definitions
      as definition
    where definition.is_active = true
      and definition.criteria_type =
        'tournament_performance'
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  if v_rated_performance_count >= 3
    and v_average_score >= 4.5
  then
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
        'average_score',
        round(v_average_score, 2),
        'rated_performances',
        v_rated_performance_count
      )
    from public.achievement_definitions
      as definition
    where definition.is_active = true
      and definition.criteria_type =
        'average_score'
      and v_average_score >=
        (
          definition.criteria_config
            ->> 'minimum'
        )::numeric
      and v_rated_performance_count >=
        (
          definition.criteria_config
            ->> 'minimum_performances'
        )::integer
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  if v_has_perfect_score then
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
        'perfect_score',
        5
      )
    from public.achievement_definitions
      as definition
    where definition.is_active = true
      and definition.criteria_type =
        'perfect_score'
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  if v_normalized_artist
    like '%rickastley%'
  then
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
        'song_title',
        v_performance.song_title,
        'artist',
        v_performance.artist
      )
    from public.achievement_definitions
      as definition
    where definition.slug = 'rickrolled'
      and definition.is_active = true
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  if v_normalized_artist like '%journey%'
    and v_normalized_title
      like 'dontstopbelievin%'
  then
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
        'song_title',
        v_performance.song_title,
        'artist',
        v_performance.artist
      )
    from public.achievement_definitions
      as definition
    where definition.slug =
        'dont-stop-believin'
      and definition.is_active = true
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  if v_normalized_artist like '%queen%'
    and v_normalized_title =
      'bohemianrhapsody'
  then
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
        'song_title',
        v_performance.song_title,
        'artist',
        v_performance.artist
      )
    from public.achievement_definitions
      as definition
    where definition.slug =
        'bohemian-achievement'
      and definition.is_active = true
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  v_local_hour := extract(
    hour
    from timezone(
      v_performance.venue_timezone,
      coalesce(
        v_performance.completed_at,
        v_performance.created_at
      )
    )
  );

  if v_local_hour between 0 and 3 then
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
        'local_hour',
        v_local_hour
      )
    from public.achievement_definitions
      as definition
    where definition.slug = 'night-owl'
      and definition.is_active = true
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;
end;
$$;

revoke all
on function public.evaluate_singer_achievements(
  uuid,
  uuid
)
from public, anon, authenticated;

create or replace function
  public.handle_performance_achievement_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
    and new.singer_profile_id is not null
    and (
      tg_op = 'INSERT'
      or old.status is distinct
        from new.status
      or old.singer_profile_id is distinct
        from new.singer_profile_id
    )
  then
    perform
      public.evaluate_singer_achievements(
        new.singer_profile_id,
        new.id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists
  evaluate_achievements_after_performance
on public.performances;

create trigger
  evaluate_achievements_after_performance
after insert or update
on public.performances
for each row
execute function
  public.handle_performance_achievement_evaluation();

create or replace function
  public.handle_vote_achievement_evaluation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_performance_id uuid;
  v_singer_profile_id uuid;
begin
  v_performance_id := coalesce(
    new.performance_id,
    old.performance_id
  );

  select singer_profile_id
  into v_singer_profile_id
  from public.performances
  where id = v_performance_id
    and status = 'completed';

  if v_singer_profile_id is not null then
    perform
      public.evaluate_singer_achievements(
        v_singer_profile_id,
        v_performance_id
      );
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists
  evaluate_achievements_after_vote
on public.votes;

create trigger
  evaluate_achievements_after_vote
after insert or update or delete
on public.votes
for each row
execute function
  public.handle_vote_achievement_evaluation();

do $$
declare
  completed_performance record;
begin
  for completed_performance in
    select
      id,
      singer_profile_id
    from public.performances
    where status = 'completed'
      and singer_profile_id is not null
    order by created_at
  loop
    perform
      public.evaluate_singer_achievements(
        completed_performance.singer_profile_id,
        completed_performance.id
      );
  end loop;
end;
$$;

commit;