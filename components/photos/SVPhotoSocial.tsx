'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import styles from './SVPhotoSocial.module.css';
type Social = {counts:Record<string,number>;mine:string|null;tags:Array<{id:string;name:string}>;myTag:string|null;signedIn:boolean;candidates:Array<{id:string;name:string}>};
export default function SVPhotoSocial({eventId,photoId}:{eventId:string;photoId:string}) {
 const [data,setData]=useState<Social|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState(''),[notice,setNotice]=useState('');
 const endpoint=`/api/events/${encodeURIComponent(eventId)}/photos/social`;
 const headers=useCallback(async()=>{const {data:{session}}=await supabase.auth.getSession();return session?{Authorization:`Bearer ${session.access_token}`} as Record<string,string>:{};},[]);
 const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch(endpoint+'?photoId='+encodeURIComponent(photoId),{headers:await headers(),cache:'no-store',signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Photo interactions are unavailable.');setData(d);},[endpoint,photoId,headers]);
 useEffect(()=>{const c=new AbortController();void refresh(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[refresh]);
 useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setTimeout(()=>{void refresh().catch(()=>{});},0);});return()=>subscription.unsubscribe();},[refresh]);
 async function change(action:string,value=''){
  if(busy)return;setBusy(true);setError('');setNotice('');
  try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',...await headers()},body:JSON.stringify({photoId,action,value})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save photo interaction.');await refresh();if(action==='tag'){setSelected('');setNotice('Tag saved. Other singers approve their tags before they appear.');}}
  catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}
 }
 return <div className={styles.social} aria-label="Photo reactions and singer tags">
  {data && <><div className={styles.reactions}>{[['applause','👏','Applause'],['fire','🔥','Fire'],['heart','❤️','Love']].map(([key,icon,label])=><button key={key} type="button" aria-label={`${label}: ${data.counts[key]||0}`} aria-pressed={data.mine===key} disabled={busy||!data.signedIn} onClick={()=>void change('react',data.mine===key?'none':key)}>{icon} {data.counts[key]||0}</button>)}</div>
  {!data.signedIn && <small><Link href={`/login?next=${encodeURIComponent('/signup/'+eventId)}`}>Sign in</Link> to react or tag singers.</small>}
  {data.tags.length>0 && <p className={styles.tags}>Pictured: {data.tags.map(t=>t.name).join(' · ')}</p>}
  {data.myTag==='pending' && <div className={styles.invite}><p>You were tagged in this photo. Show your name?</p><button disabled={busy} type="button" onClick={()=>void change('accept')}>Accept tag</button><button disabled={busy} type="button" onClick={()=>void change('untag')}>Decline</button></div>}
  {data.myTag==='accepted' && <button className={styles.quiet} type="button" disabled={busy} onClick={()=>void change('untag')}>Remove my tag</button>}
  {data.candidates.length>0 && <details><summary>Tag a singer</summary><form onSubmit={e=>{e.preventDefault();if(selected)void change('tag',selected);}}><label>Who is in this photo?<select value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Choose a singer from this show</option>{data.candidates.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label><button type="submit" disabled={busy||!selected}>Add tag</button><small>Each singer approves their own tag. Only accepted tags appear publicly.</small></form></details>}</>}
  {notice && <p role="status">{notice}</p>}{error && <p role="status" className={styles.error}>{error}</p>}
 </div>;
}
