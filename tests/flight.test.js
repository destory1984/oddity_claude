import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  C, ZONES, speedZone, stricterZoneBelow, accelerateSpeed, brakeSpeed,
  sweepSphere, firstSphereHit,
} from '../src/core/flight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('zones switch exactly at 500 km and 50,000 km', () => {
  assert.equal(speedZone(0).id, 'veryNear');
  assert.equal(speedZone(500).id, 'veryNear');
  assert.equal(speedZone(500.001).id, 'near');
  assert.equal(speedZone(50000).id, 'near');
  assert.equal(speedZone(50000.001).id, 'far');
  assert.equal(speedZone(Infinity).id, 'far');
  assert.equal(ZONES.veryNear.maxSpeed, C * 0.01);
  assert.equal(ZONES.near.maxSpeed, C * 0.1);
  assert.equal(ZONES.far.maxSpeed, C * 100);
  assert.deepEqual([ZONES.far.label, ZONES.near.label, ZONES.veryNear.label], ['100c', '0.1c', '0.01c']);
});

test('stricterZoneBelow walks toward the surface', () => {
  assert.equal(stricterZoneBelow(ZONES.far), ZONES.near);
  assert.equal(stricterZoneBelow(ZONES.near), ZONES.veryNear);
  assert.equal(stricterZoneBelow(ZONES.veryNear), null);
});

test('full acceleration reaches each zone limit in three seconds and never exceeds it', () => {
  for (const zone of Object.values(ZONES)) {
    assert.equal(accelerateSpeed(0, 1, 3, zone.maxSpeed), zone.maxSpeed);
    assert.ok(accelerateSpeed(0, 1, 2.9, zone.maxSpeed) < zone.maxSpeed);
    assert.equal(accelerateSpeed(zone.maxSpeed, 1, 3, zone.maxSpeed), zone.maxSpeed);
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

test('firstSphereHit with a margin finds the zone shell', () => {
  const bodies = [{ id: 'b', radiusKm: 1000, position: [0, 0, 100000] }];
  const hit = firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, bodies, 50000);
  near(hit.t, 100000 - 51000);
  assert.equal(firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, []), null);
});
