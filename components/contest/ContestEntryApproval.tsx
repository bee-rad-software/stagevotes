'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import styles from './SideContest.module.css';
export default function ContestEntryApproval({eventId,editable}:{eventId:string;editable:boolean}) {
 const [required,setRequired]=useState<boolean|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{let active=true;void supabase.rpc('contest_entry_approval_setting',{p_event_id:eventId}).then(({data,error})=>{if(!active)return;if(error)setMessage('Entry approval settings need the latest database update.');else setRequired(data);});return()=>{active=false;};},[eventId]);
 async function change(value:boolean){setBusy(true);setMessage('');const {data,error}=await supabase.rpc('contest_entry_approval_setting',{p_event_id:eventId,p_required:value});if(error)setMessage(error.message);else{setRequired(data);setMessage('Saved. This applies to new entries. Existing pending entries still need review.');}setBusy(false);}
 return <div><label className={styles.field}><span><input type="checkbox" checked={required!==false} disabled={required===null||busy||!editable} onChange={e=>void change(e.target.checked)}/> Require host approval for new entries</span></label><p className={styles.muted}>{required===false?'New phone entries appear on the ballot automatically.':'New phone entries wait for the host to approve them.'} Change this before voting opens. Existing pending entries still need approval or rejection.</p>{message&&<p role="status">{message}</p>}</div>;
}
