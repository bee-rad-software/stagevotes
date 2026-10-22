-- Show separate audience/costume contest controls only when selected for this show.
begin;
alter table public.events add column if not exists show_side_contest_controls boolean not null default false;
-- Keep existing contests accessible after this update.
update public.events e set show_side_contest_controls=true
where exists(select 1 from public.side_contests c where c.event_id=e.id);
notify pgrst, 'reload schema';
commit;
