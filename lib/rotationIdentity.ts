export type RotationIdentityPerformance = {
  singer_name?: string | null;
  singer_profile_id?: string | null;
  device_id?: string | null;
};

function normalizeSingerName(
  value?: string | null
) {
  return (value || '')
    .trim()
    .toLowerCase();
}

/**
 * Returns the identity StageVotes should use
 * when determining a singer's place/round.
 *
 * Priority:
 * 1. Logged-in singer profile
 * 2. Guest device
 * 3. Singer name as a last-resort fallback
 */
export function getRotationIdentity(
  performance: RotationIdentityPerformance
) {
  if (performance.singer_profile_id) {
    return `profile:${performance.singer_profile_id}`;
  }

  if (performance.device_id) {
    return `device:${performance.device_id}`;
  }

  return `name:${normalizeSingerName(
    performance.singer_name
  )}`;
}