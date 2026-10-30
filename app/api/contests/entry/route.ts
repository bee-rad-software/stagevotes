import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const runtime='nodejs';
export async function POST(request:Request) {
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)return NextResponse.json({error:'Contest entry is temporarily unavailable.'},{status:503});
 if(Number(request.headers.get('content-length')||0)>4*1024*1024)return NextResponse.json({error:'Use a photo under 3 MB.'},{status:413});
 try {
  const form=await request.formData();
  const contestId=String(form.get('contestId')||'');
  const entryKey=String(form.get('entryKey')||'');
  const name=String(form.get('name')||'').trim();
  const costume=String(form.get('costume')||'').trim();
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if(!uuid.test(contestId)||!uuid.test(entryKey)||!name||name.length>100||costume.length>200)return NextResponse.json({error:'Enter your name and a valid costume description.'},{status:400});
  const photo=form.get('photo');
  const file=photo instanceof File&&photo.size?photo:null;
  if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024))return NextResponse.json({error:'Use a JPG, PNG, or WebP photo under 3 MB.'},{status:400});
  const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:contest,error:contestError}=await admin.from('side_contests').select('event_id,status,registrations_open').eq('id',contestId).maybeSingle();
  if(contestError)return NextResponse.json({error:'Contest setup is not ready. Please ask your host.'},{status:503});
  if(!contest||contest.status!=='draft'||!contest.registrations_open)return NextResponse.json({error:'Contest entries are closed.'},{status:400});
  const {data:show,error:showError}=await admin.from('events').select('is_show_ended,is_archived').eq('id',contest.event_id).maybeSingle();
  if(showError||!show)return NextResponse.json({error:'Unable to check the show. Please try again.'},{status:503});
  if(show.is_show_ended===true||show.is_archived===true)return NextResponse.json({error:'This show has ended. Open the current contest to enter.'},{status:400});
  const {data:entryId,error}=await admin.rpc('submit_side_contest_entry',{p_contest_id:contestId,p_entry_key:entryKey,p_name:name,p_costume:costume});
  if(error)return NextResponse.json({error:error.message},{status:400});
  let warning='';
  if(file) {
   const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
   const path=contest.event_id+'/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await admin.storage.from('contest-photos').upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});
   if(uploadError)warning='Your entry was saved, but the photo could not be uploaded. Ask your host to help.';
   else {
    const photoUrl=admin.storage.from('contest-photos').getPublicUrl(path).data.publicUrl;
    const {error:updateError}=await admin.from('side_contest_entries').update({photo_url:photoUrl}).eq('id',entryId).eq('entry_key',entryKey);
    if(updateError)warning='Your entry was saved, but the photo could not be attached. Ask your host to help.';
   }
  }
  return NextResponse.json({success:true,warning,entryId},{status:201});
 }catch{return NextResponse.json({error:'Unable to submit right now. Please try again.'},{status:500});}
}
