import {NextResponse} from 'next/server';
import {AuthError,getSupabaseAdmin,requireStageVotesAccount} from '@/lib/server/stageVotesAuth';
import {parseVenueSettings,venueSettingsDefaults,venueSettingsKeys} from '@/lib/venueSettings';
export const dynamic='force-dynamic';
type Context={params:Promise<{venueId:string}>};
export async function GET(request:Request,context:Context){
 try{
  const {account,role}=await requireStageVotesAccount(request);
  const {venueId}=await context.params;
  const db=getSupabaseAdmin();
  const {data:venue,error}=await db.from('venues').select('id,name,settings').eq('id',venueId).eq('account_id',account.id).maybeSingle();
  if(error)throw Error('Venue settings are not available. The venue-settings database update must be applied first.');
  if(!venue)throw new AuthError('Venue not found.',404);
  let settings=venue.settings;
  if(!settings){const {data,error}=await db.from('accounts').select(venueSettingsKeys.join(',')).eq('id',account.id).single();if(error)throw error;settings=data;}
  return NextResponse.json({venue:{id:venue.id,name:venue.name},settings:{...venueSettingsDefaults,...settings},canEdit:['owner','admin'].includes(role)},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to load venue settings.'},{status:e instanceof AuthError?e.status:500});}
}
export async function PUT(request:Request,context:Context){
 try{
  const {account,role}=await requireStageVotesAccount(request);
  if(!['owner','admin'].includes(role))throw new AuthError('Only account owners and admins can change venue settings.',403);
  const {venueId}=await context.params;
  let settings;
  try{settings=parseVenueSettings(await request.json());}catch(e){return NextResponse.json({error:(e as Error).message},{status:400});}
  const {data,error}=await getSupabaseAdmin().from('venues').update({settings,music_provider:settings.singa_enabled?'Singa':'KaraFun'}).eq('id',venueId).eq('account_id',account.id).select('id').maybeSingle();
  if(error)throw Error('Unable to save venue settings. Check that the database update has been applied.');
  if(!data)throw new AuthError('Venue not found.',404);
  return NextResponse.json({saved:true,settings});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to save venue settings.'},{status:e instanceof AuthError?e.status:500});}
}
