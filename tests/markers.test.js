import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keepMarker, spreadArrows } from '../src/core/markers.js';

test('on-screen bodies always keep their label', () => {
  assert.equal(keepMarker({ outside: false, selected: false, nearest: false, surfaceKm: 1e9 }), true);
});

test('off-screen arrows: selected, nearest, and anything within 300,000 km', () => {
  const off = { outside: true, selected: false, nearest: false };
  assert.equal(keepMarker({ ...off, surfaceKm: 37600 }), true, 'the Moon near Earth');
  assert.equal(keepMarker({ ...off, surfaceKm: 300000 }), true);
  assert.equal(keepMarker({ ...off, surfaceKm: 300001 }), false);
  assert.equal(keepMarker({ ...off, selected: true, surfaceKm: 1e9 }), true);
  assert.equal(keepMarker({ ...off, nearest: true, surfaceKm: 1e9 }), true);
});

test('arrows piled on one spot are pushed apart vertically', () => {
  const spread = spreadArrows([{ x: 1200, y: 300 }, { x: 1205, y: 310 }, { x: 1200, y: 305 }], 40, 720);
  const ys = spread.map((a) => a.y).sort((a, b) => a - b);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] - ys[i - 1] >= 40 - 1e-9, `${ys}`);
  for (const y of ys) assert.ok(y >= 0 && y <= 720);
});

test('arrows far apart are left alone', () => {
  const input = [{ x: 100, y: 300 }, { x: 1200, y: 300 }];
  assert.deepEqual(spreadArrows(input, 40, 720), input);
});
