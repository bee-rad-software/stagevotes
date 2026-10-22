export function awardsPath(eventId: string, competitionMode?: string | null) {
  const id = encodeURIComponent(eventId);
  return competitionMode === 'tournament'
    ? `/tournament-results/${id}`
    : `/leaderboard/${id}`;
}
