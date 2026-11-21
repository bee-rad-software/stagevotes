export type Coordinates = { latitude: number; longitude: number };

export function venueCoordinates(latitude: unknown, longitude: unknown): Coordinates | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number' ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

export const nearbyShowRadiusMiles = 30;

export function nearbyLiveShows<T extends { coordinates: Coordinates | null }>(
  shows: T[], origin: Coordinates
): T[] {
  const radians = Math.PI / 180;
  return shows.flatMap(show => {
    if (!show.coordinates) return [];
    const { latitude, longitude } = show.coordinates;
    const a = Math.sin((latitude - origin.latitude) * radians / 2) ** 2 +
      Math.cos(origin.latitude * radians) * Math.cos(latitude * radians) *
      Math.sin((longitude - origin.longitude) * radians / 2) ** 2;
    const miles = 3958.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    return miles <= nearbyShowRadiusMiles ? [{ show, miles }] : [];
  }).sort((a, b) => a.miles - b.miles).map(({ show }) => show);
}
