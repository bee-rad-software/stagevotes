'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import styles from './SideContest.module.css';
export default function ContestEntryApproval({eventId,editable}:{eventId:string;editable:boolean}) {
 const [required,setRequired]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void supabase.rpc('contest_entry_approval_setting',{p_event_id:eventId}).then(({data,error})=>{if(!active)return;if(error)setMessage('Entry approval settings need the latest database update.');else setRequired(data);});return()=>{active=false;};},[eventId]);
 async function change(value:boolean){setBusy(true);setMessage('');const {data,error}=await supabase.rpc('contest_entry_approval_setting',{p_event_id:eventId,p_required:value});if(error)setMessage(error.message);else{setRequired(data);setMessage('Saved. This applies to new entries. Existing pending entries still need review.');}setBusy(false);}
 return <div className={styles.approvalPanel}>
  <div className={styles.approvalRow}>
   <div className={styles.approvalCopy}><span className={styles.settingEyebrow}>ENTRY APPROVAL</span><h3 id="entry-approval-label">Review entries before they go live</h3><p id="entry-approval-description">{required===null?'Loading approval settings…':required?'You approve each new phone entry before it appears on the ballot.':'New phone entries go straight onto the ballot.'}</p></div>
   <div className={styles.switchGroup}><button type="button" role="switch" aria-checked={required!==false} aria-labelledby="entry-approval-label" aria-describedby="entry-approval-description" className={styles.approvalSwitch} disabled={required===null||busy||!editable} onClick={()=>void change(!required)}><span/></button><span className={styles.switchState}>{busy?'Saving…':required===null?'Loading':required?'On':'Off'}</span></div>
  </div>
  <p className={styles.settingHint}>{editable?'Applies to new entries. Existing pending entries still need review.':'Approval settings are locked after voting opens.'}</p>
  {message&&<p className={styles.settingFeedback} role="status">{message}</p>}
 </div>;
}
