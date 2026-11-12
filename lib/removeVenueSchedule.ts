/** Retain historical references while removing future listings. RLS checks membership. */
export async function removeVenueSchedule(client:any,id:string,venueId:string){
 const {data,error}=await client.from('venue_recurring_shows').update({is_active:false})
  .eq('id',id).eq('venue_id',venueId).select('id').single();
 if(error||!data)throw error||new Error('The schedule could not be removed.');
}
