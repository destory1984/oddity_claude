import { test } from 'vitest';
import assert from 'node:assert/strict';
import { keepMarker, spreadArrows, crowdedMoons, nearCentre, overlapped, behindBody } from '../src/core/markers.js';

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

test('of labels that overlap, the nearer thing keeps its label and the farther waits', () => {
  const box = (id, left, top, km, first = false) => ({ id, left, top, right: left + 100, bottom: top + 24, km, first });
  // Three stacked on each other: only the nearest shows.
  assert.deepEqual([...overlapped([box('a', 0, 0, 900), box('b', 40, 10, 500), box('c', 80, 5, 700)])], ['c', 'a']);
  // b is nearest; c overlaps b and goes; a overlaps only c, which is gone, so a shows.
  assert.deepEqual([...overlapped([box('a', 0, 0, 900), box('b', 190, 0, 500), box('c', 95, 0, 700)])], ['c']);
  // Apart on screen: all show, whatever their distances.
  assert.equal(overlapped([box('a', 0, 0, 900), box('b', 0, 40, 500), box('c', 120, 0, 700)]).size, 0);
  // Two pixels of air count as touching.
  assert.equal(overlapped([box('a', 0, 0, 1), box('b', 101, 0, 2)]).size, 1);
  assert.equal(overlapped([box('a', 0, 0, 1), box('b', 103, 0, 2)]).size, 0);
  // The chosen target is never hidden, even when it is the farther one.
  assert.deepEqual([...overlapped([box('near', 0, 0, 10), box('chosen', 30, 0, 9000, true)])], ['near']);
  assert.equal(overlapped([]).size, 0);
});

test('a world keeps its name over a spacecraft or a surface place, even a nearer or chosen one', () => {
  const box = (id, left, km, extra = {}) => ({ id, left, top: 0, right: left + 100, bottom: 24, km, ...extra });
  // Hubble is nearer than Earth's surface is and sits on Earth's label: Earth shows.
  assert.deepEqual([...overlapped([box('earth', 0, 292000), box('hubble', 40, 291500, { minor: true })])], ['hubble']);
  // Even when Hubble is the chosen target.
  assert.deepEqual([...overlapped([box('earth', 0, 292000), box('hubble', 40, 291500, { minor: true, first: true })])], ['hubble']);
  // A chosen craft that covers no world's name stays, over other craft.
  assert.deepEqual([...overlapped([box('iss', 0, 100, { minor: true }), box('hubble', 40, 900, { minor: true, first: true })])], ['iss']);
  // Two worlds: the nearer, as before; the chosen world is never hidden.
  assert.deepEqual([...overlapped([box('earth', 0, 9000), box('moon', 40, 300000)])], ['moon']);
  assert.deepEqual([...overlapped([box('earth', 0, 9000), box('moon', 40, 300000, { first: true })])], ['earth']);
});

test('what stands behind a planet or a moon gets no label; what is in front of it or beside it does', () => {
  const earth = { id: 'earth', radiusKm: 6371, position: [0, 0, 0] };
  const moon = { id: 'moon', radiusKm: 1737, position: [0, 0, 40000] };
  const bodies = [earth, moon];
  const here = [0, 0, -20000];
  // The Moon straight behind Earth; a planet far beyond, the same way.
  assert.equal(behindBody(moon, here, bodies), true);
  assert.equal(behindBody({ id: 'venus', radiusKm: 6052, position: [1000, 0, 2e6] }, here, bodies), true);
  // Earth itself, a craft this side of it, and one out past its edge.
  assert.equal(behindBody(earth, here, bodies), false);
  assert.equal(behindBody({ id: 'hubble', kind: 'craft', radiusKm: 0, position: [0, 0, -6900] }, here, bodies), false);
  assert.equal(behindBody({ id: 'iss', kind: 'craft', radiusKm: 0, position: [9000, 0, 3000] }, here, bodies), false);
  // A craft in low orbit on the far side.
  assert.equal(behindBody({ id: 'tiangong', kind: 'craft', radiusKm: 0, position: [0, 0, 6800] }, here, bodies), true);
  // Something behind the traveler, with Earth ahead: not hidden.
  assert.equal(behindBody({ id: 'mars', radiusKm: 3390, position: [0, 0, -5e6] }, here, bodies), false);
  // Standing on the Moon, Earth overhead shows; from the far side it does not.
  assert.equal(behindBody(earth, [0, 0, 40000 - 1737], bodies), false);
  assert.equal(behindBody(earth, [0, 0, 40000 + 1737], bodies), true);
});
