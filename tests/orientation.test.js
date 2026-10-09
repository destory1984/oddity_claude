import { test } from 'vitest';
import assert from 'node:assert/strict';
import { rotateLocal, forward, lookAtDirection, multiply, conjugate, right, up, REAR_VIEW, rearTurn, swingToward, rotateVector } from '../src/core/orientation.js';

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

test('looking behind turns the view half round: ahead is behind, up stays up, and a drag still moves the picture the same way', () => {
  const body = rotateLocal(rotateLocal([0, 0, 0, 1], 0.7, -0.3), 0.2, 0.4, 0.5);
  const view = multiply(body, REAR_VIEW);
  const close = (a, b) => a.forEach((n, i) => assert.ok(Math.abs(n - b[i]) < 1e-9, `${a} != ${b}`));
  close(forward(view), forward(body).map((n) => -n));
  close(up(view), up(body));
  close(right(view), right(body).map((n) => -n));
  // Dragging down by 0.1 looking behind must turn the view as a drag down does looking ahead.
  const [yaw, pitch] = rearTurn(0.05, 0.1);
  const turned = multiply(rotateLocal(body, yaw, pitch), REAR_VIEW);
  close(turned, rotateLocal(view, 0.05, 0.1));
});

test('swingToward brings a chosen line of the view onto a direction by the shortest turn', () => {
  const near = (a, b, eps = 1e-9) => a.forEach((n, i) => assert.ok(Math.abs(n - b[i]) < eps, `${a} vs ${b}`));
  const aim = [0, Math.sin(0.26), Math.cos(0.26)];
  const start = rotateLocal([0, 0, 0, 1], 0.7, -0.2, 0.1);
  const way = [0.3, -0.5, 0.81].map((n) => n / Math.hypot(0.3, -0.5, 0.81));
  near(rotateVector(swingToward(start, aim, way, 1), aim), way, 1e-9);
  // Part of the way: nearer than before, not yet there.
  const half = rotateVector(swingToward(start, aim, way, 0.5), aim);
  const before = rotateVector(start, aim);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  assert.ok(dot(half, way) > dot(before, way) && dot(half, way) < 1 - 1e-6);
  // Already there, and straight behind: no fault, still a unit quaternion.
  near(swingToward(start, aim, before, 1), start, 1e-9);
  const round = swingToward(start, aim, before.map((n) => -n), 1);
  assert.ok(Math.abs(Math.hypot(...round) - 1) < 1e-9);
  near(rotateVector(round, aim), before.map((n) => -n), 1e-6);
});

test('going over the top of a target the view does not flip, as a view built from world-up does', () => {
  // The way to the target sweeps through straight up: from 60 degrees up, over the top, to 60 up on the far side.
  const ways = [];
  for (let deg = 60; deg <= 120; deg += 2) ways.push([0, Math.sin((deg * Math.PI) / 180), Math.cos((deg * Math.PI) / 180)]);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  let q = lookAtDirection(ways[0]);
  let least = 1;
  for (const way of ways.slice(1)) {
    const next = swingToward(q, [0, 0, 1], way, 1);
    least = Math.min(least, dot(right(q), right(next)));
    q = next;
  }
  assert.ok(least > 0.99, `her right hand stays her right hand (${least})`);
  // Built anew from world-up at each step, right becomes left as the top is passed.
  assert.ok(dot(right(lookAtDirection(ways[0])), right(lookAtDirection(ways[ways.length - 1]))) < -0.99);
});

test('a view comes round to another by the shortest turn, part of the way at a time', async () => {
  const { turnToward } = await import('../src/core/orientation.js');
  const from = lookAtDirection([0, 0, 1]);
  const goal = lookAtDirection([1, 0, 0]);
  // Half of a quarter turn: looking 45 degrees round.
  near(forward(turnToward(from, goal, 0.5)), [Math.SQRT1_2, 0, Math.SQRT1_2]);
  near(turnToward(from, goal, 1), goal);
  near(turnToward(from, goal, 0), from);
  // The same turning written with the other sign goes the same short way.
  near(forward(turnToward(from, goal.map((n) => -n), 0.5)), [Math.SQRT1_2, 0, Math.SQRT1_2]);
  // Closing in by a share of what is left each time, it arrives.
  let q = from;
  for (let n = 0; n < 60; n++) q = turnToward(q, goal, 0.2);
  assert.ok(forward(q).reduce((sum, v, i) => sum + v * forward(goal)[i], 0) > 0.999999);
  // (Level stays level: no roll comes into a turn between two level views.)
  assert.ok(Math.abs(up(turnToward(from, goal, 0.5))[1] - 1) < 1e-9);
});
