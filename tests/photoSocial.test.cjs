const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
const file='app/api/events/[eventId]/photos/social/route.ts';
function harness({user={id:'user'},rpcError=null,available=true}={}){
 let called=[];
 const db={auth:{getUser:async()=>({data:{user},error:null})},rpc:async(name,args)=>{called.push({name,args});return {error:rpcError};},from:()=>{let q={};for(const n of ['select','eq'])q[n]=()=>q;q.maybeSingle=async()=>({data:available?{id:'photo'}:null,error:null});return q;}};
 class PhotoError extends Error{constructor(m,status=400){super(m);this.status=status;}}
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status});
 const deps={'@/lib/server/stageVotesAuth':{getSupabaseAdmin:()=>db},'@/lib/server/eventPhotos':{checkPhotoOrigin:r=>{if(r.headers.get('origin') && r.headers.get('origin')!==new URL(r.url).origin)throw new PhotoError('origin',403);},photoResponse:json,photoFailure:e=>json({error:e.message},e.status||500)},'@/lib/eventPhotos':{PhotoError,photoId:v=>{if(typeof v!=='string'||! /^[a-f0-9-]{36}$/.test(v))throw new PhotoError('Invalid ID');return v;}}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText,m={exports:{}};new Function('require','module','exports',code)(n=>deps[n],m,m.exports);
 return {route:m.exports,called};
}
const id='11111111-1111-1111-1111-111111111111',ctx={params:Promise.resolve({eventId:id})};
function req(body,token=true,origin){return new Request('https://example.com/api',{method:'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer token'}:{}),...(origin?{origin}:{})},body:JSON.stringify(body)});}
test('requires authenticated reaction',async()=>{const h=harness();assert.equal((await h.route.POST(req({action:'react',photoId:id,value:'heart'},false),ctx)).status,401);assert.equal(h.called.length,0);});
test('rejects unsupported reaction',async()=>{const h=harness();assert.equal((await h.route.POST(req({action:'react',photoId:id,value:'other'}),ctx)).status,400);assert.equal(h.called.length,0);});
test('passes verified identity, ignoring spoofed user',async()=>{const h=harness();assert.equal((await h.route.POST(req({action:'react',photoId:id,value:'heart',userId:'victim'}),ctx)).status,200);assert.equal(h.called[0].args.p_user_id,'user');});
test('supports reaction removal',async()=>{const h=harness();await h.route.POST(req({action:'react',photoId:id,value:'none'}),ctx);assert.equal(h.called[0].args.p_value,'none');});
test('blocks cross origin writes',async()=>{const h=harness();assert.equal((await h.route.POST(req({action:'untag',photoId:id},true,'https://other.com'),ctx)).status,403);assert.equal(h.called.length,0);});
test('rejects invalid tag IDs',async()=>{const h=harness();assert.equal((await h.route.POST(req({action:'tag',photoId:id,value:'bad'}),ctx)).status,400);});
test('removed or unapproved photos cannot be changed',async()=>{const h=harness({rpcError:{message:'photo_not_found'}});assert.equal((await h.route.POST(req({action:'react',photoId:id,value:'fire'}),ctx)).status,404);});
test('declined tags cannot be proposed again',async()=>{const h=harness({rpcError:{message:'tag_declined'}});assert.equal((await h.route.POST(req({action:'tag',photoId:id,value:id}),ctx)).status,409);});
test('nonparticipants cannot propose tags',async()=>{const h=harness({rpcError:{message:'participant_required'}});assert.equal((await h.route.POST(req({action:'tag',photoId:id,value:id}),ctx)).status,403);});
