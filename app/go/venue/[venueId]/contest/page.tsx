'use client';
import {useEffect,useState} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {supabase} from '@/lib/supabase';
import styles from '@/components/contest/SideContest.module.css';
export default function StaticVenueContest() {
 const {venueId}=useParams<{venueId:string}>();
 const router=useRouter();
 const [message,setMessage]=useState('Finding the venue’s current contest…');
 useEffect(()=>{
  let active=true;
  async function resolve() {
   const {data,error}=await supabase.rpc('resolve_venue_contest',{p_venue_id:venueId});
   if(!active)return;
   if(error)setMessage('Unable to load the contest right now. Please refresh or ask your host.');
   else if(data)router.replace('/contest/'+data);
   else setMessage('No contest is set up yet. Keep this page open—it will update when the host creates the contest.');
  }
  resolve(); const timer=setInterval(resolve,5000);
  return()=>{active=false;clearInterval(timer);};
 },[venueId,router]);
 return <main className={styles.page}><div className={styles.wrap}><section className={styles.hero}>
  <span className={styles.kicker}>StageVotes · People’s Choice</span><h1>Venue contest</h1><p role="status">{message}</p>
 </section></div></main>;
}
