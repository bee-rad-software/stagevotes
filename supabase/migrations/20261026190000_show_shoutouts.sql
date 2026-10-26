begin;
create table if not exists public.show_shoutout_settings (event_id uuid primary key references public.events(id) on delete cascade, enabled boolean not null default false);
create table if not exists public.show_shoutouts (
 id uuid primary key default gen_random_uuid(), event_id uuid not null references public.events(id) on delete cascade,
 message text not null check (char_length(message) between 1 and 100), sender text not null default '' check (char_length(sender) <= 30),
 status text not null default 'pending' check (status in ('pending','approved','hidden')),
 guest_key text not null, network_key text not null, created_at timestamptz not null default now(), approved_at timestamptz
);
create index if not exists show_shoutouts_event_created on public.show_shoutouts(event_id,created_at desc);
alter table public.show_shoutouts enable row level security;
alter table public.show_shoutout_settings enable row level security;
revoke all on public.show_shoutouts, public.show_shoutout_settings from anon, authenticated;
grant select, insert, update, delete on public.show_shoutouts, public.show_shoutout_settings to service_role;
create or replace function public.submit_show_shoutout(p_event uuid, p_message text, p_sender text, p_guest text, p_network text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
 perform 1 from public.events where id=p_event and coalesce(is_show_ended,false)=false for update;
 if not found or not exists(select 1 from public.show_shoutout_settings where event_id=p_event and enabled) then raise exception 'shoutouts_closed'; end if;
 if (select count(*) from public.show_shoutouts where event_id=p_event and guest_key=p_guest and created_at > now()-interval '1 minute') >= 2
 or (select count(*) from public.show_shoutouts where event_id=p_event and network_key=p_network and created_at > now()-interval '1 minute') >= 20
 or (select count(*) from public.show_shoutouts where event_id=p_event and created_at > now()-interval '1 hour') >= 300 then raise exception 'shoutouts_limit'; end if;
 insert into public.show_shoutouts(event_id,message,sender,guest_key,network_key) values(p_event,p_message,p_sender,p_guest,p_network) returning id into v_id;
 return v_id;
end; $$;
revoke all on function public.submit_show_shoutout(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_show_shoutout(uuid,text,text,text,text) to service_role;
commit;
