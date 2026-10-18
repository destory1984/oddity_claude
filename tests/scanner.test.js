import { test } from 'vitest';
import assert from 'node:assert/strict';
import { scannerPoints, SCANNER_COUNT } from '../src/core/scanner.js';

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
