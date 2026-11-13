-- Private account favorites travel with the singer, independently of venue/catalog.
create table if not exists public.singer_song_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  song_key text not null,
  title text not null check (length(btrim(title)) between 1 and 300),
  artist text not null check (length(artist) <= 300),
  created_at timestamptz not null default now(),
  primary key (user_id, song_key)
);
create index if not exists singer_song_favorites_recent on public.singer_song_favorites(user_id, created_at desc);
alter table public.singer_song_favorites enable row level security;
revoke all on public.singer_song_favorites from public, anon, authenticated;
grant select on public.singer_song_favorites to authenticated;
grant all on public.singer_song_favorites to service_role;
drop policy if exists "Singers read their own favorites" on public.singer_song_favorites;
create policy "Singers read their own favorites" on public.singer_song_favorites
  for select to authenticated using (user_id = auth.uid());
-- Writes go through the authenticated API, which derives user_id from the token.
