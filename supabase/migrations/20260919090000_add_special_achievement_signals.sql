begin;

alter table public.performances
add column if not exists
  selection_source text
  not null
  default 'manual';

alter table public.performances
drop constraint if exists
  performances_selection_source_check;

alter table public.performances
add constraint
  performances_selection_source_check
check (
  selection_source in (
    'manual',
    'search',
    'surprise_me',
    'host'
  )
);

create or replace function
  public.award_special_performance_achievements()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'completed'
    and new.singer_profile_id is not null
    and new.selection_source =
      'surprise_me'
  then
    insert into public.singer_achievements (
      singer_profile_id,
      achievement_id,
      triggering_performance_id,
      metadata
    )
    select
      new.singer_profile_id,
      definition.id,
      new.id,
      jsonb_build_object(
        'selection_source',
        new.selection_source,
        'song_title',
        new.song_title,
        'artist',
        new.artist
      )
    from public.achievement_definitions
      as definition
    where definition.slug = 'fearless'
      and definition.is_active = true
    on conflict (
      singer_profile_id,
      achievement_id
    )
    do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists
  award_special_achievements_after_performance
on public.performances;

create trigger
  award_special_achievements_after_performance
after insert or update
on public.performances
for each row
execute function
  public.award_special_performance_achievements();

create or replace function
  public.award_final_performance_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_final_performance record;
begin
  if new.is_show_ended = true
    and coalesce(
      old.is_show_ended,
      false
    ) = false
  then
    select
      performance.id,
      performance.singer_profile_id,
      performance.song_title,
      performance.artist
    into v_final_performance
    from public.performances
      as performance
    where performance.event_id = new.id
      and performance.status =
        'completed'
      and performance.singer_profile_id
        is not null
    order by
      coalesce(
        performance.completed_at,
        performance.created_at
      ) desc,
      performance.id desc
    limit 1;

    if
      v_final_performance
        .singer_profile_id is not null
    then
      insert into public.singer_achievements (
        singer_profile_id,
        achievement_id,
        triggering_performance_id,
        metadata
      )
      select
        v_final_performance
          .singer_profile_id,
        definition.id,
        v_final_performance.id,
        jsonb_build_object(
          'event_id',
          new.id,
          'song_title',
          v_final_performance
            .song_title,
          'artist',
          v_final_performance.artist
        )
      from public.achievement_definitions
        as definition
      where definition.slug =
          'the-final-countdown'
        and definition.is_active = true
      on conflict (
        singer_profile_id,
        achievement_id
      )
      do nothing;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists
  award_final_achievement_when_show_ends
on public.events;

create trigger
  award_final_achievement_when_show_ends
after update of is_show_ended
on public.events
for each row
execute function
  public.award_final_performance_achievement();

commit;