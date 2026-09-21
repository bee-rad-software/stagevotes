create extension if not exists "pgcrypto";

create table if not exists public.singer_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  requested_name text not null,
  requested_device_id text not null,
  singer_profile_id uuid references public.singer_profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists singer_recovery_requests_event_status_idx
  on public.singer_recovery_requests (event_id, status, created_at);

alter table public.singer_recovery_requests enable row level security;

drop policy if exists "recovery requests are publicly insertable"
  on public.singer_recovery_requests;
create policy "recovery requests are publicly insertable"
  on public.singer_recovery_requests
  for insert
  with check (status = 'pending');

drop policy if exists "recovery requests are publicly readable"
  on public.singer_recovery_requests;
create policy "recovery requests are publicly readable"
  on public.singer_recovery_requests
  for select
  using (true);

drop policy if exists "recovery requests are host updateable"
  on public.singer_recovery_requests;
create policy "recovery requests are host updateable"
  on public.singer_recovery_requests
  for update
  using (
    exists (
      select 1
      from public.events
      join public.account_users
        on account_users.account_id = events.account_id
      where events.id = singer_recovery_requests.event_id
        and account_users.user_id = auth.uid()
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'singer_recovery_requests'
  ) then
    alter publication supabase_realtime
      add table public.singer_recovery_requests;
  end if;
end;
$$;
