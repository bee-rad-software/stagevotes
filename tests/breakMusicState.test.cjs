const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const ts = require('typescript');
const moduleObject = {exports:{}};
const code = ts.transpileModule(fs.readFileSync(__dirname+'/../lib/breakMusicState.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
vm.runInNewContext(code,{module:moduleObject,exports:moduleObject.exports});
const {initialBreakMusicState:initial,updateBreakMusicState:step,nextBreakTrack:next} = moduleObject.exports;
test('a ready song before any performance cannot start automatic music',()=>assert.equal(step(initial,true,3).between,false));
test('finished playback permits a break, but paused singing never does',()=>{
 const playing=step(initial,true,4);
 assert.equal(playing.blocked,true);
 const paused=step(playing,true,5);
 assert.equal(paused.blocked,true);assert.equal(paused.between,false);
 assert.equal(step(paused,true,3).between,true);
 assert.equal(step(playing,true,3).between,true);
});
test('disconnect resets the baseline and reconnect does not start music',()=>{
 const lost=step(step(initial,true,4),false,3);
 assert.equal(lost.blocked,true);assert.equal(step(lost,true,3).between,false);
});
test('unknown playback states fail silent',()=>{const state=step(step(initial,true,4),true,99);assert.equal(state.blocked,true);assert.equal(state.between,false);});
test('sequential playlists wrap and shuffle never repeats immediately',()=>{
 assert.equal(next(2,3,false),0);assert.equal(next(0,1,true),0);
 for(let i=0;i<4;i++)for(const r of [0,.25,.5,.999]){const n=next(i,4,true,()=>r);assert.notEqual(n,i);assert.ok(n>=0&&n<4);}
});

test('transient states preserve the performance until KaraFun is ready',()=>{
 let state=step(initial,true,4);
 for(const value of [null, 2, 99]) { state=step(state,true,value); assert.equal(state.blocked,true); assert.equal(state.between,false); }
 assert.equal(step(state,true,3).between,true);
 assert.equal(step(step(initial,true,2),true,3).between,false);
});
