const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
const out={};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/venueSettings.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,URL});
const defaults={...out.venueSettingsDefaults};
function client(rows){return {from(table){assert.equal(table,'venues');let filters={};return {select(){return this},eq(k,v){filters[k]=v;return this},async maybeSingle(){return {data:rows.find(v=>v.id===filters.id&&v.account_id===filters.account_id)||null,error:null};}};}};}
test('one account can have KaraFun and Singa venues without settings leaking',async()=>{
 const a={id:'account',singa_enabled:true,karafun_channel:'999',tips_enabled:true,max_songs_per_singer:9};
 const db=client([{id:'first',account_id:a.id,settings:{...defaults,karafun_channel:'123'},logo_url:'first-logo'},{id:'second',account_id:a.id,settings:{...defaults,singa_enabled:true,max_songs_per_singer:2,static_signup_qr:false}}]);
 const first=await out.settingsForVenue(db,a,'first',a.id),second=await out.settingsForVenue(db,a,'second',a.id);
 assert.equal(first.singa_enabled,false);assert.equal(first.karafun_channel,'123');assert.equal(first.tips_enabled,false);assert.equal(first.logo_url,'first-logo');assert.equal(second.singa_enabled,true);assert.equal(second.karafun_channel,'');assert.equal(second.max_songs_per_singer,2);assert.equal(second.static_signup_qr,false);
 assert.equal(a.karafun_channel,'999');
});
test('legacy shows retain defaults and cross-account venue IDs cannot load settings',async()=>{
 const a={karafun_channel:'123'},db=client([{id:'foreign',account_id:'other',settings:{...defaults,karafun_channel:'999'}}]);
 assert.equal((await out.settingsForVenue(db,a,null,'mine')).karafun_channel,'123');
 assert.equal((await out.settingsForVenue(db,a,'foreign','mine')).karafun_channel,'123');
});
test('new venues have independent safe defaults, and migration does not overwrite existing settings',()=>{
 assert.equal(defaults.singa_enabled,false);assert.equal(defaults.karafun_channel,'');assert.equal(defaults.static_signup_qr,true);
 const sql=fs.readFileSync('supabase/migrations/20261112190000_per_venue_settings.sql','utf8');assert.match(sql,/v\.settings is null/);assert.match(sql,/alter column settings set default/);
});
test('validate only allowed venue fields; normalize KaraFun links and reject invalid input',()=>{
 const input=out.parseVenueSettings({...defaults,karafun_channel:'https://www.karafun.com/456/',account_id:'foreign',subscription_status:'active'});
 assert.equal(input.karafun_channel,'456');assert.equal(input.account_id,undefined);assert.equal(input.subscription_status,undefined);
 for(const value of [{singa_enabled:'yes'},{karafun_channel:'garbage'},{max_songs_per_singer:0},{max_songs_per_singer:1.5},{venmo_url:'javascript:alert(1)'},{cashapp_url:'http://example.com'}])assert.throws(()=>out.parseVenueSettings(value));
 assert.equal(out.parseVenueSettings({venmo_url:'https://venmo.com/host'}).venmo_url,'https://venmo.com/host');
});
function route(role,rows){
 const result={};let updates=0;
 const db={from(table){assert.equal(table,'venues');let filters={};return {update(value){updates++;return this},eq(k,v){filters[k]=v;return this},select(){return this},is(k,v){filters[k]=v;return this},async maybeSingle(){return {data:rows.find(v=>v.id===filters.id&&v.account_id===filters.account_id)||null,error:null};}};}};
 class AuthError extends Error{constructor(message,status){super(message);this.status=status;}}
 const requireMock=name=>name==='next/server'?{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}}:name.includes('stageVotesAuth')?{AuthError,getSupabaseAdmin:()=>db,requireStageVotesAccount:async()=>({account:{id:'mine'},role})}:out;
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/account/venues/[venueId]/settings/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:result,require:requireMock});return {put:id=>result.PUT({json:async()=>defaults},{params:Promise.resolve({venueId:id})}),updates:()=>updates};
}
test('settings writes require owner/admin and scope venue IDs to the authenticated account',async()=>{
 const member=route('host',[{id:'own',account_id:'mine'}]);assert.equal((await member.put('own')).status,403);assert.equal(member.updates(),0);
 const owner=route('owner',[{id:'own',account_id:'mine'},{id:'foreign',account_id:'other'}]);assert.equal((await owner.put('own')).status,200);assert.equal((await owner.put('foreign')).status,404);
});
test('public show configuration loads by event even if the venue profile is private',async()=>{
 let calls=0;const db={rpc:async(name,args)=>{calls++;assert.equal(name,'stagevotes_event_venue_settings');assert.equal(args.p_event_id,'show');return {data:{venue_id:'private',account_id:'account',settings:{...defaults,singa_enabled:true,karafun_channel:''}},error:null};}};
 const settings=await out.settingsForVenue(db,{singa_enabled:false,karafun_channel:'999'},'private','account','show');
 assert.equal(settings.singa_enabled,true);assert.equal(settings.karafun_channel,'');assert.equal(calls,1);
});
test('public configuration errors or mismatched venue never fall back to the wrong provider',async()=>{
 const db={rpc:async()=>({data:{venue_id:'other',account_id:'account'},error:null})};
 await assert.rejects(out.settingsForVenue(db,{karafun_channel:'999'},'private','account','show'));
 await assert.rejects(out.settingsForVenue({rpc:async()=>({error:{message:'offline'},data:null})},{karafun_channel:'999'},'private','account','show'));
});
