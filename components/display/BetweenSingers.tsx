'use client';
import {useEffect,useState,type ReactNode} from 'react';
import NextSingerSpotlight from './NextSingerSpotlight';
import {audienceSlots} from '@/lib/stageAudienceContent';
import {StageShowPhoto,StageTrivia,useStagePhotos} from './StageAudienceMoments';
import type {StageSinger} from './StageBackdrop';
import styles from './BetweenSingers.module.css';
export default function BetweenSingers({active,eventId,nextSinger,intro,promotions,highlight}:{active:boolean;eventId:string;nextSinger?:StageSinger;intro:string;singers:StageSinger[];promotions:string[];highlight?:ReactNode}){
 const [tick,setTick]=useState(0);
 const {photos,remove}=useStagePhotos(eventId,active);
 const signature=promotions.join('\n');
 const promos=promotions.filter(p=>p.trim());
 const slots=audienceSlots(Boolean(nextSinger),true,Boolean(highlight),promos.length);
 const slot=slots[tick%slots.length];
 useEffect(()=>{setTick(0);},[active,eventId,nextSinger?.id,signature]);
 useEffect(()=>{if(!active)return;if(slot==='photo'&&!photos.length){setTick(t=>t+1);return;}const timer=setTimeout(()=>setTick(t=>t+1),slot==='trivia'?18000:9000);return()=>clearTimeout(timer);},[active,tick,slot,eventId,photos.length]);
 if(!active)return null;
 if(slot==='trivia')return <StageTrivia key={'trivia:'+tick} eventId={eventId}/>;
 if(slot==='photo')return <StageShowPhoto key={'photo:'+tick} eventId={eventId} photos={photos} onFailed={remove}/>;
 if(slot==='highlight')return <div key={tick} className={styles.highlightSlot}>{highlight}</div>;
 if(slot==='next'&&nextSinger)return <NextSingerSpotlight singer={nextSinger} intro={intro}/>;
 return <div className={styles.card} key={slot} role="region" aria-label="From your venue">
  <span className={styles.kicker}>FROM YOUR VENUE</span><span className={styles.icon} aria-hidden="true">✦</span><h2 className={styles.promotion}>{promos[Number(slot.split(':')[1])]}</h2><p>Make a night of it.</p>
 </div>;
}
