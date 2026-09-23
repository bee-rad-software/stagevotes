export type SingerFavoriteSong = {
  title: string;
  artist: string;
};

const STORAGE_KEY = 'stagevotes_saved_songs_v1';

function songKey(song: SingerFavoriteSong) {
  return `${song.title.trim().toLowerCase()}|${song.artist.trim().toLowerCase()}`;
}

export function getSingerFavoriteSongs(): SingerFavoriteSong[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(stored)) return [];

    return stored.filter((song): song is SingerFavoriteSong =>
      Boolean(song && typeof song.title === 'string' && typeof song.artist === 'string')
    );
  } catch {
    return [];
  }
}

export function saveSingerFavoriteSong(song: SingerFavoriteSong): boolean {
  const title = song.title.trim();
  const artist = song.artist.trim();
  if (!title || typeof window === 'undefined') return false;

  const saved = getSingerFavoriteSongs();
  if (saved.some((item) => songKey(item) === songKey({ title, artist }))) return true;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([{ title, artist }, ...saved]));
    return true;
  } catch {
    return false;
  }
}
