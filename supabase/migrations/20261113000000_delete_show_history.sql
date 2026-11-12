begin;
-- Preserve collected venue badge snapshots if their source show is removed.
alter table public.venue_badge_awards drop constraint if exists venue_badge_awards_event_id_fkey;
alter table public.venue_badge_awards alter column event_id drop not null;
alter table public.venue_badge_awards add constraint venue_badge_awards_event_id_fkey foreign key(event_id) references public.events(id) on delete set null;
-- Direct client deletes must use the same confirmation and competition guards.
revoke delete on public.events from public,anon,authenticated;
-- Receipt/outbox makes retries safe and retains failed photo cleanup work.
create table if not exists public.deleted_show_receipts(
 event_id uuid primary key,account_id uuid not null,actor_id uuid not null,show_name text not null,
 deleted_at timestamptz not null default now(),assets jsonb not null default '[]'::jsonb
);
alter table public.deleted_show_receipts enable row level security;
revoke all on public.deleted_show_receipts from public,anon,authenticated;
grant all on public.deleted_show_receipts to service_role;
create or replace function public.delete_stagevotes_show(p_event uuid,p_account uuid,p_actor uuid,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare e public.events%rowtype; receipt public.deleted_show_receipts%rowtype; linked boolean; child text; files jsonb;
begin
 if not exists(select 1 from public.account_users where account_id=p_account and user_id=p_actor and role in ('owner','admin','host')) then raise exception 'Only hosts, owners and admins can delete shows.' using errcode='42501'; end if;
 select * into e from public.events where id=p_event and account_id=p_account for update;
 if e.id is null then
  select * into receipt from public.deleted_show_receipts where event_id=p_event and account_id=p_account;
  if receipt.event_id is null then raise exception 'Show not found.' using errcode='P0002'; end if;
  if btrim(p_name) is distinct from btrim(receipt.show_name) then raise exception 'Type the show name to confirm deletion.' using errcode='22023'; end if;
  return jsonb_build_object('deleted',true,'assets',receipt.assets);
 end if;
 if btrim(p_name) is distinct from btrim(e.name) then raise exception 'Type the show name to confirm deletion.' using errcode='22023'; end if;
 if e.is_show_ended is not true and e.is_archived is not true then raise exception 'End or archive this show before deleting it.' using errcode='55000'; end if;
 if e.tournament_event_id is not null then raise exception 'Tournament shows cannot be deleted from history.' using errcode='55000'; end if;
 if to_regclass('public.tournament_events') is not null then
  execute 'select exists(select 1 from public.tournament_events where event_id=$1)' into linked using e.id;
  if linked then raise exception 'Tournament shows cannot be deleted from history.' using errcode='55000'; end if;
 end if;
 if to_regclass('public.sv_league_nights') is not null then
  execute 'select exists(select 1 from public.sv_league_nights where event_id=$1)' into linked using e.id;
  if linked then raise exception 'League shows cannot be deleted from history.' using errcode='55000'; end if;
 end if;
 if to_regclass('public.sv_league_nominations') is not null then
  execute 'select exists(select 1 from public.sv_league_nominations n join public.performances p on p.id=n.performance_id where p.event_id=$1)' into linked using e.id;
  if linked then raise exception 'This show contains league results and cannot be deleted from history.' using errcode='55000'; end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('bucket',bucket_id,'path',name)),'[]'::jsonb) into files from storage.objects
 where bucket_id in ('event-photos','contest-photos') and name like e.id::text||'/%';
 insert into public.deleted_show_receipts(event_id,account_id,actor_id,show_name,assets) values(e.id,p_account,p_actor,e.name,files);
 update public.venues set current_event_id=null where current_event_id=e.id;
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='accounts' and column_name='current_event_id') then execute 'update public.accounts set current_event_id=null where current_event_id=$1' using e.id; end if;
 update public.events set current_performance_id=null where id=e.id;
 -- Explicitly remove only show-owned rows, including legacy foreign keys without cascading deletes.
 foreach child in array array['scoring_votes','votes','peoples_choice_votes','judge_ballot_notes','judge_sessions','event_checkins','singer_competition_wins','event_results','singer_recovery_requests','performance_sms_subscriptions','sms_notification_deliveries','show_shoutouts','show_shoutout_settings','event_photo_reports','event_photos','side_contests','performances','vote_categories'] loop
  -- Read-only scoring/summary views are projections, not independent show data.
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=child and c.relkind in ('r','p')) then continue; end if;
  if exists(select 1 from information_schema.columns where table_schema='public' and table_name=child and column_name='event_id') then
   execute format('delete from public.%I where event_id=$1',child) using e.id;
  elsif child in ('scoring_votes','votes','peoples_choice_votes','judge_ballot_notes','performance_sms_subscriptions','sms_notification_deliveries') and exists(select 1 from information_schema.columns where table_schema='public' and table_name=child and column_name='performance_id') then
   execute format('delete from public.%I where performance_id in(select id from public.performances where event_id=$1)',child) using e.id;
  end if;
 end loop;
 delete from public.events where id=e.id and account_id=p_account;
 return jsonb_build_object('deleted',true,'assets',files);
end; $$;
revoke all on function public.delete_stagevotes_show(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.delete_stagevotes_show(uuid,uuid,uuid,text) to service_role;
commit;
