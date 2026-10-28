begin;
alter table public.events add column if not exists show_paused_at timestamptz;
create or replace function public.set_show_paused(p_event_id uuid, p_paused boolean)
returns void language plpgsql security definer set search_path=public as $$
declare e public.events%rowtype; pause_duration interval;
begin
 select * into e from public.events where id=p_event_id for update;
 if not found or auth.uid() is null or not exists(select 1 from public.account_users au where au.account_id=e.account_id and au.user_id=auth.uid()) then
  raise exception 'Only a host can pause this show.';
 end if;
 if e.is_show_ended then raise exception 'This show has ended.'; end if;
 if p_paused and e.show_paused_at is null then
  update public.events set show_paused_at=clock_timestamp() where id=p_event_id;
 elsif not p_paused and e.show_paused_at is not null then
  pause_duration := greatest(interval '0 seconds', clock_timestamp()-e.show_paused_at);
  update public.events set show_paused_at=null,
   current_performance_started_at=case when current_performance_started_at is null then null else current_performance_started_at+pause_duration end
  where id=p_event_id;
 end if;
end $$;
revoke all on function public.set_show_paused(uuid,boolean) from public;
grant execute on function public.set_show_paused(uuid,boolean) to authenticated;
commit;
