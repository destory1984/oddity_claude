import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PALS, PAL_FRAMES, palFor, palFile } from '../src/core/pal.js';

test('seven companions, four drawings each, all on file', () => {
  assert.equal(PALS.length, 7);
  for (const pal of PALS) {
    for (let frame = 0; frame < PAL_FRAMES; frame++) assert.ok(existsSync(`public/assets/${palFile(pal.id, frame)}`), palFile(pal.id, frame));
  }
  assert.equal(palFile('star', 0), 'pals/pal-star-1.png');
});

test('the companion is the last one earned: by slots, by a full journal, by all nine tours', () => {
  const at = (done, allTours = false) => palFor({ done, total: 183, allTours });
  assert.equal(at(39), null);
  assert.equal(at(40), 'star');
  assert.equal(at(79), 'star');
  assert.equal(at(80), 'saturn');
  assert.equal(at(120), 'voyager');
  assert.equal(at(182), 'voyager');
  assert.equal(at(183), 'earth');
  // The crane comes with the tours, however full the journal is.
  assert.equal(at(1, true), 'crane');
  assert.equal(at(183, true), 'crane');
  // The comet for all four stunts and the aurora for all the photo missions come after
  // the first three and before a full journal.
  assert.deepEqual(PALS.map((p) => p.id), ['star', 'saturn', 'voyager', 'comet', 'aurora', 'earth', 'crane']);
  assert.equal(palFor({ done: 130, total: 183, allTours: false, allStunts: true }), 'comet');
  assert.equal(palFor({ done: 10, total: 183, allTours: false, allStunts: true, allPhotos: true }), 'aurora');
  assert.equal(palFor({ done: 183, total: 183, allTours: false, allStunts: true, allPhotos: true }), 'earth');
});
