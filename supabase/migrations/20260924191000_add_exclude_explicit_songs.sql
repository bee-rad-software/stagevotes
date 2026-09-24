alter table public.events
  add column if not exists exclude_explicit_songs boolean not null default false;
