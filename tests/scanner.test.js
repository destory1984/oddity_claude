import { test } from 'vitest';
import assert from 'node:assert/strict';
import { scannerPoints, scannerGround, SCANNER_COUNT } from '../src/core/scanner.js';

const still = [0, 0, 0, 1];

test('the scanner lays the nearest things round her: right, ahead and above as she faces', () => {
  const points = scannerPoints([0, 0, 0], still, [
    { id: 'ahead', position: [0, 0, 100] },
    { id: 'right', position: [300, 0, 0] },
    { id: 'above', position: [0, 1000, 0] },
  ]);
  assert.deepEqual(points.map((p) => p.id), ['ahead', 'right', 'above']);
  const [ahead, toRight, above] = points;
  assert.ok(ahead.z > 0 && Math.abs(ahead.x) < 1e-9 && Math.abs(ahead.h) < 1e-9);
  assert.ok(toRight.x > 0 && Math.abs(toRight.z) < 1e-9);
  // The farthest stands on the rim; the nearest well inside it.
  assert.ok(Math.abs(above.h - 1) < 1e-9);
  assert.ok(ahead.z > 0.1 && ahead.z < 0.5);
  assert.ok(toRight.x > ahead.z && toRight.x < above.h);
});

test('it shows a handful, and leaves out the world she is down on', () => {
  const many = Array.from({ length: 9 }, (_, k) => ({ id: `t${k}`, position: [0, 0, 100 * (k + 1)] }));
  assert.equal(scannerPoints([0, 0, 0], still, many).length, SCANNER_COUNT);
  const ground = { id: 'earth', position: [0, -20000, 0], radiusKm: 6371 };
  const moon = { id: 'moon', position: [0, 0, 384000], radiusKm: 1737 };
  assert.deepEqual(scannerPoints([0, 0, 0], still, [ground, moon]).map((p) => p.id), ['moon']);
  // From far off the same world is a thing like any other.
  assert.deepEqual(scannerPoints([0, 30000, 0], still, [ground]).map((p) => p.id), ['earth']);
  assert.equal(scannerPoints([0, 0, 0], still, [ground, moon])[0].z, scannerPoints([0, 0, 0], still, [moon])[0].z);
  assert.deepEqual(scannerPoints([0, 0, 0], still, []), []);
});

test('things lying the same way are turned apart, keeping their distances and heights', () => {
  const heap = [100, 200, 400, 800, 1600].map((d, k) => ({ id: `t${k}`, position: [d * 0.05, 0, d] }));
  const points = scannerPoints([0, 0, 0], still, heap);
  const ball = (p) => [p.x, (p.z + 1.4 * p.h) * 0.35];
  for (let a = 0; a < points.length; a += 1) {
    for (let b = a + 1; b < points.length; b += 1) {
      const [ax, ay] = ball(points[a]);
      const [bx, by] = ball(points[b]);
      assert.ok(Math.hypot(ax - bx, ay - by) > 0.12, `${points[a].id} ${points[b].id}`);
    }
  }
  // None is pushed off the rim.
  assert.ok(points.every((p) => Math.hypot(p.x, p.z) <= 1 + 1e-9));
});

test('the world she is close to comes in as ground from its side, further the nearer she is', () => {
  const world = { id: 'w', position: [0, -2000, 0], radiusKm: 1000 };
  const low = scannerGround([0, 0, 0], still, [world]);
  assert.equal(low.id, 'w');
  assert.ok(Math.abs(low.h + 1) < 1e-9 && Math.abs(low.x) < 1e-9);
  assert.equal(low.surface, 1000);
  const lower = scannerGround([0, -900, 0], still, [world]);
  assert.ok(lower.fill > low.fill && lower.fill <= 0.85);
  // From three radii up and beyond, none: it is one of the points then.
  assert.equal(scannerGround([0, 2001, 0], still, [world]), null);
  // Things with no size are never ground.
  assert.equal(scannerGround([0, 0, 0], still, [{ id: 'craft', position: [0, 10, 0] }]), null);
});

// The dots glide to where they now belong instead of jumping, and come and go by fading
// (the user, 2026-10-21, of the scanner: "애들이 자꾸 도망가": when the five nearest
// changed, every dot jumped at once as the scale was drawn anew).
test('the scanner dots glide to their new places and fade in and out', async () => {
  const { easePoints } = await import('../src/core/scanner.js');
  const first = easePoints([], [{ id: 'a', x: 0.5, z: 0, h: 0 }], 0.016);
  assert.equal(first[0].alpha < 0.5, true);
  assert.equal(first[0].x, 0.5);
  // Moved far: a little of the way in one frame, nearly all of it in half a second.
  let shown = [{ id: 'a', x: 0.5, z: 0, h: 0, alpha: 1 }];
  shown = easePoints(shown, [{ id: 'a', x: -0.5, z: 0, h: 0 }], 0.016);
  assert.ok(shown[0].x < 0.5 && shown[0].x > 0.3, String(shown[0].x));
  for (let i = 0; i < 30; i += 1) shown = easePoints(shown, [{ id: 'a', x: -0.5, z: 0, h: 0 }], 0.016);
  assert.ok(Math.abs(shown[0].x + 0.5) < 0.02);
  // Gone from the five: it fades where it stood, then is dropped.
  shown = easePoints(shown, [], 0.016);
  assert.equal(shown.length, 1);
  assert.ok(shown[0].alpha < 1);
  // Marked as leaving, so its name takes no room from those staying (the review,
  // 2026-10-22: a fading name pushed a live one a line up, then it snapped back).
  assert.equal(shown[0].leaving, true);
  assert.equal(easePoints([], [{ id: 'b', x: 0, z: 0, h: 0 }], 0.016)[0].leaving, undefined);
  for (let i = 0; i < 60; i += 1) shown = easePoints(shown, [], 0.016);
  assert.equal(shown.length, 0);
});
