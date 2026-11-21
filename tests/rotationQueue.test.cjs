const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(name) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(`lib/${name}.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
  }).outputText, { exports, require: () => load('rotationIdentity') });
  return exports;
}
const { buildRotationQueue } = load('rotationQueue');
const song = (id, singer_name, queue_order, extra = {}) => ({ id, singer_name, queue_order, round: 1, ...extra });
const ids = (songs, current) => Array.from(buildRotationQueue(songs, current), p => p.id);
test('same-round duplicates from guest, profile and host entry wait until after Steven', () => {
  const set = [
    song('cara1', 'Cara', 2, { singer_profile_id: 'cara' }),
    song('cara2', ' cara ', 3, { device_id: 'phone' }),
    song('cara3', 'Cara', 4),
    song('steven', 'Steven', 16),
  ];
  assert.deepEqual(ids(set, 'cara1'), ['cara1', 'steven', 'cara2', 'cara3']);
  assert.deepEqual(ids(set), ['cara1', 'steven', 'cara2', 'cara3']);
  assert.deepEqual(ids([{ ...set[0], status: 'completed' }, ...set.slice(1)]), ['steven', 'cara2', 'cara3']);
});
test('manual order is honored and distinct signed-in singers with the same name stay distinct', () => {
  assert.deepEqual(ids([
    song('cara1', 'Cara', 1, { singer_profile_id: 'a', manual_queue_order: 3 }),
    song('cara2', 'Cara', 2, { singer_profile_id: 'b', manual_queue_order: 1 }),
    song('steven', 'Steven', 16, { manual_queue_order: 2 }),
    song('later', 'Steven', 16, { round: 2, manual_queue_order: 1 }),
  ]), ['cara2', 'steven', 'cara1', 'later']);
});
