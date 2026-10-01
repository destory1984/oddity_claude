import { test } from 'vitest';
import assert from 'node:assert/strict';
import { cometActivity, tailLengthKm } from '../src/core/comet.js';

test('a comet is fully awake at perihelion and asleep beyond 5 AU', () => {
  assert.equal(cometActivity(0.586), 1);
  assert.equal(cometActivity(0.3), 1);
  assert.equal(cometActivity(5.01), 0);
  assert.equal(cometActivity(35), 0);
});

test('the nearer the Sun, the more active', () => {
  assert.ok(cometActivity(1) > cometActivity(1.32) && cometActivity(1.32) > cometActivity(3));
});

test('the tail is 500,000 km at perihelion and about 150,000 km at the start', () => {
  assert.equal(tailLengthKm(0.586), 500000);
  assert.ok(Math.abs(tailLengthKm(1.324) - 147000) < 3000);
  assert.equal(tailLengthKm(10), 0);
});
