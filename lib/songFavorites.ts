export type FavoriteSong = { title: string; artist: string };
export function favoriteSong(value: unknown): FavoriteSong {
  const song = value as Record<string, unknown> | null;
  if (!song || typeof song.title !== 'string' || typeof song.artist !== 'string') throw new Error('A song title and artist are required.');
  const title = song.title.trim(), artist = song.artist.trim();
  if (!title || title.length > 300 || artist.length > 300) throw new Error('Use a song title and artist under 300 characters.');
  return { title, artist };
}
export function favoriteSongKey(song: FavoriteSong) {
  return JSON.stringify([song.title.trim().toLowerCase(), song.artist.trim().toLowerCase()]);
}
