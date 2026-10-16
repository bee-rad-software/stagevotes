const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const now = Date.UTC(2026, 9, 16, 12);
const day = 86_400_000;
function load(path, requireMock = require) {
 const m = { exports: {} };
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/../' + path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText,
 { module: m, exports: m.exports, require: requireMock, Date, console: {error(){}}, process: {env:{}} });
 return m.exports;
}
const {trialReminderCopy: copy} = load('lib/trialReminder.ts');
function info(days, extra = {}) { return {state:'trialing',trialEndsAt:new Date(now + days * day).toISOString(),hasPaymentMethod:false,cancelScheduled:false,...extra}; }
test('trial reminders become urgent at three days and show accurate remaining time',()=>{
 assert.equal(copy(info(14),now).tone,'gentle');
 assert.match(copy(info(7),now).body,/next karaoke night/);
 assert.equal(copy(info(3),now).tone,'urgent');
 assert.match(copy(info(.2),now).title,/1 day/);
 assert.match(copy(info(0),now).title,/today/);
});
test('payment on file and cancellation have their own billing messages',()=>{
 assert.equal(copy(info(2,{hasPaymentMethod:true}),now).button,'Review billing');
 assert.equal(copy(info(2,{hasPaymentMethod:true,cancelScheduled:true}),now).button,'Review subscription');
 assert.equal(copy(info(-1,{state:'expired'}),now).button,'Subscribe to StageVotes');
 assert.equal(copy({...info(1),trialEndsAt:'bad'},now),null);
});
function route({role='owner',status='trialing',customer='cus_test',withCard=false,subscriptionStatus='trialing',end=Math.floor(Date.now()/1000)+2*86400,endedAt=null,authError=false}={}) {
 const calls={subscriptions:0,customers:0};
 class AuthError extends Error { constructor(){super('Sign in required');this.status=401;} }
 const sdk = {subscriptions:{retrieve:async()=>{calls.subscriptions++;return {status:subscriptionStatus,customer,trial_end:end,ended_at:endedAt,default_payment_method:withCard?'pm_test':null,cancel_at_period_end:false,cancel_at:null};}},customers:{retrieve:async()=>{calls.customers++;return {invoice_settings:{default_payment_method:null},default_source:null};}}};
 const {GET}=load('app/api/stripe/trial-status/route.ts',name=>{
  if(name==='next/server') return {NextResponse:{json:(body,options)=>({body,status:options?.status||200,headers:options?.headers})}};
  if(name==='stripe') return function(){return sdk;};
  if(name.includes('stageVotesAuth')) return {AuthError,requireStageVotesAccount:async()=>{if(authError)throw new AuthError();return {role,account:{stripe_subscription_id:'sub_test',stripe_customer_id:'cus_test',subscription_status:status}};}};
  throw Error(name);
 });
 return {calls,run:()=>GET({})};
}
test('trial details come from Stripe and responses cannot be cached',async()=>{
 const c=route();const r=await c.run();assert.equal(r.body.reminder.state,'trialing');assert.equal(r.body.reminder.hasPaymentMethod,false);assert.equal(c.calls.customers,1);assert.match(r.headers['Cache-Control'],/no-store/);
});
test('existing subscription payment method avoids a redundant customer lookup',async()=>{
 const c=route({withCard:true});const r=await c.run();assert.equal(r.body.reminder.hasPaymentMethod,true);assert.equal(c.calls.customers,0);
});
test('paid hosts, non-billing members, and anonymous users get no trial promotion',async()=>{
 for(const options of [{status:'active'},{role:'judge'}]){const c=route(options);assert.equal((await c.run()).body.reminder,null);assert.equal(c.calls.subscriptions,0);}
 assert.equal((await route({authError:true}).run()).status,401);
});
test('billing ownership mismatch is rejected',async()=>{
 assert.equal((await route({customer:'cus_other'}).run()).status,403);
});
test('expired trial gets subscribe prompt, later paid cancellation does not',async()=>{
 const end=Math.floor(Date.now()/1000)-86400;
 const expired=await route({status:'canceled',subscriptionStatus:'canceled',end,endedAt:end}).run();
 assert.equal(expired.body.reminder.state,'expired');
 const formerPaid=await route({status:'canceled',subscriptionStatus:'canceled',end,endedAt:end+30*86400}).run();
 assert.equal(formerPaid.body.reminder,null);
});
