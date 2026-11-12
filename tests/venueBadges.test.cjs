const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(path,requireMock=()=>{throw Error('unexpected import')}){const out={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:out,require:requireMock,URL});return out;}
const lib=load('lib/venueBadges.ts');
const account='11111111-1111-4111-8111-111111111111',venue='22222222-2222-4222-8222-222222222222',other='33333333-3333-4333-8333-333333333333';
const valid={title:'Crowd favorite',description:'The host’s pick',icon:'🎤',color:'#ff8800',artwork_path:null,rule:'manual',is_active:true};
test('badge designs accept only scoped fields and validated artwork/colors/rules',()=>{
 const b=lib.badgeDesign({...valid,title:'  Favorite  ',venue_id:other,points:1000},account+'/'+venue);assert.equal(b.title,'Favorite');assert.equal(b.venue_id,undefined);assert.equal(b.points,undefined);
 assert.equal(lib.badgeDesign({...valid,artwork_path:`${account}/${venue}/${other}.webp`},account+'/'+venue).artwork_path,`${account}/${venue}/${other}.webp`);
 for(const patch of [{title:''},{title:'a'.repeat(61)},{color:'red'},{color:'#fff;xx'},{rule:'admin'},{artwork_path:`${account}/${other}/${venue}.webp`},{artwork_path:'https://example.com/art.svg'},{artwork_path:`${account}/${venue}/../bad.webp`},{is_active:'yes'}])assert.throws(()=>lib.badgeDesign({...valid,...patch},account+'/'+venue));
});
test('only host/owner/admin roles manage venue badges',()=>{for(const role of ['owner','admin','host'])assert.equal(lib.canManageBadges(role),true);for(const role of ['judge','viewer','singer',''])assert.equal(lib.canManageBadges(role),false);});
function hostModule(role,found=true){let calls=[];class AuthError extends Error{constructor(message,status){super(message);this.status=status;}}
 const db={from:()=>({select(){return this},eq(k,v){calls.push([k,v]);return this},maybeSingle:async()=>({data:found?{id:venue,account_id:account}:null,error:null})})};
 const mod=load('lib/server/venueBadges.ts',name=>name.includes('stageVotesAuth')?{AuthError,getSupabaseAdmin:()=>db,requireStageVotesAccount:async()=>({account:{id:account},role,user:{id:'host'}})}:lib);return {mod,calls};}
test('host authorization verifies venue ownership; read-only roles cannot write',async()=>{
 const {mod,calls}=hostModule('host');await mod.badgeHost({},venue);assert.deepEqual(calls,[['id',venue],['account_id',account]]);
 await assert.rejects(hostModule('host',false).mod.badgeHost({},other),/Venue not found/);
 const viewer=hostModule('viewer');await assert.rejects(viewer.mod.badgeHost({},venue),/Only hosts/);assert.equal(viewer.calls.length,0);
});
test('public display/history filters private profiles while host history retains them',async()=>{
 const rows=[{id:'public',artwork_path:null,singer_profiles:{profile_visibility:'public'}},{id:'private',artwork_path:null,singer_profiles:{profile_visibility:'private'}},{id:'public-array',artwork_path:null,singer_profiles:[{profile_visibility:'public'}]}];let filters=[];
 const db={from:()=>({select(){return this},eq(k,v){filters.push([k,v]);return this},order(){return this},limit:async()=>({data:rows,error:null})})};
 const mod=load('lib/server/venueBadges.ts',name=>name.includes('stageVotesAuth')?{getSupabaseAdmin:()=>db}:lib);
 assert.deepEqual(Array.from(await mod.showVenueBadges('show',true),r=>r.id),['public','public-array']);assert.deepEqual(Array.from(await mod.showVenueBadges('show',false),r=>r.id),['public','private','public-array']);assert.deepEqual(filters,[['event_id','show'],['event_id','show']]);
});
test('manual awards reject badges or shows from other venues before invoking the award RPC',async()=>{
 let writes=0;class AuthError extends Error{constructor(message,status){super(message);this.status=status;}}
 const db={from:()=>({select(){return this},eq(){return this},maybeSingle:async()=>({data:null})}),rpc(){writes++;throw Error('unexpected write');}};
 const mod=load('app/api/account/venues/[venueId]/badges/route.ts',name=>name==='next/server'?{NextResponse:{json:(body,options={})=>({body,status:options.status||200})}}:name.includes('stageVotesAuth')?{AuthError,getSupabaseAdmin:()=>db}:name==='@/lib/venueBadges'?lib:{badgeHost:async()=>({venue:{id:venue,account_id:account},user:{id:'host'}}),badgeFailure:e=>({error:e.message,status:e.status||500})});
 const response=await mod.POST({json:async()=>({action:'award',badgeId:other,eventId:other,profileId:other})},{params:Promise.resolve({venueId:venue})});assert.equal(response.status,400);assert.equal(writes,0);
});
test('SQL awards are unique, snapshotted, scoped by venue, and cannot be minted by guests',()=>{
 const sql=fs.readFileSync('supabase/migrations/20261112210000_venue_badges.sql','utf8');
 assert.match(sql,/unique\(badge_id,singer_profile_id\)/);assert.match(sql,/on conflict\(badge_id,singer_profile_id\) do nothing/);assert.match(sql,/e\.venue_id=venue and e\.account_id=account/);assert.match(sql,/shows>=5 and has_song/);assert.match(sql,/approval_status='approved'/);assert.match(sql,/status='completed'/);
 assert.match(sql,/p_performance[\s\S]*event_id=e\.id and singer_profile_id=p_profile/);assert.match(sql,/b\.title,b\.description,b\.icon,b\.color,b\.artwork_path,v\.name,label/);
 assert.match(sql,/revoke all on function public\.award_venue_badge_manual\(uuid,uuid,uuid,uuid\) from public,anon,authenticated/);assert.match(sql,/grant execute on function public\.award_venue_badge_manual\(uuid,uuid,uuid,uuid\) to service_role/);
 assert.match(sql,/as restrictive for all to anon,authenticated/);
});
