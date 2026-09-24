begin;

alter table public.venue_recurring_shows
  add column if not exists recurrence_type text not null default 'weekly',
  add column if not exists start_date date;

alter table public.venue_recurring_shows
  drop constraint if exists venue_recurring_shows_recurrence_type_check;

alter table public.venue_recurring_shows
  add constraint venue_recurring_shows_recurrence_type_check
  check (recurrence_type in ('weekly', 'biweekly', 'one_time')
    and (recurrence_type = 'weekly' or start_date is not null));

create index if not exists venue_recurring_shows_venue_active_idx
  on public.venue_recurring_shows (venue_id, is_active, start_date);

create or replace function public.can_manage_venue_schedule(requested_venue_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.venues
    join public.account_users on account_users.account_id = venues.account_id
    where venues.id = requested_venue_id
      and account_users.user_id = auth.uid()
  );
$$;

revoke all on function public.can_manage_venue_schedule(uuid) from public;
grant execute on function public.can_manage_venue_schedule(uuid) to authenticated;

alter table public.venue_recurring_shows enable row level security;

drop policy if exists "Public can read venue schedules" on public.venue_recurring_shows;
create policy "Public can read venue schedules" on public.venue_recurring_shows
  for select to anon, authenticated using (true);

drop policy if exists "Venue members can add schedule entries" on public.venue_recurring_shows;
create policy "Venue members can add schedule entries" on public.venue_recurring_shows
  for insert to authenticated
  with check (public.can_manage_venue_schedule(venue_id));

drop policy if exists "Venue members can edit schedule entries" on public.venue_recurring_shows;
create policy "Venue members can edit schedule entries" on public.venue_recurring_shows
  for update to authenticated
  using (public.can_manage_venue_schedule(venue_id))
  with check (public.can_manage_venue_schedule(venue_id));

drop policy if exists "Venue members can remove schedule entries" on public.venue_recurring_shows;
create policy "Venue members can remove schedule entries" on public.venue_recurring_shows
  for delete to authenticated using (public.can_manage_venue_schedule(venue_id));

grant select on public.venue_recurring_shows to anon, authenticated;
grant insert, update, delete on public.venue_recurring_shows to authenticated;

commit;
