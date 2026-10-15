export type BreakMusicState = { armed: boolean; blocked: boolean; between: boolean };
export const initialBreakMusicState: BreakMusicState = { armed: false, blocked: true, between: false };

// 4 = playing, 5 = paused, 3 = loaded/ready. Unknown/offline states fail silent.
// A ready state is a break only after playback has actually been observed.
export function updateBreakMusicState(previous: BreakMusicState, online: boolean, state: number | null): BreakMusicState {
  if (!online) return initialBreakMusicState;
  if (state === 4) return { armed: true, blocked: true, between: false };
  if (state === 5) return { armed: previous.armed, blocked: true, between: false };
  if (state === 3) return { armed: previous.armed, blocked: false, between: previous.armed };
  // Loading/transient states must stay silent without forgetting the performance.
  // Otherwise playing -> loading -> ready loses the automatic handoff.
  return { armed: previous.armed, blocked: true, between: false };
}

export function nextBreakTrack(index: number, count: number, shuffle: boolean, random = Math.random): number {
  if (count < 2) return 0;
  if (!shuffle) return (index + 1) % count;
  return (index + 1 + Math.floor(random() * (count - 1))) % count;
}
