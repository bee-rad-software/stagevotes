import {NextResponse} from 'next/server';
import {AuthError,getSupabaseAdmin,requireStageVotesAccount} from '@/lib/server/stageVotesAuth';
import {uuidPattern} from '@/lib/venueBadges';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=30;
export async function DELETE(request:Request,{params}:{params:Promise<{eventId:string}>}){
 try{
  const {eventId}=await params;const {account,user,role}=await requireStageVotesAccount(request);
  if(!['owner','admin','host'].includes(role))throw new AuthError('Only hosts, owners and admins can delete shows.',403);
  const body=await request.json();if(!uuidPattern.test(eventId)||typeof body?.name!=='string'||!body.name.trim()||body.name.length>500)throw new AuthError('Choose a show and type its name to confirm deletion.',400);
  const db=getSupabaseAdmin();const {data,error}=await db.rpc('delete_stagevotes_show',{p_event:eventId,p_account:account.id,p_actor:user.id,p_name:body.name});
  if(error){const status=error.code==='42501'?403:error.code==='P0002'?404:error.code==='22023'?400:error.code==='55000'||error.code==='23503'?409:500;throw new AuthError(status===500?'Unable to delete show. Check the show-deletion database update.':error.code==='23503'?'This show is linked to other records and could not be deleted. Nothing was removed.':error.message,status);}
  if(!data?.deleted)throw Error('Show deletion was not confirmed.');
  const assets=Array.isArray(data.assets)?data.assets:[];const remaining:{bucket:string;path:string}[]=[];
  for(const bucket of ['event-photos','contest-photos']){
   const files=assets.filter((a:any)=>a?.bucket===bucket&&typeof a.path==='string'&&a.path.startsWith(eventId+'/'));
   for(let start=0;start<files.length;start+=100){const batch=files.slice(start,start+100);try{const {error}=await db.storage.from(bucket).remove(batch.map((a:any)=>a.path));if(error)remaining.push(...batch);}catch{remaining.push(...batch);}}
  }
  let cleanupPending=remaining.length>0;
  const {error:receiptError}=await db.from('deleted_show_receipts').update({assets:remaining}).eq('event_id',eventId).eq('account_id',account.id);if(receiptError)cleanupPending=true;
  return NextResponse.json({deleted:true,cleanupPending,warning:cleanupPending?'Show deleted. Photo cleanup could not be confirmed. Use Retry photo cleanup.':''});
 }catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to delete show.'},{status:e instanceof AuthError?e.status:500});}
}
