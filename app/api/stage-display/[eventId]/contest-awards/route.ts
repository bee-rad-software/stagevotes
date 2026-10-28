import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(_request:Request, context:{params:Promise<{eventId:string}>}) {
 const {eventId}=await context.params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) return NextResponse.json({error:'Invalid show.'},{status:400});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Display unavailable.'},{status:503});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data,error}=await admin.from('side_contests').select('id').eq('event_id',eventId).eq('status','closed').gt('awards_step',0).limit(1).maybeSingle();
 if(error)return NextResponse.json({error:'Unable to check awards.'},{status:503});
 return NextResponse.json({contestId:data?.id||null},{headers:{'Cache-Control':'no-store'}});
}
