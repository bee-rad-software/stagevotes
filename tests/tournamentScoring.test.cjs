const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('fs');const ts=require('typescript');
function load(p){const m={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(m,m.exports);return m.exports;}
const {validatePointCategories:validate,defaultPointCategories}=load('lib/tournamentScoring.ts');const {calculateJudgeScore}=load('lib/olympicScoring.ts');
test('valid uneven rubric totals 100',()=>assert.deepEqual(validate(defaultPointCategories),defaultPointCategories));
test('reject invalid totals, duplicates, fractions and empty categories',()=>{for(const c of [[],[{name:'A',maxPoints:99}],[{name:'A',maxPoints:50},{name:'a',maxPoints:50}],[{name:'A',maxPoints:99.5},{name:'B',maxPoints:.5}],[{name:'',maxPoints:100}]])assert.throws(()=>validate(c));});
function ballots(totals){return totals.flatMap((n,j)=>[.4,.3,.3].map((w,i)=>({device_id:String(j),category_id:String(i),score:n*w*3/20})));}
test('weighted reads retain exact 100-point totals including zero',()=>{for(const total of [0,35,87,100])assert.ok(Math.abs(calculateJudgeScore(ballots([total]),['0','1','2']).averageScore*20-total)<1e-9);});
test('Olympic scoring trims total ballots with unequal category maxima',()=>{const result=calculateJudgeScore(ballots([10,60,80,90,100]),['0','1','2'],{olympic:true,expectedJudges:5});assert.ok(Math.abs(result.averageScore*20-(60+80+90)/3)<1e-9);assert.deepEqual(result.excludedJudgeIds,['0','4']);});
test('Olympic scoring waits for every complete ballot',()=>assert.equal(calculateJudgeScore(ballots([90,100]),['0','1','2'],{olympic:true,expectedJudges:5}).averageScore,null));
