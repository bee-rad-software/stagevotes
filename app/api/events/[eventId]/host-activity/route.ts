import {getSupabaseAdmin} from '@/lib/server/stageVotesAuth';
import {photoHost,photoFailure,photoResponse} from '@/lib/server/eventPhotos';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{eventId:string}>}) {
 try {
  const {eventId}=await context.params;
  const event=await photoHost(request,eventId);
  const db=getSupabaseAdmin();
  async function summary(table:string){
   const {data,count,error}=await db.from(table).select('created_at',{count:'exact'}).eq('event_id',event.id).eq('status','pending').order('created_at',{ascending:false}).limit(1);
   if(error)throw error;
   return {pending:count||0,latestAt:data?.[0]?.created_at||null};
  }
  const [photos,shoutouts]=await Promise.all([summary('event_photos'),summary('show_shoutouts')]);
  return photoResponse({photos,shoutouts});
 }catch(error){return photoFailure(error);}
}
