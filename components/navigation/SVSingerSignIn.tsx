'use client';
import {useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import Link from 'next/link';
import {LogIn} from 'lucide-react';
import {supabase} from '@/lib/supabase';
import styles from './SVSingerSignIn.module.css';
export default function SVSingerSignIn(){
 const pathname=usePathname();
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 const [next,setNext]=useState('/my-schedule');
 useEffect(()=>{setNext(window.location.pathname+window.location.search);},[pathname]);
 useEffect(()=>{
  let active=true,revision=0;
  async function check(){const version=++revision;try{const {data:{session},error}=await supabase.auth.getSession();if(active&&version===revision)setSignedIn(!error&&Boolean(session));}catch{if(active&&version===revision)setSignedIn(false);}}
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{revision++;if(active)setSignedIn(Boolean(session));});
  void check();
  const focus=()=>{if(document.visibilityState==='visible')void check();};window.addEventListener('focus',focus);
  return()=>{active=false;revision++;subscription.unsubscribe();window.removeEventListener('focus',focus);};
 },[]);
 if(signedIn!==false)return null;
 return <aside className={styles.prompt} aria-label="Singer sign in">
  <div><strong>Welcome to StageVotes</strong><p>Sign in for your songs, badges, and saved nights.</p></div>
  <Link href={`/singer-login?next=${encodeURIComponent(next)}`}><LogIn size={18}/>Sign In</Link>
 </aside>;
}
