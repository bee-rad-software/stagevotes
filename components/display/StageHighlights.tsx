'use client';
import {useEffect,useRef,useState} from 'react';
import {QRCodeSVG} from 'qrcode.react';
import {chooseStageHighlight,type HighlightBadge} from '@/lib/stageHighlights';
import styles from './BetweenSingers.module.css';
const memory=new Map<string,unknown>();
function read(key:string,fallback:any){try{return JSON.parse(localStorage.getItem(key)||'null')??memory.get(key)??fallback;}catch{return memory.get(key)??fallback;}}
function write(key:string,value:unknown){memory.set(key,value);try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
export default function StageHighlights({eventId,badges,shoutouts,showQr,signupUrl}:{eventId:string;badges:HighlightBadge[];shoutouts:string[];showQr:boolean;signupUrl:string}){
 const seenKey='stage-milestones-seen:'+eventId,turnKey='stage-highlight-turn:'+eventId;
 const [card]=useState(()=>{const seen=read(seenKey,[]),turn=read(turnKey,0);return chooseStageHighlight(badges,Array.isArray(seen)?seen:[],shoutouts,showQr,typeof turn==='number'&&Number.isFinite(turn)?turn:0);});
 const counted=useRef(false);
 useEffect(()=>{
  if(!counted.current){counted.current=true;try{const turn=Number(read(turnKey,0));write(turnKey,Number.isFinite(turn)?turn+1:1);}catch{}}
  if(card.kind!=='badge')return;
  const timer=setTimeout(()=>{try{const old=read(seenKey,[]);write(seenKey,[...new Set([...(Array.isArray(old)?old:[]),card.badge.id])]);}catch{}},6000);
  return()=>clearTimeout(timer);
 },[card,seenKey,turnKey]);
 // If signups close while this card is on screen, remove the QR immediately.
 if(card.kind==='signup'&&!showQr)return <div className={styles.card}><span className={styles.kicker}>ENJOY THE SHOW</span><h2>Give our singers a hand!</h2></div>;
 return <div className={styles.card} role="status">
  <span className={styles.kicker}>{card.kind==='badge'?'A MOMENT WORTH CELEBRATING':card.kind==='shoutout'?'A SHOUT-OUT FROM YOUR HOST':card.kind==='signup'?'YOUR NEXT GREAT MEMORY STARTS HERE':'GOOD COMPANY. GREAT MUSIC.'}</span>
  {card.kind==='badge'?<><span className={styles.icon} aria-hidden="true">{card.badge.icon}</span><h2>{card.badge.singer}</h2><p className={styles.achievement}>{card.badge.title}</p><p>Earned tonight. Give them a hand!</p></>:card.kind==='shoutout'?<><span className={styles.icon} aria-hidden="true">📣</span><h2 className={styles.promotion}>{card.text}</h2></>:card.kind==='signup'?<><h2>You could be up here.</h2><div className={styles.signupQr}><QRCodeSVG value={signupUrl} size={220} marginSize={4}/></div><p>Scan to pick a song and join the queue.</p></>:<><h2>Give our singers a hand!</h2><p>The next great chorus is just around the corner.</p></>}
 </div>;
}
