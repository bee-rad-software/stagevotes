-- Account-free tournament competitors and safe official result finalization.
begin;
alter table public.tournament_entries alter column singer_profile_id drop not null;
alter table public.tournament_entries add column if not exists guest_name text;
alter table public.tournament_entries add column if not exists guest_key text;
create unique index if not exists tournament_guest_identity on public.tournament_entries(tournament_id,guest_key);
alter table public.tournament_entries drop constraint if exists tournament_entry_has_identity;
alter table public.tournament_entries add constraint tournament_entry_has_identity check(singer_profile_id is not null or (nullif(trim(guest_name),'') is not null and nullif(trim(guest_key),'') is not null));
alter table public.performances add column if not exists tournament_entry_id uuid references public.tournament_entries(id);

create or replace function public.validate_olympic_event(p_event_id uuid)
returns void language plpgsql set search_path=public as $$
declare te public.tournament_events%rowtype; ev public.events%rowtype; required integer; missing text; ncat integer;
begin
 select * into ev from events where id=p_event_id;
 select * into te from tournament_events where id=ev.tournament_event_id or event_id=p_event_id order by id limit 1;
 if te.id is null then return; end if;
 if not ev.judging_enabled or coalesce(ev.judge_weight,100)=0 then return; end if;
 required:=greatest(coalesce(te.expected_judges,1),1);
 if te.olympic_scoring and required<5 then raise exception 'Olympic scoring requires at least five judges'; end if;
 select count(*) into ncat from vote_categories where event_id=p_event_id;
 if te.olympic_scoring and ncat=0 then raise exception 'Olympic scoring requires judging categories'; end if;
 select string_agg(p.singer_name,', ') into missing from performances p
 where p.event_id=p_event_id and (p.status='completed' or p.id=ev.current_performance_id)
 and p.status is distinct from 'skipped' and nullif(trim(p.song_title),'') is not null
 and (select count(*) from (
   select coalesce(nullif(v.device_id,''),nullif(v.voter_key::text,'')) as judge
   from scoring_votes v where v.performance_id=p.id and v.event_id=p_event_id
   and v.score is not null and coalesce(nullif(v.device_id,''),nullif(v.voter_key::text,'')) is not null
   group by 1
   having ncat=0 or count(distinct v.category_id) filter(where v.category_id in(select id from vote_categories where event_id=p_event_id))=ncat
 ) ballots)<required;
 if missing is not null then raise exception 'Results are not ready. Missing complete judge ballots for: %. Expected % judges per singer.',missing,required; end if;
end $$;

-- Average complete ballots only; a partial extra ballot must not alter standings.
create or replace function public.complete_judge_performance_score(p_performance_id uuid)
returns table(average_score numeric,ballot_count integer) language sql stable set search_path=public as $$
 with config as(select count(*)::integer n from vote_categories where event_id=(select event_id from performances where id=p_performance_id)),
 ballots as(
  select coalesce(nullif(v.device_id,''),nullif(v.voter_key::text,'')) judge,avg(v.score) average_score
  from scoring_votes v where v.performance_id=p_performance_id and v.event_id=(select event_id from performances where id=p_performance_id)
  and v.score is not null and coalesce(nullif(v.device_id,''),nullif(v.voter_key::text,'')) is not null
  group by 1 having (select n from config)=0 or count(distinct v.category_id) filter(where v.category_id in(select id from vote_categories where event_id=v.event_id))=(select n from config)
 ) select avg(b.average_score),count(*)::integer from ballots b;
$$;

CREATE OR REPLACE FUNCTION public.process_tournament_results(p_event_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $function$
declare
 v_event public.events%rowtype; v_tournament_event public.tournament_events%rowtype;
 v_destination record; v_competitor_count integer:=0; v_advancer_count integer:=0; v_destination_count integer:=0;
 v_judge_weight numeric:=100; v_peoples_choice_weight numeric:=0;
begin
 select * into v_event from events where id=p_event_id for update;
 if not found then raise exception 'Show not found'; end if;
 select * into v_tournament_event from tournament_events where id=v_event.tournament_event_id or event_id=p_event_id order by id limit 1;
 if v_tournament_event.id is null or v_event.competition_mode is distinct from 'tournament' then raise exception 'This show is not a tournament event'; end if;
 if session_user<>'postgres' and not exists(
   select 1 from account_users au where au.user_id=auth.uid() and (
     au.account_id=v_event.account_id or au.account_id=(select created_by_account_id from tournaments where id=v_tournament_event.tournament_id)
   )
 ) then raise exception 'Only this show host or tournament director can finalize results'; end if;
 if not coalesce(v_event.is_show_ended,false) then raise exception 'End the show before finalizing results'; end if;
 v_judge_weight:=coalesce(v_event.judge_weight,100);v_peoples_choice_weight:=coalesce(v_event.peoples_choice_weight,0);
 if v_judge_weight<0 or v_peoples_choice_weight<0 or v_judge_weight+v_peoples_choice_weight<>100 then raise exception 'Scoring weights must total 100'; end if;
 perform validate_olympic_event(p_event_id);
 -- Do not rewrite advancement history after a later round has begun.
 if exists(select 1 from tournament_advancements a join tournament_events t on t.id=a.to_tournament_event_id
   where a.from_tournament_event_id=v_tournament_event.id and t.event_id is not null)
 then raise exception 'A destination show has already launched. Review advancement corrections with the tournament director before reprocessing.'; end if;

 -- Create real tournament entries for guests, never fake singer accounts.
 insert into tournament_entries(tournament_id,singer_profile_id,status)
 select distinct v_tournament_event.tournament_id,p.singer_profile_id,'active' from performances p
 where p.event_id=p_event_id and p.status='completed' and nullif(trim(p.song_title),'') is not null and p.singer_profile_id is not null
 on conflict(tournament_id,singer_profile_id) do nothing;
 insert into tournament_entries(tournament_id,singer_profile_id,guest_key,guest_name,status)
 select v_tournament_event.tournament_id,null,p_event_id::text||':'||lower(trim(p.singer_name)),max(trim(p.singer_name)),'active'
 from performances p where p.event_id=p_event_id and p.status='completed' and nullif(trim(p.song_title),'') is not null and p.singer_profile_id is null
 and p.tournament_entry_id is null group by lower(trim(p.singer_name))
 on conflict(tournament_id,guest_key) do update set guest_name=excluded.guest_name;
 update performances p set tournament_entry_id=t.id from tournament_entries t
 where p.event_id=p_event_id and p.status='completed' and t.tournament_id=v_tournament_event.tournament_id
 and p.tournament_entry_id is null and ((p.singer_profile_id is not null and t.singer_profile_id=p.singer_profile_id)
 or (p.singer_profile_id is null and t.guest_key=p_event_id::text||':'||lower(trim(p.singer_name))));
 if exists(select 1 from performances p left join tournament_entries t on t.id=p.tournament_entry_id
   where p.event_id=p_event_id and p.status='completed' and nullif(trim(p.song_title),'') is not null
   and (t.id is null or t.tournament_id<>v_tournament_event.tournament_id)) then raise exception 'A competitor could not be linked to this tournament'; end if;

 -- A repair replaces this qualifier's old advancement records atomically.
 with removed as(delete from tournament_advancements where from_tournament_event_id=v_tournament_event.id returning *)
 delete from tournament_event_entries d using removed a where d.tournament_entry_id=a.tournament_entry_id and d.tournament_event_id=a.to_tournament_event_id
 and d.status='eligible' and d.placement is null and not exists(select 1 from tournament_advancements other
   where other.tournament_entry_id=a.tournament_entry_id and other.to_tournament_event_id=a.to_tournament_event_id and other.from_tournament_event_id<>v_tournament_event.id);
 update tournament_entries t set status='active' where t.status in('qualified','eliminated') and t.id in(
 select tournament_entry_id from tournament_event_entries where tournament_event_id=v_tournament_event.id)
 and not exists(select 1 from tournament_advancements a where a.tournament_entry_id=t.id);
 update tournament_event_entries set placement=null,average_score=null,judge_score=null,peoples_choice_votes=0,peoples_choice_score=null,official_score=null,status='eligible'
 where tournament_event_id=v_tournament_event.id and placement is not null;

 with eligible as (
  select p.* from performances p where p.event_id=p_event_id and p.status='completed' and nullif(trim(p.song_title),'') is not null
 ), performance_scores as (
  select p.id,p.tournament_entry_id,p.singer_name,
   case when v_tournament_event.olympic_scoring then (select average_score from olympic_performance_score(p.id,v_tournament_event.expected_judges))
     else (select average_score from complete_judge_performance_score(p.id)) end as average_score,
   (select ballot_count from complete_judge_performance_score(p.id)) as score_count
  from eligible p
 ), singers as (
  select tournament_entry_id,max(singer_name) as singer_name,avg(average_score) as average_score,sum(score_count) as score_count
  from performance_scores group by tournament_entry_id
 ), audience as (
  select s.*, (select count(*) from peoples_choice_votes pc where pc.event_id=p_event_id and lower(trim(pc.singer_name))=lower(trim(s.singer_name)))::integer as peoples_choice_votes
  from singers s where v_judge_weight=0 or s.average_score is not null
 ), weighted as (
  select a.*,case when v_judge_weight>0 then average_score/5.0*v_judge_weight else 0 end as judge_points,
   case when v_peoples_choice_weight>0 and max(peoples_choice_votes) over()>0 then peoples_choice_votes::numeric/max(peoples_choice_votes) over()*v_peoples_choice_weight else 0 end as peoples_choice_points
  from audience a where v_judge_weight>0 or peoples_choice_votes>0
 ), ranked as (
  select *,judge_points+peoples_choice_points as official_score,
   row_number() over(order by judge_points+peoples_choice_points desc,average_score desc nulls last,score_count desc,singer_name,tournament_entry_id)::integer as placement
  from weighted
 )
 insert into tournament_event_entries(tournament_event_id,tournament_entry_id,status,placement,average_score,judge_score,peoples_choice_votes,peoples_choice_score,official_score)
 select v_tournament_event.id,tournament_entry_id,'competed',placement,average_score,average_score,peoples_choice_votes,peoples_choice_points,official_score from ranked
 on conflict(tournament_event_id,tournament_entry_id) do update set status='competed',placement=excluded.placement,average_score=excluded.average_score,
 judge_score=excluded.judge_score,peoples_choice_votes=excluded.peoples_choice_votes,peoples_choice_score=excluded.peoples_choice_score,official_score=excluded.official_score;
  -- Keep the karaoke recap's judge winner consistent with the persisted scorecard.
  update event_results set
    judge_winner_name=(select coalesce(nullif(trim(sp.stage_name),''),nullif(trim(sp.display_name),''),te.guest_name)
      from tournament_event_entries tee join tournament_entries te on te.id=tee.tournament_entry_id
      left join singer_profiles sp on sp.id=te.singer_profile_id
      where tee.tournament_event_id=v_tournament_event.id and tee.judge_score is not null
      order by tee.judge_score desc,tee.placement limit 1),
    judge_score=(select max(judge_score) from tournament_event_entries where tournament_event_id=v_tournament_event.id)
  where event_id=p_event_id;

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
revoke all on function public.process_tournament_results(uuid) from public,anon;
grant execute on function public.process_tournament_results(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
