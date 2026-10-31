'use client';
import {useCallback,useEffect,useRef} from 'react';
import {supabase} from '@/lib/supabase';
/** A transient, show-scoped playback notification; never persists display mode. */
export function useStageLyricsSignal(eventId:string|undefined,onPlay?:()=>void,onBetween?:()=>void) {
 const callback=useRef(onPlay);callback.current=onPlay;
 const betweenCallback=useRef(onBetween);betweenCallback.current=onBetween;
 const realtime=useRef<ReturnType<typeof supabase.channel>|null>(null);
 const local=useRef<BroadcastChannel|null>(null);
 useEffect(()=>{
  if(!eventId)return;
  const receive=(payload:any)=>{if(payload?.eventId===eventId&&typeof payload?.at==='number'&&Math.abs(Date.now()-payload.at)<15000){if(payload.action==='between')betweenCallback.current?.();else if(!payload.action||payload.action==='play')callback.current?.();}};
  const channel=supabase.channel('stage-lyrics:'+eventId).on('broadcast',{event:'play'},message=>receive(message.payload)).subscribe();
  realtime.current=channel;
  let localChannel:BroadcastChannel|null=null;
  try{localChannel=new BroadcastChannel('stage-lyrics:'+eventId);localChannel.onmessage=e=>receive(e.data);local.current=localChannel;}catch{/* Realtime still supports separate devices. */}
  return()=>{if(realtime.current===channel)realtime.current=null;void supabase.removeChannel(channel);localChannel?.close();if(local.current===localChannel)local.current=null;};
 },[eventId]);
 return useCallback((action:'play'|'between'='play')=>{
  if(!eventId)return;
  const payload={eventId,at:Date.now(),action};
  try{local.current?.postMessage(payload);}catch{}
  void realtime.current?.send({type:'broadcast',event:'play',payload}).catch(()=>{});
 },[eventId]);
}
