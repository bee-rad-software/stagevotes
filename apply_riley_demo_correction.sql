-- Optional explicit judge selection. NULL preserves every existing show's scoring.
begin;
alter table public.events add column if not exists selected_judge_device_id text;
do $$
declare definition text;
begin
 select pg_get_viewdef('public.scoring_votes'::regclass,true) into definition;
 -- Wrap the existing weighted score projection without changing its columns or types.
 if position('selected_judge_device_id' in definition)=0 then
  definition:=regexp_replace(definition,';[[:space:]]*$','');
  execute 'create or replace view public.scoring_votes with (security_invoker=true) as select scoped.* from ('||definition||') scoped join public.events chosen_event on chosen_event.id=scoped.event_id where chosen_event.selected_judge_device_id is null or scoped.device_id=chosen_event.selected_judge_device_id';
 end if;
end $$;
notify pgrst,'reload schema';
commit;
-- Run after the guest tournament results and selected tournament judge migrations.
-- Riley G. is the one judge selected by the host for this demo.
-- Kelly's and Adam's raw ballots remain in public.votes.
begin;
do $$
declare target uuid; teid uuid; matches integer; selected_judge text:='69161f4d-1d60-4d90-8e15-079f5d273ba6';
begin
 select count(*),(array_agg(id))[1] into matches,target from public.events
 where name='Rogers Qualifier #2' and competition_mode='tournament' and is_show_ended=true;
 if matches<>1 then raise exception 'Expected exactly one ended Rogers Qualifier #2 show; found %.',matches; end if;
 perform 1 from public.events where id=target for update;
 select tournament_event_id into teid from public.events where id=target;
 if teid is null then raise exception 'The show is not linked to a tournament event'; end if;
 if exists(select 1 from public.tournament_events where id=teid and olympic_scoring=true) then raise exception 'One-judge scoring cannot use Olympic scoring'; end if;
 if not exists(select 1 from public.judge_sessions where event_id=target and device_id=selected_judge and judge_name='Riley G.') then raise exception 'Riley G. could not be verified for this show'; end if;
 update public.events set selected_judge_device_id=selected_judge where id=target;
 update public.tournament_events set expected_judges=1 where id=teid;
 perform public.process_tournament_results(target);
end $$;
select coalesce(nullif(trim(sp.stage_name),''),nullif(trim(sp.display_name),''),te.guest_name) as singer,
 tee.placement,tee.judge_score,tee.official_score,tee.status
from public.tournament_event_entries tee
join public.tournament_entries te on te.id=tee.tournament_entry_id
left join public.singer_profiles sp on sp.id=te.singer_profile_id
join public.events e on e.tournament_event_id=tee.tournament_event_id
where e.name='Rogers Qualifier #2' and e.competition_mode='tournament' and e.is_show_ended=true
and tee.placement is not null order by tee.placement;
commit;
