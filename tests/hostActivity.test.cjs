const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,mock=()=>{throw Error('Unexpected import')}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,require:mock,Date,Number});return exports;}
const lib=load('lib/hostActivity.ts');
test('new alerts distinguish unseen submissions from previously reviewed ones',()=>{
 const date='2026-11-16T18:00:00Z',summary={pending:3,latestAt:date};
 assert.equal(lib.activityIsNew(summary,null),true);
 assert.equal(lib.activityIsNew(summary,date),false);
 assert.equal(lib.activityIsNew(summary,'2026-11-16T17:59:00Z'),true);
 assert.equal(lib.activityIsNew({pending:0,latestAt:date},null),false);
 assert.equal(lib.activityIsNew({pending:1,latestAt:null},null),false);
 assert.equal(lib.activityIsNew(summary,'broken'),true);
});
test('submission ages make old messages obvious and handle invalid/future clocks',()=>{
 const now=Date.parse('2026-11-16T18:00:00Z');
 for(const [age,label] of [[0,'just now'],[59000,'just now'],[60000,'1 min ago'],[600000,'10 min ago'],[3600000,'1 hr ago'],[86400000,'1 day ago'],[172800000,'2 days ago']])assert.equal(lib.submissionAge(new Date(now-age).toISOString(),now),label);
 assert.equal(lib.submissionAge('bad',now),'');assert.equal(lib.submissionAge(new Date(now+5000).toISOString(),now),'just now');
});
function api(authorized=true,failing=false){const calls=[];const db={from:table=>{const q={select(fields,opts){calls.push([table,'select',fields,opts]);return q},eq(k,v){calls.push([table,k,v]);return q},order(k,v){calls.push([table,'order',k,v]);return q},limit:async n=>({data:table==='event_photos'?[{created_at:'2026-11-16T18:00:00Z'}]:[],count:table==='event_photos'?23:0,error:failing?Error('offline'):null})};return q;}};
 const route=load('app/api/events/[eventId]/host-activity/route.ts',name=>name.includes('stageVotesAuth')?{getSupabaseAdmin:()=>db}:{photoHost:async(_request,id)=>{if(!authorized)throw Error('Forbidden');assert.equal(id,'requested-show');return {id}},photoResponse:body=>({body,status:200}),photoFailure:e=>({body:{error:e.message},status:authorized?500:403})});return {route,calls};}
test('summary uses owning-host authorization before querying private submissions',async()=>{const a=api(false);assert.equal((await a.route.GET({}, {params:Promise.resolve({eventId:'requested-show'})})).status,403);assert.equal(a.calls.length,0);});
test('counts all pending submissions while selecting only the latest timestamp for this event',async()=>{const a=api();const r=await a.route.GET({}, {params:Promise.resolve({eventId:'requested-show'})});assert.equal(r.status,200);assert.equal(r.body.photos.pending,23);assert.equal(r.body.shoutouts.pending,0);assert.equal(r.body.shoutouts.latestAt,null);for(const table of ['event_photos','show_shoutouts']){assert.ok(a.calls.some(c=>c[0]===table&&c[1]==='event_id'&&c[2]==='requested-show'));assert.ok(a.calls.some(c=>c[0]===table&&c[1]==='status'&&c[2]==='pending'));assert.ok(a.calls.some(c=>c[0]===table&&c[1]==='select'&&c[2]==='created_at'&&c[3].count==='exact'));}assert.equal(JSON.stringify(r.body).includes('message'),false);});
test('database outages return an error rather than false empty inboxes',async()=>{const a=api(true,true);assert.equal((await a.route.GET({}, {params:Promise.resolve({eventId:'requested-show'})})).status,500);});
function reviewPanel(path,host){const listeners=new Map(),changes=[],calls=[];const panel={open:false,scrollIntoView:()=>calls.push('scroll'),focus:()=>calls.push('focus')};const effects=[];const jsx=(type,props)=>({type,props});const exports={};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='react'?{useState:init=>[init,v=>changes.push(v)],useRef:init=>({current:init===null?panel:init}),useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.includes('SubmissionTime')?{default:()=>null,useSubmissionClock:()=>0}:name.includes('hostActivity')?lib:name.includes('supabase')?{supabase:{auth:{getSession:async()=>({data:{session:{access_token:'token'}}})}}}:name.includes('eventPhotos')?{PHOTO_CAPTION_LIMIT:160}:name.includes('lucide')?{}:{default:{}},window:{addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)},fetch:async()=>({ok:true,json:async()=>({photos:[],messages:[]})}),Date});
 exports.default({eventId:'show-a',host});const effect=effects.find(fn=>String(fn).includes('HOST_REVIEW_EVENT'));const cleanup=effect();return {listeners,changes,calls,panel,cleanup};}
test('hero review shortcut opens and focuses only the matching show and submission panel',()=>{
 for(const [path,kind] of [['components/photos/SVEventPhotos.tsx','photos'],['components/shoutouts/ShowShoutouts.tsx','shoutouts']]){
  const p=reviewPanel(path,true);const listener=p.listeners.get(lib.HOST_REVIEW_EVENT);
  listener({detail:{eventId:'another-show',kind}});listener({detail:{eventId:'show-a',kind:kind==='photos'?'shoutouts':'photos'}});assert.equal(p.calls.length,0);
  listener({detail:{eventId:'show-a',kind}});assert.deepEqual(p.calls,['scroll','focus']);if(kind==='photos'){assert.ok(p.changes.includes(true));assert.ok(p.changes.includes('pending'));}else assert.equal(p.panel.open,true);
  p.cleanup();assert.equal(p.listeners.size,0);
  assert.equal(reviewPanel(path,false).listeners.size,0);
 }
});
