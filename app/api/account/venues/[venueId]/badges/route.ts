import {NextResponse} from 'next/server';
import {getSupabaseAdmin,AuthError} from '@/lib/server/stageVotesAuth';
import {badgeDesign,uuidPattern} from '@/lib/venueBadges';
import {badgeHost,badgeFailure,withArtwork} from '@/lib/server/venueBadges';
export const dynamic='force-dynamic';
type Context={params:Promise<{venueId:string}>};
function fail(e:unknown){const f=badgeFailure(e);return NextResponse.json({error:f.error},{status:f.status});}
export async function GET(request:Request,context:Context){
 try{
  const {venueId}=await context.params;const {venue}=await badgeHost(request,venueId);const db=getSupabaseAdmin();
  const [definitions,shows,awards]=await Promise.all([
   db.from('venue_badges').select('*').eq('venue_id',venue.id).order('created_at'),
   db.from('events').select('id,name,created_at,is_show_ended').eq('venue_id',venue.id).eq('account_id',venue.account_id).order('created_at',{ascending:false}).limit(100),
   db.from('venue_badge_awards').select('*').eq('venue_id',venue.id).order('earned_at',{ascending:false}).limit(100),
  ]);
  if(definitions.error||shows.error||awards.error)throw Error('Badge setup is not available. Apply the venue-badge database update first.');
  const eventId=new URL(request.url).searchParams.get('event');let singers:{id:string;name:string}[]=[];
  if(eventId){
   if(!uuidPattern.test(eventId))throw new AuthError('Invalid show.',400);
   const {data:event}=await db.from('events').select('id').eq('id',eventId).eq('venue_id',venue.id).eq('account_id',venue.account_id).maybeSingle();
   if(!event)throw new AuthError('Show not found at this venue.',404);
   const {data:performances,error}=await db.from('performances').select('singer_profile_id,singer_name').eq('event_id',eventId).not('singer_profile_id','is',null).order('created_at').limit(1000);
   if(error)throw Error('Unable to load singers.');
   const {data:contests,error:contestError}=await db.from('side_contests').select('id').eq('event_id',eventId);if(contestError)throw Error('Unable to load contest singers.');
   const entries=contests?.length?await db.from('side_contest_entries').select('singer_profile_id,name').in('contest_id',contests.map(c=>c.id)).eq('approval_status','approved').not('singer_profile_id','is',null):{data:[],error:null};
   if(entries.error)throw Error('Unable to load contest singers.');
   const profiles=new Map<string,string>();for(const p of performances||[])profiles.set(p.singer_profile_id,p.singer_name);for(const en of entries.data||[])if(!profiles.has(en.singer_profile_id))profiles.set(en.singer_profile_id,en.name);
   singers=[...profiles].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name));
  }
  return NextResponse.json({venue,badges:(definitions.data||[]).map(withArtwork),shows:shows.data||[],awards:(awards.data||[]).map(withArtwork),singers},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e);}
}
export async function POST(request:Request,context:Context){
 try{
  const {venueId}=await context.params;const {venue,user}=await badgeHost(request,venueId);const db=getSupabaseAdmin();const body=await request.json();
  if(body.action==='award'){
   if(![body.badgeId,body.profileId,body.eventId].every(id=>typeof id==='string'&&uuidPattern.test(id)))throw new AuthError('Choose a badge, show and singer profile.',400);
   const {data:badge}=await db.from('venue_badges').select('id').eq('id',body.badgeId).eq('venue_id',venue.id).eq('is_active',true).eq('rule','manual').maybeSingle();
   const {data:event}=await db.from('events').select('id').eq('id',body.eventId).eq('venue_id',venue.id).eq('account_id',venue.account_id).maybeSingle();
   if(!badge||!event)throw new AuthError('Choose a manual badge and a show at this venue.',400);
   const {data,error}=await db.rpc('award_venue_badge_manual',{p_badge:badge.id,p_profile:body.profileId,p_event:event.id,p_actor:user.id});
   if(error)throw new AuthError('Unable to award this badge. Choose a singer profile linked to this show.',400);
   return NextResponse.json({awarded:Boolean(data),message:data?'Badge awarded!':'This singer has already earned this badge.'});
  }
  if(!['create','update'].includes(body.action))throw new AuthError('Invalid badge action.',400);
  let design;try{design=badgeDesign(body.design,venue.account_id+'/'+venue.id);}catch(e){throw new AuthError((e as Error).message,400);}
  if(body.action==='update'){
   if(!uuidPattern.test(body.badgeId||''))throw new AuthError('Invalid badge.',400);
   const {data:old}=await db.from('venue_badges').select('id,rule').eq('id',body.badgeId).eq('venue_id',venue.id).maybeSingle();
   if(!old)throw new AuthError('Badge not found.',404);if(old.rule!==design.rule)throw new AuthError('Create a new badge to use a different earning rule.',400);
   const {data,error}=await db.from('venue_badges').update(design).eq('id',old.id).eq('venue_id',venue.id).select('id').maybeSingle();if(error||!data)throw Error('Unable to update badge.');
  }else{
   const {count,error:countError}=await db.from('venue_badges').select('id',{count:'exact',head:true}).eq('venue_id',venue.id);if(countError)throw Error('Badge setup is unavailable.');if((count||0)>=100)throw new AuthError('This venue already has 100 badge designs.',400);
   const {error}=await db.from('venue_badges').insert({venue_id:venue.id,...design});if(error)throw Error('Unable to create badge.');
  }
  return NextResponse.json({saved:true});
 }catch(e){return fail(e);}
}
