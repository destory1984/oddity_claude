import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ringCrossing } from '../src/core/rings.js';

const up = [0, 1, 0];
const INNER = 74500;
const OUTER = 136775;

test('flying down through the ring plane between the ring edges is a crossing', () => {
  const hit = ringCrossing([100000, 500, 0], [100000, -500, 0], up, INNER, OUTER);
  assert.ok(hit);
  assert.ok(Math.abs(hit.t - (100000 - INNER) / (OUTER - INNER)) < 1e-9);
});

test('crossing upward counts too, and the place is where the path meets the plane', () => {
  const hit = ringCrossing([0, -100, 80000], [0, 300, 120000], up, INNER, OUTER);
  assert.ok(Math.abs(hit.t - (90000 - INNER) / (OUTER - INNER)) < 1e-9);
});

test('staying on one side, or crossing inside the gap or outside the rings, is nothing', () => {
  assert.equal(ringCrossing([100000, 500, 0], [100000, 100, 0], up, INNER, OUTER), null);
  assert.equal(ringCrossing([70000, 500, 0], [70000, -500, 0], up, INNER, OUTER), null);
  assert.equal(ringCrossing([140000, 500, 0], [140000, -500, 0], up, INNER, OUTER), null);
  assert.equal(ringCrossing([100000, 0, 0], [100000, 0, 0], up, INNER, OUTER), null);
});

test('a tilted ring plane uses its own normal', () => {
  const n = [0, Math.cos(0.47), Math.sin(0.47)];
  const onPlane = [100000, 0, 0];
  const above = onPlane.map((v, i) => v + n[i] * 50);
  const below = onPlane.map((v, i) => v - n[i] * 50);
  assert.ok(ringCrossing(above, below, n, INNER, OUTER));
});

test('the B ring is the densest, the Cassini division nearly empty', async () => {
  const { ringDensity } = await import('../src/core/rings.js');
  assert.ok(ringDensity(0.5) > ringDensity(0.9) && ringDensity(0.9) > ringDensity(0.1));
  assert.ok(ringDensity(0.72) < 0.1);
  assert.equal(ringDensity(1.2), 0);
});
