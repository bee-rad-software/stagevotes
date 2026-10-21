'use client';
import {useEffect,useState} from 'react';
import {Download,Smartphone} from 'lucide-react';
import styles from './SVInstallSingerApp.module.css';
type InstallEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
export default function SVInstallSingerApp(){
 const [ready,setReady]=useState(false),[hidden,setHidden]=useState(false),[ios,setIos]=useState(false),[prompt,setPrompt]=useState<InstallEvent|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{
  const display=window.matchMedia('(display-mode: standalone)');
  const nav=navigator as Navigator & {standalone?:boolean};
  const desktop=(window as Window & {stagevotesDesktop?:{isDesktop?:boolean}}).stagevotesDesktop?.isDesktop;
  const update=()=>setHidden(Boolean(desktop||display.matches||nav.standalone));
  setIos(/iPad|iPhone|iPod/.test(nav.userAgent)||(nav.platform==='MacIntel'&&nav.maxTouchPoints>1));update();setReady(true);
  const before=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
  const installed=()=>{setPrompt(null);setHidden(true);};
  window.addEventListener('beforeinstallprompt',before);window.addEventListener('appinstalled',installed);display.addEventListener('change',update);
  return()=>{window.removeEventListener('beforeinstallprompt',before);window.removeEventListener('appinstalled',installed);display.removeEventListener('change',update);};
 },[]);
 async function install(){if(!prompt||busy)return;setBusy(true);setMessage('');try{await prompt.prompt();const result=await prompt.userChoice;setPrompt(null);setMessage(result.outcome==='accepted'?'Installation requested. Open StageVotes from your home screen.':'You can install later using your browser’s menu.');}catch{setPrompt(null);setMessage('Use the browser menu instructions below to add StageVotes.');}finally{setBusy(false);}}
 if(!ready||hidden)return null;
 return <details className={styles.panel}><summary><Smartphone size={18}/><span>Get StageVotes on your home screen</span><span className={styles.more}>+</span></summary>
  <div className={styles.body}><p>Keep your schedule, songs, badges, and show memories one tap away. Free for singers.</p>
  {prompt&&<button type="button" disabled={busy} onClick={()=>void install()}><Download size={17}/>{busy?'Opening installer…':'Install StageVotes'}</button>}
  {ios?<ol><li>Open this page in <strong>Safari</strong> if you’re viewing it inside another app.</li><li>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>. You may need to scroll through the actions.</li><li>Tap <strong>Add</strong>, then open the StageVotes icon on your home screen.</li></ol>:<p>Open your browser’s menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. If neither appears, open this page in Chrome on Android or Safari on iPhone.</p>}
  <small>The icon opens your singer schedule. You may need to sign in once inside the installed app using your existing StageVotes account. You can keep using this page without installing.</small>
  {message&&<p role="status">{message}</p>}
  </div></details>;
}
