'use client';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { contestRanking, type SideContest } from '@/lib/sideContest';
import styles from './SideContest.module.css';

export default function SideContestBallot({ contestId, displayOnly = false }: { contestId: string; displayOnly?: boolean }) {
 const [contest,setContest]=useState<SideContest|null>(null);
 const [message,setMessage]=useState('');
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [choice,setChoice]=useState<{categoryId:string;entryId:string}|null>(null);
 const [voterKey,setVoterKey]=useState('');
 const confirmation=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  if(choice&&!confirmation.current?.open)confirmation.current?.showModal();
  if(!choice&&confirmation.current?.open)confirmation.current?.close();
 },[choice]);
 useEffect(() => {
  let key=localStorage.getItem('stagevotes_contest_voter');
  if(!key) { key=crypto.randomUUID();localStorage.setItem('stagevotes_contest_voter',key); }
  setVoterKey(key);
  let active=true;
  async function refresh() {
   const {data,error}=await supabase.rpc('side_contest_snapshot',{p_contest_id:contestId,p_voter_key:displayOnly?null:key});
   if(!active)return;
   if(error) { setMessage('Unable to load this contest. Please refresh or ask your host.'); }
   else { setContest(data); }
   setLoading(false);
  }
  refresh(); const timer=setInterval(refresh,5000);
  return()=>{active=false;clearInterval(timer);};
 },[contestId,displayOnly]);
 async function castVote() {
  if(!choice||busy||!voterKey)return;
  setBusy(true);setMessage('');
  const {error}=await supabase.rpc('cast_side_contest_vote',{p_contest_id:contestId,p_category_id:choice.categoryId,p_entry_id:choice.entryId,p_voter_key:voterKey});
  if(error)setMessage(error.message);
  else {
   setMessage('Your vote was counted. Thank you!');
   const {data}=await supabase.rpc('side_contest_snapshot',{p_contest_id:contestId,p_voter_key:voterKey});
   if(data)setContest(data);
   else setContest(c=>c?{...c,selections:{...c.selections,[choice.categoryId]:choice.entryId}}:c);
  }
  setChoice(null);setBusy(false);
 }
 if(loading)return <main className={styles.page}><p>Loading contest…</p></main>;
 if(!contest)return <main className={styles.page}><p role="alert">{message}</p></main>;
 const revealed=contest.status==='closed'&&contest.results_visible;
 return <main className={styles.page}><div className={styles.wrap+' '+(displayOnly?styles.display:'')}>
  <header className={styles.hero}><span className={styles.kicker}>StageVotes · People's Choice</span><h1>{contest.title}</h1>
   <p>{contest.status==='open'?'Voting is open':revealed?'Results':'Voting is '+(contest.status==='draft'?'not open yet':'closed')}</p>
   {!displayOnly&&<p className={styles.muted}>One vote per device{contest.mode==='categories'?' in each category':' for this contest'}. Votes are final.</p>}
  </header>
  {message&&<div role="status" className={styles.message}>{message}</div>}
  {revealed ? contest.categories.map(category=>{
   const ranked=contestRanking(contest,category.id);
   const top=ranked[0]?.votes||0;
   const winners=ranked.filter(r=>r.rank===1&&r.votes>0);
   return <section key={category.id} className={styles.card}><h2>{category.name}</h2>
    <p className={styles.kicker}>{top===0?'No votes were cast':winners.length>1?'Tie for first place':'Winner'}</p>
    {winners.map(w=><h2 key={w.id}>#{w.number} · {w.name}</h2>)}
    {ranked.map(r=><div className={styles.result} key={r.id}><span>{r.rank}. #{r.number} {r.name}</span><strong>{r.votes} votes</strong></div>)}
   </section>;
  }) : displayOnly ? <section className={styles.card}><h2>{contest.status==='open'?'Voting in progress':'Results coming soon'}</h2><p>The host will reveal the winners after voting closes.</p></section> :
  contest.categories.map(category=><section key={category.id} className={styles.card}>
   <h2>{category.name}</h2>
   {contest.selections[category.id]&&<p className={styles.message}>✓ You voted for #{contest.entries.find(e=>e.id===contest.selections[category.id])?.number}. Your vote is saved.</p>}
   <div className={styles.grid}>{contest.entries.map(entry=><article className={styles.entry} key={entry.id}>
    {entry.photo_url?<img className={styles.photo} src={entry.photo_url} alt={entry.name+' costume'} />:<div className={styles.placeholder}>#{entry.number}</div>}
    <h3>#{entry.number} · {entry.name}</h3><p className={styles.muted}>{entry.costume}</p>
    <button type="button" className={styles.button} disabled={busy||contest.status!=='open'||!!contest.selections[category.id]}
     onClick={()=>setChoice({categoryId:category.id,entryId:entry.id})}>Vote for #{entry.number}</button>
   </article>)}</div>
   {!contest.entries.length&&<p>Contestants will appear here when added by the host.</p>}
  </section>)}
  <dialog ref={confirmation} className={styles.card} style={{margin:"auto",maxWidth:500,color:"#fff"}} onCancel={()=>setChoice(null)} aria-label="Confirm your vote">{choice&&<>
   <h2>Confirm your vote</h2><p>{contest.categories.find(c=>c.id===choice.categoryId)?.name}: <strong>{contest.entries.find(e=>e.id===choice.entryId)?.name}</strong></p>
   <p>This choice cannot be changed after you submit.</p>
   <div className={styles.row}><button className={styles.button} disabled={busy} onClick={castVote}>{busy?'Submitting…':'Confirm vote'}</button><button className={styles.secondary} disabled={busy} onClick={()=>setChoice(null)}>Cancel</button></div>
  </>}</dialog>
 </div></main>;
}
