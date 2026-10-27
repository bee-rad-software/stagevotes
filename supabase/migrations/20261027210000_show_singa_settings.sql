begin;
create table if not exists public.show_singa_settings (
 event_id uuid primary key references public.events(id) on delete cascade,
 enabled boolean not null default false
);
alter table public.show_singa_settings enable row level security;
revoke all on public.show_singa_settings from public, anon, authenticated;
create or replace function public.get_show_singa_enabled(p_event_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select coalesce((select enabled from show_singa_settings where event_id=p_event_id),false)
$$;
create or replace function public.set_show_singa_enabled(p_event_id uuid,p_enabled boolean)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from events e join account_users au on au.account_id=e.account_id where e.id=p_event_id and au.user_id=auth.uid()) then raise exception 'Only a host can change this setting.'; end if;
 insert into show_singa_settings(event_id,enabled) values(p_event_id,coalesce(p_enabled,false)) on conflict(event_id) do update set enabled=excluded.enabled;
end $$;
revoke all on function public.get_show_singa_enabled(uuid),public.set_show_singa_enabled(uuid,boolean) from public;
grant execute on function public.get_show_singa_enabled(uuid) to anon,authenticated;
grant execute on function public.set_show_singa_enabled(uuid,boolean) to authenticated;
commit;
