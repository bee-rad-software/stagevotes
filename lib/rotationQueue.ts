import { getRotationIdentity, type RotationIdentityPerformance } from './rotationIdentity';

export type RotationPerformance = RotationIdentityPerformance & {
  id: string;
  round?: number | null;
  queue_order?: number | null;
  status?: string | null;
  manual_queue_order?: number | null;
  created_at?: string | null;
};

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

  // Keep an extra song out of an already occupied round. A host-entered
  // name can match a signed-in singer when that name identifies only one profile.
  const nameKey = (p: T) => (p.singer_name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const profilesByName = new Map<string, Set<string>>();
  for (const p of performances) {
    const name = nameKey(p);
    if (!name || !p.singer_profile_id) continue;
    const profiles = profilesByName.get(name) ?? new Set<string>();
    profiles.add(getRotationIdentity(p));
    profilesByName.set(name, profiles);
  }
  const lastRound = new Map<string, number>();
  const current = active.find(p => p.id === currentPerformanceId);
  const waiting = active.filter(p => p !== current).sort(compare);
  const identity = (p: T) => {
    const name = nameKey(p);
    const profiles = profilesByName.get(name);
    if (p.singer_profile_id) return getRotationIdentity(p);
    if (name && profiles?.size === 1) return [...profiles][0];
    return name ? `guest:${name}` : getRotationIdentity(p);
  };
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