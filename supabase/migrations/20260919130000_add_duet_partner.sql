begin;

alter table public.performances
  add column if not exists
  duet_partner_name text;

comment on column public.performances.duet_partner_name is
  'Optional display name of a duet partner. The primary singer remains the owner of the performance and queue position.';

commit;