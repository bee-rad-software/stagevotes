import {NextResponse} from 'next/server';
import sharp from 'sharp';
import {getSupabaseAdmin,AuthError} from '@/lib/server/stageVotesAuth';
import {badgeHost,badgeFailure,artworkUrl} from '@/lib/server/venueBadges';
export const runtime='nodejs';
export async function POST(request:Request,{params}:{params:Promise<{venueId:string}>}){
 try{
  const {venueId}=await params;const {venue}=await badgeHost(request,venueId);
  const data=await request.formData(),file=data.get('file');
  if(!(file instanceof File)||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)throw new AuthError('Choose a JPG, PNG or WebP image under 3 MB.',400);
  let image:Buffer;
  try{image=await sharp(Buffer.from(await file.arrayBuffer()),{limitInputPixels:24000000}).rotate().resize(512,512,{fit:'contain',background:{r:0,g:0,b:0,alpha:0},withoutEnlargement:true}).webp({quality:85}).toBuffer();}catch{throw new AuthError('This image could not be opened. Try a JPG or PNG.',400);}
  const path=`${venue.account_id}/${venue.id}/${crypto.randomUUID()}.webp`;
  const {error}=await getSupabaseAdmin().storage.from('venue-badges').upload(path,image,{contentType:'image/webp',upsert:false});if(error)throw Error('Unable to upload artwork. Check the venue-badge database update.');
  return NextResponse.json({path,url:artworkUrl(path)});
 }catch(e){const f=badgeFailure(e);return NextResponse.json({error:f.error},{status:f.status});}
}
