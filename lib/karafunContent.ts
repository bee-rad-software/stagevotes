import ratings from './karafunSongRatings.json';

const known = Buffer.from(ratings.known, 'base64');
const explicit = Buffer.from(ratings.explicit, 'base64');

export function isKaraFunSongAllowed(songId: number | string | null | undefined) {
  if (songId == null || !/^\d+$/.test(String(songId))) return false;
  const id = Number(songId);
  if (!Number.isSafeInteger(id) || id < 0 || id >= known.length * 8) return false;
  // When filtering, unknown IDs are withheld until the catalog is refreshed.
  const mask = 1 << (id % 8);
  return (known[id >> 3] & mask) !== 0 && (explicit[id >> 3] & mask) === 0;
}
