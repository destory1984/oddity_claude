import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  C, speedLimit, MIN_SPEED, MAX_SPEED, accelerateSpeed, brakeSpeed,
  sweepSphere, firstSphereHit,
} from '../src/core/flight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the limit is the surface distance per second, between 0.01c and 100c', () => {
  assert.equal(MIN_SPEED, C * 0.01);
  assert.equal(MAX_SPEED, C * 100);
  assert.equal(speedLimit(0), MIN_SPEED);
  assert.equal(speedLimit(1000), MIN_SPEED, 'close to a surface the floor applies');
  near(speedLimit(30000), 30000);
  near(speedLimit(3e6), 3e6);
  assert.equal(speedLimit(4e7), MAX_SPEED);
  assert.equal(speedLimit(Infinity), MAX_SPEED);
});

test('the limit never falls as the distance grows', () => {
  let previous = 0;
  for (let d = 0; d < 5e7; d = d * 1.5 + 100) {
    const limit = speedLimit(d);
    assert.ok(limit >= previous, `limit fell at ${d} km`);
    previous = limit;
  }
});

test('full acceleration reaches a fixed limit in three seconds and never exceeds it', () => {
  for (const limit of [MIN_SPEED, C * 0.1, MAX_SPEED]) {
    assert.equal(accelerateSpeed(0, 1, 3, limit), limit);
    assert.ok(accelerateSpeed(0, 1, 2.9, limit) < limit);
    assert.equal(accelerateSpeed(limit, 1, 3, limit), limit);
  }
});

test('braking at the release speed stops in one second at any frame rate', () => {
  assert.equal(brakeSpeed(C * 20, C * 20, 0.5), C * 10);
  assert.equal(brakeSpeed(C * 20, C * 20, 1), 0);
  let speed = C * 100;
  for (let i = 0; i < 60; i++) speed = brakeSpeed(speed, C * 100, 1 / 60);
  assert.ok(speed < 1e-6);
});

test('sweepSphere catches a full crossing in one step', () => {
  const t = sweepSphere([0, 0, -20000], [0, 0, 1], C, [0, 0, 0], 6371);
  near(t, 20000 - 6371);
});

test('sweepSphere ignores spheres behind, beside, or out of reach', () => {
  assert.equal(sweepSphere([0, 0, -20000], [0, 0, -1], C, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere([10000, 0, -20000], [0, 0, 1], C, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere([0, 0, -20000], [0, 0, 1], 100, [0, 0, 0], 6371), null);
});

test('sweepSphere lets a traveler on the surface leave but not sink', () => {
  const onSurface = [0, 0, -6371];
  assert.equal(sweepSphere(onSurface, [0, 0, -1], 1000, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere(onSurface, [0, 0, 1], 1000, [0, 0, 0], 6371), 0);
});

test('firstSphereHit picks the first surface along a path crossing several bodies', () => {
  const bodies = [
    { id: 'far', radiusKm: 1000, position: [0, 0, 50000] },
    { id: 'close', radiusKm: 1000, position: [0, 0, 10000] },
  ];
  const hit = firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, bodies);
  assert.equal(hit.body.id, 'close');
  near(hit.t, 9000);
  near(hit.position[2], 9000);
});

test('firstSphereHit with a margin finds the shell', () => {
  const bodies = [{ id: 'b', radiusKm: 1000, position: [0, 0, 100000] }];
  const hit = firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, bodies, 50000);
  near(hit.t, 100000 - 51000);
  assert.equal(firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, []), null);
});
