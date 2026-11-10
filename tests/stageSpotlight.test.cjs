const {test}=require('node:test'),assert=require('node:assert/strict'),ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
function load(file,deps={}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,require:n=>deps[n],Date});return out;}
const rotation=load('lib/rotationQueue.ts');const {selectSpotlightSinger,stageSidebarQueue}=load('lib/stageSpotlight.ts',{'./rotationQueue':rotation});
const rows=[{id:'a',queue_order:1,status:'current'},{id:'b',queue_order:2,status:'queued'},{id:'c',queue_order:3,status:'queued'}];
test('between songs spotlights same upcoming singer before and after auto-advance',()=>{assert.equal(selectSpotlightSinger(rows,'a','a',true).id,'b');assert.equal(selectSpotlightSinger(rows.map(r=>r.id==='a'?{...r,status:'completed'}:r),'b','a',true).id,'b');});
test('manual break chooses next in rotation, ignoring removed or completed songs',()=>{assert.equal(selectSpotlightSinger(rows,'a','a',false).id,'b');const changed=rows.map(r=>r.id==='b'?{...r,status:'removed'}:r);assert.equal(selectSpotlightSinger(changed,'a','a',false).id,'c');});
test('empty rotation does not invent a singer; changed queue order is reflected',()=>{assert.equal(selectSpotlightSinger([],'a','a',true),undefined);assert.equal(selectSpotlightSinger(rows.map(r=>({...r,manual_queue_order:r.id==='c'?0:r.queue_order})),'a','a',false).id,'c');});

test('sidebar keeps Greg ahead of Bill after auto-advance and excludes Greg once Play starts',()=>{
 const after=[{id:'finished',status:'completed',queue_order:1},{id:'greg',status:'current',queue_order:2},{id:'bill',status:'queued',queue_order:3}];
 assert.deepEqual(Array.from(stageSidebarQueue(after,'greg','finished',true),r=>r.id),['greg','bill']);
 assert.deepEqual(Array.from(stageSidebarQueue(after,'greg','greg',false),r=>r.id),['bill']);
 assert.deepEqual(Array.from(stageSidebarQueue(after,'finished','finished',true),r=>r.id),['greg','bill']);
});
test('sidebar preserves ordering, ignores removed songs and stays limited to five',()=>{
 const many=Array.from({length:8},(_,i)=>({id:String(i),queue_order:i,status:i===1?'removed':'queued'}));
 const queue=stageSidebarQueue(many,'0','prior',true);
 assert.equal(queue.length,5);assert.equal(queue[0].id,'0');assert.ok(!queue.some(r=>r.id==='1'));
});
