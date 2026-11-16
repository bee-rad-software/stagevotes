const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const moduleObject = {exports:{}};
const code = ts.transpileModule(fs.readFileSync(__dirname+'/../lib/breakMusicState.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{module:moduleObject,exports:moduleObject.exports});
const {initialBreakMusicState:initial,updateBreakMusicState:step,nextBreakTrack:next} = moduleObject.exports;
test('a ready song before any performance cannot start automatic music',()=>assert.equal(step(initial,true,3).between,false));
test('finished playback permits a break, but paused singing never does',()=>{
 const playing=step(initial,true,4);
 assert.equal(playing.blocked,true);
 const paused=step(playing,true,5);
 assert.equal(paused.blocked,true);assert.equal(paused.between,false);
 assert.equal(step(paused,true,3).between,true);
 assert.equal(step(playing,true,3).between,true);
});
test('disconnect resets the baseline and reconnect does not start music',()=>{
 const lost=step(step(initial,true,4),false,3);
 assert.equal(lost.blocked,true);assert.equal(step(lost,true,3).between,false);
});
test('unknown playback states fail silent',()=>{const state=step(step(initial,true,4),true,99);assert.equal(state.blocked,true);assert.equal(state.between,false);});
test('sequential playlists wrap and shuffle never repeats immediately',()=>{
 assert.equal(next(2,3,false),0);assert.equal(next(0,1,true),0);
 for(let i=0;i<4;i++)for(const r of [0,.25,.5,.999]){const n=next(i,4,true,()=>r);assert.notEqual(n,i);assert.ok(n>=0&&n<4);}
});

test('transient states preserve the performance until KaraFun is ready',()=>{
 let state=step(initial,true,4);
 for(const value of [null, 2, 99]) { state=step(state,true,value); assert.equal(state.blocked,true); assert.equal(state.between,false); }
 assert.equal(step(state,true,3).between,true);
 assert.equal(step(step(initial,true,2),true,3).between,false);
});

const {breakTrackPlayback:plan}=moduleObject.exports;
test('a new singer handoff picks the next track once, then ordinary resume stays on that track',()=>{
 const fresh=plan(0,3,false,true,true);assert.equal(fresh.index,1);assert.equal(fresh.restart,true);
 const resume=plan(fresh.index,3,false,false,true);assert.equal(resume.index,1);assert.equal(resume.restart,false);
 const nextSinger=plan(resume.index,3,false,true,true);assert.equal(nextSinger.index,2);
});
test('first break keeps first track, shuffle changes tracks, and one track restarts',()=>{
 assert.equal(plan(0,3,false,true,false).index,0);
 assert.notEqual(plan(1,4,true,true,true,undefined,()=>.5).index,1);
 assert.equal(plan(0,1,true,true,true).index,0);assert.equal(plan(0,1,true,true,true).restart,true);
 const explicit=plan(1,3,false,true,true,2);assert.equal(explicit.index,2);assert.equal(explicit.restart,true);
});

const {unplayedBreakTrack:unplayed}=moduleObject.exports;
test('shuffle exhausts the entire playlist before repeating across many rounds',()=>{
 for(const count of [1,2,3,15])for(const r of [0,.25,.9,.999]){
  const played=new Set();let current=0;
  for(let round=0;round<4;round++){
   const heard=[];
   for(let i=0;i<count;i++){
    const choice=unplayed(current,count,played,()=>r);
    if(choice.newRound){assert.equal(played.size,count);if(count>1)assert.notEqual(choice.index,current);played.clear();}
    assert.ok(!played.has(choice.index));played.add(choice.index);heard.push(choice.index);current=choice.index;
   }
   assert.equal(new Set(heard).size,count);
  }
 }
});
test('manual first track and resumes stay counted; failed choices do not consume a song',()=>{
 const played=new Set([2]);const a=unplayed(2,4,played,()=>0),retry=unplayed(2,4,played,()=>0);
 assert.equal(a.index,retry.index);assert.equal(played.size,1);assert.notEqual(a.index,2);
 played.add(a.index);played.add(a.index);assert.equal(played.size,2);
 const b=unplayed(a.index,4,played,()=>0);assert.ok(!played.has(b.index));
 assert.equal(unplayed(0,0,new Set()).index,0);
});

const {shouldSilenceBreakMusic:silence}=moduleObject.exports;
test('first signup/loading preserves manual pre-show music without arming automatic playback',()=>{
 let previous=initial;
 for(const [online,status] of [[false,null],[true,null],[true,2],[true,3],[true,2],[true,3]]){
  const updated=step(previous,online,status);assert.equal(silence(previous,updated,online,status,false),false);assert.equal(updated.between,false);previous=updated;
 }
});
test('actual singing, singer pause, and ending the show still silence pre-show music',()=>{
 for(const status of [4,5])assert.equal(silence(initial,step(initial,true,status),true,status,false),true);
 assert.equal(silence(initial,step(initial,true,2),true,2,true),true);
});
test('loading, disconnects, and unknown states after singer playback still fail silent',()=>{
 const playing=step(initial,true,4);
 for(const [online,status] of [[true,2],[true,null],[true,99],[false,null]])assert.equal(silence(playing,step(playing,online,status),online,status,false),true);
 const ready=step(playing,true,3);assert.equal(ready.between,true);assert.equal(silence(playing,ready,true,3,false),false);
});
