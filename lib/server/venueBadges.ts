import {AuthError,getSupabaseAdmin,requireStageVotesAccount} from '@/lib/server/stageVotesAuth';
import {canManageBadges,uuidPattern,type VenueBadgeAward} from '@/lib/venueBadges';
export async function badgeHost(request:Request,venueId:string){
 if(!uuidPattern.test(venueId))throw new AuthError('Invalid venue.',400);
 const identity=await requireStageVotesAccount(request);
 if(!canManageBadges(identity.role))throw new AuthError('Only hosts, owners and admins can manage venue badges.',403);
 const {data:venue,error}=await getSupabaseAdmin().from('venues').select('id,name,account_id').eq('id',venueId).eq('account_id',identity.account.id).maybeSingle();
 if(error)throw Error('Unable to load venue.');if(!venue)throw new AuthError('Venue not found.',404);
 return {...identity,venue};
}
export function artworkUrl(path:string|null){return path?getSupabaseAdmin().storage.from('venue-badges').getPublicUrl(path).data.publicUrl:null;}
export function withArtwork<T extends {artwork_path:string|null}>(badge:T){return {...badge,artworkUrl:artworkUrl(badge.artwork_path)};}
export async function showVenueBadges(eventId:string,publicOnly=true){
 const {data,error}=await getSupabaseAdmin().from('venue_badge_awards').select('id,title,description,icon,color,artwork_path,venue_name,singer_name,singer_profile_id,event_id,performance_id,earned_at,singer_profiles!inner(profile_visibility)').eq('event_id',eventId).order('earned_at',{ascending:false}).order('id').limit(200);
 if(error)throw Error('Venue badges are unavailable. Check that the venue-badge database update has been applied.');
 return (data||[]).filter(row=>{const profile=Array.isArray(row.singer_profiles)?row.singer_profiles[0]:row.singer_profiles;return !publicOnly||profile?.profile_visibility==='public';}).map(row=>{const {singer_profiles,...badge}=row;return withArtwork(badge as VenueBadgeAward);});
}
export function badgeFailure(error:unknown){return {error:error instanceof Error?error.message:'Unable to manage badges.',status:error instanceof AuthError?error.status:500};}
