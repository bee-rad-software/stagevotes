-- Repair badge evaluation during song completion. No show data is changed.
create or replace function public.evaluate_venue_badges(p_profile uuid,p_event uuid,p_performance uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare b record; v_venue_id uuid; v_account_id uuid; shows integer; has_song boolean; has_entry boolean;
begin
 if p_profile is null then return; end if;
 select e.venue_id,e.account_id into v_venue_id,v_account_id from public.events e where e.id=p_event;
 if v_venue_id is null then return; end if;
 perform 1 from public.singer_profiles where id=p_profile for update;
 select count(distinct p.event_id) into shows from public.performances p join public.events e on e.id=p.event_id where p.singer_profile_id=p_profile and p.status='completed' and e.venue_id=v_venue_id and e.account_id=v_account_id;
 select exists(select 1 from public.performances where event_id=p_event and singer_profile_id=p_profile and status='completed') into has_song;
 select exists(select 1 from public.side_contest_entries en join public.side_contests c on c.id=en.contest_id where c.event_id=p_event and en.singer_profile_id=p_profile and en.approval_status='approved') into has_entry;
 for b in select vb.* from public.venue_badges vb where vb.venue_id=v_venue_id and vb.is_active and vb.rule<>'manual' loop
  if (b.rule='song' and has_song) or (b.rule='five_shows' and shows>=5 and has_song) or (b.rule='contest_entry' and has_entry) then
   perform public.write_venue_badge_award(b.id,p_profile,p_event,p_performance,null);
  end if;
 end loop;
end; $$;
revoke all on function public.evaluate_venue_badges(uuid,uuid,uuid) from public,anon,authenticated;
