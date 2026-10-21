-- Event photos: private uploads, explicit host moderation, public approved gallery.
begin;
alter table public.events add column if not exists photo_sharing_enabled boolean not null default false;

create table if not exists public.event_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  caption text not null default '' check (char_length(caption) <= 150),
  display_name text not null default '' check (char_length(display_name) <= 40),
  status text not null default 'uploading' check (status in ('uploading','pending','approved','rejected','deleted')),
  storage_path text,
  uploader_key text not null,
  network_key text not null,
  removal_hash text not null,
  created_at timestamptz not null default now(),
  moderated_at timestamptz
);
create index if not exists event_photos_event_status on public.event_photos(event_id,status,created_at);
create index if not exists event_photos_uploader on public.event_photos(event_id,uploader_key,created_at);
create index if not exists event_photos_network on public.event_photos(event_id,network_key,created_at);
create table if not exists public.event_photo_reports (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.event_photos(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  uploader_key text not null,
  network_key text not null,
  reason text not null check (char_length(reason) between 1 and 300),
  created_at timestamptz not null default now(),
  unique(photo_id,uploader_key)
);
create index if not exists event_photo_reports_event on public.event_photo_reports(event_id,created_at);
alter table public.event_photos enable row level security;
alter table public.event_photo_reports enable row level security;
revoke all on public.event_photos, public.event_photo_reports from anon, authenticated;
grant select, insert, update, delete on public.event_photos, public.event_photo_reports to service_role;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('event-photos','event-photos',false,3145728,array['image/webp'])
on conflict(id) do update set public=false,file_size_limit=3145728,allowed_mime_types=array['image/webp'];
-- Restrict this new bucket even if an older broad Storage policy exists.
drop policy if exists event_photos_server_only on storage.objects;
create policy event_photos_server_only on storage.objects as restrictive for all to anon,authenticated
using (bucket_id <> 'event-photos') with check (bucket_id <> 'event-photos');

create or replace function public.guard_event_photo_setting() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.photo_sharing_enabled is distinct from old.photo_sharing_enabled
     and current_user not in ('postgres','service_role','supabase_admin')
     and coalesce(auth.role(),'') <> 'service_role' then
    raise exception 'Photo settings must be changed through the host photo panel';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_event_photo_setting on public.events;
create trigger guard_event_photo_setting before update of photo_sharing_enabled on public.events
for each row execute function public.guard_event_photo_setting();

create or replace function public.reserve_event_photo(p_event_id uuid,p_uploader_key text,p_network_key text,p_caption text,p_display_name text,p_removal_hash text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_enabled boolean; v_ended boolean;
begin
  select photo_sharing_enabled,coalesce(is_show_ended,false) into v_enabled,v_ended
  from public.events where id=p_event_id for update;
  if not found or not v_enabled or v_ended then raise exception 'photos_closed'; end if;
  if (select count(*) from public.event_photos where event_id=p_event_id) >= 250
    or (select count(*) from public.event_photos where event_id=p_event_id and uploader_key=p_uploader_key) >= 20
    or (select count(*) from public.event_photos where event_id=p_event_id and network_key=p_network_key and created_at > now()-interval '1 hour') >= 100
    then raise exception 'photo_limit'; end if;
  insert into public.event_photos(event_id,uploader_key,network_key,caption,display_name,removal_hash)
  values(p_event_id,p_uploader_key,p_network_key,p_caption,p_display_name,p_removal_hash) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.reserve_event_photo(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_event_photo(uuid,text,text,text,text,text) to service_role;

create or replace function public.report_event_photo(p_event_id uuid,p_photo_id uuid,p_uploader_key text,p_network_key text,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.events where id=p_event_id for update;
  if not exists(select 1 from public.event_photos where id=p_photo_id and event_id=p_event_id and status='approved') then raise exception 'photo_not_found'; end if;
  if exists(select 1 from public.event_photo_reports where photo_id=p_photo_id and uploader_key=p_uploader_key) then return; end if;
  if (select count(*) from public.event_photo_reports where event_id=p_event_id and uploader_key=p_uploader_key) >= 10
    or (select count(*) from public.event_photo_reports where event_id=p_event_id and network_key=p_network_key and created_at > now()-interval '1 hour') >= 50
    then raise exception 'photo_limit'; end if;
  insert into public.event_photo_reports(photo_id,event_id,uploader_key,network_key,reason)
  values(p_photo_id,p_event_id,p_uploader_key,p_network_key,p_reason);
end;
$$;
revoke all on function public.report_event_photo(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.report_event_photo(uuid,uuid,text,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
