'use client';
import {useEffect,useState} from 'react';
import NextSingerSpotlight from './NextSingerSpotlight';
import {tonightStats} from '@/lib/stageIntermission';
import type {StageSinger} from './StageBackdrop';
import styles from './BetweenSingers.module.css';
export default function BetweenSingers({active,eventId,nextSinger,intro,singers,promotions}:{active:boolean;eventId:string;nextSinger?:StageSinger;intro:string;singers:StageSinger[];promotions:string[]}){
 const [tick,setTick]=useState(0);
 const signature=promotions.join('\n');
 useEffect(()=>{setTick(0);if(!active)return;const timer=setInterval(()=>setTick(t=>t+1),9000);return()=>clearInterval(timer);},[active,eventId,nextSinger?.id,signature]);
 if(!active)return null;
 const slots=[...(nextSinger?['next']:[]),'stats',...promotions.filter(p=>p.trim()).map((_,i)=>'promo:'+i)];
 const slot=slots[tick%slots.length];const stats=tonightStats(singers);
 if(slot==='next'&&nextSinger)return <NextSingerSpotlight singer={nextSinger} intro={intro}/>;
 return <div className={styles.card} key={slot} role="region" aria-label={slot==='stats'?'Tonight so far':'From your venue'}>
  <span className={styles.kicker}>{slot==='stats'?'TONIGHT SO FAR':'FROM YOUR VENUE'}</span>
  {slot==='stats'?<><h2>Look what we started.</h2><div className={styles.numbers}><div><strong>{stats.songs}</strong><span>{stats.songs===1?'song sung':'songs sung'}</span></div><div><strong>{stats.singers}</strong><span>{stats.singers===1?'singer on stage':'singers on stage'}</span></div></div><p>Good songs. Great company. Keep it going!</p></>:<><span className={styles.icon} aria-hidden="true">✦</span><h2 className={styles.promotion}>{promotions.filter(p=>p.trim())[Number(slot.split(':')[1])]}</h2><p>Make a night of it.</p></>}
 </div>;
}
