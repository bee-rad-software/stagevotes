import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
import {chooseSignupEvent} from '@/lib/chooseSignupEvent';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{venueId:string;audienceKind:string}>}) {
 const {venueId,audienceKind}=await context.params;
 const routes:Record<string,string>={signup:'signup',vote:'vote',people:'peopleschoice'};
 if(!routes[audienceKind]||!/^[0-9a-f-]{36}$/i.test(venueId))return new NextResponse('Invalid audience link.',{status:404});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return new NextResponse('Audience access is temporarily unavailable.',{status:503});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:venue,error}=await admin.from('venues').select('account_id,current_event_id').eq('id',venueId).is('deleted_at',null).eq('is_active',true).maybeSingle();
 if(error)return new NextResponse('Unable to check this venue. Please try again.',{status:503});
 if(!venue)return new NextResponse('Venue not found. Please check your QR code.',{status:404,headers:{'Cache-Control':'no-store'}});
 // Resolve only within this venue and account. A missing or stale pointer must
 // not hide a new active show, or send a guest to another venue's show.
 const {data:shows,error:showError}=await admin.from('events')
  .select('id,created_at,is_show_ended,is_archived')
  .eq('venue_id',venueId).eq('account_id',venue.account_id)
  .not('is_show_ended','is',true).not('is_archived','is',true)
  .order('created_at',{ascending:false});
 if(showError)return new NextResponse('Unable to check the show. Please try again.',{status:503,headers:{'Cache-Control':'no-store'}});
 const show=chooseSignupEvent(shows||[],[venue.current_event_id]);
 if(!show)return new NextResponse('No active show at this venue. Please check with your host.',{status:404,headers:{'Cache-Control':'no-store'}});
 return NextResponse.redirect(new URL('/'+routes[audienceKind]+'/'+show.id,request.url),{status:307,headers:{'Cache-Control':'no-store'}});
}
