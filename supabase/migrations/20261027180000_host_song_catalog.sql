begin;
create table if not exists public.host_song_catalog (
 account_id uuid not null references public.accounts(id) on delete cascade,
 title text not null check(length(title) between 1 and 200),
 artist text not null check(length(artist) between 1 and 200),
 explicit boolean,
 primary key(account_id,title,artist)
);
alter table public.host_song_catalog enable row level security;
revoke all on public.host_song_catalog from public, anon, authenticated;

create or replace function public.replace_host_song_catalog(p_account_id uuid,p_songs jsonb)
returns integer language plpgsql security definer set search_path=public as $$
declare total integer;
begin
 if auth.uid() is null or not exists(select 1 from account_users where account_id=p_account_id and user_id=auth.uid()) then raise exception 'Only an account host can update this catalog.'; end if;
 if jsonb_typeof(p_songs) is distinct from 'array' or jsonb_array_length(p_songs) not between 1 and 20000 then raise exception 'The catalog must contain between 1 and 20,000 songs.'; end if;
 if exists(select 1 from jsonb_array_elements(p_songs) x where jsonb_typeof(x) <> 'object' or jsonb_typeof(x->'title') is distinct from 'string' or jsonb_typeof(x->'artist') is distinct from 'string' or length(trim(x->>'title')) not between 1 and 200 or length(trim(x->>'artist')) not between 1 and 200 or (x ? 'explicit' and jsonb_typeof(x->'explicit') not in ('boolean','null'))) then raise exception 'Every song needs a title and artist; explicit must be true, false, or blank.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 0));
 delete from host_song_catalog where account_id=p_account_id;
 insert into host_song_catalog(account_id,title,artist,explicit)
 select distinct on (trim(x->>'title'),trim(x->>'artist')) p_account_id,trim(x->>'title'),trim(x->>'artist'),(x->>'explicit')::boolean
 from jsonb_array_elements(p_songs) x order by trim(x->>'title'),trim(x->>'artist');
 get diagnostics total = row_count;
 return total;
end $$;

create or replace function public.clear_host_song_catalog(p_account_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from account_users where account_id=p_account_id and user_id=auth.uid()) then raise exception 'Only an account host can update this catalog.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_account_id::text, 0));
 delete from host_song_catalog where account_id=p_account_id;
end $$;

create or replace function public.host_song_catalog_count(p_account_id uuid)
returns integer language plpgsql stable security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from account_users where account_id=p_account_id and user_id=auth.uid()) then raise exception 'Only an account host can view this catalog.'; end if;
 return (select count(*)::integer from host_song_catalog where account_id=p_account_id);
end $$;

create or replace function public.search_show_host_catalog(p_event_id uuid,p_query text default '',p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare acct uuid; clean_only boolean; amount integer; query_text text;
begin
 select account_id,coalesce(exclude_explicit_songs,false) into acct,clean_only from events where id=p_event_id;
 if acct is null then raise exception 'Show not found.'; end if;
 query_text := left(coalesce(trim(p_query),''),100);
 amount := greatest(1,least(coalesce(p_limit,25),100));
 return jsonb_build_object('configured',exists(select 1 from host_song_catalog where account_id=acct), 'songs',
   coalesce((select jsonb_agg(jsonb_build_object('title',title,'artist',artist)) from (
     select title,artist from host_song_catalog where account_id=acct
     and (not clean_only or explicit is false)
     and (query_text='' or position(lower(query_text) in lower(title))>0 or position(lower(query_text) in lower(artist))>0)
     order by title,artist limit amount
   ) s),'[]'::jsonb));
end $$;
revoke all on function public.replace_host_song_catalog(uuid,jsonb),public.clear_host_song_catalog(uuid),public.host_song_catalog_count(uuid),public.search_show_host_catalog(uuid,text,integer) from public;
grant execute on function public.replace_host_song_catalog(uuid,jsonb),public.clear_host_song_catalog(uuid),public.host_song_catalog_count(uuid) to authenticated;
grant execute on function public.search_show_host_catalog(uuid,text,integer) to anon,authenticated;
commit;
