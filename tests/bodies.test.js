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

test('the table holds the Sun, all eight planets and twenty moons at real radii', () => {
  assert.deepEqual(
    BODIES.map((b) => b.id),
    [
      'sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'phobos', 'deimos',
      'jupiter', 'io', 'europa', 'ganymede', 'callisto',
      'saturn', 'mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus',
      'uranus', 'miranda', 'ariel', 'umbriel', 'titania', 'oberon', 'neptune', 'triton',
    ],
  );
  assert.equal(bodyById('ganymede').radiusKm, 2634.1);
  assert.equal(bodyById('titan').parent, 'saturn');
  for (const id of ['io', 'europa', 'ganymede', 'callisto']) assert.equal(bodyById(id).parent, 'jupiter');
  assert.equal(bodyById('sun').radiusKm / KM_PER_UNIT, 696.34);
  assert.equal(bodyById('earth').radiusKm, 6371);
  assert.equal(bodyById('moon').radiusKm, 1737.4);
  assert.equal(bodyById('jupiter').radiusKm, 69911);
  assert.equal(bodyById('neptune').radiusKm, 24622);
  assert.deepEqual(bodyById('sun').position, [0, 0, 0]);
  for (const body of BODIES) assert.ok(body.name && body.nameEn, `${body.id} needs names`);
});

test('planets orbit the Sun in order of real mean distance', () => {
  const planets = BODIES.filter((b) => b.kind === 'planet');
  assert.equal(planets.length, 8);
  for (const planet of planets) assert.equal(planet.parent, 'sun');
  const distances = planets.map((p) => Math.hypot(...p.position));
  for (let i = 1; i < distances.length; i++) assert.ok(distances[i] > distances[i - 1]);
});

test('no two bodies overlap', () => {
  for (let i = 0; i < BODIES.length; i++) {
    for (let j = i + 1; j < BODIES.length; j++) {
      const a = BODIES[i];
      const b = BODIES[j];
      const gap = Math.hypot(...sub(a.position, b.position)) - a.radiusKm - b.radiusKm;
      assert.ok(gap > 0, `${a.id} and ${b.id} overlap`);
    }
  }
});

test('planets sit at 1/100 of the real gap from the Sun, moons at 1/10 from their planet', () => {
  for (const item of BODY_DATA.filter((d) => d.parent)) {
    const body = bodyById(item.id);
    const parent = bodyById(item.parent);
    const centerDistance = Math.hypot(...sub(body.position, parent.position));
    // Saturn's inner moons are measured from the edge of the rings, not the cloud tops.
    const radii = body.radiusKm + (item.edgeKm ?? parent.radiusKm);
    const factor = parent.kind === 'star' ? 100 : 10;
    assert.ok(centerDistance > radii);
    near(centerDistance - radii, (item.orbitKm - radii) / factor);
  }
  // Moon: 8,108.4 km of radii + (384,400 - 8,108.4) / 10 of gap.
  near(Math.hypot(...sub(bodyById('moon').position, bodyById('earth').position)), 45737.56);
});

test('Titan orbits outside the rings of Saturn', () => {
  const ringOuterKm = 136775;
  const gap = Math.hypot(...sub(bodyById('titan').position, bodyById('saturn').position));
  assert.ok(gap - bodyById('titan').radiusKm > ringOuterKm);
});

test('compressedCenterDistance keeps radii and divides the gap, by 100 unless told otherwise', () => {
  assert.equal(compressedCenterDistance(1100, 50, 50), 100 + 10);
  assert.equal(compressedCenterDistance(1100, 50, 50, 10), 100 + 100);
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

test('altitude label follows the nearest planet or the Sun, never a moon', () => {
  const start = nearestLocalBody(START_POSITION);
  assert.equal(start.body.id, 'earth');
  assert.equal(start.label, '지구 상공');
  near(start.altitude, 9129);

  // Right above the Moon the label still counts from Earth.
  const moon = bodyById('moon');
  const earth = bodyById('earth');
  const nearMoon = [moon.position[0], moon.position[1], moon.position[2] + 2000];
  const result = nearestLocalBody(nearMoon);
  assert.equal(result.label, '지구 상공');
  near(result.altitude, Math.hypot(...sub(nearMoon, earth.position)) - earth.radiusKm);

  const sun = bodyById('sun');
  const nearSun = [sun.position[0], sun.position[1] + sun.radiusKm + 10, sun.position[2]];
  assert.equal(nearestLocalBody(nearSun).label, '태양 상공');
  near(nearestLocalBody(nearSun).altitude, 10);
});

test('a body grows in view as the traveler approaches it', () => {
  const far = apparentAngularRadius(696340, 2e6);
  const half = apparentAngularRadius(696340, 1e6);
  assert.ok(half > far * 1.99);
});

test('from the start, looking at Earth, the Moon hangs beside it in frame and partly sunlit', async () => {
  const { frameBodies } = await import('../src/core/framing.js');
  const earth = bodyById('earth');
  const moon = bodyById('moon');
  const toEarth = sub(earth.position, START_POSITION);
  const len = Math.hypot(...toEarth);
  const q = (await import('../src/core/orientation.js')).lookAtDirection(toEarth.map((n) => n / len));
  const frames = frameBodies({ position: START_POSITION, orientation: q, fovY: Math.PI / 3, aspect: 16 / 9, bodies: BODIES });
  const moonFrame = frames.find((f) => f.body.id === 'moon');
  assert.equal(moonFrame.visible, true);
  assert.equal(moonFrame.hidden, false);
  // The Sun lights the face we see: angle Sun-Moon-viewer under 100 degrees.
  const toSun = sub(bodyById('sun').position, moon.position);
  const toViewer = sub(START_POSITION, moon.position);
  const cos = dot(toSun, toViewer) / (Math.hypot(...toSun) * Math.hypot(...toViewer));
  assert.ok(Math.acos(cos) < (100 * Math.PI) / 180);
});

test('every moon of Saturn stays outside the rings, in its real order outward', () => {
  const ringOuterKm = 136775;
  const saturn = bodyById('saturn');
  const out = ['mimas', 'enceladus', 'tethys', 'dione', 'rhea', 'titan', 'iapetus'].map((id) => {
    const moon = bodyById(id);
    return Math.hypot(...sub(moon.position, saturn.position)) - moon.radiusKm;
  });
  assert.ok(out[0] > ringOuterKm, `Mimas at ${out[0]}`);
  for (let i = 1; i < out.length; i++) assert.ok(out[i] > out[i - 1], `order at ${i}`);
});

test('small moons keep their real sizes and parents', () => {
  assert.equal(bodyById('phobos').radiusKm, 11.3);
  assert.equal(bodyById('deimos').parent, 'mars');
  assert.equal(bodyById('triton').parent, 'neptune');
  for (const id of ['miranda', 'ariel', 'umbriel', 'titania', 'oberon']) assert.equal(bodyById(id).parent, 'uranus');
  const mars = bodyById('mars');
  const d = (id) => Math.hypot(...sub(bodyById(id).position, mars.position));
  assert.ok(d('phobos') < d('deimos'));
});
