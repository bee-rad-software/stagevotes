begin;

create table if not exists public.side_contests (
 id uuid primary key default gen_random_uuid(),
 event_id uuid not null unique references public.events(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 mode text not null check(mode in ('overall','categories')),
 status text not null default 'draft' check(status in ('draft','open','closed')),
 results_visible boolean not null default false,
 created_at timestamptz not null default now(),
 check(not results_visible or status='closed')
);
create table if not exists public.side_contest_categories (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.side_contests(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 position integer not null,
 unique(contest_id,name)
);
create table if not exists public.side_contest_entries (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.side_contests(id) on delete cascade,
 contestant_number integer not null check(contestant_number>0),
 name text not null check(length(trim(name)) between 1 and 100),
 costume text not null default '' check(length(costume)<=200),
 photo_url text,
 unique(contest_id,contestant_number)
);
create table if not exists public.side_contest_votes (
 contest_id uuid not null references public.side_contests(id) on delete cascade,
 category_id uuid not null references public.side_contest_categories(id) on delete cascade,
 entry_id uuid not null references public.side_contest_entries(id) on delete cascade,
 voter_key uuid not null,
 created_at timestamptz not null default now(),
 primary key(category_id,voter_key)
);
alter table public.side_contests enable row level security;
alter table public.side_contest_categories enable row level security;
alter table public.side_contest_entries enable row level security;
alter table public.side_contest_votes enable row level security;
revoke all on public.side_contests,public.side_contest_categories,public.side_contest_entries,public.side_contest_votes from anon,authenticated;

create or replace function public.manage_side_contest(p_event_id uuid,p_action text,p_data jsonb default '{}')
returns uuid language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype; cat text; i integer:=0; entry_number integer; result_id uuid;
begin
 if not exists(select 1 from events e join account_users au on au.account_id=e.account_id where e.id=p_event_id and au.user_id=auth.uid()) then
  raise exception 'Only this show host can manage the contest.';
 end if;
 -- Serialize creation and changes for this show.
 perform 1 from events where id=p_event_id for update;
 select * into c from side_contests where event_id=p_event_id for update;
 if p_action='create' then
  if c.id is not null then raise exception 'This show already has a contest.'; end if;
  insert into side_contests(event_id,title,mode) values(p_event_id,trim(p_data->>'title'),p_data->>'mode') returning * into c;
  if c.mode='overall' then
   insert into side_contest_categories(contest_id,name,position) values(c.id,'Overall Winner',0);
  else
   if jsonb_typeof(p_data->'categories') is distinct from 'array' or jsonb_array_length(p_data->'categories') not between 1 and 10 then
    raise exception 'Add between one and ten categories.';
   end if;
   for cat in select trim(value) from jsonb_array_elements_text(p_data->'categories') loop
    insert into side_contest_categories(contest_id,name,position) values(c.id,cat,i);
    i:=i+1;
   end loop;
  end if;
 elsif c.id is null then raise exception 'Create the contest first.';
 elsif p_action='add_entry' then
  if c.status<>'draft' then raise exception 'Contestants are locked once voting begins.'; end if;
  select coalesce(max(contestant_number),0)+1 into entry_number from side_contest_entries where contest_id=c.id;
  if nullif(p_data->>'photo_url','') is not null and p_data->>'photo_url' !~ '^https://' then raise exception 'Photo must use an HTTPS URL.'; end if;
  insert into side_contest_entries(contest_id,contestant_number,name,costume,photo_url)
  values(c.id,entry_number,trim(p_data->>'name'),coalesce(trim(p_data->>'costume'),''),nullif(p_data->>'photo_url',''));
 elsif p_action='remove_entry' then
  if c.status<>'draft' then raise exception 'Contestants are locked once voting begins.'; end if;
  delete from side_contest_entries where contest_id=c.id and id=(p_data->>'entry_id')::uuid;
 elsif p_action='open' then
  if not exists(select 1 from side_contest_entries where contest_id=c.id) then raise exception 'Add contestants before opening voting.'; end if;
  update side_contests set status='open',results_visible=false where id=c.id;
 elsif p_action='close' then
  if c.status<>'open' then raise exception 'Voting is not open.'; end if;
  update side_contests set status='closed',results_visible=false where id=c.id;
 elsif p_action='reveal' then
  if c.status<>'closed' then raise exception 'Close voting before revealing results.'; end if;
  update side_contests set results_visible=coalesce((p_data->>'visible')::boolean,true) where id=c.id;
 else raise exception 'Unknown contest action.';
 end if;
 return c.id;
end;
$$;

create or replace function public.side_contest_snapshot(p_contest_id uuid,p_voter_key uuid default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare c side_contests%rowtype; show_counts boolean;
begin
 select * into c from side_contests where id=p_contest_id;
 if c.id is null then raise exception 'Contest not found.'; end if;
 show_counts := (c.status='closed' and c.results_visible) or exists(
  select 1 from events e join account_users au on au.account_id=e.account_id where e.id=c.event_id and au.user_id=auth.uid());
 return jsonb_build_object(
  'id',c.id,'title',c.title,'mode',c.mode,'status',c.status,'results_visible',c.results_visible,
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',cat.id,'name',cat.name) order by cat.position) from side_contest_categories cat where cat.contest_id=c.id),'[]'::jsonb),
  'entries',coalesce((select jsonb_agg(jsonb_build_object('id',en.id,'number',en.contestant_number,'name',en.name,'costume',en.costume,'photo_url',en.photo_url) order by en.contestant_number) from side_contest_entries en where en.contest_id=c.id),'[]'::jsonb),
  'selections',coalesce((select jsonb_object_agg(v.category_id::text,v.entry_id) from side_contest_votes v where v.contest_id=c.id and v.voter_key=p_voter_key),'{}'::jsonb),
  'counts',case when show_counts then coalesce((select jsonb_agg(jsonb_build_object('category_id',v.category_id,'entry_id',v.entry_id,'votes',v.total)) from (select category_id,entry_id,count(*) total from side_contest_votes where contest_id=c.id group by category_id,entry_id) v),'[]'::jsonb) else null end
 );
end;
$$;
create or replace function public.get_show_side_contest(p_event_id uuid)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare contest_id uuid;
begin
 if not exists(select 1 from events e join account_users au on au.account_id=e.account_id where e.id=p_event_id and au.user_id=auth.uid()) then raise exception 'Only this show host can view contest controls.'; end if;
 select id into contest_id from side_contests where event_id=p_event_id;
 if contest_id is null then return null; end if;
 return side_contest_snapshot(contest_id,null);
end;
$$;
create or replace function public.cast_side_contest_vote(p_contest_id uuid,p_category_id uuid,p_entry_id uuid,p_voter_key uuid)
returns void language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype;
begin
 select * into c from side_contests where id=p_contest_id for update;
 if c.id is null or c.status<>'open' then raise exception 'Voting is not open.'; end if;
 if p_voter_key is null then raise exception 'A voting device ID is required.'; end if;
 if not exists(select 1 from side_contest_categories where id=p_category_id and contest_id=c.id)
 or not exists(select 1 from side_contest_entries where id=p_entry_id and contest_id=c.id) then raise exception 'Invalid contestant or category.'; end if;
 insert into side_contest_votes(contest_id,category_id,entry_id,voter_key) values(c.id,p_category_id,p_entry_id,p_voter_key);
exception when unique_violation then raise exception 'You already voted in this category.';
end;
$$;
revoke all on function public.manage_side_contest(uuid,text,jsonb),public.get_show_side_contest(uuid),public.side_contest_snapshot(uuid,uuid),public.cast_side_contest_vote(uuid,uuid,uuid,uuid) from public;
grant execute on function public.manage_side_contest(uuid,text,jsonb),public.get_show_side_contest(uuid) to authenticated;
grant execute on function public.side_contest_snapshot(uuid,uuid),public.cast_side_contest_vote(uuid,uuid,uuid,uuid) to anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('contest-photos','contest-photos',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
drop policy if exists contest_photos_host_insert on storage.objects;
create policy contest_photos_host_insert on storage.objects for insert to authenticated with check(
 bucket_id='contest-photos' and exists(select 1 from public.events e join public.account_users au on au.account_id=e.account_id
 where e.id::text=(storage.foldername(name))[1] and au.user_id=auth.uid()));
drop policy if exists contest_photos_public_read on storage.objects;
create policy contest_photos_public_read on storage.objects for select to anon,authenticated using(bucket_id='contest-photos');

commit;
