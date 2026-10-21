begin;
create table if not exists public.singer_show_attendance (
 show_id uuid not null references public.venue_recurring_shows(id) on delete cascade,
 show_date date not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 status text not null check(status in ('going','interested')),
 is_public boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(show_id,show_date,user_id)
);
create index if not exists singer_show_attendance_public on public.singer_show_attendance(show_id,show_date,status) where is_public;
alter table public.singer_show_attendance enable row level security;
revoke all on public.singer_show_attendance from anon,authenticated;
grant select,insert,update,delete on public.singer_show_attendance to service_role;
notify pgrst,'reload schema';
commit;
