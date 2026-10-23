begin;
create table if not exists public.host_signup_notifications (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  suppressed boolean not null default false,
  provider_id text,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  lock_token uuid,
  locked_until timestamptz,
  last_error text
);
alter table public.host_signup_notifications enable row level security;
revoke all on public.host_signup_notifications from anon, authenticated;
grant all on public.host_signup_notifications to service_role;

-- Existing accounts are explicitly suppressed, never emailed by this rollout.
insert into public.host_signup_notifications(account_id, payload, suppressed)
select id, '{}'::jsonb, true from public.accounts
on conflict (account_id) do nothing;

create or replace function public.queue_host_signup_notification()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.role = 'owner' then
    insert into public.host_signup_notifications(account_id, payload)
    select a.id, jsonb_build_object(
      'accountName', a.name,
      'email', u.email,
      'status', coalesce(a.subscription_status, 'incomplete'),
      'createdAt', now()
    ) from public.accounts a join auth.users u on u.id = new.user_id
    where a.id = new.account_id
    on conflict (account_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.queue_host_signup_notification() from public, anon, authenticated;
drop trigger if exists queue_host_signup_notification on public.account_users;
create trigger queue_host_signup_notification after insert on public.account_users
for each row execute function public.queue_host_signup_notification();

create or replace function public.claim_host_signup_notification(p_account_id uuid default null)
returns setof public.host_signup_notifications
language sql security definer set search_path = public, pg_temp as $$
  update public.host_signup_notifications n
  set lock_token = gen_random_uuid(), locked_until = now() + interval '10 minutes',
      attempts = attempts + 1
  where n.account_id = (
    select candidate.account_id from public.host_signup_notifications candidate
    where candidate.sent_at is null and not candidate.suppressed and candidate.next_attempt_at <= now()
      and (candidate.locked_until is null or candidate.locked_until < now())
      and (p_account_id is null or candidate.account_id = p_account_id)
    order by candidate.created_at limit 1 for update skip locked
  ) returning n.*;
$$;
revoke all on function public.claim_host_signup_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_host_signup_notification(uuid) to service_role;
commit;
