'use client';
import {useEffect,useState} from 'react';
import type {StageSinger} from './StageBackdrop';
import styles from './NextSingerSpotlight.module.css';
export default function NextSingerSpotlight({singer,intro}:{singer:StageSinger;intro:string}) {
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[singer.photo_url]);
 const name=singer.duet_partner_name?singer.singer_name+' & '+singer.duet_partner_name:singer.singer_name;
 return <div className={styles.spotlight} key={singer.id} role="region" aria-label="Next singer spotlight">
  <span className={styles.eyebrow}>NEXT SINGER SPOTLIGHT</span>
  <div className={styles.portrait}>{singer.photo_url&&!failed?<img src={singer.photo_url} alt={singer.singer_name} onError={()=>setFailed(true)}/>:<span aria-hidden="true">{singer.singer_name.trim().slice(0,1).toUpperCase()||'♫'}</span>}</div>
  <span className={styles.intro}>{intro}</span><h2>{name}</h2><p>{singer.song_title}</p>{singer.artist&&<span className={styles.artist}>{singer.artist}</span>}
  <span className={styles.invitation}>Get ready to cheer them on!</span>
 </div>;
}
