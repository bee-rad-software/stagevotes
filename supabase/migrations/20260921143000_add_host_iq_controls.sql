alter table public.events
  add column if not exists host_target_end_time text,
  add column if not exists host_iq_buffer_minutes integer not null default 10,
  add column if not exists additional_songs_open boolean not null default true;

alter table public.events
  drop constraint if exists events_host_target_end_time_format;

alter table public.events
  add constraint events_host_target_end_time_format
  check (
    host_target_end_time is null
    or host_target_end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
  );

alter table public.events
  drop constraint if exists events_host_iq_buffer_minutes_range;

alter table public.events
  add constraint events_host_iq_buffer_minutes_range
  check (host_iq_buffer_minutes between 0 and 60);
