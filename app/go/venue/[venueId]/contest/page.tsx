'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import styles from '@/components/contest/SideContest.module.css';
export default function StaticVenueContest() {
 const {venueId}=useParams<{venueId:string}>();
 const router=useRouter();
 const [message,setMessage]=useState('Finding the venue’s current contest…');
 useEffect(()=>{
  let active=true;
  async function resolve() {
   try {
   const response=await fetch('/api/contests/resolve?venueId='+encodeURIComponent(venueId),{cache:'no-store'});
   if(!response.ok)throw new Error('resolve failed');
   const {contestId}=await response.json();
   if(!active)return;
   if(contestId)router.replace('/contest/'+contestId);
   else setMessage('No active contest is available right now. Keep this page open or ask your host.');
   } catch { if(active)setMessage('Unable to load the contest right now. Please refresh or ask your host.'); }
  }
  resolve(); const timer=setInterval(resolve,5000);
  return()=>{active=false;clearInterval(timer);};
 },[venueId,router]);
 return <main className={styles.page}><div className={styles.wrap}><section className={styles.hero}>
  <span className={styles.kicker}>StageVotes · People’s Choice</span><h1>Venue contest</h1><p role="status">{message}</p>
 </section></div></main>;
}
