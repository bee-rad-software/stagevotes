-- Run AFTER 20261022170000_guest_tournament_results.sql.
-- Rebuild this ended qualifier from saved votes. No votes or singer accounts are changed.
-- If required judge ballots are missing, the repair stops without changing results.
begin;
do $$
declare target uuid; matches integer;
begin
 select count(*),(array_agg(id))[1] into matches,target from public.events
 where name='Rogers Qualifier #2' and competition_mode='tournament' and is_show_ended=true;
 if matches<>1 then raise exception 'Expected one ended Rogers Qualifier #2 show; found %. Use the exact event ID before repairing.',matches; end if;
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
