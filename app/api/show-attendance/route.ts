import {getSupabaseAdmin} from '@/lib/server/stageVotesAuth';
import {photoResponse,photoFailure,checkPhotoOrigin} from '@/lib/server/eventPhotos';
import {PhotoError} from '@/lib/eventPhotos';
import {attendanceKey,validOccurrence} from '@/lib/showAttendance';
export const dynamic='force-dynamic';
async function auth(req:Request){const token=req.headers.get('authorization')?.replace(/^Bearer /,'');if(!token)return null;const {data,error}=await getSupabaseAdmin().auth.getUser(token);if(error||!data.user)throw new PhotoError('Please sign in again.',401);return data.user;}
async function showRule(show:string,date:string){
 const db=getSupabaseAdmin();const {data,error}=await db.from('venue_recurring_shows').select('id,venue_id,day_of_week,recurrence_type,start_date').eq('id',show).eq('is_active',true).maybeSingle();if(error)throw error;if(!data)throw new PhotoError('This show is no longer listed.',404);
 const v=await db.from('venues').select('id').eq('id',data.venue_id).eq('is_public',true).eq('is_active',true).maybeSingle();if(v.error)throw v.error;if(!v.data||!validOccurrence(data,date))throw new PhotoError('This show date is no longer listed.',404);
}
export async function GET(req:Request){try{
 const url=new URL(req.url);let key;try{key=attendanceKey(url.searchParams.get('show'),url.searchParams.get('date'));}catch{throw new PhotoError('Invalid show or date.');}
 await showRule(key.show,key.date);const db=getSupabaseAdmin(),user=await auth(req);
 const own=user?await db.from('singer_show_attendance').select('status,is_public').eq('show_id',key.show).eq('show_date',key.date).eq('user_id',user.id).maybeSingle():{data:null,error:null};if(own.error)throw own.error;
 const counts=await Promise.all(['going','interested'].map(status=>db.from('singer_show_attendance').select('show_id',{head:true,count:'exact'}).eq('show_id',key.show).eq('show_date',key.date).eq('is_public',true).eq('status',status)));if(counts.some(r=>r.error))throw counts.find(r=>r.error)?.error;
 let people:Array<{name:string;photo:string|null;status:string}>=[];
 if(user){const rows=await db.from('singer_show_attendance').select('user_id,status').eq('show_id',key.show).eq('show_date',key.date).eq('is_public',true).order('updated_at',{ascending:false}).limit(30);if(rows.error)throw rows.error;
  if(rows.data?.length){const profiles=await db.from('singer_profiles').select('user_id,stage_name,display_name,photo_url').in('user_id',rows.data.map(r=>r.user_id));if(profiles.error)throw profiles.error;const map=new Map((profiles.data||[]).map(p=>[p.user_id,p]));people=rows.data.map(r=>{const p=map.get(r.user_id);return {name:p?.stage_name||p?.display_name||'Singer',photo:p?.photo_url||null,status:r.status};});}
 }
 return photoResponse({signedIn:Boolean(user),mine:own.data?{status:own.data.status,isPublic:own.data.is_public}:null,going:counts[0].count||0,interested:counts[1].count||0,people});
}catch(e){return photoFailure(e);}}
export async function POST(req:Request){try{
 checkPhotoOrigin(req);const user=await auth(req);if(!user)throw new PhotoError('Sign in to mark your attendance.',401);if(Number(req.headers.get('content-length')||0)>2048)throw new PhotoError('Request too large.',413);
 const b=await req.json();let key;try{key=attendanceKey(b.show,b.date);}catch{throw new PhotoError('Invalid show or date.');}
 if(!['going','interested','none'].includes(b.status)||typeof b.isPublic!=='boolean')throw new PhotoError('Choose your attendance and privacy setting.');
 const db=getSupabaseAdmin();
 // Removal remains possible even if the venue has changed its schedule or visibility.
 if(b.status==='none'){const {error}=await db.from('singer_show_attendance').delete().eq('show_id',key.show).eq('show_date',key.date).eq('user_id',user.id);if(error)throw error;return photoResponse({ok:true});}
 await showRule(key.show,key.date);
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 if(key.date<today||Date.parse(key.date)-Date.now()>366*86400000)throw new PhotoError('Choose an upcoming show.');
 const {error}=await db.from('singer_show_attendance').upsert({show_id:key.show,show_date:key.date,user_id:user.id,status:b.status,is_public:b.isPublic,updated_at:new Date().toISOString()},{onConflict:'show_id,show_date,user_id'});if(error)throw error;
 return photoResponse({ok:true});
}catch(e){return photoFailure(e);}}
