const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const lib={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/stageAudienceContent.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:lib,URL});
test('photo slides reject pending, removed, malformed and unsafe images; disabling sharing clears them',()=>{
 const good={id:'approved',url:'https://example.com/signed-photo.webp',status:'approved',caption:'Hello'};
 assert.deepEqual(Array.from(lib.approvedStagePhotos({enabled:true,photos:[good,{...good,id:'pending',status:'pending'},{...good,id:'deleted',status:'deleted'},{...good,url:'javascript:alert(1)'},null]}),p=>({...p})),[{id:'approved',url:good.url,caption:'Hello'}]);
 for(const input of [null,{}, {enabled:false,photos:[good]}, {enabled:true,photos:'bad'}])assert.equal(lib.approvedStagePhotos(input).length,0);
});
test('rotation keeps spotlight and signup highlights, replacing stats with trivia and optional photos',()=>{
 assert.deepEqual(Array.from(lib.audienceSlots(true,true,true,2)),['next','photo','trivia','highlight','promo:0','promo:1']);
 assert.deepEqual(Array.from(lib.audienceSlots(false,false,true,0)),['trivia','highlight']);
 assert.deepEqual(Array.from(lib.audienceSlots(false,false,false,0)),['trivia']);
});
test('trivia has distinct questions and nonempty answers without song lyric excerpts',()=>{
 assert.equal(lib.musicTrivia.length,100);assert.equal(new Set(lib.musicTrivia.map(q=>q.question)).size,lib.musicTrivia.length);
 for(const q of lib.musicTrivia){assert.ok(q.question.length<180&&q.answer.length>0&&q.answer.length<120);}
});
test('every question is used before the next cycle repeats',()=>{
 const first=Array.from({length:100},(_,turn)=>lib.musicTrivia[turn%lib.musicTrivia.length].question);
 assert.equal(new Set(first).size,100);
 assert.equal(lib.musicTrivia[100%lib.musicTrivia.length].question,first[0]);
});

test('trivia reveals the answer after nine seconds and cancels the reveal on unmount',()=>{
 const exports={},state=[],effects=[],timers=[];let cursor=0;const jsx=(type,props)=>({type,props});
 const react={useState:initial=>{const i=cursor++;if(!(i in state))state[i]=typeof initial==='function'?initial():initial;return[state[i],v=>state[i]=v]},useRef:()=>({current:false}),useEffect:fn=>effects.push(fn)};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync('components/display/StageAudienceMoments.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports,require:name=>name==='react'?react:name==='react/jsx-runtime'?{jsx,jsxs:jsx}:name.includes('stageAudienceContent')?lib:{default:{}},setTimeout:(fn,ms)=>{timers.push({fn,ms});return 1},clearTimeout:id=>timers.push({cleared:id})});
 const before=exports.StageTrivia({eventId:'show-a'});assert.ok(JSON.stringify(before).includes('Answer coming up'));const cleanups=effects.map(fn=>fn());assert.equal(timers[0].ms,9000);timers[0].fn();cursor=0;const after=exports.StageTrivia({eventId:'show-a'});assert.ok(JSON.stringify(after).includes('Freddie Mercury'));cleanups.filter(Boolean).forEach(fn=>fn());assert.ok(timers.some(t=>t.cleared===1));
});
