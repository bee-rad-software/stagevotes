'use client';
import {useEffect,useState} from 'react';
import {supabase} from '@/lib/supabase';
import styles from './ContestAwards.module.css';
type Winner={id:string;number:number;name:string;costume:string;photo_url:string|null;votes:number;rank:number};
type Awards={title:string;category:string;category_id:string|null;step:number;closed:boolean;winners:Winner[]};
export default function ContestAwards({contestId}:{contestId:string}) {
 const [awards,setAwards]=useState<Awards|null>(null);
 const [message,setMessage]=useState('Preparing the awards stage…');
 useEffect(()=>{
  let active=true;
  async function refresh(){
   const {data,error}=await supabase.rpc('contest_awards_snapshot',{p_contest_id:contestId});
   if(!active)return;
   if(error)setMessage('The awards display is not ready. Please ask the host.');
   else{setAwards(data);setMessage('');}
  }
  refresh();const timer=setInterval(refresh,1500);
  return()=>{active=false;clearInterval(timer);};
 },[contestId]);
 const labels:Record<number,string>={1:'FIRST PLACE',2:'SECOND PLACE',3:'THIRD PLACE'};
 return <main className={styles.page}>
  <div className={styles.controls}><button onClick={()=>{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen().catch(()=>{});}}>Full screen</button></div>
  <header className={styles.header}><p className={styles.kicker}>StageVotes · Awards Night</p><h1 className={styles.title}>{awards?.title||'People’s Choice Awards'}</h1><h2 className={styles.category}>{awards?.category}</h2></header>
  {message&&<p role="status">{message}</p>}
  {!awards||!awards.closed||awards.step===0?<section className={styles.waiting}><p>{awards?.closed?'✨ The results are in…':'✨ People’s Choice Awards'}</p><h2>{awards?.closed?'Who will take the crown?':'Voting is still in progress'}</h2><p>The host will reveal the winners here.</p></section>:
   <div className={styles.stage}>{[2,1,3].map(rank=>{
    const visible=rank>=4-awards.step;
    const winners=awards.winners.filter(w=>w.rank===rank);
    const theme=rank===1?styles.gold:rank===2?styles.silver:styles.bronze;
    return <section className={styles.slot+' '+theme} key={rank}>
     {visible?<div className={styles.cards}>{winners.length?winners.map(w=><article className={styles.card} key={awards.category_id+w.id}>
      <div className={styles.medal}>{rank===1?'👑':rank===2?'🥈':'🥉'} {labels[rank]}{winners.length>1?' · TIE':''}</div>
      {w.photo_url?<img className={styles.photo} src={w.photo_url} alt={w.name+' costume'}/>:<div className={styles.placeholder}>#{w.number}</div>}
      <h2 className={styles.name}>{w.name}</h2><p className={styles.costume}>{w.costume}</p><p>#{w.number} · {w.votes} votes</p>
     </article>):<div className={styles.hidden}>{awards.winners.length?'No separate placement here':'No winner at this placement'}</div>}</div>:
      <div className={styles.hidden}>{labels[rank]}<br/>Coming up…</div>}
     <div className={styles.podium}>{rank===1?'1st':rank===2?'2nd':'3rd'}</div>
    </section>;
   })}</div>}
  {awards?.step===3&&awards.winners.some(w=>w.rank===1)&&<div className={styles.sparkles} key={awards.category_id} aria-hidden="true">
   {Array.from({length:60},(_,i)=><span key={i} style={{left:(i*37%100)+'%',animationDelay:(i%12)*.12+'s',background:['#fbbf24','#fb923c','#a78bfa','#38bdf8'][i%4]}}/>)}
  </div>}
 </main>;
}
