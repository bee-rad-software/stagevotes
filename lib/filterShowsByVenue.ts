/** An empty selection means all venues. Never infer venue identity from its name. */
export function filterShowsByVenue<T extends {venue_id?:string|null}>(shows:T[],venueId:string):T[]{
 return venueId?shows.filter(show=>show.venue_id===venueId):shows;
}
