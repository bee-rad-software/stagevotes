'use client';
import {useEffect,useState} from 'react';
import {submissionAge} from '@/lib/hostActivity';
export function useSubmissionClock(active:boolean){const [now,setNow]=useState(Date.now());useEffect(()=>{if(!active)return;setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[active]);return now;}
export default function SubmissionTime({createdAt,now}:{createdAt:string;now:number}){
 const age=submissionAge(createdAt,now);if(!age)return null;
 const date=new Date(createdAt);
 return <small style={{display:'block',color:'#aebdd0',marginTop:4}}><time dateTime={createdAt} title={date.toLocaleString()}>Submitted {age} · {date.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}</time></small>;
}
