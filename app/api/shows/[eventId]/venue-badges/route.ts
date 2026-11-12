import {NextResponse} from 'next/server';
import {getSupabaseAdmin} from '@/lib/server/stageVotesAuth';
import {uuidPattern} from '@/lib/venueBadges';
import {showVenueBadges} from '@/lib/server/venueBadges';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{eventId:string}>}){
 try{
  const {eventId}=await params;if(!uuidPattern.test(eventId))return NextResponse.json({error:'Invalid show.'},{status:400});const db=getSupabaseAdmin();
  const {data:event,error}=await db.from('events').select('id,venue_id,account_id,is_show_ended').eq('id',eventId).maybeSingle();if(error||!event)return NextResponse.json({error:'Show not found.'},{status:404});
  let host=false;const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];
  if(token){const {data:{user}}=await db.auth.getUser(token);if(user){const {data:member}=await db.from('account_users').select('account_id').eq('user_id',user.id).eq('account_id',event.account_id).maybeSingle();host=Boolean(member);}}
  if(!host){if(!event.is_show_ended)return NextResponse.json({error:'Show recap is not available.'},{status:404});const {data:venue}=await db.from('venues').select('id').eq('id',event.venue_id).eq('account_id',event.account_id).eq('is_public',true).eq('is_active',true).maybeSingle();if(!venue)return NextResponse.json({error:'Show recap is not available.'},{status:404});}
  return NextResponse.json({badges:await showVenueBadges(event.id,!host)},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Unable to load venue badges.'},{status:503});}
}
