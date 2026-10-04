import { test } from 'vitest';
import assert from 'node:assert/strict';
import { feelFovDeg, easeFovDeg, streakAmount, BASE_FOV_DEG, WIDE_FOV_DEG } from '../src/core/speedFeel.js';

test('the view is 60 degrees up to 60% of the speed limit and 72 at the limit', () => {
  assert.equal(BASE_FOV_DEG, 60);
  assert.equal(WIDE_FOV_DEG, 12);
  assert.equal(feelFovDeg(0, false), 60);
  assert.equal(feelFovDeg(0.6, false), 60);
  assert.ok(Math.abs(feelFovDeg(0.8, false) - 66) < 1e-9);
  assert.equal(feelFovDeg(1, false), 72);
  assert.equal(feelFovDeg(3, false), 72);
});

test('on an upright screen the view widens half as much', () => {
  assert.equal(feelFovDeg(1, true), 66);
  assert.ok(Math.abs(feelFovDeg(0.8, true) - 63) < 1e-9);
});

test('the view takes half a second to go the whole way, and stops at its goal', () => {
  assert.equal(easeFovDeg(60, 72, 0.25), 66);
  assert.equal(easeFovDeg(60, 72, 0.5), 72);
  assert.equal(easeFovDeg(60, 72, 5), 72);
  assert.equal(easeFovDeg(72, 60, 0.25), 66);
  assert.equal(easeFovDeg(66, 66, 0.1), 66);
  assert.equal(easeFovDeg(70, 60, 0), 70);
});

test('stars draw out into lines from 2c, by the logarithm of the speed, fully at 100c', () => {
  assert.equal(streakAmount(0), 0);
  assert.equal(streakAmount(2), 0);
  assert.ok(Math.abs(streakAmount(Math.sqrt(200)) - 0.5) < 1e-9);
  assert.equal(streakAmount(100), 1);
  assert.equal(streakAmount(1000), 1);
});
