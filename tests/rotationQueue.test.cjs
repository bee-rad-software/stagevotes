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

const { assignSignupRound, getRotationProgress, getFitIntoRoundUpdates } = load('rotationQueue');

test('a late returning singer keeps their slot next round while singers whose slots are ahead stay in this round', () => {
  const rows = [
    song('greg1', 'Greg', 4, { status: 'completed' }),
    song('current', 'Jen', 7, { round: 2, manual_queue_order: 1 }),
    song('waiting', 'Brad', 9, { round: 2 }),
  ];
  const progress = getRotationProgress(rows, 'current');
  assert.equal(assignSignupRound(progress, 4, 1), 3);
  assert.equal(assignSignupRound(progress, 8, 1), 2);
  assert.equal(assignSignupRound(progress, null, null), 2);
  assert.equal(assignSignupRound(progress, 8, 2), 3);
  const betweenSongs = getRotationProgress([
    rows[0], { ...rows[1], status: 'completed' },
  ], null);
  assert.equal(assignSignupRound(betweenSongs, 4, 1), 3);
});

test('fit puts only a missed turn behind this round’s waiting songs and preserves the permanent slot', () => {
  const rows = [
    song('current', 'Jen', 7, { round: 2 }),
    song('waiting', 'Brad', 9, { round: 2, manual_queue_order: 12 }),
    song('greg1', 'Greg', 4, { status: 'completed' }),
    song('greg3', 'Greg', 4, { round: 3, singer_profile_id: 'greg' }),
    song('greg4', 'Greg', 4, { round: 4, singer_profile_id: 'greg' }),
    song('bill2', 'Bill', 5, { round: 2, status: 'completed' }),
    song('bill3', 'Bill', 5, { round: 3 }),
  ];
  const updates = getFitIntoRoundUpdates(rows, 'current');
  assert.deepEqual(Array.from(updates.keys()), ['greg3']);
  assert.equal(updates.get('greg3').round, 2);
  assert.equal(updates.get('greg3').manual_queue_order, 13);
  const moved = rows.map(row => ({ ...row, ...updates.get(row.id) }));
  assert.equal(moved.find(row => row.id === 'greg3').queue_order, 4);
  assert.deepEqual(ids(moved, 'current'), ['current', 'waiting', 'greg3', 'bill3', 'greg4']);
  assert.equal(getFitIntoRoundUpdates(moved, 'current').size, 0);
});
