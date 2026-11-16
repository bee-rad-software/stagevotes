'use client';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/lib/supabase';
import {activityIsNew,HOST_REVIEW_EVENT,submissionAge,type ReviewKind,type ReviewSummary} from '@/lib/hostActivity';
import styles from './HostActivityAlerts.module.css';
type Activity=Record<ReviewKind,ReviewSummary>;
export default function HostActivityAlerts({eventId}:{eventId:string}) {
 const [data,setData]=useState<Activity|null>(null),[seen,setSeen]=useState<Partial<Record<ReviewKind,string>>>({});
 const [error,setError]=useState(''),[now,setNow]=useState(Date.now()),[retry,setRetry]=useState(0);
 const storageKey=useRef('');
 useEffect(()=>{
  let live=true,busy=false;const controller=new AbortController();
  setData(null);setSeen({});storageKey.current='';setError('');
  async function refresh(){
   if(busy||document.visibilityState==='hidden')return;busy=true;
   try{
    const {data:{session}}=await supabase.auth.getSession();if(!live)return;
    if(!session){setData(null);setSeen({});storageKey.current='';throw new Error('Sign in to see audience updates.');}
    const key=`sv-host-review:${session.user.id}:${eventId}`;
    if(storageKey.current!==key){storageKey.current=key;setData(null);setSeen({});try{const saved=JSON.parse(localStorage.getItem(key)||'{}');setSeen(Object.fromEntries(Object.entries(saved).filter(([k,v])=>['photos','shoutouts'].includes(k)&&typeof v==='string'&&Number.isFinite(Date.parse(v)))));}catch{}}
    const response=await fetch(`/api/events/${encodeURIComponent(eventId)}/host-activity`,{headers:{Authorization:`Bearer ${session.access_token}`},cache:'no-store',signal:controller.signal});
    const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not check audience updates.');
    if(live){setData(result);setError('');setNow(Date.now());}
   }catch(e){if(live)setError(e instanceof Error?e.message:'Could not check audience updates.');}
   finally{busy=false;}
  }
  void refresh();const timer=setInterval(()=>{setNow(Date.now());void refresh();},10000);
  const focus=()=>void refresh();window.addEventListener('focus',focus);document.addEventListener('visibilitychange',focus);
  return()=>{live=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};
 },[eventId,retry]);
 function review(kind:ReviewKind){
  const latest=data?.[kind].latestAt;
  if(latest){const next={...seen,[kind]:latest};setSeen(next);try{if(storageKey.current)localStorage.setItem(storageKey.current,JSON.stringify(next));}catch{}}
  window.dispatchEvent(new CustomEvent(HOST_REVIEW_EVENT,{detail:{eventId,kind}}));
 }
 return <section className={styles.panel} aria-label="Audience updates">
  <div className={styles.heading}>Audience updates <span role="status" aria-live="polite">{data?`${data.photos.pending} photos and ${data.shoutouts.pending} shout-outs awaiting review`:'Checking…'}</span></div>
  <div className={styles.cards}>{(['photos','shoutouts'] as const).map(kind=>{
   const summary=data?.[kind];const fresh=summary&&activityIsNew(summary,seen[kind]||null);
   return <button key={kind} type="button" className={styles.card} data-new={Boolean(fresh)} onClick={()=>review(kind)}>
    <span className={styles.label}>{kind==='photos'?'📷 Photos':'📣 Shout-outs'}{fresh&&<b className={styles.new}>NEW</b>}</span>
    <strong>{summary?`${summary.pending} to review`:'Checking…'}</strong>
    <span>{summary?.latestAt?`Latest ${submissionAge(summary.latestAt,now)}`:'Open '+(kind==='photos'?'photo review':'shout-outs')} <span aria-hidden="true">→</span></span>
   </button>;
  })}</div>
  {error&&<p role="status" className={styles.error}>Updates may be out of date. {error} <button type="button" onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
 </section>;
}
