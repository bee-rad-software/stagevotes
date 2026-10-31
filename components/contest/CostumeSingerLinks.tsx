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
 return <section className={styles.card+' '+styles.halloweenBadgeCard}>
  <div className={styles.badgeHeader}><div className={styles.badgeMedallion} aria-hidden="true">🎃<span>🎤</span></div><div><span className={styles.settingEyebrow}>HALLOWEEN ACHIEVEMENT</span><h2>Boo &amp; Belt It!</h2><p>You brought the costume AND the chorus.</p></div></div>
  <div className={styles.badgeCriteria}><span>✓ Approved costume entry</span><span aria-hidden="true">＋</span><span>♫ Completed song</span><span className={styles.badgeSameShow}>Same show · One badge per profile</span></div>
  {data?<><div className={styles.approvalPanel}>
   <div className={styles.approvalRow}><div className={styles.approvalCopy}><span className={styles.settingEyebrow}>BADGE SETTINGS</span><h3 id="halloween-badge-label">Enable this badge for the contest</h3><p id="halloween-badge-description">{data.enabled?'Linked singers earn the badge automatically when both requirements are met.':'Turn on to celebrate singers who join the costume contest, too.'}</p></div><div className={styles.switchGroup}><button type="button" role="switch" aria-checked={data.enabled} aria-labelledby="halloween-badge-label" aria-describedby="halloween-badge-description" className={styles.approvalSwitch} disabled={busy} onClick={()=>void update(()=>supabase.rpc('costume_badge_host',{p_event_id:eventId,p_enabled:!data.enabled}))}><span/></button><span className={styles.switchState}>{busy?'Saving…':data.enabled?'On':'Off'}</span></div></div>
   <p className={styles.settingHint}>Turning this off won’t remove badges already earned.</p>
  </div>
  <div className={styles.reviewHeading}><h3>Link contestant profiles <span className={styles.reviewCount}>{data.entries.filter(e=>e.singer_profile_id).length} / {data.entries.length}</span></h3></div>
  <p className={styles.profileIntro}>Choose the correct singer for each contestant. You can link them before or after they sing.</p>
  {data.entries.length?<div className={styles.profileLinkList}>{data.entries.map(entry=><div className={styles.profileLinkRow} key={entry.id}><div><strong>{entry.name}</strong><span className={styles.profileLinkStatus} data-linked={Boolean(entry.singer_profile_id)}>{entry.singer_profile_id?'✓ Profile linked':'Needs a singer profile'}</span></div><label><span className={styles.srOnly}>Singer profile for {entry.name}</span><select className={styles.input} value={entry.singer_profile_id||''} disabled={busy} onChange={e=>void update(()=>supabase.rpc('link_costume_singer',{p_entry_id:entry.id,p_profile_id:e.target.value||null}))}><option value="">Choose a singer profile…</option>{data.singers.map(s=><option key={s.id} value={s.id}>{s.name} · {s.id.slice(0,6)}</option>)}</select></label></div>)}</div>:<div className={styles.reviewEmpty}><span className={styles.reviewCheck} aria-hidden="true">♫</span><div><strong>Ready for your first contestant</strong><p>Contestants will appear here as they enter.</p></div></div>}
  <details className={styles.badgeHelp}><summary>Can’t find a singer?</summary><p>The singer needs a profile and a song in this show to appear in the list. Names are never matched automatically. Each family member needs their own profile link.</p></details>
  </>:!message&&<p className={styles.muted}>Loading badge settings…</p>}
  {message&&<p className={styles.settingFeedback} role="status">{message}</p>}
 </section>;
}
