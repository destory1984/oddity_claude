import { test } from 'vitest';
import assert from 'node:assert/strict';
import { lookBackPlan, LOOK_MIN_S, LOOK_MAX_S } from '../src/core/lookBack.js';

const album = (n) => Array.from({ length: n }, (_, i) => ({ at: `2026-10-${String(n - i).padStart(2, '0')}T00:00:00Z` }));

test('looking back goes from the oldest photo to the newest', () => {
  const { photos } = lookBackPlan(album(3));
  assert.deepEqual(photos.map((p) => p.at.slice(8, 10)), ['01', '02', '03']);
});

test('about thirty seconds in all, each photo between 1.5 and 4 seconds', () => {
  assert.equal(lookBackPlan(album(10)).each, 3);
  assert.equal(lookBackPlan(album(24)).each, LOOK_MIN_S);
  assert.equal(lookBackPlan(album(2)).each, LOOK_MAX_S);
  assert.equal(lookBackPlan([]).each, 0);
});
