begin;
alter table public.venues add column if not exists deleted_at timestamptz;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='deleted_venues_stay_inactive' and conrelid='public.venues'::regclass) then
  alter table public.venues add constraint deleted_venues_stay_inactive check(deleted_at is null or (is_active is false and is_public is false));
 end if;
end; $$;

-- Even direct authenticated table updates must use the guarded delete API/RPC.
create or replace function public.protect_venue_deletion() returns trigger
language plpgsql security invoker set search_path=public as $$
begin
 if new.deleted_at is distinct from old.deleted_at and current_user in ('anon','authenticated') then
  raise exception 'Use the venue delete action to remove this venue.' using errcode='42501';
 end if;
 return new;
end; $$;
revoke all on function public.protect_venue_deletion() from public,anon,authenticated;
drop trigger if exists venue_deletion_api_only on public.venues;
create trigger venue_deletion_api_only before update of deleted_at on public.venues for each row execute function public.protect_venue_deletion();

-- Serialize show creation/reopening with venue deletion, including requests from old tabs.
create or replace function public.check_show_venue_available() returns trigger
language plpgsql security definer set search_path=public as $$
declare v public.venues%rowtype;
begin
 if new.venue_id is null or new.is_show_ended is true or new.is_archived is true then return new; end if;
 select * into v from public.venues where id=new.venue_id for update;
 if v.id is null or v.deleted_at is not null or v.is_active is not true then
  raise exception 'This venue is no longer available. Choose an active venue.' using errcode='55000';
 end if;
 return new;
end; $$;
revoke all on function public.check_show_venue_available() from public,anon,authenticated;
drop trigger if exists event_venue_available on public.events;
create trigger event_venue_available before insert or update of venue_id,account_id,is_show_ended,is_archived on public.events for each row execute function public.check_show_venue_available();

create or replace function public.check_schedule_venue_available() returns trigger
language plpgsql security definer set search_path=public as $$
declare v public.venues%rowtype;
begin
 if new.is_active is not true then return new; end if;
 select * into v from public.venues where id=new.venue_id for update;
 if v.id is null or v.deleted_at is not null then raise exception 'This venue has been deleted.' using errcode='55000'; end if;
 return new;
end; $$;
revoke all on function public.check_schedule_venue_available() from public,anon,authenticated;
drop trigger if exists schedule_venue_available on public.venue_recurring_shows;
create trigger schedule_venue_available before insert or update of venue_id,is_active on public.venue_recurring_shows for each row execute function public.check_schedule_venue_available();

create or replace function public.delete_stagevotes_venue(p_venue uuid,p_account uuid,p_actor uuid,p_name text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v public.venues%rowtype;
begin
 if not exists(select 1 from public.account_users where account_id=p_account and user_id=p_actor and role in ('owner','admin')) then raise exception 'Only account owners and admins can delete venues.' using errcode='42501'; end if;
 select * into v from public.venues where id=p_venue and account_id=p_account for update;
 if v.id is null then raise exception 'Venue not found.' using errcode='P0002'; end if;
 if btrim(p_name) is distinct from btrim(v.name) then raise exception 'Type the venue name to confirm deletion.' using errcode='22023'; end if;
 if v.deleted_at is not null then return jsonb_build_object('deleted',true); end if;
 if exists(select 1 from public.events where venue_id=v.id and is_show_ended is not true and is_archived is not true) then
  raise exception 'End or archive all open shows at this venue before deleting it.' using errcode='55000';
 end if;
 update public.venue_recurring_shows set is_active=false where venue_id=v.id;
 update public.venue_badges set is_active=false where venue_id=v.id;
 update public.venues set deleted_at=now(),is_active=false,is_public=false,current_event_id=null where id=v.id;
 return jsonb_build_object('deleted',true);
end; $$;
revoke all on function public.delete_stagevotes_venue(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.delete_stagevotes_venue(uuid,uuid,uuid,text) to service_role;
commit;
