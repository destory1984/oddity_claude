import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mapPoint, mapHeading, pickNearest, mapLetter, letterPoint } from '../src/core/minimap.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the Sun is the centre and the outer orbit touches the edge', () => {
  assert.deepEqual(mapPoint([0, 0, 0], [0, 0, 0], 100, 80), [0, 0]);
  const [x, y] = mapPoint([100, 0, 0], [0, 0, 0], 100, 80);
  near(x, 80);
  near(y, 0);
});

test('north (+z) is up on the map and height (y) is ignored', () => {
  const [x, y] = mapPoint([0, 999, 100], [0, 0, 0], 100, 80);
  near(x, 0);
  near(y, -80);
});

test('distances shrink by the square root so inner planets spread out', () => {
  const [x] = mapPoint([25, 0, 0], [0, 0, 0], 100, 80);
  near(x, 40);
});

test('beyond the outer orbit a point sticks to the edge', () => {
  const [x] = mapPoint([400, 0, 0], [0, 0, 0], 100, 80);
  near(x, 80);
});

test('positions are relative to the Sun', () => {
  const [x, y] = mapPoint([110, 5, 10], [10, 5, 10], 100, 80);
  near(x, 80);
  near(y, 0);
});

test('the heading is the forward vector laid flat, or null when looking straight up or down', () => {
  const [x, y] = mapHeading([0, 0, 1]);
  near(x, 0);
  near(y, -1);
  const [x2, y2] = mapHeading([3, 5, 0]);
  near(x2, 1);
  near(y2, 0);
  assert.equal(mapHeading([0, 1, 0]), null);
  assert.equal(mapHeading([1e-9, -1, 0]), null);
});

test('a tap picks the nearest dot within reach', () => {
  const dots = [{ id: 'mars', x: 30, y: 0 }, { id: 'earth', x: 22, y: 0 }];
  assert.equal(pickNearest([24, 1], dots), 'earth');
  assert.equal(pickNearest([29, -2], dots), 'mars');
  assert.equal(pickNearest([80, 80], dots), null);
});

test('Earth and the planets and dwarf planets beyond it have the first letter of their English name; Mercury, Venus, the Sun, moons and comets have none', async () => {
  const { BODIES: all } = await import('../src/core/bodies.js');
  const letter = (id) => mapLetter(all.find((b) => b.id === id));
  assert.equal(letter('saturn'), 'S');
  assert.equal(letter('earth'), 'E');
  assert.equal(letter('jupiter'), 'J');
  assert.equal(letter('pluto'), 'P');
  assert.equal(letter('ceres'), 'C');
  assert.equal(letter('mars'), 'M');
  assert.equal(letter('mercury'), null);
  assert.equal(letter('venus'), null);
  assert.equal(letter('sun'), null);
  assert.equal(letter('moon'), null);
  assert.equal(letter('halley'), null);
  assert.equal(all.filter((b) => mapLetter(b)).length, 8);
});

test('the letter stands outward of its dot, away from the middle of the map', () => {
  assert.deepEqual(letterPoint([10, 0], 7), [17, 0]);
  assert.deepEqual(letterPoint([0, -20], 7), [0, -27]);
  const [x, y] = letterPoint([3, 4], 5);
  assert.ok(Math.abs(x - 6) < 1e-9 && Math.abs(y - 8) < 1e-9);
  assert.deepEqual(letterPoint([0, 0], 7), [0, -7]);
  // On the rim of a map 60 px in radius, the letter goes inside.
  assert.deepEqual(letterPoint([52, 0], 7, 54), [45, 0]);
  assert.deepEqual(letterPoint([40, 0], 7, 54), [47, 0]);
});
