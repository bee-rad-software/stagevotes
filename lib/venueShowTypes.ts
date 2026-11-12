// Stored values match venue_recurring_shows_show_type_check.
export const venueShowTypes = [
 {value:'karaoke',label:'Karaoke Night'},
 {value:'judge_competition',label:'Judged Competition'},
 {value:'peoples_choice',label:'People’s Choice'},
 {value:'theme_night',label:'Theme Night'},
 {value:'league',label:'League'},
 {value:'special_event',label:'Special Event'},
] as const;
export type VenueShowType=typeof venueShowTypes[number]['value'];
export function validVenueShowType(value:unknown):value is VenueShowType {
 return venueShowTypes.some(option=>option.value===value);
}
export function venueShowTypeOrDefault(value:unknown):VenueShowType {
 return validVenueShowType(value)?value:'karaoke';
}
