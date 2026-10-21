const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const P = '33333333-3333-4333-8333-333333333333';
const Q = '44444444-4444-4444-8444-444444444444';
const base = path.resolve(__dirname, '..');

function harness() {
  const state = {
    events: [{id:A,account_id:'account-a',name:'Saturday Karaoke',photo_sharing_enabled:true,is_show_ended:false},
      {id:B,account_id:'account-b',name:'Other Show',photo_sharing_enabled:true,is_show_ended:false}],
    event_photos: [
      {id:P,event_id:A,caption:'Pending secret',display_name:'Guest',status:'pending',storage_path:A+'/'+P+'.webp',created_at:new Date().toISOString(),removal_hash:'private-hash',uploader_key:'private-uploader'},
      {id:Q,event_id:A,caption:'Future album cover 😂',display_name:'Brad',status:'approved',storage_path:A+'/'+Q+'.webp',created_at:new Date().toISOString(),removal_hash:'private-hash',uploader_key:'private-uploader'},
    ],
    event_photo_reports: [], objects: new Map(), reservations:0, rpcError:null, storageError:null, signed:[], removed:[],
  };
  class Query {
    constructor(table) {this.table=table;this.filters=[];}
    select(columns,options) {this.options=options;return this;}
    eq(key,value) {this.filters.push(r=>r[key]===value);return this;}
    in(key,values) {this.filters.push(r=>values.includes(r[key]));return this;}
    order() {return this;}
    limit() {return this;}
    update(values) {this.values=values;return this;}
    result(single=false) {
      const rows=state[this.table].filter(r=>this.filters.every(f=>f(r)));
      if(this.values)rows.forEach(r=>Object.assign(r,this.values));
      const data=rows.map(r=>({...r,event_photo_reports:[{count:state.event_photo_reports.filter(x=>x.photo_id===r.id).length}]}));
      return {data:this.options?.head?null:single?data[0]||null:data,count:rows.length,error:null};
    }
    maybeSingle() {return Promise.resolve(this.result(true));}
    then(resolve,reject) {return Promise.resolve(this.result()).then(resolve,reject);}
  }
  const admin={
    from:table=>new Query(table),
    rpc:async(name,args)=>{
      if(state.rpcError)return {data:null,error:{message:state.rpcError}};
      const e=state.events.find(x=>x.id===args.p_event_id);
      if(name==='reserve_event_photo') {
        if(!e?.photo_sharing_enabled||e.is_show_ended)return {error:{message:'photos_closed'}};
        const id=randomUUID();state.reservations++;
        state.event_photos.push({id,event_id:args.p_event_id,caption:args.p_caption,display_name:args.p_display_name,status:'uploading',removal_hash:args.p_removal_hash,uploader_key:args.p_uploader_key,created_at:new Date().toISOString()});
        return {data:id,error:null};
      }
      const photo=state.event_photos.find(x=>x.id===args.p_photo_id&&x.event_id===args.p_event_id&&x.status==='approved');
      if(!photo)return {error:{message:'photo_not_found'}};
      state.event_photo_reports.push({photo_id:photo.id,event_id:photo.event_id,reason:args.p_reason});
      return {data:null,error:null};
    },
    storage:{from:bucket=>{
      assert.equal(bucket,'event-photos');
      return {
        createSignedUrls:async(paths,seconds)=>{state.signed.push({paths,seconds});return {data:paths.map(p=>({path:p,signedUrl:'https://storage.example/signed/'+p,error:null})),error:null};},
        upload:async(p,bytes,options)=>{if(state.storageError)return {error:new Error('Storage failure')};state.objects.set(p,{bytes,options});return {error:null};},
        remove:async paths=>{paths.forEach(p=>{state.objects.delete(p);state.removed.push(p);});return {error:null};},
      };
    }},
  };
  class AuthError extends Error {constructor(message,status=401){super(message);this.status=status;}}
  const cache={};
  function load(file) {
    if(cache[file])return cache[file].exports;
    const mod={exports:{}};cache[file]=mod;
    const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
    const requireMock=name=>{
      if(name==='@/lib/server/stageVotesAuth')return {getSupabaseAdmin:()=>admin,AuthError,requireStageVotesAccount:async req=>{
        const token=req.headers.get('authorization');
        if(!token)throw new AuthError('Sign in required');
        return {account:{id:token==='Bearer b'?'account-b':'account-a'},role:token==='Bearer judge'?'judge':'owner'};
      }};
      if(name.startsWith('@/'))return load(path.join(base,name.slice(2)+'.ts'));
      return require(name);
    };
    vm.runInNewContext(code,{module:mod,exports:mod.exports,require:requireMock,Buffer,File,URL,Date,console:{error(){}},process:{env:{SUPABASE_SERVICE_ROLE_KEY:'test-only-photo-key',NEXT_PUBLIC_SITE_URL:'https://app.stagevotes.com',NODE_ENV:'test'}}});
    return mod.exports;
  }
  const api=load(path.join(base,'app/api/events/[eventId]/photos/route.ts'));
  const helper=load(path.join(base,'lib/eventPhotos.ts'));
  async function request(method,{host=false,eventId=A,json,form,query='',cookie='',origin='https://app.stagevotes.com',token}={}) {
    const headers={origin,'x-vercel-forwarded-for':'192.0.2.10'};
    if(host||token)headers.authorization='Bearer '+(token||'a');
    if(cookie)headers.cookie=cookie;
    if(json)headers['content-type']='application/json';
    const req=new Request('https://app.stagevotes.com/api/events/'+eventId+'/photos'+query,{method,headers,body:json?JSON.stringify(json):form});
    const response=await api[method](req,{params:Promise.resolve({eventId})});
    return {status:response.status,body:await response.json(),headers:response.headers};
  }
  return {state,request,helper};
}
async function uploadForm(caption='Great night!',bytes) {
  bytes ||= await sharp({create:{width:100,height:60,channels:3,background:'#ff7700'}})
    .withMetadata({exif:{IFD0:{ImageDescription:'Private camera metadata'}}}).jpeg().toBuffer();
  const form=new FormData();form.append('photo',new File([bytes],'camera.jpg',{type:'image/jpeg'}));
  form.append('caption',caption);form.append('displayName','Brad');form.append('permission','yes');
  return form;
}
test('guest galleries expose only approved photos and never private moderation fields',async()=>{
 const h=harness(),r=await h.request('GET');
 assert.equal(r.status,200);assert.equal(r.body.photos.length,1);assert.equal(r.body.photos[0].id,Q);
 assert.equal(r.body.photos[0].caption,'Future album cover 😂');
 assert.ok(!JSON.stringify(r.body).includes('private-hash'));assert.ok(!JSON.stringify(r.body).includes('Pending secret'));
 assert.equal(h.state.signed[0].seconds,120);assert.match(r.headers.get('set-cookie'),/HttpOnly/i);
});
test('collapsed gallery uses a count without creating signed image links',async()=>{
 const h=harness(),r=await h.request('GET',{query:'?summary=1'});
 assert.equal(r.body.photoCount,1);assert.equal(r.body.photos.length,0);assert.equal(h.state.signed.length,0);
});
test('host moderation requires event ownership and a host role',async()=>{
 const h=harness();
 assert.equal((await h.request('GET',{query:'?mode=host'})).status,401);
 assert.equal((await h.request('GET',{query:'?mode=host',token:'b'})).status,403);
 assert.equal((await h.request('GET',{query:'?mode=host',token:'judge'})).status,403);
 const r=await h.request('GET',{query:'?mode=host',host:true});assert.equal(r.body.photos.length,2);
});
test('uploads are re-encoded without metadata, stay pending, then become public only on approval',async()=>{
 const h=harness(),r=await h.request('POST',{form:await uploadForm('<script>fun caption</script>')});
 assert.equal(r.status,201);assert.match(r.body.removalToken,/^[a-f0-9]{64}$/);
 const row=h.state.event_photos.find(p=>p.id===r.body.id);assert.equal(row.status,'pending');assert.notEqual(row.removal_hash,r.body.removalToken);
 const stored=h.state.objects.get(row.storage_path);assert.equal(stored.options.contentType,'image/webp');
 const metadata=await sharp(stored.bytes).metadata();assert.equal(metadata.format,'webp');assert.equal(metadata.exif,undefined);assert.equal(metadata.orientation,undefined);
 assert.ok(!(await h.request('GET')).body.photos.some(p=>p.id===row.id));
 assert.equal((await h.request('PATCH',{host:true,json:{action:'approve',photoId:row.id}})).status,200);
 assert.ok((await h.request('GET')).body.photos.some(p=>p.id===row.id));
});
test('caption limit and sharing permission are checked before reserving storage',async()=>{
 const h=harness();
 assert.equal((await h.request('POST',{form:await uploadForm('a'.repeat(151))})).status,400);
 const form=await uploadForm();form.delete('permission');
 assert.equal((await h.request('POST',{form})).status,400);assert.equal(h.state.reservations,0);
});
test('disabled and ended events cannot accept new uploads',async()=>{
 for(const key of ['disabled','ended']){
 const h=harness();if(key==='ended')h.state.events[0].is_show_ended=true;else h.state.events[0].photo_sharing_enabled=false;
 assert.equal((await h.request('POST',{form:await uploadForm()})).status,409);assert.equal(h.state.objects.size,0);
 }
});
test('forged image content is rejected and failed decodes clean up the reservation',async()=>{
 const h=harness();
 assert.equal((await h.request('POST',{form:await uploadForm('',Buffer.from('<svg></svg>'))})).status,400);
 assert.equal((await h.request('POST',{form:await uploadForm('',Buffer.from([255,216,255,0,0,0]))})).status,400);
 assert.equal(h.state.objects.size,0);assert.equal(h.state.event_photos.at(-1).status,'rejected');
});
test('a storage failure never publishes a photo and leaves a rejected reservation',async()=>{
 const h=harness();h.state.storageError=true;
 assert.equal((await h.request('POST',{form:await uploadForm()})).status,500);
 assert.equal(h.state.event_photos.at(-1).status,'rejected');assert.equal(h.state.objects.size,0);
});
test('database rate limits become 429 responses without an upload',async()=>{
 const h=harness();h.state.rpcError='photo_limit';
 assert.equal((await h.request('POST',{form:await uploadForm()})).status,429);assert.equal(h.state.objects.size,0);
});
test('only the uploader removal secret or owning host can remove a photo',async()=>{
 const h=harness(),r=await h.request('POST',{form:await uploadForm()});
 const id=r.body.id;
 assert.equal((await h.request('DELETE',{json:{photoId:id,removalToken:'a'.repeat(64)}})).status,404);
 assert.equal((await h.request('PATCH',{token:'b',json:{action:'remove',photoId:id}})).status,403);
 const args={json:{photoId:id,removalToken:r.body.removalToken}};
 assert.equal((await h.request('DELETE',args)).status,200);
 assert.equal((await h.request('DELETE',args)).status,200);assert.equal(h.state.objects.size,0);
});
test('reports target approved photos only and host-only responses include the reason',async()=>{
 const h=harness();
 assert.equal((await h.request('POST',{json:{action:'report',photoId:P,reason:'Please review'}})).status,404);
 assert.equal((await h.request('POST',{json:{action:'report',photoId:Q,reason:'Please remove my picture'}})).status,200);
 assert.equal((await h.request('GET')).body.reports.length,0);
 const r=await h.request('GET',{host:true,query:'?mode=host'});assert.equal(r.body.reports[0].reason,'Please remove my picture');
});
test('turning uploads off keeps the approved gallery, and ended shows cannot be reopened',async()=>{
 const h=harness();
 assert.equal((await h.request('PATCH',{host:true,json:{action:'settings',enabled:false}})).status,200);
 assert.equal((await h.request('GET')).body.photos.length,1);
 h.state.events[0].is_show_ended=true;
 assert.equal((await h.request('PATCH',{host:true,json:{action:'settings',enabled:true}})).status,409);
});
test('cross-origin writes and non-UUID event paths are rejected',async()=>{
 const h=harness();
 assert.equal((await h.request('POST',{origin:'https://unrelated.example',form:await uploadForm()})).status,403);
 assert.equal((await h.request('GET',{eventId:'not-an-event'})).status,400);
});
