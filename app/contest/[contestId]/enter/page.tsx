'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import type {SideContest} from '@/lib/sideContest';
import styles from '@/components/contest/SideContest.module.css';
type Entry={number:number;name:string;costume:string;approval_status:'pending'|'approved'|'rejected'};
export default function ContestEntryPage() {
 const {contestId}=useParams<{contestId:string}>();
 const [contest,setContest]=useState<SideContest|null>(null);
 const [entry,setEntry]=useState<Entry|null>(null);
 const [showEnded,setShowEnded]=useState(false);
 const [venueId,setVenueId]=useState<string|null>(null);
 const [entryKey,setEntryKey]=useState('');
 const [name,setName]=useState('');
 const [costume,setCostume]=useState('');
 const [photo,setPhoto]=useState<File|null>(null);
 const [busy,setBusy]=useState(false);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState('');
 useEffect(()=>{
  setEntry(null);setContest(null);setLoading(true);setShowEnded(false);setVenueId(null);setMessage('');
  const storageKey='stagevotes_contest_entry_'+contestId;
  let key=localStorage.getItem(storageKey)||localStorage.getItem('stagevotes_contest_entrant');
  if(!key)key=crypto.randomUUID();
  localStorage.setItem(storageKey,key);
  setEntryKey(key);
  let active=true;
  async function refresh() {
   try {
   const response=await fetch('/api/contests/resolve?contestId='+encodeURIComponent(contestId),{cache:'no-store'});
   if(!response.ok)throw new Error('Unable to check show');
   const context=await response.json();
   if(!active)return;
   setShowEnded(context.ended===true);setVenueId(context.venueId||null);
   if(context.ended){setEntry(null);setLoading(false);return;}
   const [contestResult,entryResult]=await Promise.all([
    supabase.rpc('side_contest_snapshot',{p_contest_id:contestId,p_voter_key:null}),
    supabase.rpc('my_side_contest_entry',{p_contest_id:contestId,p_entry_key:key})
   ]);
   if(!active)return;
   if(contestResult.error)setMessage('Unable to load this contest. Please ask your host.');
   else setContest(contestResult.data);
   if(!entryResult.error)setEntry(entryResult.data || null);
   else setMessage('Unable to check your entry. Please refresh or ask your host.');
   setLoading(false);
   } catch {if(active){setMessage('Unable to check this show. Please refresh or ask your host.');setLoading(false);setContest(null);}}
  }
  refresh();const timer=setInterval(refresh,5000);
  return()=>{active=false;clearInterval(timer);};
 },[contestId,entryKey]);
 function addAnother() {
  const key=crypto.randomUUID();
  localStorage.setItem('stagevotes_contest_entry_'+contestId,key);
  setEntry(null);setName('');setCostume('');setPhoto(null);setMessage('');setLoading(true);setEntryKey(key);
 }
 async function submit(e:React.FormEvent) {
  e.preventDefault();if(busy||!entryKey)return;
  setBusy(true);setMessage('');
  try{
   const form=new FormData();
   form.set('contestId',contestId);form.set('entryKey',entryKey);form.set('name',name.trim());form.set('costume',costume.trim());
   if(photo)form.set('photo',photo);
   const response=await fetch('/api/contests/entry',{method:'POST',body:form});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error||'Unable to submit entry.');
   setMessage(result.warning||'Your entry was received. The host will review it.');
   const {data}=await supabase.rpc('my_side_contest_entry',{p_contest_id:contestId,p_entry_key:entryKey});
   setEntry(data||{number:0,name:name.trim(),costume:costume.trim(),approval_status:'pending'});
  }catch(error:any){setMessage(error.message||'Unable to submit entry.');}
  finally{setBusy(false);}
 }
 return <main className={styles.page}><div className={styles.wrap}>
  <header className={styles.hero}><span className={styles.kicker}>StageVotes · Contest entry</span><h1>{contest?.title||'Enter the contest'}</h1>
   <p>Enter yourself, a family member, or another contestant for host approval.</p></header>
  {message&&<div className={styles.message} role="status">{message}</div>}
  {loading?<p>Loading…</p>:showEnded?<section className={styles.card}><h2>This show has ended</h2><p>This entry belongs to a previous show.</p>{venueId&&<a className={styles.button} href={'/go/venue/'+venueId+'/contest/enter'}>Find the current contest</a>}</section>:entry?<section className={styles.card}>
   <h2>{entry.approval_status==='approved'?'✓ You’re in!':entry.approval_status==='rejected'?'Please see your host':'Entry received'}</h2>
   <p>{entry.name}{entry.number>0?' · Contestant #'+entry.number:''}</p><p>{entry.costume}</p>
   <p>{entry.approval_status==='approved'?'Your costume is approved and appears on the ballot.':entry.approval_status==='pending'?'Waiting for the host to approve your entry. Keep this page open for updates.':'Your entry was not approved. Ask your host for help.'}</p>
   <a className={styles.secondary} href={'/contest/'+contestId}>Open voting page</a>
   {contest?.status==='draft'&&contest.registrations_open&&<p><button type="button" className={styles.button} onClick={addAnother}>Add another contestant</button></p>}
  </section>:contest?.status==='draft'&&contest.registrations_open?<form className={styles.card} onSubmit={submit}>
   <label className={styles.field}><span>Contestant name</span><input className={styles.input} required maxLength={100} value={name} onChange={e=>setName(e.target.value)} disabled={busy}/></label>
   <label className={styles.field}><span>Costume description</span><input className={styles.input} maxLength={200} value={costume} onChange={e=>setCostume(e.target.value)} disabled={busy}/></label>
   <label className={styles.field}><span>Photo (optional) · JPG, PNG, WebP, under 3 MB</span><input className={styles.input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setPhoto(e.target.files?.[0]||null)} disabled={busy}/></label>
   <p className={styles.muted}>The contestant’s name, costume, and photo will appear on the public ballot if approved. You can submit another contestant after this entry. Voting limits are unchanged. Ask the host to change an existing entry.</p>
   <button className={styles.button} disabled={busy}>{busy?'Submitting…':'Submit contestant'}</button>
  </form>:<section className={styles.card}><h2>Entries are closed</h2><p>Please see your host if you need help.</p></section>}
 </div></main>;
}
