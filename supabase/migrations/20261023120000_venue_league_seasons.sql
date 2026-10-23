-- Venue and regional league seasons. Legacy league_seasons / league_points are untouched.
begin;
create table if not exists public.sv_league_seasons(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references public.accounts(id),name text not null check(length(trim(name)) between 3 and 100),
 starts_on date not null,ends_on date not null,timezone text not null default 'America/Chicago',status text not null default 'draft' check(status in('draft','upcoming','active','completed','archived')),
 best_n integer not null default 6 check(best_n between 1 and 50),weekly_limit integer not null default 1 check(weekly_limit between 1 and 7),min_appearances integer not null default 4 check(min_appearances between 1 and 50),
 qualifying_count integer not null default 10 check(qualifying_count between 1 and 100),placement_points integer[] not null default array[100,90,80,70,60,50,40,30,20,10],participation_points integer not null default 0 check(participation_points between 0 and 100),
 final_event_id uuid references public.tournament_events(id),staff_invite uuid not null default gen_random_uuid(),created_at timestamptz not null default now(),check(ends_on>=starts_on)
);
create table if not exists public.sv_league_venues(season_id uuid not null references public.sv_league_seasons on delete cascade,venue_id uuid not null references public.venues,primary key(season_id,venue_id));
create table if not exists public.sv_league_members(
 id uuid primary key default gen_random_uuid(),season_id uuid not null references public.sv_league_seasons on delete cascade,singer_profile_id uuid references public.singer_profiles,
 display_name text not null check(length(trim(display_name)) between 2 and 80),claim_token uuid unique,qualified boolean not null default false,created_at timestamptz not null default now(),
 check(singer_profile_id is not null or claim_token is not null),unique(season_id,singer_profile_id)
);
create table if not exists public.sv_league_nights(
 id uuid primary key default gen_random_uuid(),season_id uuid not null references public.sv_league_seasons on delete cascade,venue_id uuid not null references public.venues,
 event_id uuid references public.events,name text not null check(length(trim(name)) between 2 and 100),played_on date not null,status text not null default 'scheduled' check(status in('scheduled','published','cancelled')),
 expected_judges integer not null default 3 check(expected_judges between 1 and 20),olympic boolean not null default false,historical_import boolean not null default false,
 revision integer not null default 0,published_at timestamptz,unique(season_id,event_id),check(not olympic or expected_judges>=5)
);
create table if not exists public.sv_league_nominations(night_id uuid not null references public.sv_league_nights on delete cascade,member_id uuid not null references public.sv_league_members,performance_id uuid not null references public.performances,
 primary key(night_id,member_id),unique(night_id,performance_id));
create table if not exists public.sv_league_results(night_id uuid not null references public.sv_league_nights on delete cascade,member_id uuid not null references public.sv_league_members,
 placement integer not null,judge_score numeric not null,points integer not null check(points>=0),primary key(night_id,member_id));
create table if not exists public.sv_league_audit(id uuid primary key default gen_random_uuid(),season_id uuid not null references public.sv_league_seasons,night_id uuid references public.sv_league_nights,
 actor_id uuid,action text not null,reason text not null default '',before_data jsonb,after_data jsonb,prior_standings jsonb,created_at timestamptz not null default now());
do $$ declare t text; begin foreach t in array array['sv_league_seasons','sv_league_venues','sv_league_members','sv_league_nights','sv_league_nominations','sv_league_results','sv_league_audit'] loop
 execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end $$;

create or replace function public.sv_league_director(p_season uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from sv_league_seasons s join account_users a on a.account_id=s.account_id where s.id=p_season and a.user_id=auth.uid());$$;
create or replace function public.sv_league_host(p_season uuid,p_venue uuid) returns boolean language sql stable security definer set search_path=public as $$
 select sv_league_director(p_season) or exists(select 1 from sv_league_venues lv join venues v on v.id=lv.venue_id join account_users a on a.account_id=v.account_id where lv.season_id=p_season and v.id=p_venue and a.user_id=auth.uid());$$;
create or replace function public.sv_league_rules(p jsonb) returns void language plpgsql set search_path=public as $$
declare a integer[]; n integer; last_point integer:=10001;begin
 if coalesce(p->>'name','')='' then raise exception 'Give the season a name';end if;
 if not exists(select 1 from pg_timezone_names where name=coalesce(p->>'timezone','America/Chicago')) then raise exception 'Choose a valid timezone';end if;
 select array_agg(value::integer order by ordinality) into a from jsonb_array_elements_text(p->'placement_points') with ordinality;
 if coalesce(cardinality(a),0) not between 1 and 50 then raise exception 'Add 1 to 50 placement awards';end if;
 foreach n in array a loop if n is null or n<0 or n>10000 or n>last_point then raise exception 'Placement points must decrease or stay equal, from 0 to 10000';end if;last_point:=n;end loop;
end $$;

-- Rank using points only. Each week's best nights count first, then the season's best N.
-- Ties share a place; all tied eligible singers at the finals cutoff qualify.
create or replace function public.sv_league_standings(p_season uuid) returns jsonb language sql stable security definer set search_path=public as $$
 with weekly as(
 select r.*,n.played_on,n.name night_name,v.name venue_name,n.event_id,
 row_number() over(partition by r.member_id,date_trunc('week',n.played_on::timestamp) order by r.points desc,n.played_on,n.id) week_order
 from sv_league_results r join sv_league_nights n on n.id=r.night_id join venues v on v.id=n.venue_id where n.season_id=p_season and n.status='published'
 ), eligible as(
 select w.*,row_number() over(partition by member_id order by points desc,played_on,night_id) season_order from weekly w where week_order<=(select weekly_limit from sv_league_seasons where id=p_season)
 ), totals as(
 select m.id,m.display_name,m.singer_profile_id,m.qualified,sp.photo_url,
 count(e.night_id)::integer appearances,coalesce(sum(e.points) filter(where e.season_order<=s.best_n),0)::integer points,
 count(*) filter(where e.season_order<=s.best_n and e.placement=1)::integer wins,
 coalesce(max(e.points) filter(where e.season_order<=s.best_n),0)::integer best_night,
 count(*) filter(where e.season_order<=s.best_n)::integer counting_nights,
 count(e.night_id)>=s.min_appearances eligible
 from sv_league_members m join sv_league_seasons s on s.id=m.season_id left join singer_profiles sp on sp.id=m.singer_profile_id left join eligible e on e.member_id=m.id
 where m.season_id=p_season group by m.id,sp.photo_url,s.best_n,s.min_appearances
 ), ranked as(
 select t.*,case when appearances>0 then rank() over(order by points desc,wins desc,best_night desc) end rank,
 case when eligible then rank() over(partition by eligible order by points desc,wins desc,best_night desc) end qualification_rank from totals t
 ), movement as(select prior_standings from sv_league_audit where season_id=p_season and action in('publish','correct') order by created_at desc,id desc limit 1)
 select coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object(
 'previous_rank',(select (x->>'rank')::integer from movement,jsonb_array_elements(prior_standings) x where x->>'id'=r.id::text limit 1),
 'in_qualification_zone',r.eligible and r.qualification_rank<=(select qualifying_count from sv_league_seasons where id=p_season),
 'nights',coalesce((select jsonb_agg(jsonb_build_object('night_id',w.night_id,'name',w.night_name,'date',w.played_on,'venue',w.venue_name,'placement',w.placement,'points',w.points,'judge_score',w.judge_score,
 'counted',coalesce(e.season_order<=(select best_n from sv_league_seasons where id=p_season),false),'reason',case when e.night_id is null then 'Weekly limit' when e.season_order>(select best_n from sv_league_seasons where id=p_season) then 'Outside best results' else 'Counts toward season' end) order by w.played_on desc,w.night_id)
 from weekly w left join eligible e on e.night_id=w.night_id and e.member_id=w.member_id where w.member_id=r.id),'[]'::jsonb)
 ) order by r.rank nulls last,r.display_name,r.id),'[]'::jsonb) from ranked r;
$$;

create or replace function public.sv_league_snapshot(p_season uuid,p_claim_token uuid default null) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare s sv_league_seasons%rowtype; me uuid;begin
 select * into s from sv_league_seasons where id=p_season;
 if s.id is null or (s.status='draft' and not sv_league_director(p_season) and not exists(select 1 from sv_league_venues v where v.season_id=p_season and sv_league_host(p_season,v.venue_id))) then raise exception 'League season not found';end if;
 select m.id into me from sv_league_members m left join singer_profiles sp on sp.id=m.singer_profile_id where m.season_id=p_season and ((auth.uid() is not null and sp.user_id=auth.uid()) or (m.singer_profile_id is null and p_claim_token is not null and m.claim_token=p_claim_token)) limit 1;
 return jsonb_build_object('season',to_jsonb(s)-'staff_invite','my_member_id',me,'can_direct',sv_league_director(p_season),
 'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name)) from sv_league_venues lv join venues v on v.id=lv.venue_id where lv.season_id=p_season),'[]'::jsonb),
 'nights',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object('venue_name',v.name) order by n.played_on,n.id) from sv_league_nights n join venues v on v.id=n.venue_id where n.season_id=p_season),'[]'::jsonb),
 'standings',sv_league_standings(p_season));
end $$;
create or replace function public.sv_league_list() returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'starts_on',s.starts_on,'ends_on',s.ends_on,'status',s.status,'best_n',s.best_n,'qualifying_count',s.qualifying_count,
 'members',(select count(*) from sv_league_members where season_id=s.id),
 'joined',exists(select 1 from sv_league_members m join singer_profiles p on p.id=m.singer_profile_id where m.season_id=s.id and p.user_id=auth.uid()),
 'venues',coalesce((select string_agg(v.name,', ' order by v.name) from sv_league_venues lv join venues v on v.id=lv.venue_id where lv.season_id=s.id),'')) order by s.starts_on desc),'[]'::jsonb)
 from sv_league_seasons s where s.status in('upcoming','active','completed');$$;

create or replace function public.sv_league_join(p_season uuid,p_name text default null,p_claim_token uuid default null) returns uuid language plpgsql security definer set search_path=public as $$
declare s sv_league_seasons%rowtype; profile singer_profiles%rowtype; mid uuid;begin
 select * into s from sv_league_seasons where id=p_season for update;
 if s.status not in('upcoming','active','completed') or s.id is null then raise exception 'This season is not accepting entries';end if;
 select * into profile from singer_profiles where user_id=auth.uid() limit 1;
 if profile.id is not null then
  select id into mid from sv_league_members where season_id=p_season and singer_profile_id=profile.id;if mid is not null then
   if p_claim_token is not null and exists(select 1 from sv_league_members where season_id=p_season and singer_profile_id is null and claim_token=p_claim_token) then raise exception 'Your profile already has a league entry. Ask the director to review your separate guest results before claiming.';end if;
   return mid;end if;
  if p_claim_token is not null then
   update sv_league_members set singer_profile_id=profile.id,claim_token=null,display_name=coalesce(nullif(trim(profile.stage_name),''),profile.display_name) where season_id=p_season and singer_profile_id is null and claim_token=p_claim_token returning id into mid;
   if mid is not null then return mid;end if;
  end if;
  if s.status='completed' then raise exception 'This season has finished; only an existing guest entry can be claimed';end if;
  insert into sv_league_members(season_id,singer_profile_id,display_name) values(p_season,profile.id,coalesce(nullif(trim(profile.stage_name),''),profile.display_name)) returning id into mid;
 else
  if p_claim_token is null then raise exception 'Sign in or choose a guest entry';end if;
  select id into mid from sv_league_members where season_id=p_season and singer_profile_id is null and claim_token=p_claim_token;if mid is not null then return mid;end if;
  if s.status='completed' then raise exception 'This season has finished';end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 80 then raise exception 'Enter your singer name (2–80 characters)';end if;
  if (select count(*) from sv_league_members where season_id=p_season)>10000 then raise exception 'Season entry limit reached';end if;
  insert into sv_league_members(season_id,display_name,claim_token) values(p_season,trim(p_name),p_claim_token) returning id into mid;
 end if;return mid;
end $$;

create or replace function public.sv_league_admin_home() returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in to manage leagues';end if;
 return jsonb_build_object(
 'accounts',coalesce((select jsonb_agg(jsonb_build_object('id',a.account_id,'name',coalesce((select string_agg(v.name,', ') from venues v where v.account_id=a.account_id),'StageVotes host account'))) from (select distinct account_id from account_users where user_id=auth.uid()) a),'[]'::jsonb),
 'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'account_id',v.account_id)) from venues v where exists(select 1 from account_users a where a.account_id=v.account_id and a.user_id=auth.uid())),'[]'::jsonb),
 'seasons',coalesce((select jsonb_agg((to_jsonb(s)-'staff_invite')||jsonb_build_object('can_direct',sv_league_director(s.id)) order by s.created_at desc) from sv_league_seasons s where sv_league_director(s.id) or exists(select 1 from sv_league_venues lv where lv.season_id=s.id and sv_league_host(s.id,lv.venue_id))),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e)) from(select id,name,venue_id,is_show_ended,created_at from events e where e.is_archived is not true and exists(select 1 from account_users a where a.account_id=e.account_id and a.user_id=auth.uid()) order by created_at desc limit 100) e),'[]'::jsonb),
 'finals',coalesce((select jsonb_agg(jsonb_build_object('id',te.id,'name',te.name)) from tournament_events te join tournaments t on t.id=te.tournament_id where te.event_id is null and exists(select 1 from account_users a where a.account_id=t.created_by_account_id and a.user_id=auth.uid())),'[]'::jsonb));
end $$;
create or replace function public.sv_league_admin_snapshot(p_season uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
begin
 if not sv_league_director(p_season) and not exists(select 1 from sv_league_venues lv where lv.season_id=p_season and sv_league_host(p_season,lv.venue_id)) then raise exception 'League staff access required';end if;
 return sv_league_snapshot(p_season)||jsonb_build_object(
 'invite',case when sv_league_director(p_season) then(select staff_invite from sv_league_seasons where id=p_season) else null end,
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',display_name,'guest',singer_profile_id is null) order by display_name) from sv_league_members where season_id=p_season),'[]'::jsonb),
 'nominations',coalesce((select jsonb_agg(to_jsonb(x)) from sv_league_nominations x join sv_league_nights n on n.id=x.night_id where n.season_id=p_season),'[]'::jsonb),
 'performances',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'night_id',n.id,'singer_name',p.singer_name,'song',p.song_title,'status',p.status,'has_scores',exists(select 1 from votes v where v.performance_id=p.id))) from sv_league_nights n join performances p on p.event_id=n.event_id where n.season_id=p_season and sv_league_host(p_season,n.venue_id)),'[]'::jsonb),
 'has_results',exists(select 1 from sv_league_nights where season_id=p_season and status='published'),
 'audit',coalesce((select jsonb_agg(x) from(select action,reason,created_at,night_id,coalesce((select coalesce(nullif(trim(sp.stage_name),''),sp.display_name) from singer_profiles sp where sp.user_id=a.actor_id limit 1),'League staff') actor_name,before_data,after_data from sv_league_audit a where season_id=p_season order by created_at desc limit 40)x),'[]'::jsonb));
end $$;

create or replace function public.sv_league_create(p_data jsonb) returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid; aid uuid:=(p_data->>'account_id')::uuid; vid text;begin
 if not exists(select 1 from account_users where account_id=aid and user_id=auth.uid()) then raise exception 'Host account access required';end if;
 perform sv_league_rules(p_data);
 if coalesce(p_data->>'status','draft') not in('draft','upcoming','active') then raise exception 'Choose draft, upcoming, or active';end if;
 insert into sv_league_seasons(account_id,name,starts_on,ends_on,timezone,status,best_n,weekly_limit,min_appearances,qualifying_count,placement_points,participation_points)
 values(aid,trim(p_data->>'name'),(p_data->>'starts_on')::date,(p_data->>'ends_on')::date,coalesce(p_data->>'timezone','America/Chicago'),coalesce(p_data->>'status','draft'),
 coalesce((p_data->>'best_n')::integer,6),coalesce((p_data->>'weekly_limit')::integer,1),coalesce((p_data->>'min_appearances')::integer,4),coalesce((p_data->>'qualifying_count')::integer,10),array(select value::integer from jsonb_array_elements_text(p_data->'placement_points')),coalesce((p_data->>'participation_points')::integer,0)) returning id into sid;
 for vid in select value from jsonb_array_elements_text(p_data->'venue_ids') loop
  if not exists(select 1 from venues where id=vid::uuid and account_id=aid) then raise exception 'Choose venues owned by this host account';end if;
  insert into sv_league_venues values(sid,vid::uuid) on conflict do nothing;
 end loop;
 insert into sv_league_audit(season_id,actor_id,action,reason) values(sid,auth.uid(),'create','Season created');return sid;
end $$;
create or replace function public.sv_league_connect_venue(p_invite uuid,p_venue uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare sid uuid;begin
 select id into sid from sv_league_seasons where staff_invite=p_invite and status in('draft','upcoming','active');if sid is null then raise exception 'Venue invitation is not valid';end if;
 if not exists(select 1 from venues v join account_users a on a.account_id=v.account_id where v.id=p_venue and a.user_id=auth.uid()) then raise exception 'This venue belongs to another host account';end if;
 insert into sv_league_venues values(sid,p_venue) on conflict do nothing;
 insert into sv_league_audit(season_id,actor_id,action,reason) values(sid,auth.uid(),'venue_join','Venue joined using a director invitation');return sid;
end $$;

create or replace function public.sv_league_manage(p_season uuid,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path=public as $$
declare s sv_league_seasons%rowtype;n sv_league_nights%rowtype;vid uuid;eid uuid;mid uuid;pid uuid;tid uuid;entryid uuid;member sv_league_members%rowtype;
 director boolean;reason text:=trim(coalesce(p_data->>'reason',''));before_rows jsonb;old_standings jsonb;bad text;old_night uuid;cnt integer;ondate date;
begin
 select * into s from sv_league_seasons where id=p_season for update;if s.id is null then raise exception 'Season not found';end if;
 director:=sv_league_director(p_season);
 if auth.uid() is null then raise exception 'Sign in to manage a league';end if;
 if s.status in('completed','archived') then raise exception 'This season is finished; its standings are locked';end if;
 if p_action='rotate_invite' then
  if not director then raise exception 'Director access required';end if;
  update sv_league_seasons set staff_invite=gen_random_uuid() where id=p_season;
 elsif p_action='settings' then
  if not director then raise exception 'Only the director can change season rules';end if;
  if exists(select 1 from sv_league_nights where season_id=p_season and status='published') then raise exception 'Rules are locked after the first published league night';end if;
  perform sv_league_rules(p_data);
  if coalesce(p_data->>'status','draft') not in('draft','upcoming','active') then raise exception 'Use End season to finalize qualifications';end if;
  update sv_league_seasons set name=trim(p_data->>'name'),starts_on=(p_data->>'starts_on')::date,ends_on=(p_data->>'ends_on')::date,timezone=p_data->>'timezone',status=p_data->>'status',
  best_n=(p_data->>'best_n')::integer,weekly_limit=(p_data->>'weekly_limit')::integer,min_appearances=(p_data->>'min_appearances')::integer,qualifying_count=(p_data->>'qualifying_count')::integer,
  placement_points=array(select value::integer from jsonb_array_elements_text(p_data->'placement_points')),participation_points=(p_data->>'participation_points')::integer where id=p_season;
  if exists(select 1 from sv_league_nights n join sv_league_seasons ns on ns.id=n.season_id where n.season_id=p_season and (n.played_on<ns.starts_on or n.played_on>ns.ends_on)) then raise exception 'Scheduled nights must remain inside the season dates';end if;
 elsif p_action='add_venue' then
  if not director then raise exception 'Director access required';end if;
  vid:=(p_data->>'venue_id')::uuid;
  if not exists(select 1 from venues where id=vid and account_id=s.account_id) then raise exception 'Use a staff invitation to connect a venue from another host account';end if;
  insert into sv_league_venues values(p_season,vid) on conflict do nothing;
 elsif p_action='night' then
  vid:=(p_data->>'venue_id')::uuid;eid:=nullif(p_data->>'event_id','')::uuid;ondate:=(p_data->>'played_on')::date;
  if not sv_league_host(p_season,vid) or not exists(select 1 from sv_league_venues where season_id=p_season and venue_id=vid) then raise exception 'Choose a participating venue you manage';end if;
  if ondate not between s.starts_on and s.ends_on then raise exception 'League night must fall inside the season';end if;
  if eid is not null then
   if not exists(select 1 from events where id=eid and venue_id=vid and judging_enabled=true) then raise exception 'Choose a judged show at this venue';end if;
   if exists(select 1 from votes where event_id=eid) and not(director and coalesce((p_data->>'historical_import')::boolean,false) and length(reason)>=8) then raise exception 'Choose league performances before judging. A director can import a historical show with a reason.';end if;
  end if;
  insert into sv_league_nights(season_id,venue_id,event_id,name,played_on,expected_judges,olympic,historical_import)
  values(p_season,vid,eid,trim(p_data->>'name'),ondate,coalesce((p_data->>'expected_judges')::integer,3),coalesce((p_data->>'olympic')::boolean,false),director and coalesce((p_data->>'historical_import')::boolean,false)) returning id into old_night;
 elsif p_action in('bind','nominate','cancel','publish') then
  select * into n from sv_league_nights where id=(p_data->>'night_id')::uuid and season_id=p_season for update;
  if n.id is null or not sv_league_host(p_season,n.venue_id) then raise exception 'You cannot manage this league night';end if;
  old_night:=n.id;
  if n.status='cancelled' then raise exception 'This league night was cancelled';end if;
  if p_action='bind' then
   if n.event_id is not null or n.status<>'scheduled' then raise exception 'A linked show cannot be replaced';end if;
   eid:=(p_data->>'event_id')::uuid;
   if not exists(select 1 from events where id=eid and venue_id=n.venue_id and judging_enabled=true) then raise exception 'Choose a judged show at this venue';end if;
   if exists(select 1 from votes where event_id=eid) then raise exception 'Connect the league show before judging begins. Use a historical import instead.';end if;
   update sv_league_nights set event_id=eid where id=n.id;
  elsif p_action='cancel' then
   if not director or n.status='published' then raise exception 'Only the director can cancel an unpublished night';end if;
   if length(reason)<8 then raise exception 'Give a reason for cancelling';end if;
   update sv_league_nights set status='cancelled' where id=n.id;
  elsif p_action='nominate' then
   mid:=(p_data->>'member_id')::uuid;pid:=(p_data->>'performance_id')::uuid;
   select * into member from sv_league_members where id=mid and season_id=p_season;
   if member.id is null then raise exception 'Choose a member of this season';end if;
   if not exists(select 1 from performances p where p.id=pid and p.event_id=n.event_id and p.status is distinct from 'skipped' and
    ((p.singer_profile_id is not null and member.singer_profile_id=p.singer_profile_id) or (p.singer_profile_id is null and lower(trim(p.singer_name))=lower(trim(member.display_name))))) then raise exception 'Choose this member’s performance from the linked show';end if;
   if n.status='published' and not(director and length(reason)>=8) then raise exception 'Only the director can correct a published night, with a reason';end if;
   if (exists(select 1 from votes where performance_id=pid) or exists(select 1 from sv_league_nominations x join votes v on v.performance_id=x.performance_id where x.night_id=n.id and x.member_id=mid))
    and not(director and (n.historical_import or n.status='published') and length(reason)>=8) then raise exception 'The counting performance is locked once judging starts';end if;
   select coalesce(jsonb_agg(to_jsonb(x)),'[]') into before_rows from sv_league_nominations x where night_id=n.id and member_id=mid;
   insert into sv_league_nominations values(n.id,mid,pid) on conflict(night_id,member_id) do update set performance_id=excluded.performance_id;
  elsif p_action='publish' then
   if s.status not in('active','upcoming') then raise exception 'Open the season before publishing';end if;
   if n.status='published' and (not director or length(reason)<8) then raise exception 'Only the director can republish corrected results, with a reason';end if;
   if n.event_id is null or not exists(select 1 from events where id=n.event_id and is_show_ended=true) then raise exception 'Finish the linked show before publishing league points';end if;
   if not exists(select 1 from sv_league_nominations where night_id=n.id) then raise exception 'Designate counting performances before publishing';end if;
   if exists(select 1 from sv_league_nominations x join performances p on p.id=x.performance_id where x.night_id=n.id and (p.event_id<>n.event_id or p.status<>'completed' or nullif(trim(p.song_title),'') is null)) then raise exception 'Every nominated performance must be completed with a song';end if;
   select string_agg(m.display_name,', ') into bad from sv_league_nominations x join sv_league_members m on m.id=x.member_id
   cross join lateral complete_judge_performance_score(x.performance_id) score where x.night_id=n.id and (score.ballot_count<n.expected_judges or score.average_score is null);
   if bad is not null then raise exception 'Missing required complete judge ballots for: %',bad;end if;
   if n.olympic and exists(select 1 from sv_league_nominations x cross join lateral olympic_performance_score(x.performance_id,n.expected_judges) score where x.night_id=n.id and score.average_score is null) then raise exception 'Olympic scoring is not complete';end if;
   old_standings:=sv_league_standings(p_season);
   select coalesce(jsonb_agg(to_jsonb(r)),'[]') into before_rows from sv_league_results r where night_id=n.id;
   delete from sv_league_results where night_id=n.id;
   with scores as(
    select x.member_id,case when n.olympic then (select average_score from olympic_performance_score(x.performance_id,n.expected_judges)) else (select average_score from complete_judge_performance_score(x.performance_id)) end score
    from sv_league_nominations x where x.night_id=n.id
   ),ranked as(select *,rank() over(order by score desc)::integer place from scores)
   insert into sv_league_results select n.id,member_id,place,score,coalesce(s.placement_points[place],s.placement_points[cardinality(s.placement_points)])+s.participation_points from ranked;
   update sv_league_nights set status='published',revision=revision+1,published_at=now() where id=n.id;
   update sv_league_seasons set status='active' where id=p_season and status='upcoming';
  end if;
 elsif p_action='finish' then
  if not director then raise exception 'Only the director can end the season';end if;
  if length(reason)<8 then raise exception 'Confirm why the season is being finalized';end if;
  if exists(select 1 from sv_league_nights where season_id=p_season and status='scheduled') then raise exception 'Publish or cancel every scheduled night before ending the season';end if;
  old_standings:=sv_league_standings(p_season);
  if not exists(select 1 from jsonb_array_elements(old_standings) x where (x->>'in_qualification_zone')::boolean) then raise exception 'No singers meet the published finals qualification rules yet';end if;
  tid:=nullif(p_data->>'final_event_id','')::uuid;
  if tid is not null and not exists(select 1 from tournament_events te join tournaments t on t.id=te.tournament_id join account_users a on a.account_id=t.created_by_account_id where te.id=tid and te.event_id is null and a.user_id=auth.uid()) then raise exception 'Choose an unlaunched final you manage';end if;
  update sv_league_members set qualified=true where season_id=p_season and id in(select (x->>'id')::uuid from jsonb_array_elements(old_standings) x where (x->>'in_qualification_zone')::boolean);
  if tid is not null then
   for member in select * from sv_league_members where season_id=p_season and qualified loop
    select tournament_id into eid from tournament_events where id=tid for update;
    if member.singer_profile_id is not null then
     insert into tournament_entries(tournament_id,singer_profile_id,status) values(eid,member.singer_profile_id,'active') on conflict(tournament_id,singer_profile_id) do nothing;
     select id into entryid from tournament_entries where tournament_id=eid and singer_profile_id=member.singer_profile_id;
    else
     insert into tournament_entries(tournament_id,guest_key,guest_name,status) values(eid,'league:'||member.id,member.display_name,'active') on conflict(tournament_id,guest_key) do update set guest_name=excluded.guest_name returning id into entryid;
    end if;
    insert into tournament_event_entries(tournament_event_id,tournament_entry_id,status,seed)
    values(tid,entryid,'eligible',(select (x->>'qualification_rank')::integer from jsonb_array_elements(old_standings) x where x->>'id'=member.id::text)) on conflict(tournament_event_id,tournament_entry_id) do nothing;
   end loop;
  end if;
  update sv_league_seasons set status='completed',final_event_id=tid where id=p_season;
 else raise exception 'Unknown league action';end if;
 insert into sv_league_audit(season_id,night_id,actor_id,action,reason,before_data,after_data,prior_standings)
 values(p_season,old_night,auth.uid(),case when p_action='publish' then case when n.revision>0 then 'correct' else 'publish' end else p_action end,reason,before_rows,p_data,old_standings);
 return sv_league_admin_snapshot(p_season);
end $$;
create or replace function public.sv_league_event_links(p_event uuid) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('season_id',s.id,'name',s.name,'night_name',n.name,'status',n.status) order by s.name),'[]'::jsonb)
 from sv_league_nights n join sv_league_seasons s on s.id=n.season_id
 where n.event_id=p_event and n.status<>'cancelled' and (sv_league_host(s.id,n.venue_id) or exists(select 1 from events e join account_users a on a.account_id=e.account_id where e.id=p_event and a.user_id=auth.uid()));$$;
revoke all on function public.sv_league_event_links(uuid) from public,anon;
grant execute on function public.sv_league_event_links(uuid) to authenticated;

-- Function-only access. Internal helpers are never callable directly by guests.
revoke all on function public.sv_league_director(uuid),public.sv_league_host(uuid,uuid),public.sv_league_rules(jsonb),public.sv_league_standings(uuid) from public,anon,authenticated;
revoke all on function public.sv_league_create(jsonb),public.sv_league_admin_home(),public.sv_league_admin_snapshot(uuid),public.sv_league_manage(uuid,text,jsonb),public.sv_league_connect_venue(uuid,uuid) from public,anon;
grant execute on function public.sv_league_create(jsonb),public.sv_league_admin_home(),public.sv_league_admin_snapshot(uuid),public.sv_league_manage(uuid,text,jsonb),public.sv_league_connect_venue(uuid,uuid) to authenticated;
revoke all on function public.sv_league_snapshot(uuid,uuid),public.sv_league_list(),public.sv_league_join(uuid,text,uuid) from public;
grant execute on function public.sv_league_snapshot(uuid,uuid),public.sv_league_list(),public.sv_league_join(uuid,text,uuid) to anon,authenticated;
notify pgrst,'reload schema';
commit;
