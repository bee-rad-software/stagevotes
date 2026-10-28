const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');
const fs=require('node:fs');
const vm=require('node:vm');
const exportsObject={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/singaPlayback.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exportsObject});
const {newSingaPlaybackTracker,observeSingaPlayback}=exportsObject;
const requests=new Map([['a','singer-a'],['b','singer-b']]);
const snapshot=(version,status,ids)=>({estimate_version:version,player_status:status,entries:ids.map((id,i)=>({song_request_identifier:id,position:i+1}))});
test('Play and request done do not advance; Stop and Pause preserve current',()=>{
 const t=newSingaPlaybackTracker();
 for(const [version,status] of [[1,'playing'],[2,'paused'],[3,'playing'],[4,'stopped']]) assert.equal(observeSingaPlayback(t,snapshot(version,status,['a','b']),'singer-a',requests),null);
 assert.equal(observeSingaPlayback(t,{status:'done'},'singer-a',requests),null);
});
test('natural ending and skip consume current exactly once',()=>{
 for(const remaining of [['b'],[]]){
 const t=newSingaPlaybackTracker();
 observeSingaPlayback(t,snapshot(1,'playing',['a','b']),'singer-a',requests);
 assert.equal(observeSingaPlayback(t,snapshot(2,'stopped',remaining),'singer-a',requests),'singer-a');
 assert.equal(observeSingaPlayback(t,snapshot(3,'stopped',remaining),'singer-a',requests),null);
 }
});
test('reconnect, stale snapshots, malformed payloads, other songs and changed current cannot advance',()=>{
 const t=newSingaPlaybackTracker();
 assert.equal(observeSingaPlayback(t,snapshot(1,'stopped',[]),'singer-a',requests),null);
 observeSingaPlayback(t,snapshot(3,'playing',['a','b']),'singer-a',requests);
 assert.equal(observeSingaPlayback(t,snapshot(2,'stopped',[]),'singer-a',requests),null);
 assert.equal(observeSingaPlayback(t,{estimate_version:4,player_status:'stopped'},'singer-a',requests),null);
 assert.equal(observeSingaPlayback(t,snapshot(5,'stopped',[]),'singer-b',requests),null);
 const other=newSingaPlaybackTracker();
 observeSingaPlayback(other,snapshot(1,'playing',['b']),'singer-a',requests);
 assert.equal(observeSingaPlayback(other,snapshot(2,'stopped',[]),'singer-a',requests),null);
});
