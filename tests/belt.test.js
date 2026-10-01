import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BELT, MAX_ROCKS, inBelt, rocksNear, beltPoints } from '../src/core/belt.js';

const SUN = [0, 0, 0];
const mid = (BELT.innerKm + BELT.outerKm) / 2;

test('the belt spans 2.2 to 3.2 AU after the 1/100 squeeze', () => {
  assert.ok(Math.abs(BELT.innerKm - 2.2 * 149597870.7 / 100) < 1);
  assert.ok(Math.abs(BELT.outerKm - 3.2 * 149597870.7 / 100) < 1);
});

test('inside and outside the belt', () => {
  assert.equal(inBelt([mid, 0, 0], SUN), true);
  assert.equal(inBelt([0, 0, -mid], SUN), true);
  assert.equal(inBelt([BELT.innerKm - 1000, 0, 0], SUN), false);
  assert.equal(inBelt([BELT.outerKm + 1000, 0, 0], SUN), false);
  assert.equal(inBelt([mid, BELT.halfHeightKm + 1, 0], SUN), false);
  assert.equal(inBelt([mid + 5e6, 0, 0], [5e6, 0, 0]), true);
});

test('the same spot always has the same rocks', () => {
  const a = rocksNear([mid, 100, 3000], SUN);
  const b = rocksNear([mid + 10, 100, 3000], SUN);
  // Close enough to see: the far corner of the 5 x 5 x 5 block is 5.2 cells away.
  for (const rock of a) assert.ok(Math.hypot(rock.position[0] - mid, rock.position[1] - 100, rock.position[2] - 3000) < 5.2 * BELT.cellKm);
  assert.deepEqual(a, b);
  assert.ok(a.length > 0 && a.length <= MAX_ROCKS);
});

test('rocks are 60 to 300 km across and lie in the belt, on both sides of the Sun', () => {
  for (const x of [mid, -mid]) {
    const rocks = rocksNear([x, 0, 0], SUN);
    assert.ok(rocks.length > 0, `none at ${x}`);
    for (const rock of rocks) {
      assert.ok(rock.radiusKm >= 30 && rock.radiusKm <= 150);
      assert.equal(inBelt(rock.position, SUN), true);
    }
  }
});

test('no rocks outside the belt, and none past its edge when standing at the edge', () => {
  assert.deepEqual(rocksNear([BELT.outerKm + 200000, 0, 0], SUN), []);
  for (const rock of rocksNear([BELT.outerKm - 100, 0, 0], SUN)) assert.equal(inBelt(rock.position, SUN), true);
});

test('about four cells in ten hold a rock', () => {
  let rocks = 0;
  // Forty spots round the middle of the belt, far enough apart to share no cells.
  assert.equal(MAX_ROCKS, 125);
  for (let i = 0; i < 40; i++) {
    const a = (i * Math.PI) / 20;
    rocks += rocksNear([mid * Math.cos(a), 0, mid * Math.sin(a)], SUN).length;
  }
  assert.ok(rocks > 40 * MAX_ROCKS * 0.3 && rocks < 40 * MAX_ROCKS * 0.5, `${rocks}`);
});

test('the far band: fixed points all inside the belt', () => {
  const points = beltPoints(3000);
  assert.equal(points.length, 3000);
  assert.deepEqual(points[7], beltPoints(3000)[7]);
  for (const p of points) assert.equal(inBelt(p, SUN), true);
});
