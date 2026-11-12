'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import type {VenueBadgeAward} from '@/lib/venueBadges';
import VenueBadgeMark from '@/components/VenueBadgeMark';
export default function VenueBadgeCollection({eventId}:{eventId?:string}){
 const [badges,setBadges]=useState<VenueBadgeAward[]>([]),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setBadges([]);setError('');void(async()=>{try{const {data:{session}}=await supabase.auth.getSession();const response=await fetch(eventId?`/api/shows/${eventId}/venue-badges`:'/api/singer/venue-badges',{headers:session?{Authorization:'Bearer '+session.access_token}:{},cache:'no-store'});const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to load venue badges.');if(live)setBadges(result.badges||[]);}catch(e){if(live)setError((e as Error).message);}})();return()=>{live=false;};},[eventId,retry]);
 if(!badges.length&&!error)return null;
 return <section style={{margin:'24px 0',padding:24,border:'1px solid #334155',borderRadius:18,background:'#101b2d',color:'#eef4ff'}}><h2>{eventId?'Venue badges earned this show':'My venue badges'}</h2>{error?<p role="status">{error} <button type="button" onClick={()=>setRetry(r=>r+1)}>Try again</button></p>:<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>{badges.map(b=><article key={b.id} style={{border:'1px solid '+b.color+'88',borderRadius:16,padding:20,textAlign:'center'}}><VenueBadgeMark {...b}/><h3>{b.title}</h3>{eventId&&<strong>{b.singer_name}</strong>}<p style={{color:'#7dd3fc',fontWeight:700}}>{b.venue_name}</p><p>{b.description}</p><small>Earned {new Date(b.earned_at).toLocaleDateString()}</small></article>)}</div>}</section>;
}
