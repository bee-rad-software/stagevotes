'use client';
import {useEffect,useRef,useState} from 'react';
import {stageControlChannel,type StageDisplayCommand,type StageDisplayState} from '@/lib/stageDisplayControl';
import styles from './HostLyricsControls.module.css';
type Connected={id:string;seen:number;state:StageDisplayState};
const views=[['lyrics','Lyrics'],['welcome','Welcome'],['next','Next singer'],['break','Break']] as const;
const themes=[['classic','Classic'],['halloween','Halloween'],['neon','Neon Night'],['country','Country Night'],['holiday','Holiday']] as const;
export default function HostLyricsControls({eventId,requested}:{eventId:string;requested:boolean}) {
 const [screens,setScreens]=useState<Connected[]>([]),[selected,setSelected]=useState(''),[expanded,setExpanded]=useState(true),[message,setMessage]=useState(''),[draft,setDraft]=useState('');
 const channel=useRef<BroadcastChannel|null>(null),pending=useRef<{id:string;timer:ReturnType<typeof setTimeout>}|null>(null);
 useEffect(()=>{
  setScreens([]);setSelected('');setMessage('');setDraft('');
  if(typeof BroadcastChannel==='undefined'){setMessage('Open the host and Lyrics display in the same supported browser or desktop app.');return;}
  const connection=new BroadcastChannel(stageControlChannel(eventId));channel.current=connection;
  connection.onmessage=e=>{const d=e.data;if(d?.eventId!==eventId)return;
   if(d.type==='state'&&typeof d.instanceId==='string'&&d.state){setScreens(old=>[...old.filter(s=>s.id!==d.instanceId),{id:d.instanceId,seen:Date.now(),state:d.state}]);setSelected(old=>old||d.instanceId);}
   if(d.type==='closed')setScreens(old=>old.filter(s=>s.id!==d.instanceId));
   if(d.type==='ack'&&pending.current&&d.commandId===pending.current.id){clearTimeout(pending.current.timer);pending.current=null;setMessage(d.error||d.hint||'Display updated.');}
  };
  const ping=()=>{connection.postMessage({type:'ping',eventId});setScreens(old=>old.filter(s=>Date.now()-s.seen<7000));};
  ping();const timer=setInterval(ping,2000);
  return()=>{clearInterval(timer);if(pending.current){clearTimeout(pending.current.timer);pending.current=null;}connection.close();channel.current=null;};
 },[eventId]);
 const screen=screens.find(s=>s.id===selected)||screens[0],state=screen?.state;
 useEffect(()=>{setDraft(screen?.state.announcement||'');},[screen?.id]);
 function send(command:StageDisplayCommand){if(!screen||!channel.current)return;if(pending.current)clearTimeout(pending.current.timer);const id=crypto.randomUUID();if(command.type==='close'){pending.current=null;setMessage('Display close requested.');channel.current.postMessage({type:'command',eventId,targetId:screen.id,commandId:id,command});return;}pending.current={id,timer:setTimeout(()=>{setMessage('No response from the display. Reopen it and try again.');pending.current=null;},4000)};setMessage('');channel.current.postMessage({type:'command',eventId,targetId:screen.id,commandId:id,command});}
 if(!requested&&!screens.length)return null;
 return <section className={styles.panel} aria-label="Lyrics display controls">
  <header className={styles.header}><div><span className={styles.kicker}>AUDIENCE SCREEN</span><h2>Lyrics display</h2><span className={styles.status} data-connected={Boolean(state)}>{state?'● Connected':'○ Waiting for display'}</span></div><button className={styles.secondary} type="button" aria-expanded={expanded} onClick={()=>setExpanded(v=>!v)}>{expanded?'Hide controls':'Show controls'}</button></header>
  {expanded&&<>{!state?<div className={styles.empty}><p>Open the Lyrics backdrop to control it here. Use this same computer and browser session.</p><button className={styles.primary} type="button" onClick={()=>window.open('/stage-display/'+eventId,'_blank','noopener,noreferrer')}>Open Lyrics display</button></div>:<>
   {screens.length>1&&<label className={styles.field}>Display window<select value={screen.id} onChange={e=>setSelected(e.target.value)}>{screens.map((s,i)=><option value={s.id} key={s.id}>Lyrics display {i+1} · {s.state.theme}</option>)}</select></label>}
   <div className={styles.modeRow}>{views.map(([value,label])=><button type="button" key={value} aria-pressed={state.view===value} onClick={()=>send({type:'view',value})}>{label}</button>)}</div>
   <div className={styles.grid}><label className={styles.field}>Theme<select value={state.theme} onChange={e=>send({type:'theme',value:e.target.value as StageDisplayState['theme']})}>{themes.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
   {state.native&&<label className={styles.field}>TV / monitor<select value={state.displayId} onChange={e=>send({type:'fill',displayId:e.target.value})}>{state.displays.map(d=><option key={d.id} value={d.id}>{d.label} · {d.width}×{d.height}</option>)}</select></label>}
   {state.theme==='halloween'&&<label className={styles.field}>Planned voting close<input type="datetime-local" value={state.votingDeadline} onChange={e=>send({type:'deadline',value:e.target.value})}/><small>Countdown reminder only. Close voting in contest controls.</small></label>}</div>
   <div className={styles.toggles}><label><input type="checkbox" checked={state.singerSpotlight} onChange={e=>send({type:'flag',key:'singerSpotlight',value:e.target.checked})}/> Singer spotlight</label>{state.theme==='halloween'&&<label><input type="checkbox" checked={state.partyEnabled} onChange={e=>send({type:'flag',key:'partyEnabled',value:e.target.checked})}/> Halloween party extras</label>}<label><input type="checkbox" checked={state.guides} onChange={e=>send({type:'flag',key:'guides',value:e.target.checked})}/> Lyrics placement guides</label>{state.handoffSupported&&<label><input type="checkbox" checked={state.autoWindowHandoff} onChange={e=>send({type:'flag',key:'autoWindowHandoff',value:e.target.checked})}/> Auto window handoff</label>}</div>
   <form className={styles.announcement} onSubmit={e=>{e.preventDefault();if(draft.trim())send({type:'announcement',value:draft.trim()});}}><label className={styles.field}>Message for the audience<input value={draft} maxLength={180} placeholder="Last call for costumes!" onChange={e=>setDraft(e.target.value)}/></label><button className={styles.primary} disabled={!draft.trim()}>Show message</button>{state.announcement&&<button type="button" className={styles.secondary} onClick={()=>{send({type:'announcement',value:''});setDraft('');}}>Clear message</button>}</form>
   {state.view==='announcement'&&state.announcement&&<p className={styles.note}>On screen: {state.announcement}</p>}
   <p className={styles.note}>Play returns to Lyrics automatically. Costume winner reveals are controlled from the contest page.</p><div className={styles.actions}>{state.native?<><button type="button" className={styles.secondary} onClick={()=>send({type:'fill',displayId:state.displayId})}>Fill TV</button><button type="button" className={styles.secondary} onClick={()=>send({type:'restore'})}>Restore window</button><button type="button" className={styles.secondary} onClick={()=>send({type:'close'})}>Close display</button></>:<small>Resize the browser display window manually. Native window controls require the desktop app.</small>}</div>
  </>}{message&&<p className={styles.feedback} role="status">{message}</p>}</>}
 </section>;
}
