begin;

alter table public.performances
drop constraint if exists
  performances_selection_source_check;

alter table public.performances
add constraint
  performances_selection_source_check
check (
  selection_source in (
    'manual',
    'search',
    'surprise_me',
    'ai_recommendation',
    'host'
  )
);

commit;
