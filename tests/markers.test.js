import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keepMarker, spreadArrows, crowdedMoons, nearCentre } from '../src/core/markers.js';

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

const saturn = { id: 'saturn', parent: null, x: 567, y: 212, outside: false, selected: false };
const titan = { id: 'titan', parent: 'saturn', x: 573, y: 210, outside: false, selected: false };

test('a moon label sitting on its planet label is hidden', () => {
  assert.deepEqual([...crowdedMoons([saturn, titan])], ['titan']);
});

test('a selected moon keeps its label even on top of its planet', () => {
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, selected: true }])], []);
});

test('a moon far enough from its planet on screen keeps its label', () => {
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, x: 567 + 41 }])], []);
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, y: 212 + 41 }])], []);
});

test('off-screen arrows are left to spreadArrows', () => {
  assert.deepEqual([...crowdedMoons([{ ...saturn, outside: true }, titan])], []);
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, outside: true }])], []);
});

test('Earth and the Sun keep their arrow from anywhere', () => {
  const far = { outside: true, selected: false, nearest: false, surfaceKm: 5e8 };
  assert.equal(keepMarker(far), false);
  assert.equal(keepMarker({ ...far, always: true }), true);
});

test('a label counts as near the centre within a quarter of the shorter side of the screen', () => {
  // 1280 x 720: within 180 px of (640, 360).
  assert.equal(nearCentre(640, 360, 1280, 720), true);
  assert.equal(nearCentre(640 + 179, 360, 1280, 720), true);
  assert.equal(nearCentre(640 + 181, 360, 1280, 720), false);
  assert.equal(nearCentre(640 + 130, 360 + 130, 1280, 720), false);
  // A tall phone: 375 x 812 gives 94 px.
  assert.equal(nearCentre(187, 406 + 90, 375, 812), true);
  assert.equal(nearCentre(187, 406 + 100, 375, 812), false);
});
