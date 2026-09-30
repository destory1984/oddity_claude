import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  BODIES, BODY_DATA, KM_PER_UNIT, START_POSITION, START_ALTITUDE_KM,
  compressedCenterDistance, placeBodies, bodyById, surfaceDistance,
  nearestSurface, nearestLocalBody, apparentAngularRadius,
} from '../src/core/bodies.js';

const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the table holds the Sun, Earth and Moon at real radii', () => {
  assert.deepEqual(BODIES.map((b) => b.id), ['sun', 'earth', 'moon']);
  assert.equal(bodyById('sun').radiusKm / KM_PER_UNIT, 696.34);
  assert.equal(bodyById('earth').radiusKm, 6371);
  assert.equal(bodyById('moon').radiusKm, 1737.4);
  assert.deepEqual(bodyById('sun').position, [0, 0, 0]);
});

test('every child sits at the compressed distance from its parent', () => {
  for (const item of BODY_DATA.filter((d) => d.parent)) {
    const body = bodyById(item.id);
    const parent = bodyById(item.parent);
    const centerDistance = Math.hypot(...sub(body.position, parent.position));
    const radii = body.radiusKm + parent.radiusKm;
    assert.ok(centerDistance > radii);
    near(centerDistance - radii, (item.orbitKm - radii) / 100);
  }
  near(Math.hypot(...sub(bodyById('moon').position, bodyById('earth').position)), 11871.316);
});

test('compressedCenterDistance keeps radii and divides the gap by 100', () => {
  assert.equal(compressedCenterDistance(1100, 50, 50), 100 + 10);
});

test('placeBodies rejects a child listed before its parent', () => {
  assert.throws(() => placeBodies([
    { id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1, parent: 'earth', orbitKm: 10, direction: [1, 0, 0] },
  ]), /parent earth/);
});

test('the start is 9,129 km above Earth with the Sun at a right angle', () => {
  const earth = bodyById('earth');
  near(surfaceDistance(START_POSITION, earth), START_ALTITUDE_KM);
  const toPlayer = sub(START_POSITION, earth.position);
  const toSun = sub(bodyById('sun').position, earth.position);
  near(dot(toPlayer, toSun) / (Math.hypot(...toPlayer) * Math.hypot(...toSun)), 0, 1e-12);
});

test('nearestSurface picks the closest surface and handles an empty list', () => {
  const moon = bodyById('moon');
  const point = [moon.position[0] + moon.radiusKm + 200, moon.position[1], moon.position[2]];
  const result = nearestSurface(point);
  assert.equal(result.body.id, 'moon');
  near(result.distance, 200);
  assert.deepEqual(nearestSurface(point, []), { body: null, distance: Infinity });
});

test('altitude label follows the nearest planet or moon, never the Sun', () => {
  const start = nearestLocalBody(START_POSITION);
  assert.equal(start.body.id, 'earth');
  assert.equal(start.label, '지구 상공');
  near(start.altitude, 9129);

  const moon = bodyById('moon');
  const nearMoon = [moon.position[0], moon.position[1], moon.position[2] + 2000];
  const result = nearestLocalBody(nearMoon);
  assert.equal(result.label, '달 상공');
  near(result.altitude, 262.6);

  const sun = bodyById('sun');
  const nearSun = [sun.position[0], sun.position[1] + sun.radiusKm + 10, sun.position[2]];
  assert.notEqual(nearestLocalBody(nearSun).body.id, 'sun');
});

test('a body grows in view as the traveler approaches it', () => {
  const far = apparentAngularRadius(696340, 2e6);
  const half = apparentAngularRadius(696340, 1e6);
  assert.ok(half > far * 1.99);
});
