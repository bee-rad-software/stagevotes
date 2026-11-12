import {NextResponse} from 'next/server';
import {getSupabaseAdmin} from '@/lib/server/stageVotesAuth';
import {withArtwork} from '@/lib/server/venueBadges';
export const dynamic='force-dynamic';
export async function GET(request:Request){
 const token=request.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];if(!token)return NextResponse.json({error:'Sign in to see your venue badges.'},{status:401});
 const db=getSupabaseAdmin();const {data:{user},error}=await db.auth.getUser(token);if(error||!user)return NextResponse.json({error:'Please sign in again.'},{status:401});
 const {data:profile,error:profileError}=await db.from('singer_profiles').select('id').eq('user_id',user.id).maybeSingle();if(profileError)return NextResponse.json({error:'Unable to load profile.'},{status:500});
 if(!profile)return NextResponse.json({badges:[]});
 const {data,error:badgeError}=await db.from('venue_badge_awards').select('*').eq('singer_profile_id',profile.id).order('earned_at',{ascending:false}).limit(200);
 if(badgeError)return NextResponse.json({error:'Venue badges are unavailable.'},{status:503});
 return NextResponse.json({badges:(data||[]).map(withArtwork)},{headers:{'Cache-Control':'no-store'}});
}
