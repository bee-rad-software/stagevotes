const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
const eventId='11111111-1111-1111-1111-111111111111';
function setup({ended=false,archived=false,entriesError=null}={}){
 const queries=[];const output={};
 const responses={events:{data:{id:eventId,is_show_ended:ended,is_archived:archived}},side_contests:{data:{id:'contest',title:'Costumes',status:'open'}},side_contest_entries:{data:[{id:'approved',name:'Brad',costume:'Racer',photo_url:null}],count:1,error:entriesError}};
 const admin={from(table){const q={table,filters:[]};queries.push(q);const chain={select(fields){q.fields=fields;return chain;},eq(key,value){q.filters.push([key,value]);return chain;},order(){return chain;},limit(){return chain;},maybeSingle(){return Promise.resolve(responses[table]);},then(resolve,reject){return Promise.resolve(responses[table]).then(resolve,reject);}};return chain;}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/stage-display/[eventId]/halloween/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:output,process:{env:{NEXT_PUBLIC_SUPABASE_URL:'url',SUPABASE_SERVICE_ROLE_KEY:'key'}},require(name){if(name==='next/server')return {NextResponse:{json:(data,options)=>({data,options})}};if(name==='@supabase/supabase-js')return {createClient:()=>admin};throw Error(name);}});
 return {queries,GET:output.GET};
}
test('public spotlight is restricted to approved ballot fields without results or profile links',async()=>{const {GET,queries}=setup();const r=await GET(null,{params:Promise.resolve({eventId})});assert.equal(r.data.contest.entryCount,1);const query=queries.find(q=>q.table==='side_contest_entries');assert.ok(query.filters.some(([key,value])=>key==='approval_status'&&value==='approved'));assert.equal(query.fields,'id,name,costume,photo_url');assert.equal(r.options.headers['Cache-Control'],'no-store');});
test('ended and archived shows return no contest and never load entries',async()=>{for(const options of [{ended:true},{archived:true}]){const {GET,queries}=setup(options);const r=await GET(null,{params:Promise.resolve({eventId})});assert.equal(r.data.contest,null);assert.equal(queries.length,1);}});
test('invalid links and database failures do not expose contest data',async()=>{const {GET,queries}=setup();assert.equal((await GET(null,{params:Promise.resolve({eventId:'bad'})})).options.status,400);assert.equal(queries.length,0);const failed=setup({entriesError:{message:'database'}});assert.equal((await failed.GET(null,{params:Promise.resolve({eventId})})).options.status,503);});
