import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rotateLocal, forward, lookAtDirection } from '../src/core/orientation.js';

const near = (a, b) => a.forEach((n, i) => assert.ok(Math.abs(n - b[i]) < 1e-9));

test('vertical full loop passes through upside down and returns forward', () => {
  near(forward(rotateLocal([0, 0, 0, 1], 0, Math.PI)), [0, 0, -1]);
  near(forward(rotateLocal([0, 0, 0, 1], 0, 2 * Math.PI)), [0, 0, 1]);
});

test('steering remains local after flying upside down', () => {
  const upside = rotateLocal([0, 0, 0, 1], 0, Math.PI);
  near(forward(rotateLocal(upside, Math.PI / 2, 0)), [1, 0, 0]);
});

test('many turns keep normalized orientation and direction', () => {
  let q = [0, 0, 0, 1];
  for (let i = 0; i < 10000; i++) q = rotateLocal(q, 0.02, 0.03, 0.01);
  assert.ok(Math.abs(Math.hypot(...q) - 1) < 1e-10);
  assert.ok(Math.abs(Math.hypot(...forward(q)) - 1) < 1e-10);
});

test('target pointing covers all axes', () => {
  for (const d of [[0, 1, 0], [0, -1, 0], [0, 0, -1], [1, 2, -3]]) {
    const length = Math.hypot(...d);
    near(forward(lookAtDirection(d)), d.map((n) => n / length));
  }
});
