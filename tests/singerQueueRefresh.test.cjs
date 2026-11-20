const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup() {
  const source = fs.readFileSync('app/signup/[eventId]/page.tsx', 'utf8');
  const marker = source.indexOf('let stopped = false;');
  assert.ok(marker > 0);
  const start = source.lastIndexOf('  useEffect(() => {', marker);
  const end = source.indexOf('  }, [eventId]);', marker) + '  }, [eventId]);'.length;
  const listeners = { window: new Map(), document: new Map() };
  const target = key => ({
    addEventListener: (name, fn) => listeners[key].set(name, fn),
    removeEventListener: (name, fn) => { if (listeners[key].get(name) === fn) listeners[key].delete(name); },
  });
  let tick, delay, cleanup, eventCalls = 0, queueCalls = 0;
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const document = { ...target('document'), visibilityState: 'visible' };
  vm.runInNewContext(source.slice(start, end), {
    eventId: 'show-id', document, console,
    window: { ...target('window'), setInterval(fn, ms) { tick = fn; delay = ms; return 1; }, clearInterval() { tick = undefined; } },
    useEffect(fn) { cleanup = fn(); },
    loadEvent: async () => { eventCalls++; await pending; },
    loadQueue: async () => { queueCalls++; await pending; },
  });
  return { document, listeners, get tick() { return tick; }, delay, cleanup, release, counts: () => [eventCalls, queueCalls] };
}

test('foreground polling refreshes both queue and show, without overlapping fallback requests', async () => {
  const s = setup();
  assert.equal(s.delay, 15000);
  const first = s.tick();
  await s.tick();
  assert.deepEqual(s.counts(), [1, 1]);
  s.release(); await first;
  await s.tick();
  assert.deepEqual(s.counts(), [2, 2]);
});

test('returning to a visible page and reconnecting refresh the queue; background polling is skipped', async () => {
  const s = setup();
  s.document.visibilityState = 'hidden';
  await s.tick();
  assert.deepEqual(s.counts(), [0, 0]);
  s.release();
  s.document.visibilityState = 'visible';
  await s.listeners.document.get('visibilitychange')();
  await s.listeners.window.get('online')();
  await s.listeners.window.get('focus')();
  assert.deepEqual(s.counts(), [3, 3]);
  const oldRefresh = s.tick;
  s.cleanup();
  assert.equal(s.tick, undefined);
  assert.equal(s.listeners.window.size, 0);
  assert.equal(s.listeners.document.size, 0);
  await oldRefresh();
  assert.deepEqual(s.counts(), [3, 3]);
});
