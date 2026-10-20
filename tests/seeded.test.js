import { test } from 'vitest';
import assert from 'node:assert/strict';
import { seeded } from '../src/core/seeded.js';

test('a seeded run is the same every time, in [0, 1), and gives the numbers the copies it replaced gave', () => {
  const a = seeded(7);
  const b = seeded(7);
  const run = Array.from({ length: 50 }, () => a());
  assert.deepEqual(run, Array.from({ length: 50 }, () => b()));
  assert.ok(run.every((n) => n > 0 && n < 1));
  // (The first two of seed 7, as `seed = (seed * 16807) % 2147483647` gave them.)
  assert.equal(run[0], 117649 / 2147483647);
  assert.equal(run[1], ((117649 * 16807) % 2147483647) / 2147483647);
  assert.notEqual(seeded(8)(), run[0]);
});
