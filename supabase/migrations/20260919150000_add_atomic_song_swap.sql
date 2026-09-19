begin;

create or replace function public.swap_singer_performance_rounds(
  p_event_id uuid,
  p_first_id uuid,
  p_second_id uuid
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  first_performance public.performances%rowtype;
  second_performance public.performances%rowtype;
  current_performance_id uuid;
  same_singer boolean := false;
  first_round integer;
  second_round integer;
begin
  if p_first_id = p_second_id then
    raise exception
      'Two different performances are required.';
  end if;

    select events.current_performance_id
  into current_performance_id
  from public.events
  where events.id = p_event_id
  for update;

  if
    p_first_id = current_performance_id or
    p_second_id = current_performance_id
  then
    raise exception
      'The currently performing song cannot be reordered.';
  end if;

  select *
  into first_performance
  from public.performances
  where id = p_first_id
    and event_id = p_event_id
  for update;

  if first_performance.id is null then
    raise exception
      'First performance was not found.';
  end if;

  select *
  into second_performance
  from public.performances
  where id = p_second_id
    and event_id = p_event_id
  for update;

  if second_performance.id is null then
    raise exception
      'Second performance was not found.';
  end if;

  if
    first_performance.status in (
      'completed',
      'skipped'
    ) or
    second_performance.status in (
      'completed',
      'skipped'
    )
  then
    raise exception
      'Completed or skipped songs cannot be reordered.';
  end if;

  /*
   * Use the same identity priority as StageVotes:
   * profile ID, then device ID, then legacy name.
   */
  if
    first_performance.singer_profile_id
      is not null or
    second_performance.singer_profile_id
      is not null
  then
    same_singer :=
      first_performance.singer_profile_id
        is not null and
      second_performance.singer_profile_id
        is not null and
      first_performance.singer_profile_id =
        second_performance.singer_profile_id;

  elsif
    first_performance.device_id
      is not null or
    second_performance.device_id
      is not null
  then
    same_singer :=
      first_performance.device_id
        is not null and
      second_performance.device_id
        is not null and
      first_performance.device_id =
        second_performance.device_id;

  else
    same_singer :=
      lower(
        regexp_replace(
          trim(
            first_performance.singer_name
          ),
          '\s+',
          ' ',
          'g'
        )
      ) =
      lower(
        regexp_replace(
          trim(
            second_performance.singer_name
          ),
          '\s+',
          ' ',
          'g'
        )
      );
  end if;

  if not same_singer then
    raise exception
      'Only songs belonging to the same singer can be swapped.';
  end if;

  first_round :=
    coalesce(first_performance.round, 1);

  second_round :=
    coalesce(second_performance.round, 1);

  update public.performances
  set round = case
    when id = p_first_id
      then second_round
    when id = p_second_id
      then first_round
    else round
  end
  where event_id = p_event_id
    and id in (
      p_first_id,
      p_second_id
    );
end;
$$;

comment on function
  public.swap_singer_performance_rounds(
    uuid,
    uuid,
    uuid
  )
is
  'Atomically swaps two active round positions belonging to the same singer without moving the current performance.';

commit;