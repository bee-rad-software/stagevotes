const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/nearbyLiveShows.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: exportsObject });
const { nearbyLiveShows, venueCoordinates } = exportsObject;

test('Rogers shows nearby venues nearest first and excludes England and unknown locations', () => {
  const rogers = venueCoordinates(36.33, -94.12);
  const shows = [
    { id: 'England', coordinates: venueCoordinates(52.49, -1.97) },
    { id: 'Fayetteville', coordinates: venueCoordinates(36.06, -94.16) },
    { id: 'Unknown', coordinates: venueCoordinates(null, null) },
    { id: 'Rogers', coordinates: rogers },
  ];
  assert.equal(Array.from(nearbyLiveShows(shows, rogers), show => show.id).join(','), 'Rogers,Fayetteville');
});

test('zero is a valid coordinate; incomplete and out-of-range locations are excluded', () => {
  assert.ok(venueCoordinates(0, 0));
  assert.equal(venueCoordinates(91, 0), null);
  assert.equal(venueCoordinates(0, NaN), null);
  assert.equal(venueCoordinates(null, 0), null);
});
