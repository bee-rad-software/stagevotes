const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function harness(){
 const timers=new Map();let next=0;
 const clock={setTimeout(fn){const id=++next;timers.set(id,()=>{timers.delete(id);fn();});return id;},clearTimeout(id){timers.delete(id);}};
 const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/karafunConnectionAttempt.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,AbortController,...clock});
 return {...out,timers,...clock};
}
test('startup timeout aborts stalled fetch and reports failure once',()=>{
 const h=harness();let failures=0;const a=h.createKaraFunConnectionAttempt(()=>failures++);
 assert.equal(a.isActive(),true);[...h.timers.values()][0]();
 assert.equal(a.signal.aborted,true);assert.equal(failures,1);
});
test('confirmed player clears deadline and remains active for playback events',()=>{
 const h=harness();const a=h.createKaraFunConnectionAttempt(()=>assert.fail('unexpected timeout'));
 a.complete();assert.equal(h.timers.size,0);assert.equal(a.isActive(),true);
});
test('retiring an attempt cancels its deadline and invalidates stale callbacks',()=>{
 const h=harness();const a=h.createKaraFunConnectionAttempt(()=>assert.fail('unexpected timeout'));
 a.cancel();assert.equal(h.timers.size,0);assert.equal(a.isActive(),false);assert.equal(a.signal.aborted,true);
});
const source=fs.readFileSync('app/host/[eventId]/page.tsx','utf8');
function host(){
 const h=harness(),sockets=[],state={};
 class Socket {static OPEN=1;static CONNECTING=0;readyState=0;constructor(){sockets.push(this);}close(){this.readyState=3;this.onclose?.();}send(){}}
 const ctx={...h,WebSocket:Socket,console:{log(){},error(){}},Date,Set,WeakSet,karafunChannel:'123',karafunConnected:false,karafunPlayerOnline:false,finishKaraFunControl(){},disconnectKaraFun(){ctx.karaFunConnectionAttemptRef.current?.cancel();ctx.karafunSocketRef.current=null;}};
 for(const name of source.match(/\b\w+Ref\b/g)||[])ctx[name]??={current:null};
 ctx.karafunSendingPerformanceIdsRef.current=new Set();ctx.karaFunIntentionallyClosedSocketsRef.current=new WeakSet();
 for(const name of source.match(/\bsetKarafun\w+/g)||[])ctx[name]=(v)=>{state[name]=v;};
 ctx.fetch=async()=>({ok:true,text:async()=>'"kcs_url":"wss://example.test"'});
 const start=source.indexOf('  async function connectKaraFun()'),end=source.indexOf('\nfunction disconnectKaraFun()',start);
 vm.createContext(ctx);vm.runInContext(ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 const disconnectStart=source.indexOf('function disconnectKaraFun()');
 const disconnectEnd=source.indexOf('const [karaFunConnectionHistory,',disconnectStart);
 vm.runInContext(ts.transpileModule(source.slice(disconnectStart,disconnectEnd),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,ctx);
 return {ctx,h,sockets,state};
}
test('retry replaces a relay-only connection; retired socket messages cannot overwrite it',async()=>{
 const {ctx,sockets,state}=host();await ctx.connectKaraFun();const old=sockets[0];old.readyState=1;ctx.karafunConnected=true;
 await ctx.connectKaraFun();assert.equal(sockets.length,2);assert.equal(ctx.karafunSocketRef.current,sockets[1]);
 old.onmessage({data:JSON.stringify({type:'remote.AppJoinEvent'})});assert.notEqual(state.setKarafunPlayerOnline,true);
 sockets[1].onmessage({data:JSON.stringify({type:'remote.AppJoinEvent'})});assert.equal(state.setKarafunPlayerOnline,true);
});
test('relay authentication alone keeps startup deadline until player responds',async()=>{
 const {ctx,h,sockets,state}=host();await ctx.connectKaraFun();
 sockets[0].onmessage({data:JSON.stringify({type:'core.AuthenticatedEvent'})});
 assert.equal(state.setKarafunConnecting,true);assert.equal(h.timers.size,1);
 sockets[0].onmessage({data:JSON.stringify({type:'remote.AppJoinEvent'})});
 assert.equal(state.setKarafunConnecting,false);assert.equal(h.timers.size,0);
});
test('cancelled fetch resolving late cannot create a socket or change new connection state',async()=>{
 const {ctx,sockets}=host();let resolve;
 ctx.fetch=()=>new Promise(r=>{resolve=r;});const pending=ctx.connectKaraFun();
 ctx.karaFunConnectionAttemptRef.current.cancel();
 resolve({ok:true,text:async()=>'"kcs_url":"wss://example.test"'});await pending;
 assert.equal(sockets.length,0);
});

test('stalled relay times out, closes its socket, and permits a fresh connection',async()=>{
 const {ctx,h,sockets,state}=host();await ctx.connectKaraFun();
 sockets[0].onmessage({data:JSON.stringify({type:'core.AuthenticatedEvent'})});
 [...h.timers.values()][0]();
 assert.equal(state.setKarafunConnecting,false);assert.equal(state.setKarafunConnected,false);
 assert.match(state.setKarafunConnectionError,/did not respond in time/);
 assert.equal(sockets[0].readyState,3);assert.equal(h.timers.size,0);
 await ctx.connectKaraFun();assert.equal(sockets.length,2);
});
test('unexpected live socket close retains automatic reconnect',async()=>{
 const {ctx,h,sockets}=host();await ctx.connectKaraFun();
 sockets[0].onmessage({data:JSON.stringify({type:'remote.AppJoinEvent'})});
 sockets[0].close();assert.equal(ctx.karafunSocketRef.current,null);assert.equal(h.timers.size,1);
 assert.ok(ctx.karaFunReconnectTimerRef.current);
});

test('a queue update cannot send commands while Skip Song is settling', async () => {
 const {ctx,sockets}=host();
 await ctx.connectKaraFun();
 const commands=[];
 sockets[0].send = command => commands.push(JSON.parse(command));
 ctx.karafunControlRef.current = {kind:'skip',previousItemId:'first',expectedItemId:'second'};
 ctx.karafunQueueItems = [{queueItemId:'first'}, {queueItemId:'second'}];
 const start=source.indexOf('async function syncKaraFunQueueOrder()');
 const end=source.indexOf('async function sendPerformanceToKaraFun',start);
 vm.runInContext(ts.transpileModule(source.slice(start,end),{
   compilerOptions:{target:ts.ScriptTarget.ES2022}
 }).outputText,ctx);
 await ctx.syncKaraFunQueueOrder();
 assert.deepEqual(commands,[]);
});
