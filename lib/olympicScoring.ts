export type JudgeScore = {
  device_id?: string | null;
  category_id?: string | null;
  score: number;
};

export type ScoringOptions = {
  olympic?: boolean;
  expectedJudges?: number | null;
};

export function calculateJudgeScore(
  votes: JudgeScore[],
  categoryIds: string[],
  options: ScoringOptions = {}
) {
  const olympic = options.olympic === true;
  const expected = options.expectedJudges || 0;
  if (olympic && (!Number.isInteger(expected) || expected < 5)) {
    throw new Error('Olympic scoring requires at least five expected judges.');
  }
  const categories = [...new Set(categoryIds)];
  const grouped = new Map<string, Map<string, number>>();
  for (const vote of votes) {
    if (!vote.device_id || !vote.category_id ||
        !categories.includes(vote.category_id) ||
        !Number.isFinite(vote.score)) continue;
    const scores = grouped.get(vote.device_id) || new Map<string, number>();
    scores.set(vote.category_id, vote.score);
    grouped.set(vote.device_id, scores);
  }
  const ballots = categories.length ? [...grouped].filter(([, scores]) =>
    categories.every((id) => scores.has(id))
  ).map(([judgeId, scores]) => ({
    judgeId,
    total: categories.reduce((sum, id) => sum + scores.get(id)!, 0),
    scores,
  })).sort((a, b) => a.total - b.total || a.judgeId.localeCompare(b.judgeId)) : [];
  // A deterministic secondary sort excludes exactly one low and one high
  // ballot even when multiple judges have equal totals.
  const complete = expected > 0 && ballots.length >= expected;
  const ready = olympic ? complete : ballots.length > 0;
  const retained = ready
    ? olympic ? ballots.slice(1, -1) : ballots
    : [];
  const excludedJudgeIds = ready && olympic
    ? [ballots[0].judgeId, ballots[ballots.length - 1].judgeId]
    : [];
  const averageTotal = retained.length
    ? retained.reduce((sum, ballot) => sum + ballot.total, 0) / retained.length
    : null;
  return {
    complete,
    completeBallotCount: ballots.length,
    averageTotal,
    // Preserve StageVotes' per-category score scale (currently out of 5).
    averageScore: averageTotal === null ? null : averageTotal / categories.length,
    retainedJudgeIds: retained.map((ballot) => ballot.judgeId),
    excludedJudgeIds,
    excludedTotals: ready && olympic ? [ballots[0].total, ballots[ballots.length - 1].total] : [],
    categoryAverages: Object.fromEntries(categories.map((id) => [
      id, retained.length
        ? retained.reduce((sum, ballot) => sum + ballot.scores.get(id)!, 0) / retained.length
        : null,
    ])),
  };
}

