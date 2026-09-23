create table if not exists public.sms_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  performance_id uuid not null references public.performances(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  notification_type text not null
    check (notification_type in ('on_deck', 'you_are_up')),
  status text not null default 'sending'
    check (status in ('sending', 'sent')),
  twilio_message_sid text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (performance_id, notification_type)
);

create index if not exists sms_notification_deliveries_event_id_idx
  on public.sms_notification_deliveries(event_id);

alter table public.sms_notification_deliveries enable row level security;

-- No browser policies are intentional. This delivery ledger is available only
-- to trusted server code through the Supabase service role.
comment on table public.sms_notification_deliveries is
  'Private idempotency ledger for transactional singer queue alerts.';
