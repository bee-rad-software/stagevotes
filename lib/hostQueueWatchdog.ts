export type WatchdogPerformance = {
 id:string;singer_name:string;song_title:string;status:string;round?:number|null;
 singer_profile_id?:string|null;device_id?:string|null;queue_order?:number;
};
export type WatchdogAlert = {
 id:string;kind:'rotation'|'karafun_mismatch'|'stalled';
 severity:'watch'|'warning';title:string;message:string;suggestion:string;
 performanceId?:string;fixAction?:'move_next_round'|'sync_karafun'|'advance_singer';fixLabel?:string;fixRound?:number;action:'review_singer'|'review_karafun';
};
export type WatchdogInput = {
 performances:WatchdogPerformance[];current:WatchdogPerformance|null;next:WatchdogPerformance|null;
 startedAt:string|null;now:number;averageMinutes:number;showEnded:boolean;tournament:boolean;
 karaFun:{connected:boolean;online:boolean;recovering:boolean;state:number|null;
  singer:string;title:string;currentItemId:string|null;stableForMs:number;
  queue:{queueItemId:string; singer:string;title:string}[]};
};
const normalize=(value:string|null|undefined)=>(value||'').trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ');
function identityOf(p:WatchdogPerformance){
 const name=normalize(p.singer_name);
 return p.singer_profile_id?'profile:'+p.singer_profile_id:(p.device_id?'device:'+p.device_id+':':'name:')+name;
}
export function detectHostQueueIssues(input:WatchdogInput):WatchdogAlert[]{
 if(input.showEnded)return [];
 const alerts:WatchdogAlert[]=[];
 if(!input.tournament){
  const groups=new Map<string,WatchdogPerformance[]>();
  for(const p of input.performances){
   if(['skipped','removed','cancelled'].includes(p.status)||!p.song_title?.trim()||!Number.isInteger(p.round)||Number(p.round)<1)continue;
   const name=normalize(p.singer_name);
   const identity=identityOf(p);
   if(!name&&!p.singer_profile_id)continue;
   const key=identity+':round:'+p.round;
   groups.set(key,[...(groups.get(key)||[]),p]);
  }
  for(const rows of groups.values()){
   if(rows.length<2)continue;
   const active=rows.find(p=>p.status!=='completed');
   if(!active)continue;
   const fixTarget=rows.filter(p=>p.status!=='completed'&&p.id!==input.current?.id).sort((a,b)=>(b.queue_order||0)-(a.queue_order||0))[0];
   let fixRound=Number(fixTarget?.round||1)+1;
   if(fixTarget){
    const occupied=new Set(input.performances.filter(p=>!['skipped','removed','cancelled'].includes(p.status)&&identityOf(p)===identityOf(fixTarget)).map(p=>Number(p.round)));
    while(occupied.has(fixRound))fixRound++;
   }
   alerts.push({id:'rotation:'+rows.map(p=>p.id).sort().join(':')+':'+active.round,kind:'rotation',severity:'warning',
    title:active.singer_name+' appears twice in round '+active.round,
    message:rows.length+' non-skipped performances are assigned to this singer in the same saved round, including completed songs.',
    suggestion:'Review the singer’s songs and round assignments. A duet or a deliberate host adjustment may explain it.',
    performanceId:fixTarget?.id||active.id,fixAction:fixTarget?'move_next_round':undefined,fixLabel:fixTarget?'Move extra song to round '+fixRound:undefined,fixRound:fixTarget?fixRound:undefined,action:'review_singer'});
  }
 }
 const k=input.karaFun;
 if(input.current && k.connected && k.online && !k.recovering && k.stableForMs>=15000){
  if(k.state===4&&k.title&&input.current.song_title){
   const titleMismatch=normalize(k.title)!==normalize(input.current.song_title);
   const singerMismatch=!!k.singer&&normalize(k.singer)!==normalize(input.current.singer_name);
   if(titleMismatch||singerMismatch)alerts.push({
    id:'kf-current:'+input.current.id+':'+k.currentItemId+':'+normalize(k.singer)+':'+normalize(k.title),
    kind:'karafun_mismatch',severity:'warning',title:'KaraFun is playing a different performer or song',
    message:'StageVotes: '+input.current.singer_name+' — '+input.current.song_title+'. KaraFun: '+(k.singer||'Singer not supplied')+' — '+k.title+'.',
    suggestion:'Check both current songs before advancing or playing another track.',
    performanceId:input.current.id,action:'review_karafun'});
  }
  if(input.next){
   const currentIndex=k.queue.findIndex(q=>q.queueItemId===k.currentItemId);
   const actual=currentIndex>=0?k.queue[currentIndex+1]:k.queue[0];
   if(actual&&(normalize(actual.singer)!==normalize(input.next.singer_name)||normalize(actual.title)!==normalize(input.next.song_title))){
    alerts.push({id:'kf-next:'+input.next.id+':'+actual.queueItemId+':'+normalize(actual.singer)+':'+normalize(actual.title),
     kind:'karafun_mismatch',severity:'watch',title:'KaraFun’s next song differs from the StageVotes queue',
     message:'Expected: '+input.next.singer_name+' — '+input.next.song_title+'. KaraFun next: '+(actual.singer||'Singer not supplied')+' — '+actual.title+'.',
     suggestion:'Review KaraFun’s queue and connection. Wait for queue synchronization before skipping.',
     performanceId:input.next.id,fixAction:'sync_karafun',fixLabel:'Sync KaraFun queue',action:'review_karafun'});
   }
  }
 }
 if(input.current&&input.startedAt&&!(k.connected&&k.online&&k.state===5)){
  const started=Date.parse(input.startedAt);
  const elapsed=(input.now-started)/60000;
  const threshold=Math.max(12,Number.isFinite(input.averageMinutes)?input.averageMinutes*2.5:12);
  if(Number.isFinite(elapsed)&&elapsed>=threshold){
   alerts.push({id:'stalled:'+input.current.id+':'+input.startedAt,kind:'stalled',severity:'watch',
    title:input.current.singer_name+' has been current for '+Math.floor(elapsed)+' minutes',
    message:'This is longer than the '+Math.ceil(threshold)+'-minute review threshold based on tonight’s pace.',
    suggestion:'Check whether the performance is finished, the show is taking a break, or the current singer needs updating.',
    performanceId:input.current.id,fixAction:input.next?'advance_singer':undefined,fixLabel:input.next?'Advance to next singer':undefined,action:'review_singer'});
  }
 }
 return alerts.sort((a,b)=>Number(b.severity==='warning')-Number(a.severity==='warning')).slice(0,12);
}
