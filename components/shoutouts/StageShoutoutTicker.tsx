'use client';
import {useEffect,useRef,useState} from 'react';
import styles from './shoutouts.module.css';
type Message={id:string;message:string;sender:string;approved_at:string};
export default function StageShoutoutTicker({eventId,active}:{eventId:string;active:boolean}) {
 const [messages,setMessages]=useState<Message[]>([]); const [index,setIndex]=useState(0); const [enabled,setEnabled]=useState(false); const last=useRef('');
 useEffect(()=>{let live=true;const refresh=async()=>{try{const r=await fetch(`/api/events/${encodeURIComponent(eventId)}/shoutouts`,{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json();if(live){setEnabled(data.enabled);setMessages(data.messages||[]);}}catch{if(live){setEnabled(false);setMessages([]);}}};void refresh();const timer=window.setInterval(refresh,5000);return()=>{live=false;window.clearInterval(timer);};},[eventId]);
 useEffect(()=>{const timer=window.setInterval(()=>setIndex(i=>i+1),8000);return()=>window.clearInterval(timer);},[]);
 useEffect(()=>{if(last.current!==eventId){last.current=eventId;setIndex(0);}},[eventId]);
 if(!active||!enabled||!messages.length||index%2===1)return null;
 const item=messages[Math.floor(index/2)%messages.length];
 return <div className={styles.ticker} role="status"><span>📣 SHOUT-OUT</span><strong>{item.message}</strong>{item.sender&&<small>— {item.sender}</small>}</div>;
}
