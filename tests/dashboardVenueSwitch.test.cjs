const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');

test('changing the venue filters open shows without restarting its subscription',()=>{
 const source=fs.readFileSync('components/dashboard/SVActiveShows.tsx','utf8');
 const hooks=[];let cursor=0,subscriptions=0,removals=0;
 const data=[{id:'a',venue_id:'one',name:'First show'},{id:'b',venue_id:'two',name:'Second show'}];
 const react={useState(initial){const i=cursor++;if(!(i in hooks))hooks[i]=initial;return [hooks[i],v=>{hooks[i]=v;}];},useEffect(fn,deps){const i=cursor++;if(!hooks[i]||deps.some((v,n)=>v!==hooks[i].deps[n])){hooks[i]?.cleanup?.();hooks[i]={deps,cleanup:fn()};}}};
 const query={select(){return this},eq(){return this},order(){return Promise.resolve({data,error:null})}};
 const supabase={from:()=>query,channel(){subscriptions++;return {on(){return this},subscribe(){return this}}},removeChannel(){removals++;}};
 const jsx=(type,props,key)=>({type,props,key});
 const out={};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,{exports:out,require(name){if(name==='react')return react;if(name==='react/jsx-runtime')return {jsx,jsxs:jsx};if(name==='next/link')return {default:'a'};if(name==='@/lib/supabase')return {supabase};if(name==='@/lib/filterShowsByVenue')return {filterShowsByVenue:(rows,id)=>id?rows.filter(r=>r.venue_id===id):rows};throw Error(name);},crypto:{randomUUID:()=> 'instance'},window:{setInterval:()=>1,clearInterval(){},addEventListener(){},removeEventListener(){}},document:{visibilityState:'visible'}});
 const render=id=>{cursor=0;return out.default({accountId:'account',venueId:id});};
 render('one');hooks[0]=data;
 assert.match(JSON.stringify(render('one')),/First show/);
 const second=JSON.stringify(render('two'));
 assert.match(second,/Second show/);assert.doesNotMatch(second,/First show/);
 assert.equal(subscriptions,1);assert.equal(removals,0);
});

test('dashboard preserves open-show component identity across venue selections',()=>{
 const source=ts.createSourceFile('page.tsx',fs.readFileSync('app/page.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let key;
 function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(source)==='SVActiveShows')key=node.attributes.properties.find(a=>a.name?.getText(source)==='key')?.initializer?.getText(source);ts.forEachChild(node,visit);}
 visit(source);assert.equal(key,'{account.id}');
});
