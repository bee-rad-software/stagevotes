begin;
alter table public.venues
 add column if not exists current_side_contest_id uuid
 references public.side_contests(id) on delete set null;

create or replace function public.set_new_venue_contest()
returns trigger language plpgsql security definer set search_path=public as $$
begin
 update venues v set current_side_contest_id=new.id
 from events e where e.id=new.event_id
 and v.id=e.venue_id and v.account_id=e.account_id;
 return new;
end;
$$;
drop trigger if exists side_contest_venue_link on public.side_contests;
create trigger side_contest_venue_link after insert on public.side_contests
for each row execute function public.set_new_venue_contest();
revoke all on function public.set_new_venue_contest() from public;

create or replace function public.activate_venue_contest(p_event_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from events e join account_users au
 on au.account_id=e.account_id where e.id=p_event_id and au.user_id=auth.uid())
 then raise exception 'Only this show host can select the venue contest.'; end if;
 update venues v set current_side_contest_id=c.id
 from events e join side_contests c on c.event_id=e.id
 where e.id=p_event_id and v.id=e.venue_id and v.account_id=e.account_id;
 if not found then raise exception 'This show needs an assigned venue and a contest.'; end if;
end;
$$;

create or replace function public.resolve_venue_contest(p_venue_id uuid)
returns uuid language sql stable security definer set search_path=public as $$
 select c.id from venues v
 join side_contests c on c.id=v.current_side_contest_id
 join events e on e.id=c.event_id
 where v.id=p_venue_id and e.venue_id=v.id and e.account_id=v.account_id;
$$;
revoke all on function public.activate_venue_contest(uuid),
 public.resolve_venue_contest(uuid) from public;
grant execute on function public.activate_venue_contest(uuid) to authenticated;
grant execute on function public.resolve_venue_contest(uuid) to anon,authenticated;

-- Link existing contests without replacing an already selected contest.
update public.venues v set current_side_contest_id=latest.id
from (
 select distinct on(e.venue_id) e.venue_id,e.account_id,c.id
 from public.side_contests c join public.events e on e.id=c.event_id
 where e.venue_id is not null
 order by e.venue_id,c.created_at desc,c.id
) latest
where v.id=latest.venue_id and v.account_id=latest.account_id
and v.current_side_contest_id is null;
commit;
