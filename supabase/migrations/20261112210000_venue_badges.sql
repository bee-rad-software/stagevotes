begin;
create table if not exists public.venue_badges (
 id uuid primary key default gen_random_uuid(),
 venue_id uuid not null references public.venues(id) on delete cascade,
 title text not null check(char_length(title) between 1 and 60),
 description text not null default '' check(char_length(description)<=280),
 icon text not null default '🏅' check(char_length(icon) between 1 and 24),
 color text not null default '#f97316' check(color ~ '^#[0-9a-fA-F]{6}$'),
 artwork_path text,
 rule text not null default 'manual' check(rule in ('manual','song','five_shows','contest_entry')),
 is_active boolean not null default true,
 created_at timestamptz not null default now()
);
create index if not exists venue_badges_venue_idx on public.venue_badges(venue_id);
create table if not exists public.venue_badge_awards (
 id uuid primary key default gen_random_uuid(),
 badge_id uuid not null references public.venue_badges(id),
 venue_id uuid not null references public.venues(id),
 singer_profile_id uuid not null references public.singer_profiles(id) on delete cascade,
 event_id uuid not null references public.events(id),
 performance_id uuid references public.performances(id) on delete set null,
 awarded_by uuid,
 title text not null, description text not null, icon text not null, color text not null,
 artwork_path text, venue_name text not null, singer_name text not null,
 earned_at timestamptz not null default now(),
 unique(badge_id,singer_profile_id)
);
create index if not exists venue_badge_awards_show_idx on public.venue_badge_awards(event_id,earned_at desc);
create index if not exists venue_badge_awards_profile_idx on public.venue_badge_awards(singer_profile_id,earned_at desc);
alter table public.venue_badges enable row level security;
alter table public.venue_badge_awards enable row level security;
revoke all on public.venue_badges,public.venue_badge_awards from anon,authenticated;
grant select on public.venue_badges,public.venue_badge_awards to authenticated;
grant all on public.venue_badges,public.venue_badge_awards to service_role;
drop policy if exists venue_badges_host_read on public.venue_badges;
create policy venue_badges_host_read on public.venue_badges for select to authenticated using(
 exists(select 1 from public.venues v join public.account_users a on a.account_id=v.account_id where v.id=venue_id and a.user_id=auth.uid())
);
drop policy if exists venue_badges_award_read on public.venue_badge_awards;
create policy venue_badges_award_read on public.venue_badge_awards for select to authenticated using(
 exists(select 1 from public.singer_profiles s where s.id=singer_profile_id and s.user_id=auth.uid()) or
 exists(select 1 from public.venues v join public.account_users a on a.account_id=v.account_id where v.id=venue_id and a.user_id=auth.uid())
);
-- All awards take snapshots, so later design changes or archiving preserve earned history.
create or replace function public.write_venue_badge_award(p_badge uuid,p_profile uuid,p_event uuid,p_performance uuid,p_actor uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare b public.venue_badges%rowtype; v public.venues%rowtype; e public.events%rowtype; label text; result uuid;
begin
 select * into b from public.venue_badges where id=p_badge and is_active;
 if b.id is null or p_profile is null then return null; end if;
 select * into v from public.venues where id=b.venue_id;
 select * into e from public.events where id=p_event and venue_id=v.id and account_id=v.account_id;
 if e.id is null then raise exception 'Choose a show at this venue.'; end if;
 select singer_name into label from public.performances where event_id=e.id and singer_profile_id=p_profile order by (status='completed') desc,created_at,id limit 1;
 if label is null then
  select en.name into label from public.side_contest_entries en join public.side_contests c on c.id=en.contest_id where c.event_id=e.id and en.singer_profile_id=p_profile and en.approval_status='approved' limit 1;
 end if;
 if label is null then raise exception 'Choose a singer profile linked to this show.'; end if;
 if p_performance is not null and not exists(select 1 from public.performances where id=p_performance and event_id=e.id and singer_profile_id=p_profile) then raise exception 'Performance does not belong to this singer and show.'; end if;
 insert into public.venue_badge_awards(badge_id,venue_id,singer_profile_id,event_id,performance_id,awarded_by,title,description,icon,color,artwork_path,venue_name,singer_name)
 values(b.id,v.id,p_profile,e.id,p_performance,p_actor,b.title,b.description,b.icon,b.color,b.artwork_path,v.name,label)
 on conflict(badge_id,singer_profile_id) do nothing returning id into result;
 return result;
end; $$;
revoke all on function public.write_venue_badge_award(uuid,uuid,uuid,uuid,uuid) from public,anon,authenticated;

create or replace function public.award_venue_badge_manual(p_badge uuid,p_profile uuid,p_event uuid,p_actor uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare b public.venue_badges%rowtype; perf uuid;
begin
 select * into b from public.venue_badges where id=p_badge and is_active and rule='manual';
 if b.id is null then raise exception 'Choose an active manual badge.'; end if;
 if not exists(select 1 from public.venues v join public.account_users a on a.account_id=v.account_id where v.id=b.venue_id and a.user_id=p_actor and a.role in ('owner','admin','host')) then raise exception 'You cannot award this venue badge.'; end if;
 select id into perf from public.performances where event_id=p_event and singer_profile_id=p_profile order by (status='completed') desc,created_at,id limit 1;
 return public.write_venue_badge_award(p_badge,p_profile,p_event,perf,p_actor);
end; $$;
revoke all on function public.award_venue_badge_manual(uuid,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.award_venue_badge_manual(uuid,uuid,uuid,uuid) to service_role;

create or replace function public.evaluate_venue_badges(p_profile uuid,p_event uuid,p_performance uuid default null)
returns void language plpgsql security definer set search_path=public as $$
declare b record; venue uuid; account uuid; shows integer; has_song boolean; has_entry boolean;
begin
 if p_profile is null then return; end if;
 select venue_id,account_id into venue,account from public.events where id=p_event;
 if venue is null then return; end if;
 perform 1 from public.singer_profiles where id=p_profile for update;
 select count(distinct p.event_id) into shows from public.performances p join public.events e on e.id=p.event_id where p.singer_profile_id=p_profile and p.status='completed' and e.venue_id=venue and e.account_id=account;
 select exists(select 1 from public.performances where event_id=p_event and singer_profile_id=p_profile and status='completed') into has_song;
 select exists(select 1 from public.side_contest_entries en join public.side_contests c on c.id=en.contest_id where c.event_id=p_event and en.singer_profile_id=p_profile and en.approval_status='approved') into has_entry;
 for b in select * from public.venue_badges where venue_id=venue and is_active and rule<>'manual' loop
  if (b.rule='song' and has_song) or (b.rule='five_shows' and shows>=5 and has_song) or (b.rule='contest_entry' and has_entry) then
   perform public.write_venue_badge_award(b.id,p_profile,p_event,p_performance,null);
  end if;
 end loop;
end; $$;
revoke all on function public.evaluate_venue_badges(uuid,uuid,uuid) from public,anon,authenticated;
create or replace function public.venue_badge_song_changed() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status='completed' and new.singer_profile_id is not null then perform public.evaluate_venue_badges(new.singer_profile_id,new.event_id,new.id); end if;
 return new;
end; $$;
create or replace function public.venue_badge_contest_changed() returns trigger language plpgsql security definer set search_path=public as $$
declare ev uuid;
begin
 if new.approval_status='approved' and new.singer_profile_id is not null then
  select event_id into ev from public.side_contests where id=new.contest_id;
  perform public.evaluate_venue_badges(new.singer_profile_id,ev,null);
 end if;
 return new;
end; $$;
revoke all on function public.venue_badge_song_changed() from public,anon,authenticated;
revoke all on function public.venue_badge_contest_changed() from public,anon,authenticated;
drop trigger if exists venue_badge_song on public.performances;
create trigger venue_badge_song after insert or update of status,singer_profile_id on public.performances for each row execute function public.venue_badge_song_changed();
drop trigger if exists venue_badge_contest on public.side_contest_entries;
create trigger venue_badge_contest after insert or update of approval_status,singer_profile_id on public.side_contest_entries for each row execute function public.venue_badge_contest_changed();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('venue-badges','venue-badges',true,2097152,array['image/webp']) on conflict(id) do nothing;
-- Artwork is intentionally public; only authenticated host API routes can write it.
drop policy if exists venue_badge_art_api_only on storage.objects;
create policy venue_badge_art_api_only on storage.objects as restrictive for all to anon,authenticated
using(bucket_id<>'venue-badges') with check(bucket_id<>'venue-badges');
commit;
