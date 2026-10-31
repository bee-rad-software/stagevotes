'use client';
import {useEffect,useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import type {StageBadge} from './StageBackdrop';
import styles from './HalloweenParty.module.css';
type Contest={id:string;title:string;status:string;entryCount:number;entries:{id:string;name:string;costume:string;photo_url:string|null}[]};
export default function HalloweenParty({eventId,active,enabled,origin,songs,badges,deadline}:{eventId:string;active:boolean;enabled:boolean;origin:string;songs:number;badges:StageBadge[];deadline:string}) {
 const [contest,setContest]=useState<Contest|null>(null),[tick,setTick]=useState(0),[now,setNow]=useState(0);
 useEffect(()=>{
  setContest(null);setTick(0);
  if(!enabled)return;
  let live=true,busy=false;const controller=new AbortController();
  async function refresh(){if(busy)return;busy=true;try{const response=await fetch('/api/stage-display/'+encodeURIComponent(eventId)+'/halloween',{cache:'no-store',signal:controller.signal});if(!response.ok){if(live)setContest(null);return;}const data=await response.json();if(live)setContest(data.contest||null);}catch{if(live)setContest(null);}finally{busy=false;}}
  void refresh();const poll=setInterval(()=>void refresh(),5000);
  return()=>{live=false;controller.abort();clearInterval(poll);};
 },[eventId,enabled]);
 useEffect(()=>{if(!active)return;setNow(Date.now());const clock=setInterval(()=>setNow(Date.now()),1000),rotate=setInterval(()=>setTick(t=>t+1),8000);return()=>{clearInterval(clock);clearInterval(rotate);};},[active]);
 if(!active||!enabled)return null;
 const entries=contest?.entries||[];
 const badge=badges.find(b=>b.title==='Boo & Belt It!');
 const entry=entries.length?entries[Math.floor(tick/4)%entries.length]:null;
 const slides=[...(entry?[{kind:'costume' as const,entry}]:[]),...(contest?.status==='open'?[{kind:'vote' as const}]:[]),...(badge?[{kind:'badge' as const}]:[]),{kind:'stats' as const}];
 const slide=slides[tick%slides.length];
 const seconds=deadline?Math.ceil((new Date(deadline).getTime()-now)/1000):0;
 const votingUrl=origin&&contest?origin+'/contest/'+contest.id:'';
 return <div className={styles.panel} role="region" aria-label="Halloween party spotlight">
  <span className={styles.bats} aria-hidden="true">🦇　✦　🎃　✦　🦇</span>
  {slide.kind==='costume'?<div key={slide.entry.id} className={styles.spotlight}>
   <span className={styles.kicker}>COSTUME SPOTLIGHT · {contest?.title}</span>
   {slide.entry.photo_url&&<img key={slide.entry.photo_url} className={styles.photo} src={slide.entry.photo_url} alt={'Costume worn by '+slide.entry.name} onError={e=>{e.currentTarget.style.display='none';}}/>}
   <h2>{slide.entry.name}</h2><p>{slide.entry.costume||'Dressed to impress. Ready to haunt the stage.'}</p>
  </div>:slide.kind==='vote'?<div className={styles.spotlight}><span className={styles.kicker}>PICK YOUR FAVORITE COSTUME</span><h2>Cast your spooky vote!</h2>{Number.isFinite(seconds)&&seconds>0?<p>Planned voting close in {Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</p>:<p>Voting is open · Scan to join the fun</p>}{votingUrl&&<div className={styles.qr}><QRCodeSVG value={votingUrl} size={150} marginSize={4}/></div>}</div>:slide.kind==='badge'&&badge?<div className={styles.spotlight}><span className={styles.kicker}>BADGE EARNED TONIGHT</span><h2>🎃🎤 Boo &amp; Belt It!</h2><h3>{badge.singer}</h3><p>You brought the costume AND the chorus.</p></div>:<div className={styles.spotlight}><span className={styles.kicker}>TONIGHT’S HAUNTINGLY GOOD COMPANY</span><h2>{songs} songs sung</h2>{contest&&<h3>{contest.entryCount} costumes entered</h3>}<p>Good songs. Great costumes. One unforgettable night.</p></div>}
 </div>;
}
