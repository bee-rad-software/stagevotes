export type SignupEventState = { is_show_ended?: boolean | null; signups_open?: boolean | null; additional_songs_open?: boolean | null };
export function singerShowAvailability(event: SignupEventState | null | undefined) {
  if (!event) return 'loading';
  if (event.is_show_ended) return 'ended';
  if (event.signups_open === false) return 'closed';
  if (event.additional_songs_open === false) return 'paused';
  return 'open';
}
export function canRequestSingerSong(event: SignupEventState | null | undefined, hasJoined: boolean) {
  const state = singerShowAvailability(event);
  return state === 'open' || (state === 'paused' && !hasJoined);
}
