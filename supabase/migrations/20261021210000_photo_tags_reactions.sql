-- Run after 20261021180000_event_photo_gallery.sql.
begin;
create table if not exists public.event_photo_reactions (
 photo_id uuid not null references public.event_photos(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction text not null check(reaction in ('applause','fire','heart')),
 created_at timestamptz not null default now(),
 primary key(photo_id,user_id)
);
create table if not exists public.event_photo_tags (
 photo_id uuid not null references public.event_photos(id) on delete cascade,
 singer_profile_id uuid not null references public.singer_profiles(id) on delete cascade,
 proposed_by uuid references auth.users(id) on delete set null,
 status text not null check(status in ('pending','accepted','removed')),
 created_at timestamptz not null default now(),
 primary key(photo_id,singer_profile_id)
);
create index if not exists event_photo_tags_singer on public.event_photo_tags(singer_profile_id,status);
alter table public.event_photo_reactions enable row level security;
alter table public.event_photo_tags enable row level security;
revoke all on public.event_photo_reactions,public.event_photo_tags from anon,authenticated;
grant select,insert,update,delete on public.event_photo_reactions,public.event_photo_tags to service_role;
-- The server verifies the bearer token and supplies its user ID; callers cannot invoke directly.
create or replace function public.change_photo_social(p_event_id uuid,p_photo_id uuid,p_user_id uuid,p_action text,p_value text)
returns void language plpgsql security definer set search_path='' as $$
declare v_photo public.event_photos; v_singer uuid; v_target uuid; v_status text;
begin
 select * into v_photo from public.event_photos where id=p_photo_id and event_id=p_event_id for update;
 if not found or v_photo.status <> 'approved' then raise exception 'photo_not_found'; end if;
 select id into v_singer from public.singer_profiles where user_id=p_user_id limit 1;
 if p_action='react' then
  if p_value not in ('applause','fire','heart','none') then raise exception 'invalid_reaction'; end if;
  if p_value='none' then delete from public.event_photo_reactions where photo_id=p_photo_id and user_id=p_user_id;
  else insert into public.event_photo_reactions(photo_id,user_id,reaction) values(p_photo_id,p_user_id,p_value)
    on conflict(photo_id,user_id) do update set reaction=excluded.reaction; end if;
 elsif p_action='tag' then
  v_target:=p_value::uuid;
  -- Only participants may propose tags; targets must have participated in this event.
  if v_singer is null or not exists(select 1 from public.performances where event_id=p_event_id and singer_profile_id=v_singer) then raise exception 'participant_required'; end if;
  if not exists(select 1 from public.performances where event_id=p_event_id and singer_profile_id=v_target) then raise exception 'participant_required'; end if;
  select status into v_status from public.event_photo_tags where photo_id=p_photo_id and singer_profile_id=v_target;
  -- A removed tag cannot be proposed again by another singer.
  if v_status='removed' and v_target<>v_singer then raise exception 'tag_declined'; end if;
  if v_status is null and (select count(*) from public.event_photo_tags where photo_id=p_photo_id)>=10 then raise exception 'tag_limit'; end if;
  insert into public.event_photo_tags as existing_tag(photo_id,singer_profile_id,proposed_by,status)
   values(p_photo_id,v_target,p_user_id,case when v_target=v_singer then 'accepted' else 'pending' end)
   on conflict(photo_id,singer_profile_id) do update set status=case when v_target=v_singer then 'accepted' else existing_tag.status end;
 elsif p_action in ('accept','untag') then
  if v_singer is null then raise exception 'participant_required'; end if;
  update public.event_photo_tags set status=case when p_action='accept' then 'accepted' else 'removed' end
   where photo_id=p_photo_id and singer_profile_id=v_singer and (p_action='untag' or status='pending');
 else raise exception 'invalid_action'; end if;
end $$;
revoke all on function public.change_photo_social(uuid,uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.change_photo_social(uuid,uuid,uuid,text,text) to service_role;
notify pgrst,'reload schema';
commit;
