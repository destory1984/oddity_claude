import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mapPoint, mapHeading, pickNearest } from '../src/core/minimap.js';

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
