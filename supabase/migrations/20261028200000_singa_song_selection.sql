alter table public.performances
  add column if not exists singa_song_id text,
  add column if not exists singa_variant_id text;
