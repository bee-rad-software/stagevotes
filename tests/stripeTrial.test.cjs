const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function checkout({ history = [], open = [], status = 'incomplete', subscriptionId = null, rejectAuth = false } = {}) {
  const calls = { created: [], expired: [] };
  const sdk = {
    customers: { create: async () => ({ id: 'cus_test' }) },
    subscriptions: { list: async () => ({ data: history }) },
    checkout: { sessions: {
      list: async () => ({ data: open }),
      expire: async id => { calls.expired.push(id); },
      create: async options => { calls.created.push(options); return { url: 'https://checkout.stripe.com/new' }; },
    } },
  };
  class AuthError extends Error { constructor(message, status = 401) { super(message); this.status = status; } }
  const moduleObject = { exports: {} };
  const source = fs.readFileSync(__dirname + '/../app/api/stripe/checkout/route.ts', 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, {
    module: moduleObject, exports: moduleObject.exports, URL, console: { error() {} },
    process: { env: { NEXT_PUBLIC_SITE_URL: 'https://app.stagevotes.com', STRIPE_PRICE_ID: 'price_test' } },
    require(name) {
      if (name === 'next/server') return { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } };
      if (name === 'stripe') return function Stripe() { return sdk; };
      if (name.includes('desktopDownloadIntent')) return { desktopPlatform: value => ['mac', 'windows'].includes(value) ? value : null };
      if (name.includes('stageVotesAuth')) return { AuthError, getSupabaseAdmin: () => ({}), requireStageVotesAccount: async () => {
        if (rejectAuth) throw new AuthError('Sign in required');
        return { user: { email: 'host@example.com' }, account: { id: 'account_test', stripe_customer_id: 'cus_test', stripe_subscription_id: subscriptionId, subscription_status: status } };
      } };
      throw Error(name);
    },
  });
  return { calls, run: (platform = 'mac') => moduleObject.exports.POST({ headers: new Headers(), json: async () => ({ downloadPlatform: platform }) }) };
}
test('new trial requires no card, lasts 14 days, cancels without payment, preserves installer return', async () => {
  const c = checkout(); const result = await c.run();
  assert.equal(result.status, 200);
  const session = c.calls.created[0];
  assert.equal(session.payment_method_collection, 'if_required');
  assert.equal(session.subscription_data.trial_period_days, 14);
  assert.equal(session.subscription_data.trial_settings.end_behavior.missing_payment_method, 'cancel');
  assert.match(session.success_url, /download=mac/);
});
test('expired trial subscribers can pay without getting another trial', async () => {
  const c = checkout({ history: [{ status: 'canceled' }], status: 'canceled', subscriptionId: 'sub_old' }); await c.run('windows');
  const session = c.calls.created[0];
  assert.equal(session.payment_method_collection, 'always');
  assert.equal(session.subscription_data.trial_period_days, undefined);
  assert.match(session.success_url, /download=windows/);
});
test('old seven-day card-required checkout is expired rather than reused', async () => {
  const c = checkout({ open: [{ id: 'cs_old', url: 'https://checkout.stripe.com/old', success_url: 'https://app.stagevotes.com/onboarding?download=mac', metadata: {} }] });
  await c.run(); assert.equal(c.calls.expired[0], 'cs_old'); assert.equal(c.calls.created.length, 1);
});
test('matching current checkout is reused', async () => {
  const c = checkout({ open: [{ id: 'cs_new', url: 'https://checkout.stripe.com/existing', success_url: 'https://app.stagevotes.com/onboarding?download=mac', metadata: { checkout_policy: 'trial-14-no-card-v1' } }] });
  const result = await c.run(); assert.equal(result.body.url, 'https://checkout.stripe.com/existing'); assert.equal(c.calls.created.length, 0);
});
test('active or unsynchronized live subscriptions cannot be duplicated', async () => {
  for (const options of [{ status: 'active' }, { history: [{ status: 'trialing' }] }, { history: [{ status: 'past_due' }] }]) {
    const c = checkout(options); assert.equal((await c.run()).status, 409); assert.equal(c.calls.created.length, 0);
  }
});
test('trial activation requires authenticated account', async () => {
  const c = checkout({ rejectAuth: true }); assert.equal((await c.run()).status, 401); assert.equal(c.calls.created.length, 0);
});
