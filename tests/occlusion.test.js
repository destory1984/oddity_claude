import { test } from 'vitest';
import assert from 'node:assert/strict';
import { sunVisibility } from '../src/core/occlusion.js';

const SUN_RADIUS = 696340;
const SUN_DISTANCE = 2.19e6;
const sunDir = [1, 0, 0];

test('the Sun is fully visible with nothing in front of it', () => {
  assert.equal(sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, []), 1);
});

test('a planet squarely in front hides the Sun', () => {
  const earth = { direction: [1, 0, 0], distance: 15000, radius: 6371 };
  assert.ok(sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [earth]) < 0.01);
});

test('a planet far off to the side does not dim the Sun', () => {
  const earth = { direction: [0, 0, -1], distance: 15000, radius: 6371 };
  assert.equal(sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [earth]), 1);
});

test('a body behind the Sun cannot hide it', () => {
  const behind = { direction: [1, 0, 0], distance: SUN_DISTANCE * 2, radius: 6371 };
  assert.equal(sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [behind]), 1);
});

test('a planet at the Sun edge dims it partly, and the dimmest occluder wins', () => {
  const edge = { direction: [Math.cos(0.43), Math.sin(0.43), 0], distance: 15000, radius: 6371 };
  const full = { direction: [1, 0, 0], distance: 15000, radius: 6371 };
  const partial = sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [edge]);
  assert.ok(partial > 0 && partial < 1, `edge case should be partial, got ${partial}`);
  assert.ok(sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [edge, full]) < 0.01);
});

test('visibility is the uncovered share of the disc area, not of its width', () => {
  // A small body crossing the middle of the Sun (a transit) covers 1% of the disc.
  const transit = { direction: [1, 0, 0], distance: SUN_DISTANCE / 2, radius: SUN_RADIUS / 20 };
  const seen = sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [transit]);
  assert.ok(Math.abs(seen - 0.99) < 0.002, `transit leaves 99%, got ${seen}`);
  // A body a little wider than the Sun whose edge reaches a quarter of the way across
  // covers about 15.5% (checked by counting random points).
  const sunAngular = Math.asin(SUN_RADIUS / SUN_DISTANCE);
  const big = Math.asin(6371 / 15000);
  const sep = big + sunAngular / 2;
  const quarter = { direction: [Math.cos(sep), Math.sin(sep), 0], distance: 15000, radius: 6371 };
  const left = sunVisibility(sunDir, SUN_DISTANCE, SUN_RADIUS, [quarter]);
  assert.ok(Math.abs(left - 0.845) < 0.005, `quarter-width cover leaves about 84.5%, got ${left}`);
});
