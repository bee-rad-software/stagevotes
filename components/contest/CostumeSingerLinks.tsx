'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import styles from './SideContest.module.css';
type Data={enabled:boolean;entries:{id:string;name:string;singer_profile_id:string|null}[];singers:{id:string;name:string}[]};
export default function CostumeSingerLinks({eventId}:{eventId:string}) {
 const [data,setData]=useState<Data|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 async function load(){const r=await supabase.rpc('costume_badge_host',{p_event_id:eventId});if(r.error)setMessage('Singer badges need the costume badge database update.');else setData(r.data);}
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),5000);return()=>clearInterval(timer);},[eventId]);
 async function update(action:()=>PromiseLike<{error:any}>){setBusy(true);setMessage('');try{const r=await action();if(r.error)throw r.error;await load();setMessage('Saved. Eligible singers receive the badge automatically.');}catch(e:any){setMessage(e.message||'Unable to save.');}finally{setBusy(false);}}
 return <section className={styles.card}><h2>🎃🎤 Boo &amp; Belt It!</h2><p>You brought the costume AND the chorus.</p><p>Link each contestant to their own singer profile. An approved costume entry and a completed song in this show earn the badge. Names are never matched automatically.</p>{message&&<p role="status">{message}</p>}{data&&<><label className={styles.field}><span><input type="checkbox" checked={data.enabled} disabled={busy} onChange={e=>void update(()=>supabase.rpc('costume_badge_host',{p_event_id:eventId,p_enabled:e.target.checked}))}/> Enable the Halloween badge for this contest</span></label>{data.entries.map(entry=><label className={styles.field} key={entry.id}><span>{entry.name} · Singer profile</span><select className={styles.input} value={entry.singer_profile_id||''} disabled={busy} onChange={e=>void update(()=>supabase.rpc('link_costume_singer',{p_entry_id:entry.id,p_profile_id:e.target.value||null}))}><option value="">Not linked</option>{data.singers.map(s=><option key={s.id} value={s.id}>{s.name} · {s.id.slice(0,6)}</option>)}</select></label>)}<p className={styles.muted}>Only singers with a profile and a song in this show appear. You can link them before or after they sing. The badge is earned once per profile; disabling it does not remove earned badges.</p></>}</section>;
}
