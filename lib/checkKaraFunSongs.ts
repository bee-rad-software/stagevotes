export async function filterKaraFunSongs<T extends { songId?: number | string | null }>(
  eventId: string,
  songs: T[]
): Promise<T[]> {
  const response = await fetch('/api/karafun/allowed-songs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, songIds: songs.map((song) => song.songId) }),
  });
  if (!response.ok) throw new Error('Unable to check song content ratings. Please try again.');
  const data: { allowedIds: string[] } = await response.json();
  const allowed = new Set(data.allowedIds);
  return songs.filter((song) => song.songId != null && allowed.has(String(song.songId)));
}
