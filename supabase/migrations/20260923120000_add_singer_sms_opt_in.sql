create table if not exists public.performance_sms_subscriptions (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null unique references public.performances(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  phone_e164 text not null check (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
  consented_at timestamptz not null default now(),
  consent_version text not null default '2026-09-23',
  consent_source text not null default 'singer_web_form'
    check (consent_source in ('singer_web_form')),
  created_at timestamptz not null default now()
);

create index if not exists performance_sms_subscriptions_event_id_idx
  on public.performance_sms_subscriptions(event_id);

alter table public.performance_sms_subscriptions enable row level security;

-- Singer browsers may create an opt-in record after submitting a song.
-- There is intentionally no public SELECT policy, so phone numbers cannot
-- be read from the client. Trusted server code uses the service role.
drop policy if exists "singers can create sms opt ins"
  on public.performance_sms_subscriptions;

create policy "singers can create sms opt ins"
on public.performance_sms_subscriptions
for insert
to anon, authenticated
with check (
  phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  and consented_at <= now() + interval '5 minutes'
);

comment on table public.performance_sms_subscriptions is
  'Private, per-performance SMS opt-ins. No client read policy by design.';
