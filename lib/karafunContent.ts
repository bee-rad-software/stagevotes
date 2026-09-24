import ratings from './karafunSongRatings.json';

export function isKaraFunSongAllowed(songId: number | string | null | undefined) {
  if (songId == null) return false;
  // When filtering, unknown IDs are withheld until the catalog is refreshed.
  return (ratings as Record<string, number>)[String(songId)] === 0;
}
