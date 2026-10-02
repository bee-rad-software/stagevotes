begin;
alter table public.tournament_events add column if not exists olympic_scoring boolean not null default false;
alter table public.tournament_events drop constraint if exists tournament_events_olympic_judges_check;
alter table public.tournament_events add constraint tournament_events_olympic_judges_check
 check (not olympic_scoring or (expected_judges is not null and expected_judges >= 5));

create or replace function public.lock_launched_olympic_mode()
returns trigger language plpgsql set search_path = public as $
begin
 if old.event_id is not null and new.olympic_scoring is distinct from old.olympic_scoring then
   raise exception 'Scoring mode cannot change after a tournament show is launched';
 end if;
 return new;
end;
$;
drop trigger if exists lock_launched_olympic_mode on public.tournament_events;
create trigger lock_launched_olympic_mode before update of olympic_scoring on public.tournament_events
for each row execute function public.lock_launched_olympic_mode();

create or replace function public.olympic_performance_score(p_performance_id uuid, p_expected integer)
returns table (average_score numeric, ballot_count integer, excluded_totals numeric[])
language sql stable set search_path = public as $$
 with categories as (
   select c.id from public.vote_categories c join public.performances p on p.event_id=c.event_id
   where p.id=p_performance_id
 ), ballots as (
   select v.device_id, sum(v.score)::numeric as total,
     avg(v.score)::numeric as average
   from public.votes v join categories c on c.id=v.category_id
   where v.performance_id=p_performance_id and v.device_id is not null and v.score is not null
   group by v.device_id
   having count(distinct v.category_id)=(select count(*) from categories)
     and count(*)=(select count(*) from categories)
 ), ordered as (
   select *, row_number() over(order by total, device_id) as position,
     count(*) over()::integer as received from ballots
 )
 select case when p_expected>=5 and max(received)>=p_expected
   then avg(average) filter(where position>1 and position<received) else null end,
   coalesce(max(received),0),
   array_agg(total order by position) filter(where position=1 or position=received)
 from ordered;
$$;
revoke all on function public.olympic_performance_score(uuid,integer) from public, anon;
grant execute on function public.olympic_performance_score(uuid,integer) to authenticated;

create or replace function public.validate_olympic_event(p_event_id uuid)
returns void language plpgsql set search_path = public as $$
declare te public.tournament_events%rowtype;
begin
 select t.* into te from public.tournament_events t
 join public.events e on e.tournament_event_id=t.id where e.id=p_event_id;
 if not coalesce(te.olympic_scoring,false) then return; end if;
 if coalesce(te.expected_judges,0)<5 then raise exception 'Olympic scoring requires at least five judges'; end if;
 if not exists(select 1 from public.vote_categories where event_id=p_event_id) then
   raise exception 'Olympic scoring requires judging categories'; end if;
 if exists (
   select 1 from public.performances p
   cross join lateral public.olympic_performance_score(p.id,te.expected_judges) s
   where p.event_id=p_event_id and p.status is distinct from 'skipped'
     and nullif(trim(p.song_title),'') is not null
     and (s.average_score is null or p.singer_profile_id is null)
 ) then raise exception 'Wait for all expected complete judge ballots for every competitor before ending this Olympic-scored show'; end if;
end;
$$;
revoke all on function public.validate_olympic_event(uuid) from public, anon;
grant execute on function public.validate_olympic_event(uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.process_tournament_results(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_event public.events%rowtype;
  v_tournament_event public.tournament_events%rowtype;

  v_destination record;

  v_competitor_count integer := 0;
  v_advancer_count integer := 0;
  v_destination_count integer := 0;

  v_judge_weight numeric := 100;
  v_peoples_choice_weight numeric := 0;

begin

  /*
   * Load the regular StageVotes event.
   */
  select *
  into v_event
  from public.events
  where id = p_event_id;

  if not found then
    raise exception
      'Event % was not found',
      p_event_id;
  end if;

  if coalesce(
    v_event.is_show_ended,
    false
  ) = false then
    raise exception
      'Tournament event % has not ended',
      p_event_id;
  end if;

  if coalesce(
    v_event.competition_mode,
    'standard'
  ) <> 'tournament' then
    raise exception
      'Event % is not marked as a tournament event',
      p_event_id;
  end if;

  /*
   * Load scoring weights.
   */
  v_judge_weight :=
    coalesce(
      v_event.judge_weight,
      100
    );

  v_peoples_choice_weight :=
    coalesce(
      v_event.peoples_choice_weight,
      0
    );

  /*
   * Safety check.
   */
  if (
    v_judge_weight +
    v_peoples_choice_weight
  ) <> 100 then
    raise exception
      'Tournament scoring weights must total 100. Judge: %, People''s Choice: %',
      v_judge_weight,
      v_peoples_choice_weight;
  end if;

  /*
   * Find the connected tournament event.
   */
  select te.*
  into v_tournament_event
  from public.tournament_events te
  where te.event_id = p_event_id
     or te.id =
        v_event.tournament_event_id
  limit 1;

  if not found then
    raise exception
      'No tournament event is connected to event %',
      p_event_id;
  end if;

  perform public.validate_olympic_event(p_event_id);

  /*
   * =========================================
   * OFFICIAL TOURNAMENT SCORING
   * =========================================
   *
   * Judge:
   *   average / 5 × judge weight
   *
   * People's Choice:
   *   singer votes / highest vote total
   *   × People's Choice weight
   *
   * Official score:
   *   judge points + PC points
   *
   * average_score remains the familiar
   * judge score out of 5.
   */

  with competitor_base as (

    /*
     * Start with every registered performer
     * who has a singer profile.
     *
     * This allows:
     * judges only,
     * blended scoring,
     * AND People's Choice only.
     */
    select
      p.singer_profile_id,
      max(p.singer_name) as singer_name
    from public.performances p
    where p.event_id = p_event_id
      and p.singer_profile_id is not null
      and (not v_tournament_event.olympic_scoring or (p.status is distinct from 'skipped' and nullif(trim(p.song_title),'') is not null))
    group by p.singer_profile_id
  ),

  judge_scores as (
    select cb.singer_profile_id, cb.singer_name,
      case when v_tournament_event.olympic_scoring
        then (select avg(os.average_score) from public.performances op
          cross join lateral public.olympic_performance_score(op.id,v_tournament_event.expected_judges) os
          where op.event_id=p_event_id and op.singer_profile_id=cb.singer_profile_id
            and op.status is distinct from 'skipped' and nullif(trim(op.song_title),'') is not null)
        else avg(v.score)::numeric end as average_score,
      count(v.id)::integer as score_count
    from competitor_base cb
    left join public.performances p on p.event_id=p_event_id and p.singer_profile_id=cb.singer_profile_id
    left join public.votes v on v.performance_id=p.id and v.score is not null
    group by cb.singer_profile_id, cb.singer_name
  ),

  /*
   * Count People's Choice votes for
   * each competitor.
   */
  peoples_choice_counts as (
    select
      js.singer_profile_id,

      count(pcv.id)::integer
        as peoples_choice_votes

    from judge_scores js

    left join public.peoples_choice_votes pcv
      on pcv.event_id = p_event_id

      and lower(
        trim(pcv.singer_name)
      ) =
      lower(
        trim(js.singer_name)
      )

    group by
      js.singer_profile_id
  ),

  scoring_base as (
    select
      js.singer_profile_id,
      js.singer_name,
      js.average_score,
      js.score_count,

      coalesce(
        pc.peoples_choice_votes,
        0
      ) as peoples_choice_votes,

      max(
        coalesce(
          pc.peoples_choice_votes,
          0
        )
      ) over ()
        as highest_peoples_choice_votes

    from judge_scores js

    left join peoples_choice_counts pc
      on pc.singer_profile_id =
         js.singer_profile_id
  ),

  official_scores as (
    select
      sb.*,

      /*
       * Judge contribution.
       *
       * If judges count 0%, this is 0.
       * If judges count > 0% but a singer
       * somehow has no judge score, they
       * receive 0 judge points.
       */
      case
        when v_judge_weight > 0
        then
          (
            coalesce(
              sb.average_score,
              0
            ) / 5.0
          ) * v_judge_weight
        else 0
      end as judge_points,

      /*
       * People's Choice contribution.
       */
      case
        when
          v_peoples_choice_weight > 0
          and
          sb.highest_peoples_choice_votes > 0
        then
          (
            sb.peoples_choice_votes::numeric
            /
            sb.highest_peoples_choice_votes::numeric
          )
          * v_peoples_choice_weight

        else 0
      end as peoples_choice_points

    from scoring_base sb
  ),

  ranked_singers as (
    select
      os.*,

      (
        os.judge_points +
        os.peoples_choice_points
      ) as official_score,

      row_number() over (
        order by

          /*
           * Official weighted score.
           */
          (
            os.judge_points +
            os.peoples_choice_points
          ) desc,

          /*
           * First tiebreaker:
           * judge average.
           */
          coalesce(
            os.average_score,
            0
          ) desc,

          /*
           * Second:
           * number of judge scores.
           */
          os.score_count desc,

          /*
           * Final deterministic fallback.
           */
          os.singer_name asc

      )::integer as placement

    from official_scores os
  ),

  /*
   * Ensure each competitor has an overall
   * tournament entry.
   */
  ensured_entries as (
    insert into public.tournament_entries (
      tournament_id,
      singer_profile_id,
      status
    )

    select
      v_tournament_event.tournament_id,
      rs.singer_profile_id,
      'active'

    from ranked_singers rs

    on conflict (
      tournament_id,
      singer_profile_id
    )

    do update set
      status = case
        when public.tournament_entries.status
          in (
            'champion',
            'withdrawn'
          )
        then
          public.tournament_entries.status

        else 'active'
      end

    returning
      id,
      singer_profile_id
  ),

  /*
   * Build the complete stored result.
   */
  result_rows as (
    select
      ee.id as tournament_entry_id,

      rs.singer_profile_id,

      rs.placement,

      /*
       * Existing 1–5 score.
       */
      rs.average_score,

      /*
       * New scoring breakdown.
       */
      rs.average_score
        as judge_score,

      rs.peoples_choice_votes,

      rs.peoples_choice_points
        as peoples_choice_score,

      rs.official_score

    from ranked_singers rs

    join ensured_entries ee
      on ee.singer_profile_id =
         rs.singer_profile_id
  )

  /*
   * Store tournament-event results.
   */
  insert into public.tournament_event_entries (
    tournament_event_id,
    tournament_entry_id,
    status,
    placement,
    average_score,

    judge_score,
    peoples_choice_votes,
    peoples_choice_score,
    official_score
  )

  select
    v_tournament_event.id,
    rr.tournament_entry_id,
    'competed',
    rr.placement,
    rr.average_score,

    rr.judge_score,
    rr.peoples_choice_votes,
    rr.peoples_choice_score,
    rr.official_score

  from result_rows rr

  on conflict (
    tournament_event_id,
    tournament_entry_id
  )

  do update set
    status =
      'competed',

    placement =
      excluded.placement,

    average_score =
      excluded.average_score,

    judge_score =
      excluded.judge_score,

    peoples_choice_votes =
      excluded.peoples_choice_votes,

    peoples_choice_score =
      excluded.peoples_choice_score,

    official_score =
      excluded.official_score;

  /*
   * Count processed competitors.
   */
  select count(*)
  into v_competitor_count

  from public.tournament_event_entries tee

  where tee.tournament_event_id =
    v_tournament_event.id

    and tee.placement is not null;

  /*
   * Send top X singers through every
   * configured advancement path.
   */
  for v_destination in

    select
      tep.to_tournament_event_id

    from public.tournament_event_paths tep

    where tep.from_tournament_event_id =
      v_tournament_event.id

  loop

    v_destination_count :=
      v_destination_count + 1;

    /*
     * Permanent advancement record.
     */
    insert into public.tournament_advancements (
      tournament_id,
      tournament_entry_id,
      from_tournament_event_id,
      to_tournament_event_id,
      qualifying_place,
      qualifying_score,
      advancement_type
    )

    select
      v_tournament_event.tournament_id,
      tee.tournament_entry_id,
      v_tournament_event.id,
      v_destination.to_tournament_event_id,
      tee.placement,

      /*
       * Keep this as the familiar
       * judge average for compatibility.
       */
      tee.average_score,

      'placement'

    from public.tournament_event_entries tee

    where tee.tournament_event_id =
      v_tournament_event.id

      and tee.placement <= coalesce(
        v_tournament_event.advancement_count,
        1
      )

    on conflict (
      tournament_entry_id,
      to_tournament_event_id
    )

    do update set
      from_tournament_event_id =
        excluded.from_tournament_event_id,

      qualifying_place =
        excluded.qualifying_place,

      qualifying_score =
        excluded.qualifying_score,

      advancement_type =
        excluded.advancement_type,

      advanced_at =
        now();

    /*
     * Add advancing singers to the
     * destination event.
     */
    insert into public.tournament_event_entries (
      tournament_event_id,
      tournament_entry_id,
      status,
      seed
    )

    select
      v_destination.to_tournament_event_id,
      tee.tournament_entry_id,
      'eligible',
      tee.placement

    from public.tournament_event_entries tee

    where tee.tournament_event_id =
      v_tournament_event.id

      and tee.placement <= coalesce(
        v_tournament_event.advancement_count,
        1
      )

    on conflict (
      tournament_event_id,
      tournament_entry_id
    )

    do update set
      status = case

        when public.tournament_event_entries.status
          in (
            'competed',
            'advanced'
          )

        then
          public.tournament_event_entries.status

        else
          'eligible'

      end,

      seed =
        excluded.seed;

    /*
     * Mark source-event qualifiers advanced.
     */
    update public.tournament_event_entries tee

    set status =
      'advanced'

    where tee.tournament_event_id =
      v_tournament_event.id

      and tee.placement <= coalesce(
        v_tournament_event.advancement_count,
        1
      );

    /*
     * Update overall tournament status.
     */
    update public.tournament_entries te

    set status =
      'qualified'

    where te.id in (

      select
        tee.tournament_entry_id

      from public.tournament_event_entries tee

      where tee.tournament_event_id =
        v_tournament_event.id

        and tee.placement <= coalesce(
          v_tournament_event.advancement_count,
          1
        )
    );

  end loop;

  /*
   * Everyone who competed but did not advance
   * is eliminated when there is a destination.
   */
  if v_destination_count > 0 then

    update public.tournament_event_entries tee

    set status =
      'eliminated'

    where tee.tournament_event_id =
      v_tournament_event.id

      and tee.status =
        'competed';

    update public.tournament_entries te

    set status =
      'eliminated'

    where te.id in (

      select
        tee.tournament_entry_id

      from public.tournament_event_entries tee

      where tee.tournament_event_id =
        v_tournament_event.id

        and tee.status =
          'eliminated'
    );

  end if;

  /*
   * Mark tournament event complete.
   */
  update public.tournament_events

  set status =
    'completed'

  where id =
    v_tournament_event.id;

  /*
   * Count advancers.
   */
  select count(*)
  into v_advancer_count

  from public.tournament_event_entries tee

  where tee.tournament_event_id =
    v_tournament_event.id

    and tee.status =
      'advanced';

  return jsonb_build_object(
    'event_id',
      p_event_id,

    'tournament_event_id',
      v_tournament_event.id,

    'tournament_id',
      v_tournament_event.tournament_id,

    'competitors_processed',
      v_competitor_count,

    'advancers',
      v_advancer_count,

    'destinations',
      v_destination_count,

    'judge_weight',
      v_judge_weight,

    'peoples_choice_weight',
      v_peoples_choice_weight,

    'league_points_awarded',
      false
  );

end;
$function$;

commit;
