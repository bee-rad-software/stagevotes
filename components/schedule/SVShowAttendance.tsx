'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import {Users,Share2} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import styles from './SVShowAttendance.module.css';
type Status='going'|'interested';
type Data={signedIn:boolean;mine:{status:Status;isPublic:boolean}|null;going:number;interested:number;people:Array<{name:string;photo:string|null;status:string}>};
export default function SVShowAttendance({showId,date,title,venueName,venueSlug,onPlan}:{showId:string;date:string;title:string;venueName:string;venueSlug:string;onPlan:()=>void}){
 const [data,setData]=useState<Data|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const endpoint=`/api/show-attendance?show=${encodeURIComponent(showId)}&date=${encodeURIComponent(date)}`;
 const headers=useCallback(async()=>{const {data:{session}}=await supabase.auth.getSession();return session?{Authorization:`Bearer ${session.access_token}`} as Record<string,string>:{};},[]);
 const refresh=useCallback(async(signal?:AbortSignal)=>{const r=await fetch(endpoint,{headers:await headers(),cache:'no-store',signal});const d=await r.json();if(!r.ok)throw Error(d.error||'Attendance is unavailable.');setData(d);},[endpoint,headers]);
 useEffect(()=>{const c=new AbortController();void refresh(c.signal).catch(e=>{if(!c.signal.aborted)setError(e.message);});return()=>c.abort();},[refresh]);
 useEffect(()=>{const focus=()=>{if(document.visibilityState==='visible')void refresh().catch(()=>{});};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[refresh]);
 useEffect(()=>{const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{setData(null);setTimeout(()=>{void refresh().catch(()=>{});},0);});return()=>subscription.unsubscribe();},[refresh]);
 async function save(status:Status|'none',isPublic:boolean){if(busy)return;setBusy(true);setError('');setNotice('');try{const r=await fetch('/api/show-attendance',{method:'POST',headers:{'Content-Type':'application/json',...await headers()},body:JSON.stringify({show:showId,date,status,isPublic})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save attendance.');await refresh();setNotice(status==='none'?'Attendance removed.':isPublic?'Your attendance is visible to other signed-in singers.':'Saved privately. Other singers cannot see your attendance.');if(status!=='none')onPlan();}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}}
 async function share(){const url=`https://app.stagevotes.com/venues/${encodeURIComponent(venueSlug)}`;const text=`${title} at ${venueName} on ${new Date(date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}. Come sing!`;try{if(navigator.share)await navigator.share({title,text,url});else{await navigator.clipboard.writeText(text+' '+url);setNotice('Show details and venue link copied.');}}catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))setError('Could not share. Open Venue details to copy the link.');}}
 return <section className={styles.panel} aria-label="Show attendance">
  <div className={styles.heading}><Users size={16}/><strong>Who’s going?</strong><button type="button" onClick={()=>void share()} aria-label="Share this show"><Share2 size={15}/>Share</button></div>
  {data&&<><p className={styles.counts}>{data.going} going · {data.interested} interested <span>public plans</span></p>
  {data.signedIn?<><div className={styles.choices}>{(['going','interested'] as const).map(s=><button type="button" key={s} disabled={busy} aria-pressed={data.mine?.status===s} onClick={()=>void save(s,data.mine?.isPublic||false)}>{s==='going'?'✓ Going':'☆ Interested'}</button>)}{data.mine&&<button type="button" disabled={busy} onClick={()=>void save('none',false)}>Clear</button>}</div>
  {data.mine&&<label className={styles.privacy}><input type="checkbox" checked={data.mine.isPublic} disabled={busy} onChange={e=>void save(data.mine!.status,e.target.checked)}/><span>Show my name and photo to other signed-in singers for this date</span></label>}
  <small>{data.mine?.isPublic?'Your plan is visible. Uncheck the box to make it private.':'Private by default. Your plan is not included in public counts.'}</small>
  {data.people.length>0&&<details><summary>See singers with public plans</summary><ul className={styles.people}>{data.people.map((p,i)=><li key={i}>{p.photo&&<img src={p.photo} alt="" loading="lazy"/>}<span>{p.name}<small>{p.status==='going'?'Going':'Interested'}</small></span></li>)}</ul>{data.going+data.interested>data.people.length&&<small>Showing the 30 most recent public plans.</small>}</details>}
  </>:<small><Link href="/login">Sign in</Link> to mark Going or Interested and see who’s coming. You can still save a personal plan on this device.</small>}</>}
  {error&&<p role="status" className={styles.error}>{error}</p>}{notice&&<p role="status" className={styles.notice}>{notice}</p>}
 </section>;
}
