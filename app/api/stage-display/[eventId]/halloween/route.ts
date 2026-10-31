import {NextResponse} from 'next/server';
import {createClient} from '@supabase/supabase-js';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}) {
 const {eventId}=await params;
 const headers={'Cache-Control':'no-store'};
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId))return NextResponse.json({error:'Invalid show'},{status:400,headers});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Unavailable'},{status:503,headers});
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const show=await admin.from('events').select('id,is_show_ended,is_archived').eq('id',eventId).maybeSingle();
 if(show.error)return NextResponse.json({error:'Unavailable'},{status:503,headers});
 if(!show.data||show.data.is_show_ended||show.data.is_archived)return NextResponse.json({contest:null},{headers});
 const result=await admin.from('side_contests').select('id,title,status').eq('event_id',eventId).maybeSingle();
 if(result.error)return NextResponse.json({error:'Unavailable'},{status:503,headers});
 if(!result.data)return NextResponse.json({contest:null},{headers});
 const entries=await admin.from('side_contest_entries').select('id,name,costume,photo_url',{count:'exact'}).eq('contest_id',result.data.id).eq('approval_status','approved').order('contestant_number').limit(200);
 if(entries.error)return NextResponse.json({error:'Unavailable'},{status:503,headers});
 // Only public ballot fields for approved contestants; never expose pending entries,
 // singer links, vote totals, or unrevealed placements.
 return NextResponse.json({contest:{...result.data,entries:entries.data||[],entryCount:entries.count||0}},{headers});
}
