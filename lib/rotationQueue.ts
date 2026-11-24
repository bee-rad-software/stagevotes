import { getRotationIdentity, type RotationIdentityPerformance } from './rotationIdentity';

export type RotationPerformance = RotationIdentityPerformance & {
  id: string;
  round?: number | null;
  queue_order?: number | null;
  status?: string | null;
  manual_queue_order?: number | null;
  created_at?: string | null;
};

const nameKey = (p: RotationPerformance) => (p.singer_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
const roundOf = (p: RotationPerformance) => p.round || 1;
const orderOf = (p: RotationPerformance) => p.manual_queue_order ?? p.queue_order ?? 0;
const isActive = (p: RotationPerformance) => p.status !== 'completed' && p.status !== 'skipped';

// A host-entered name can match a signed-in singer when it identifies one profile.
function rotationIdentityFor(performances: RotationPerformance[]) {
  const profilesByName = new Map<string, Set<string>>();
  for (const p of performances) {
    const name = nameKey(p);
    if (!name || !p.singer_profile_id) continue;
    const profiles = profilesByName.get(name) ?? new Set<string>();
    profiles.add(getRotationIdentity(p));
    profilesByName.set(name, profiles);
  }
  return (p: RotationPerformance) => {
    const name = nameKey(p);
    const profiles = profilesByName.get(name);
    if (p.singer_profile_id) return getRotationIdentity(p);
    if (name && profiles?.size === 1) return [...profiles][0];
    return name ? `guest:${name}` : getRotationIdentity(p);
  };
}

export const rotationProgressFields = 'id, round, queue_order, manual_queue_order, status, singer_name, singer_profile_id, device_id';

export function getRotationProgress(rows: RotationPerformance[], currentId?: string | null) {
  const current = rows.find(p => p.id === currentId && isActive(p));
  const completedRound = rows.reduce((latest, p) =>
    p.status === 'completed' ? Math.max(latest, roundOf(p)) : latest, 0);
  const waitingRound = rows.reduce((earliest, p) =>
    isActive(p) ? Math.min(earliest, roundOf(p)) : earliest, Infinity);
  const round = current ? roundOf(current)
    : completedRound || (Number.isFinite(waitingRound) ? waitingRound : 1);
  // The cutoff is in permanent slots. Manual ranks can be renumbered
  // from 1 when the host reorders the remaining songs.
  const passedOrder = rows.reduce((furthest, p) =>
    roundOf(p) === round && (p === current || p.status === 'completed')
      ? Math.max(furthest, p.queue_order ?? 0) : furthest, 0);
  return { round, passedOrder };
}

export function assignSignupRound(
  progress: ReturnType<typeof getRotationProgress>,
  originalOrder: number | null,
  highestRound: number | null
) {
  const missedTurn = originalOrder !== null && originalOrder <= progress.passedOrder;
  return Math.max(progress.round + Number(missedTurn), (highestRound ?? 0) + 1);
}

export function getFitIntoRoundUpdates(rows: RotationPerformance[], currentId?: string | null) {
  const { round, passedOrder } = getRotationProgress(rows, currentId);
  const identity = rotationIdentityFor(rows);
  const occupied = new Set(rows.filter(p =>
    (p.status === 'completed' && roundOf(p) >= round) ||
    (isActive(p) && roundOf(p) === round)).map(identity));
  const seen = new Set<string>();
  const updates = new Map<string, {round: number; manual_queue_order: number}>();
  const lastOrder = rows.reduce((max, p) =>
    roundOf(p) === round && isActive(p) ? Math.max(max, orderOf(p)) : max, passedOrder);
  for (const p of buildRotationQueue(rows, currentId)) {
    const key = identity(p);
    if (p.id === currentId || seen.has(key)) continue;
    seen.add(key);
    if (!occupied.has(key) && roundOf(p) === round + 1 &&
        p.queue_order != null && p.queue_order <= passedOrder) {
      updates.set(p.id, { round, manual_queue_order: lastOrder + 1 });
    }
  }
  return updates;
}

export function buildRotationQueue<
  T extends RotationPerformance
>(
  performances: T[],
  currentPerformanceId?: string | null
): T[] {
  const active = performances.filter(
    (performance) =>
      performance.status !== 'completed' &&
      performance.status !== 'skipped'
  );

  const compare = (a: T, b: T) => {
    const roundDiff =
      (a.round || 1) - (b.round || 1);

    if (roundDiff !== 0) {
      return roundDiff;
    }

    const aOrder =
  a.manual_queue_order ??
  a.queue_order ??
  0;

const bOrder =
  b.manual_queue_order ??
  b.queue_order ??
  0;

const orderDiff =
  aOrder - bOrder;

if (orderDiff !== 0) {
  return orderDiff;
}

const aCreated =
  a.created_at
    ? new Date(a.created_at).getTime()
    : 0;

const bCreated =
  b.created_at
    ? new Date(b.created_at).getTime()
    : 0;

const createdDiff =
  aCreated - bCreated;

if (createdDiff !== 0) {
  return createdDiff;
}

return a.id.localeCompare(b.id);
  };

  // Keep an extra song out of an already occupied round.
  const lastRound = new Map<string, number>();
  const current = active.find(p => p.id === currentPerformanceId);
  const waiting = active.filter(p => p !== current).sort(compare);
  const identity = rotationIdentityFor(performances);
  for (const p of performances) {
    if (p !== current && p.status !== 'completed') continue;
    const key = identity(p);
    lastRound.set(key, Math.max(lastRound.get(key) ?? 0, p.round || 1));
  }
  const ordered = waiting.map(p => {
    const key = identity(p);
    const round = Math.max(p.round || 1, (lastRound.get(key) ?? 0) + 1);
    if (nameKey(p) || p.singer_profile_id || p.device_id) lastRound.set(key, round);
    return { p, round };
  }).sort((a, b) => a.round - b.round || compare(a.p, b.p)).map(({ p }) => p);
  if (current) ordered.unshift(current);
  return ordered;
}


export function getQueuePosition<
  T extends RotationPerformance
>(
  queue: T[],
  predicate: (performance: T) => boolean
): number | null {
  const index = queue.findIndex(predicate);

  return index >= 0 ? index + 1 : null;
}