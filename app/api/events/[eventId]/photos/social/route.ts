import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';
import { checkPhotoOrigin, photoFailure, photoResponse } from '@/lib/server/eventPhotos';
import { photoId, PhotoError } from '@/lib/eventPhotos';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ eventId: string }> };
async function viewer(req: Request) {
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');
 if (!token) return null;
 const { data, error }=await getSupabaseAdmin().auth.getUser(token);
 if(error || !data.user) throw new PhotoError('Please sign in again.',401);
 return data.user;
}
async function approved(eventId:string,id:string) {
 const {data,error}=await getSupabaseAdmin().from('event_photos').select('id').eq('event_id',eventId).eq('id',id).eq('status','approved').maybeSingle();
 if(error) throw error;
 if(!data) throw new PhotoError('This photo is no longer available.',404);
}
export async function GET(req:Request,ctx:Context) {
 try {
  const eventId=photoId((await ctx.params).eventId), id=photoId(new URL(req.url).searchParams.get('photoId'));
  await approved(eventId,id);
  const db=getSupabaseAdmin(),user=await viewer(req);
  const [reactions,tags,profile]=await Promise.all([
   Promise.all(['applause','fire','heart'].map(reaction=>db.from('event_photo_reactions').select('photo_id',{count:'exact',head:true}).eq('photo_id',id).eq('reaction',reaction))),
   db.from('event_photo_tags').select('singer_profile_id,status,singer_profiles(display_name,stage_name)').eq('photo_id',id),
   user?db.from('singer_profiles').select('id').eq('user_id',user.id).maybeSingle():Promise.resolve({data:null,error:null})
  ]);
  if(reactions.some(r=>r.error) || tags.error || profile.error) throw reactions.find(r=>r.error)?.error || tags.error || profile.error;
  const counts:Record<string,number>={applause:0,fire:0,heart:0};
  ['applause','fire','heart'].forEach((key,i)=>{counts[key]=reactions[i].count || 0;});
  let mine=null;
  if(user) {const r=await db.from('event_photo_reactions').select('reaction').eq('photo_id',id).eq('user_id',user.id).maybeSingle();if(r.error)throw r.error;mine=r.data?.reaction || null;}
  const ownTag=(tags.data || []).find(t=>t.singer_profile_id===profile.data?.id);
  const accepted=(tags.data || []).filter(t=>t.status==='accepted').map(t=>{const p:any=Array.isArray(t.singer_profiles)?t.singer_profiles[0]:t.singer_profiles;return {id:t.singer_profile_id,name:p?.stage_name || p?.display_name || 'Singer'};});
  // Only signed-in participants can see this event's tag picker, never a global people directory.
  let candidates:Array<{id:string;name:string}>=[];
  if(profile.data) {
   const joined=await db.from('performances').select('id').eq('event_id',eventId).eq('singer_profile_id',profile.data.id).limit(1);
   if(joined.error)throw joined.error;
   if(joined.data?.length){const r=await db.from('performances').select('singer_profile_id,singer_profiles(display_name,stage_name)').eq('event_id',eventId).not('singer_profile_id','is',null).limit(1000);if(r.error)throw r.error;
    const unique=new Map<string,{id:string;name:string}>();for(const row of r.data||[]){const p:any=Array.isArray(row.singer_profiles)?row.singer_profiles[0]:row.singer_profiles;if(row.singer_profile_id && p)unique.set(row.singer_profile_id,{id:row.singer_profile_id,name:p.stage_name||p.display_name||'Singer'});}candidates=[...unique.values()];}
  }
  return photoResponse({counts,mine,tags:accepted,myTag:ownTag?.status || null,signedIn:Boolean(user),candidates});
 }catch(e){return photoFailure(e);}
}
export async function POST(req:Request,ctx:Context) {
 try {
  checkPhotoOrigin(req);const user=await viewer(req);if(!user)throw new PhotoError('Sign in to react or tag singers.',401);
  if(Number(req.headers.get('content-length')||0)>2048)throw new PhotoError('Request too large.',413);
  const eventId=photoId((await ctx.params).eventId),body=await req.json(),id=photoId(body.photoId);
  if(!['react','tag','accept','untag'].includes(body.action))throw new PhotoError('Invalid photo action.');
  if(body.action==='react' && !['applause','fire','heart','none'].includes(body.value))throw new PhotoError('Invalid reaction.');
  const value=body.action==='tag'?photoId(body.value):body.action==='react'?body.value:'';
  const {error}=await getSupabaseAdmin().rpc('change_photo_social',{p_event_id:eventId,p_photo_id:id,p_user_id:user.id,p_action:body.action,p_value:value});
  if(error){if(error.message.includes('photo_not_found'))throw new PhotoError('This photo is no longer available.',404);if(error.message.includes('participant_required'))throw new PhotoError('Only singers from this show can tag participants.',403);if(error.message.includes('tag_declined'))throw new PhotoError('This singer has removed their tag.',409);if(error.message.includes('tag_limit'))throw new PhotoError('This photo has reached its tag limit.',409);throw error;}
  return photoResponse({ok:true});
 }catch(e){return photoFailure(e);}
}
