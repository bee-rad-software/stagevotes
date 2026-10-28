export type SingaPlaybackTracker = { requestId: string | null; currentId: string | null; version: number };
export const newSingaPlaybackTracker = (): SingaPlaybackTracker => ({ requestId: null, currentId: null, version: -1 });

// estimates.state is the observed queue snapshot, not a song-request status.
export function observeSingaPlayback(tracker: SingaPlaybackTracker, payload: any, currentId: string | null, requests: Map<string, string>): string | null {
  if (!payload || !Array.isArray(payload.entries) || !Number.isInteger(payload.estimate_version)) return null;
  if (payload.estimate_version <= tracker.version) return null;
  tracker.version = payload.estimate_version;
  if (tracker.currentId !== currentId) { tracker.currentId = currentId; tracker.requestId = null; }
  if (!currentId) return null;
  const entries = payload.entries;
  if (entries.some((entry: any) => !entry || typeof entry.song_request_identifier !== 'string' || !Number.isInteger(entry.position))) return null;
  if (payload.player_status === 'playing') {
    const first = entries.find((entry: any) => entry.position === 1);
    // Never arm another request merely because it has moved into first place.
    if (first && requests.get(first.song_request_identifier) === currentId) tracker.requestId = first.song_request_identifier;
    return null;
  }
  if (payload.player_status !== 'stopped' || !tracker.requestId) return null;
  if (entries.some((entry: any) => entry.song_request_identifier === tracker.requestId)) return null;
  const completed = requests.get(tracker.requestId);
  tracker.requestId = null; // Consume before invoking any asynchronous advancement.
  return completed === currentId ? completed : null;
}
