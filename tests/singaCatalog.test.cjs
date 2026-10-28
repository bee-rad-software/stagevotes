const {test}=require('node:test');
const assert=require('node:assert/strict');
const ts=require('typescript');const fs=require('node:fs');const vm=require('node:vm');
const api={};let response;
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/singaCatalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:api,URLSearchParams,fetch:async()=>response});
test('catalog and AI retain both exact versions of a matched song',async()=>{
 response={ok:true,json:async()=>({songs:{items:[{resource_id:'song-a',name:'Song',artists:[{name:'Artist'}],variants:[{resource_id:'v1',catalog:{name:'Sunfly'}},{resource_id:'v2',catalog:{name:'Stingray'}}]}]}})};
 const songs=await api.searchSingaVersions('Song');assert.equal(songs.length,2);assert.equal(songs[1].singaVariantId,'v2');
 const rec=await api.findSingaRecommendation({title:'song',artist:'artist',reason:'Try this'});assert.equal(rec.singaVersions.length,2);assert.equal(rec.singaVersions[0].singaSongId,'song-a');
 assert.equal(await api.findSingaRecommendation({title:'Other',artist:'Artist',reason:''}),null);
});
test('catalog failure does not silently fall back to another provider',async()=>{response={ok:false};await assert.rejects(()=>api.searchSingaVersions('Song'));});
