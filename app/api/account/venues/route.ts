import {NextResponse} from 'next/server';
import {AuthError,getSupabaseAdmin,requireStageVotesAccount} from '@/lib/server/stageVotesAuth';
import {venueInput} from '@/lib/venueInput';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 try{const {account,role}=await requireStageVotesAccount(request);const {data,error}=await getSupabaseAdmin().from('venues').select('id,name,slug,city,state').eq('account_id',account.id).order('name');if(error)throw error;return NextResponse.json({venues:data||[],canAdd:['owner','admin'].includes(role)},{headers:{'Cache-Control':'no-store'}});}
 catch(error){return NextResponse.json({error:error instanceof AuthError?error.message:'Unable to load venues.'},{status:error instanceof AuthError?error.status:500});}
}
export async function POST(request:Request){
 try{const {account,role}=await requireStageVotesAccount(request);if(!['owner','admin'].includes(role))throw new AuthError('Only account owners and admins can add venues.',403);
 const input=venueInput(await request.json());if(!input)return NextResponse.json({error:'Enter a venue name (up to 120 characters), city (up to 100) and state (up to 50).'},{status:400});
 const id=crypto.randomUUID(),slug=(input.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)||'venue')+'-'+id.slice(0,8);
 const {data,error}=await getSupabaseAdmin().from('venues').insert({id,account_id:account.id,slug,...input}).select('id,name,slug,city,state').single();if(error)throw error;return NextResponse.json({venue:data},{status:201});
 }catch(error){return NextResponse.json({error:error instanceof AuthError?error.message:'Unable to add this venue. Please try again.'},{status:error instanceof AuthError?error.status:500});}
}
