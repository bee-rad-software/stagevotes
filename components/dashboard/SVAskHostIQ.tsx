'use client';
import {useEffect,useRef,useState} from 'react';
import type {HostIQChatMessage} from '@/lib/hostIQChat';
const questions=['What needs my attention?','Can everyone sing twice before we close?','When should I close signups?','Explain the queue alerts.'];
export default function SVAskHostIQ({eventId,onAsk}:{eventId:string;onAsk:(question:string,history:HostIQChatMessage[])=>Promise<string>}){
 const [messages,setMessages]=useState<HostIQChatMessage[]>([]);
 const [question,setQuestion]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const requestBusy=useRef(false);
 const generation=useRef(0);
 const transcript=useRef<HTMLDivElement>(null);
 useEffect(()=>{generation.current++;setMessages([]);setQuestion('');setError('');setBusy(false);requestBusy.current=false;},[eventId]);
 useEffect(()=>{if(transcript.current)transcript.current.scrollTop=transcript.current.scrollHeight;},[messages,busy]);
 async function ask(text:string){
  const trimmed=text.trim();if(!trimmed||requestBusy.current)return;
  requestBusy.current=true;setBusy(true);setError('');setQuestion('');
  const previous=messages;const turn=generation.current;
  setMessages(m=>[...m,{role:'user',content:trimmed}]);
  try{const answer=await onAsk(trimmed,previous.slice(-8));if(turn===generation.current)setMessages(m=>[...m,{role:'assistant',content:answer}]);}
  catch(e:any){if(turn===generation.current){setError(e.message||'Unable to answer right now.');setQuestion(trimmed);setMessages(previous);}}
  finally{if(turn===generation.current){setBusy(false);requestBusy.current=false;}}
 }
 return <section style={{marginTop:18,padding:18,borderRadius:14,border:'1px solid #38bdf8',background:'rgba(14,116,144,.09)'}}>
  <strong style={{color:'#7dd3fc',fontSize:18}}>💬 Ask Host IQ</strong>
  <p style={{color:'#94a3b8',fontSize:13}}>Ask about tonight’s queue, timing, singer turns, or alerts. Answers use a fresh queue snapshot.</p>
  <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
   {questions.map(q=><button key={q} type="button" className="btn-small" disabled={busy} onClick={()=>ask(q)}>{q}</button>)}
  </div>
  {!!messages.length&&<div ref={transcript} role="log" aria-label="Host IQ conversation" aria-live="polite" style={{maxHeight:360,overflowY:'auto',display:'grid',gap:10,marginBottom:14}}>
   {messages.map((m,i)=><div key={i} style={{padding:12,borderRadius:12,background:m.role==='user'?'#16344b':'#0b1425',border:'1px solid #334155'}}>
    <strong style={{fontSize:12,color:m.role==='user'?'#cbd5e1':'#7dd3fc'}}>{m.role==='user'?'You':'Host IQ'}</strong>
    <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'6px 0',fontSize:14}}>{m.content}</p>
   </div>)}
  </div>}
  {busy&&<p role="status" style={{color:'#7dd3fc'}}>Checking the show…</p>}
  {error&&<p role="alert" style={{color:'#fca5a5'}}>{error}</p>}
  <form onSubmit={e=>{e.preventDefault();ask(question);}} style={{display:'flex',gap:10,alignItems:'flex-end',flexWrap:'wrap'}}>
   <label style={{flex:'1 1 260px'}}><span style={{display:'block',fontSize:12,marginBottom:6}}>Your question</span>
    <textarea rows={2} maxLength={1200} value={question} onChange={e=>setQuestion(e.target.value)} disabled={busy}
     placeholder="What should I do next?"
     style={{width:'100%',boxSizing:'border-box',padding:12,borderRadius:12,border:'1px solid #64748b',background:'#071126',color:'#fff',fontSize:16}}/>
   </label>
   <button type="submit" className="btn-small primary" disabled={busy||!question.trim()} style={{minHeight:44}}>{busy?'Thinking…':'Ask Host IQ'}</button>
   {!!messages.length&&<button type="button" className="btn-small" disabled={busy} onClick={()=>{setMessages([]);setError('');}}>Clear chat</button>}
  </form>
  <p style={{fontSize:11,color:'#94a3b8',marginBottom:0}}>Advisory only. Chat never changes your queue, playback, or signup settings. Conversation clears when you leave or reload this screen.</p>
 </section>;
}
