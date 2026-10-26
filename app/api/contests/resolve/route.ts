import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const reply = (body: object, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export async function GET(request: Request) {
 const params = new URL(request.url).searchParams;
 const contestId = params.get('contestId');
 const venueId = params.get('venueId');
 if ((!contestId && !venueId) || (contestId && venueId) || !uuid.test(contestId || venueId || '')) return reply({error:'Invalid contest'}, 400);
 const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
 if (!url || !key) return reply({error:'Contest temporarily unavailable'}, 503);
 const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
 if (contestId) {
  const {data: contest,error} = await admin.from('side_contests').select('event_id').eq('id',contestId).maybeSingle();
  if (error) return reply({error:'Unable to find contest'}, 500);
  if (!contest) return reply({error:'Contest not found'}, 404);
  const {data: show,error: showError} = await admin.from('events').select('venue_id,is_show_ended,is_archived').eq('id',contest.event_id).maybeSingle();
  if (showError || !show) return reply({error:'Unable to find show'}, 500);
  return reply({ended: show.is_show_ended === true || show.is_archived === true, venueId:show.venue_id});
 }
 const {data: venue,error: venueError} = await admin.from('venues').select('id,account_id,current_side_contest_id').eq('id',venueId).maybeSingle();
 if (venueError) return reply({error:'Unable to find venue'}, 500);
 if (!venue) return reply({contestId:null});
 // Honour an explicitly selected contest while its show remains active.
 if (venue.current_side_contest_id) {
  const {data: selected,error} = await admin.from('side_contests').select('id,event_id').eq('id',venue.current_side_contest_id).maybeSingle();
  if (error) return reply({error:'Unable to find contest'}, 500);
  if (selected) {
   const {data: show,error: showError} = await admin.from('events').select('id,venue_id,account_id,is_show_ended,is_archived').eq('id',selected.event_id).maybeSingle();
   if (showError) return reply({error:'Unable to find show'}, 500);
   if (show && show.venue_id===venue.id && show.account_id===venue.account_id && show.is_show_ended!==true && show.is_archived!==true) return reply({contestId:selected.id});
  }
 }
 // A stale pointer may be replaced only when there is one unambiguous active contest.
 const {data: shows,error: showsError} = await admin.from('events').select('id').eq('venue_id',venue.id).eq('account_id',venue.account_id).eq('is_show_ended',false).eq('is_archived',false);
 if (showsError) return reply({error:'Unable to find active shows'}, 500);
 if (!shows?.length) return reply({contestId:null});
 const {data: contests,error: contestsError} = await admin.from('side_contests').select('id').in('event_id',shows.map(show=>show.id)).limit(2);
 if (contestsError) return reply({error:'Unable to find contest'}, 500);
 return reply({contestId:contests?.length===1 ? contests[0].id : null});
}
