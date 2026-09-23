alter table public.performances
  add column if not exists performance_note text;

alter table public.performances
  drop constraint if exists performances_performance_note_length_check;

alter table public.performances
  add constraint performances_performance_note_length_check
  check (
    performance_note is null
    or char_length(performance_note) <= 500
  );

comment on column public.performances.performance_note is
  'Optional host-facing instructions for a queued performance, such as key changes or intro cues.';
