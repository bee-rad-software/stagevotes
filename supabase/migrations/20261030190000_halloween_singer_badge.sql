begin;
alter table public.side_contests add column if not exists halloween_badge_enabled boolean not null default false;
alter table public.side_contest_entries add column if not exists singer_profile_id uuid references public.singer_profiles(id) on delete set null;
create unique index if not exists costume_profile_once on public.side_contest_entries(contest_id,singer_profile_id) where singer_profile_id is not null;
insert into public.achievement_definitions(slug,title,description,unlocked_description,icon,category,criteria_type,points,sort_order)
values('boo-and-belt-it','Boo & Belt It!','Complete a song and enter an approved costume in the same Halloween badge show.','You brought the costume AND the chorus.','🎃🎤','special','halloween_costume_and_song',25,950)
on conflict(slug) do nothing;

create or replace function public.award_halloween_badge(p_profile uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if p_profile is null then return; end if;
 perform 1 from singer_profiles where id=p_profile for update;
 insert into singer_achievements(singer_profile_id,achievement_id,triggering_performance_id,metadata)
 select p_profile,d.id,p.id,jsonb_build_object('event_id',p.event_id,'contest_id',c.id)
 from performances p join side_contests c on c.event_id=p.event_id
 join side_contest_entries en on en.contest_id=c.id and en.singer_profile_id=p_profile
 join achievement_definitions d on d.slug='boo-and-belt-it' and d.is_active
 where p.singer_profile_id=p_profile and p.status='completed' and c.halloween_badge_enabled and en.approval_status='approved'
 order by p.completed_at nulls last,p.id limit 1
 on conflict(singer_profile_id,achievement_id) do nothing;
end; $$;
revoke all on function public.award_halloween_badge(uuid) from public,anon,authenticated;

create or replace function public.halloween_badge_changed() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 perform award_halloween_badge(new.singer_profile_id);
 return new;
end; $$;
revoke all on function public.halloween_badge_changed() from public,anon,authenticated;
create trigger costume_badge_entry after insert or update of singer_profile_id,approval_status on public.side_contest_entries for each row execute function public.halloween_badge_changed();
create trigger costume_badge_song after insert or update of singer_profile_id,status on public.performances for each row execute function public.halloween_badge_changed();

create or replace function public.costume_badge_host(p_event_id uuid,p_enabled boolean default null) returns jsonb
language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype; profile record;
begin
 if not exists(select 1 from events e join account_users a on a.account_id=e.account_id where e.id=p_event_id and a.user_id=auth.uid()) then raise exception 'Only this show host can manage singer links.'; end if;
 select * into c from side_contests where event_id=p_event_id for update;
 if c.id is null then return null; end if;
 if p_enabled is not null then
  update side_contests set halloween_badge_enabled=p_enabled where id=c.id;
  c.halloween_badge_enabled:=p_enabled;
  if p_enabled then
   for profile in select distinct singer_profile_id from side_contest_entries where contest_id=c.id and singer_profile_id is not null loop
    perform award_halloween_badge(profile.singer_profile_id);
   end loop;
  end if;
 end if;
 return jsonb_build_object('enabled',c.halloween_badge_enabled,
 'entries',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'singer_profile_id',singer_profile_id) order by contestant_number) from side_contest_entries where contest_id=c.id),'[]'::jsonb),
 'singers',coalesce((select jsonb_agg(jsonb_build_object('id',singer_profile_id,'name',name)) from (select singer_profile_id,min(singer_name) as name from performances where event_id=p_event_id and singer_profile_id is not null group by singer_profile_id) s),'[]'::jsonb));
end; $$;
revoke all on function public.costume_badge_host(uuid,boolean) from public,anon;
grant execute on function public.costume_badge_host(uuid,boolean) to authenticated;

create or replace function public.link_costume_singer(p_entry_id uuid,p_profile_id uuid,p_entry_key uuid default null) returns void
language plpgsql security definer set search_path=public as $$
declare en side_contest_entries%rowtype; ev uuid; host boolean;
begin
 select * into en from side_contest_entries where id=p_entry_id for update;
 if en.id is null then raise exception 'Entry not found.'; end if;
 select event_id into ev from side_contests where id=en.contest_id;
 host:=exists(select 1 from events e join account_users a on a.account_id=e.account_id where e.id=ev and a.user_id=auth.uid());
 if not host then
  if auth.uid() is null or p_entry_key is null or p_entry_key is distinct from en.entry_key or p_profile_id is null or not exists(select 1 from singer_profiles where id=p_profile_id and user_id=auth.uid()) then raise exception 'You can only link your own profile to your entry.'; end if;
  if en.singer_profile_id is not null and en.singer_profile_id<>p_profile_id then raise exception 'Ask the host to change this singer link.'; end if;
 elsif p_profile_id is not null and not exists(select 1 from performances where event_id=ev and singer_profile_id=p_profile_id) then raise exception 'Choose a singer profile from this show.';
 end if;
 update side_contest_entries set singer_profile_id=p_profile_id where id=en.id;
end; $$;
revoke all on function public.link_costume_singer(uuid,uuid,uuid) from public,anon;
grant execute on function public.link_costume_singer(uuid,uuid,uuid) to authenticated;
commit;
