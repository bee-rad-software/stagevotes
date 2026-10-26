import { getSupabaseAdmin } from '@/lib/server/stageVotesAuth';
import { PhotoError, photoId, photoText } from '@/lib/eventPhotos';
import { checkPhotoOrigin, guestIdentity, photoEvent, photoFailure, photoHost, photoResponse } from '@/lib/server/eventPhotos';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ eventId: string }> };

export async function GET(req: Request, context: Context) {
 try {
  const { eventId } = await context.params;
  const host = new URL(req.url).searchParams.get('host') === '1';
  const event = host ? await photoHost(req,eventId) : await photoEvent(eventId);
  const db = getSupabaseAdmin();
  const setting = await db.from('show_shoutout_settings').select('enabled').eq('event_id',event.id).maybeSingle();
  if (setting.error) throw setting.error;
  const enabled = Boolean(setting.data?.enabled) && !event.is_show_ended;
  let messages: unknown[] = [];
  if (host || enabled) {
   let query = db.from('show_shoutouts').select('id,message,sender,status,created_at,approved_at').eq('event_id',event.id);
   query = host ? query.in('status',['pending','approved']) : query.eq('status','approved').gte('approved_at',new Date(Date.now()-5*60*1000).toISOString());
   const result = await query.order('created_at',{ascending:false}).limit(host ? 100 : 20);
   if (result.error) throw result.error;
   messages = result.data || [];
  }
  return photoResponse({ enabled, closed: Boolean(event.is_show_ended), messages });
 } catch(error) { return photoFailure(error); }
}

export async function POST(req: Request, context: Context) {
 try {
  checkPhotoOrigin(req);
  if (Number(req.headers.get('content-length') || 0) > 2048) throw new PhotoError('Message is too long.',413);
  const { eventId } = await context.params; photoId(eventId);
  const body = await req.json();
  const message = photoText(body.message,100,'Message');
  const sender = photoText(body.sender || '',30,'Name');
  if (!message) throw new PhotoError('Enter a shout-out.');
  const identity = guestIdentity(req);
  const { error } = await getSupabaseAdmin().rpc('submit_show_shoutout',{p_event:eventId,p_message:message,p_sender:sender,p_guest:identity.uploadKey,p_network:identity.networkKey});
  if (error?.message?.includes('shoutouts_closed')) throw new PhotoError('Shout-outs are closed.',409);
  if (error?.message?.includes('shoutouts_limit')) throw new PhotoError('Please wait before sending another shout-out.',429);
  if (error) throw error;
  return photoResponse({ok:true},identity.guest,201);
 } catch(error) { return photoFailure(error); }
}

export async function PATCH(req: Request, context: Context) {
 try {
  checkPhotoOrigin(req);
  const { eventId } = await context.params;
  const event = await photoHost(req,eventId); const body = await req.json(); const db = getSupabaseAdmin();
  if (body.action === 'settings') {
   if (typeof body.enabled !== 'boolean' || (body.enabled && event.is_show_ended)) throw new PhotoError('Cannot change this setting.');
   const { error } = await db.from('show_shoutout_settings').upsert({event_id:event.id,enabled:body.enabled}); if(error) throw error;
  } else if (body.action === 'approve' || body.action === 'hide') {
   const { data,error } = await db.from('show_shoutouts').update({status:body.action === 'approve' ? 'approved' : 'hidden',approved_at:body.action === 'approve' ? new Date().toISOString() : null}).eq('event_id',event.id).eq('id',photoId(body.id)).in('status',body.action === 'approve' ? ['pending'] : ['pending','approved']).select('id').maybeSingle();
   if(error) throw error; if(!data) throw new PhotoError('This shout-out is no longer available.',404);
  } else throw new PhotoError('Invalid request.');
  return photoResponse({ok:true});
 } catch(error) { return photoFailure(error); }
}
