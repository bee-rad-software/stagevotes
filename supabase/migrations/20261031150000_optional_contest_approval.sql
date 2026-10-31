begin;
alter table public.side_contests add column if not exists require_entry_approval boolean not null default true;
create or replace function public.contest_entry_approval_setting(p_event_id uuid,p_required boolean default null) returns boolean
language plpgsql security definer set search_path=public as $$
declare c side_contests%rowtype;
begin
 if not exists(select 1 from events e join account_users a on a.account_id=e.account_id where e.id=p_event_id and a.user_id=auth.uid()) then raise exception 'Only this show host can change entry approval.'; end if;
 select * into c from side_contests where event_id=p_event_id for update;
 if c.id is null then raise exception 'Create the contest first.'; end if;
 if p_required is not null then
  if c.status<>'draft' then raise exception 'Change entry approval before voting opens.'; end if;
  update side_contests set require_entry_approval=p_required where id=c.id;
  return p_required;
 end if;
 return c.require_entry_approval;
end; $$;
revoke all on function public.contest_entry_approval_setting(uuid,boolean) from public,anon;
grant execute on function public.contest_entry_approval_setting(uuid,boolean) to authenticated;
create or replace function public.apply_contest_entry_approval() returns trigger
language plpgsql security definer set search_path=public as $$
declare required boolean;
begin
 -- The entry RPC and settings RPC lock this same contest row, serializing changes.
 select require_entry_approval into required from side_contests where id=new.contest_id for update;
 if new.entry_key is not null and new.approval_status='pending' and required=false then
  new.approval_status:='approved';
 end if;
 return new;
end; $$;
revoke all on function public.apply_contest_entry_approval() from public,anon,authenticated;
drop trigger if exists apply_contest_entry_approval on public.side_contest_entries;
create trigger apply_contest_entry_approval before insert on public.side_contest_entries for each row execute function public.apply_contest_entry_approval();
commit;
