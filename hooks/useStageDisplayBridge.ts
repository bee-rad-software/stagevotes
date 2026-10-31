'use client';
import {useEffect,useRef} from 'react';
import {stageControlChannel,validStageCommand,type StageDisplayCommand,type StageDisplayState} from '@/lib/stageDisplayControl';
export function useStageDisplayBridge(eventId:string|undefined,state:StageDisplayState,onCommand:(command:StageDisplayCommand)=>Promise<string|void>|string|void) {
 const stateRef=useRef(state);stateRef.current=state;
 const actionRef=useRef(onCommand);actionRef.current=onCommand;
 const channelRef=useRef<BroadcastChannel|null>(null);
 const instance=useRef('');
 useEffect(()=>{
  if(!eventId||typeof BroadcastChannel==='undefined')return;
  instance.current=crypto.randomUUID();
  const id=instance.current,channel=new BroadcastChannel(stageControlChannel(eventId));
  channelRef.current=channel;
  let active=true;
  const report=()=>{if(active)channel.postMessage({type:'state',eventId,instanceId:id,state:stateRef.current});};
  channel.onmessage=async e=>{
   const data=e.data;
   if(data?.eventId!==eventId)return;
   if(data.type==='ping'){report();return;}
   if(data.type!=='command'||data.targetId!==id||typeof data.commandId!=='string'||!validStageCommand(data.command))return;
   try{const hint=await actionRef.current(data.command);if(active){channel.postMessage({type:'ack',eventId,instanceId:id,commandId:data.commandId,hint:hint||''});report();}}
   catch{if(active)channel.postMessage({type:'ack',eventId,instanceId:id,commandId:data.commandId,error:'Unable to update the display. Please try again.'});}
  };
  report();const timer=setInterval(report,2000);
  return()=>{active=false;clearInterval(timer);channel.postMessage({type:'closed',eventId,instanceId:id});channel.close();if(channelRef.current===channel)channelRef.current=null;};
 },[eventId]);
 useEffect(()=>{if(eventId)channelRef.current?.postMessage({type:'state',eventId,instanceId:instance.current,state});},[eventId,state]);
}
