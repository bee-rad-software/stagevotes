'use client';
import {useEffect,useState} from 'react';
import type {WatchdogAlert} from '@/lib/hostQueueWatchdog';
export default function SVHostWatchdog({eventId,alerts,karaFunAvailable,onReview,onFix,onExplain,explaining=false}:{
 eventId:string;alerts:WatchdogAlert[];karaFunAvailable:boolean;
 onReview:(alert:WatchdogAlert)=>void;onFix:(alert:WatchdogAlert)=>Promise<string>;onExplain:()=>void;explaining?:boolean;
}){
 const [dismissed,setDismissed]=useState<Record<string,number>>({});
 const [ready,setReady]=useState(false);
 const [fixing,setFixing]=useState<string|null>(null);
 const [fixMessage,setFixMessage]=useState('');
 async function fix(alert:WatchdogAlert){
  if(fixing)return;
  setFixing(alert.id);setFixMessage('');
  try{setFixMessage(await onFix(alert));}
  catch(error:any){setFixMessage(error.message||'Unable to apply the fix. Please review the issue.');}
  finally{setFixing(null);}
 }
 const [now,setNow]=useState(Date.now());
 useEffect(()=>{
  setReady(false);
  try{setDismissed(JSON.parse(localStorage.getItem('stagevotes_watchdog_'+eventId)||'{}'));}
  catch{setDismissed({});}
  setReady(true);
  const timer=setInterval(()=>setNow(Date.now()),15000);
  return()=>clearInterval(timer);
 },[eventId]);
 function snooze(id:string){
  const next={...dismissed,[id]:Date.now()+10*60000};
  setDismissed(next);
  try{localStorage.setItem('stagevotes_watchdog_'+eventId,JSON.stringify(next));}catch{}
 }
 const visible=ready?alerts.filter(a=>!(dismissed[a.id]>now)):[];
 return <section style={{marginTop:18,padding:18,borderRadius:14,border:'1px solid #475569',background:'rgba(2,8,23,.45)'}}>
  <div style={{display:'flex',justifyContent:'space-between',gap:12,flexWrap:'wrap',alignItems:'center'}}>
   <div><strong style={{color:'#7dd3fc'}}>👀 Live Queue Watchdog</strong>
    <p style={{fontSize:12,color:'#94a3b8',margin:'6px 0'}}>Watches rotation, KaraFun alignment, and long-running performances while this dashboard is open.</p>
   </div><span style={{color:visible.length?'#fde68a':'#86efac'}} aria-live="polite">{visible.length?visible.length+' to review':'No issues detected'}</span>
  </div>
  {!karaFunAvailable&&<p style={{color:'#94a3b8',fontSize:12}}>KaraFun alignment checks are waiting for a connected player.</p>}
  {!visible.length&&<p style={{color:'#cbd5e1',fontSize:13}}>{alerts.length?'Current alerts are snoozed.':'No issues found in the checks currently available. Queue changes always remain under your control.'}</p>}
  {fixMessage&&<p role="status" style={{color:'#cbd5e1',fontSize:13}}>{fixMessage}</p>}
  <div style={{display:'grid',gap:12,marginTop:12}}>
   {visible.map(alert=><article key={alert.id} style={{padding:14,borderRadius:12,border:'1px solid '+(alert.severity==='warning'?'#b45309':'#475569'),background:'#0f172a'}}>
    <strong style={{color:alert.severity==='warning'?'#fdba74':'#fde68a'}}>{alert.title}</strong>
    <p style={{fontSize:13,color:'#cbd5e1',margin:'8px 0'}}>{alert.message}</p>
    <p style={{fontSize:13,color:'#94a3b8'}}>{alert.suggestion}</p>
    <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
     {alert.fixAction&&<button type="button" className="btn-small primary" disabled={!!fixing} onClick={()=>fix(alert)}>{fixing===alert.id?'Working…':alert.fixLabel}</button>}
     <button type="button" className="btn-small" onClick={()=>onReview(alert)}>{alert.action==='review_karafun'?'Review KaraFun':'Review singer'}</button>
     <button type="button" className="btn-small" onClick={()=>snooze(alert.id)}>Snooze 10 min</button>
    </div>
   </article>)}
  </div>
  {!!alerts.length&&<button type="button" className="btn-small primary" disabled={explaining} style={{marginTop:14}} onClick={onExplain}>{explaining?'Thinking…':'Ask AI to explain these issues'}</button>}
  <p style={{fontSize:11,color:'#94a3b8',marginBottom:0}}>Checks refresh automatically. AI explanations run when requested. Alerts never reorder or advance singers automatically.</p>
 </section>;
}
