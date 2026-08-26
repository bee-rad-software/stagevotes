export type RotationPerformance = {
  id: string;
  round?: number | null;
  queue_order?: number | null;
  status?: string | null;
  manual_queue_order?: number | null;
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

  const ordered = [...active].sort((a, b) => {
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

    return a.id.localeCompare(b.id);
  });

  // The event record is authoritative about
  // who is currently performing.
  if (currentPerformanceId) {
    const currentIndex = ordered.findIndex(
      (performance) =>
        performance.id === currentPerformanceId
    );

    if (currentIndex > 0) {
      const [current] = ordered.splice(
        currentIndex,
        1
      );

      ordered.unshift(current);
    }
  }

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