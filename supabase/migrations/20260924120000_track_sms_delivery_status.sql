alter table public.sms_notification_deliveries
  drop constraint if exists sms_notification_deliveries_status_check;

alter table public.sms_notification_deliveries
  add constraint sms_notification_deliveries_status_check
  check (status in ('sending', 'sent', 'queued', 'delivered', 'undelivered', 'failed'));

alter table public.sms_notification_deliveries
  add column if not exists status_updated_at timestamptz,
  add column if not exists error_code text;

create unique index if not exists sms_notification_deliveries_twilio_sid_idx
  on public.sms_notification_deliveries(twilio_message_sid)
  where twilio_message_sid is not null;
