'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './shoutouts.module.css';
type Shout = {id:string; message:string; sender:string; status:string; approved_at:string | null};
type Data = {enabled:boolean; closed:boolean; messages:Shout[]};
export default function ShowShoutouts({eventId,host=false}:{eventId:string;host?:boolean}) {
 const panelRef=useRef<HTMLDetailsElement>(null);
 const [instance,setInstance]=useState<'checking'|'primary'|'duplicate'>(host?'checking':'primary');
 useLayoutEffect(()=>{
  if(!host)return;
  const panels=document.querySelectorAll('[data-host-shoutout-panel]');
  setInstance(panels[panels.length-1]===panelRef.current?'primary':'duplicate');
 },[host,eventId]);
 const [data,setData]=useState<Data|null>(null); const [message,setMessage]=useState(''); const [sender,setSender]=useState(''); const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [busy,setBusy]=useState(false);
 const url=`/api/events/${encodeURIComponent(eventId)}/shoutouts`;
 const headers=useCallback(async()=>{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Sign in to manage shout-outs.');return {Authorization:`Bearer ${session.access_token}`};},[]);
 const refresh=useCallback(async()=>{try{const response=await fetch(url+(host?'?host=1':''),{headers:host?await headers():{},cache:'no-store'});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to load shout-outs.');setData(result);}catch(e){if(host)setError(e instanceof Error?e.message:'Unable to load shout-outs.');}},[url,host,headers]);
 useEffect(()=>{if(instance!=='primary')return;void refresh();const timer=window.setInterval(()=>void refresh(),10000);return()=>window.clearInterval(timer);},[refresh,instance]);
 async function act(body:object,method:'PATCH'|'POST') {if(busy)return;setBusy(true);setError('');setNotice('');try{const response=await fetch(url,{method,headers:{'Content-Type':'application/json',...(host?await headers():{})},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Unable to save.');if(!host){setMessage('');setNotice('Sent to the host for approval!');}await refresh();}catch(e){setError(e instanceof Error?e.message:'Unable to save.');}finally{setBusy(false);}}
 if(instance==='duplicate'||(!host && !data?.enabled))return null;
 return <details ref={panelRef} data-host-shoutout-panel={host?'':undefined} className={styles.panel}><summary className={styles.toggle}><strong>{host?'📣 Live shout-outs':'📣 Send a shout-out'}</strong><span>{host?(!data?(error?'Unavailable':'Loading…'):data.enabled?'On':'Off')+(data?.messages?.filter(x=>x.status==='pending').length?` · ${data.messages.filter(x=>x.status==='pending').length} to review`:''):'Cheer on the singer'}</span><span aria-hidden="true">⌄</span></summary><div className={styles.body}>
 {host?<><label className={styles.setting}><input type="checkbox" checked={!!data?.enabled} disabled={busy||!data||data.closed} onChange={e=>void act({action:'settings',enabled:e.target.checked},'PATCH')} /><span><strong>Allow shout-outs for this show</strong><small>Guests can send cheers for the host to review.</small></span></label><p>Approved messages appear on Stage Mode for up to five minutes.</p>{data?.closed&&<p>Shout-outs are closed because the show has ended.</p>}{data?.messages.map(item=><div className={styles.item} key={item.id}><div><strong>{item.sender||'Guest'}</strong> <span>{item.message}</span><small>{item.status==='pending'?'Awaiting approval':'Approved'}</small></div><div>{item.status==='pending'&&<button disabled={busy} onClick={()=>void act({action:'approve',id:item.id},'PATCH')}>Approve</button>}<button disabled={busy} onClick={()=>void act({action:'hide',id:item.id},'PATCH')}>Remove</button></div></div>)}{data&&!data.messages.length&&<p>No shout-outs yet.</p>}</>:<><p>Choose a cheer or write your own. The host reviews it before it appears on the TV.</p><div className={styles.presets}>{['Killing it! 🔥','Great song! 👏','You’ve got this! 🎤'].map(p=><button type="button" key={p} onClick={()=>setMessage(p)}>{p}</button>)}</div><label>Your name (optional)<input value={sender} maxLength={30} onChange={e=>setSender(e.target.value)} /></label><label>Shout-out<input value={message} maxLength={100} onChange={e=>setMessage(e.target.value)} placeholder="You're amazing!" /></label><button disabled={busy||!message.trim()} onClick={()=>void act({message,sender},'POST')}>Send to host</button></>}
 {notice&&<p role="status">{notice}</p>}{error&&<p role="alert">{error}</p>}</div></details>;
}
