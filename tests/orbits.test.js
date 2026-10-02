import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, BODY_DATA, bodiesAt, bodyById, TIME_SCALE } from '../src/core/bodies.js';

const sub = (a, b) => a.map((n, i) => n - b[i]);
const dist = (a, b) => Math.hypot(...sub(a, b));
const at = (t, id) => bodyById(id, bodiesAt(t));

test('game time runs 180 times real time', () => {
  assert.equal(TIME_SCALE, 180);
});

test('at time zero the bodies sit where the static table puts them', () => {
  assert.deepEqual(bodiesAt(0).map((b) => b.position), BODIES.map((b) => b.position));
});

test('every orbiting body has a real orbital period', () => {
  for (const d of BODY_DATA.filter((x) => x.parent)) assert.ok((d.periodS ?? d.ellipse?.periodS) > 0, d.id);
  const days = (id) => BODY_DATA.find((d) => d.id === id).periodS / 86400;
  assert.ok(Math.abs(days('moon') - 27.3217) < 1e-6);
  assert.ok(Math.abs(days('earth') - 365.256) < 1e-6);
  assert.ok(Math.abs(days('io') - 1.769138) < 1e-6);
});

test('orbits keep their distance from the parent', () => {
  for (const t of [0, 1e4, 3.3e5, 2e7]) {
    for (const d of BODY_DATA.filter((x) => x.parent && !x.ellipse)) {
      const before = dist(at(0, d.id).position, at(0, d.parent).position);
      const now = dist(at(t, d.id).position, at(t, d.parent).position);
      assert.ok(Math.abs(before - now) < 1e-6, `${d.id} at ${t}`);
    }
  }
});

test('half a period puts Io on the far side of Jupiter; a full period brings it back', () => {
  const period = BODY_DATA.find((d) => d.id === 'io').periodS;
  const offset = (t) => sub(at(t, 'io').position, at(t, 'jupiter').position);
  const start = offset(0);
  const half = offset(period / 2);
  assert.ok(Math.abs(half[0] + start[0]) < 1e-6 && Math.abs(half[2] + start[2]) < 1e-6);
  assert.ok(Math.abs(half[1] - start[1]) < 1e-6, 'orbit keeps its height');
  const full = offset(period);
  full.forEach((n, i) => assert.ok(Math.abs(n - start[i]) < 1e-6));
});

test('the Sun stays at the origin', () => {
  assert.deepEqual(at(1e7, 'sun').position, [0, 0, 0]);
});

test('moons ride along with their planet', () => {
  const t = 1e6;
  const moonFromEarth = dist(at(t, 'moon').position, at(t, 'earth').position);
  assert.ok(Math.abs(moonFromEarth - dist(at(0, 'moon').position, at(0, 'earth').position)) < 1e-6);
  assert.notDeepEqual(at(t, 'earth').position, at(0, 'earth').position);
});

test('orbits run counterclockwise seen from the north (+y), like the real solar system', () => {
  // In Babylon's left-handed frame seen from +y, +x is right and +z is up on screen,
  // so counterclockwise turns +x toward +z: the tangent at (x, z) is (-z, x).
  // (Triton is the exception; it has its own test below. Comets on ellipses have no
  // periodS of their own here and are checked in newBodies and meteors tests.)
  for (const d of BODY_DATA.filter((x) => x.parent && !x.retrograde && !x.ellipse)) {
    const offset = (t) => sub(at(t, d.id).position, at(t, d.parent).position);
    const a = offset(0);
    const b = offset(d.periodS / 1000);
    const move = [b[0] - a[0], b[2] - a[2]];
    const tangent = [-a[2], a[0]];
    assert.ok(move[0] * tangent[0] + move[1] * tangent[1] > 0, `${d.id} goes clockwise`);
  }
});

test('Triton goes round Neptune backwards, the other moons forwards', () => {
  // Seen from the north (+y), forward orbits turn counterclockwise: in Babylon's
  // left-handed axes the angle atan2(z, x) falls with time.
  const turn = (id, parentId) => {
    const a = sub(at(0, id).position, at(0, parentId).position);
    const b = sub(at(3600, id).position, at(3600, parentId).position);
    return a[0] * b[2] - a[2] * b[0];
  };
  assert.ok(turn('triton', 'neptune') * turn('moon', 'earth') < 0);
  assert.ok(turn('titania', 'uranus') * turn('moon', 'earth') > 0);
});
