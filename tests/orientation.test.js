import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rotateLocal, forward, lookAtDirection, multiply, conjugate, right, up } from '../src/core/orientation.js';

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

test('conjugate undoes a rotation, so a camera can be aimed relative to the body', () => {
  const ship = rotateLocal([0, 0, 0, 1], 0.7, -0.4, 0.2);
  const target = lookAtDirection([0.3, -0.5, -0.8]);
  const relative = multiply(conjugate(ship), target);
  near(forward(multiply(ship, relative)), forward(target));
});

test('camera basis: identity looks along +z with +x right and +y up', () => {
  near(right([0, 0, 0, 1]), [1, 0, 0]);
  near(up([0, 0, 0, 1]), [0, 1, 0]);
});

test('camera basis stays orthonormal and right-handed in Babylon order after turning', () => {
  const q = rotateLocal([0, 0, 0, 1], 1.1, -0.6, 0.4);
  const f = forward(q);
  const r = right(q);
  const u = up(q);
  const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
  assert.ok(Math.abs(dot(f, r)) < 1e-12 && Math.abs(dot(f, u)) < 1e-12 && Math.abs(dot(r, u)) < 1e-12);
  // Left-handed (Babylon): right = up × forward.
  const cross = [u[1] * f[2] - u[2] * f[1], u[2] * f[0] - u[0] * f[2], u[0] * f[1] - u[1] * f[0]];
  near(cross, r);
});
