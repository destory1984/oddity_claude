import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MISSIONS, completedMissions } from '../src/core/missions.js';
import { BODIES, START_POSITION, bodyById } from '../src/core/bodies.js';
import { lookAtDirection } from '../src/core/orientation.js';

const DEG = Math.PI / 180;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const add = (a, b) => a.map((n, i) => n + b[i]);
const scale = (a, s) => a.map((n) => n * s);
const unit = (a) => scale(a, 1 / Math.hypot(...a));

function shoot(position, lookAt, { fovDeg = 60, heroVisible = false } = {}) {
  const target = typeof lookAt === 'string' ? bodyById(lookAt).position : lookAt;
  return completedMissions({
    position,
    orientation: lookAtDirection(sub(target, position)),
    fovY: fovDeg * DEG,
    aspect: 16 / 9,
    heroVisible,
    bodies: BODIES,
  });
}

// A point `distanceKm` from a body's center, on the side facing `fromId`.
function near(bodyId, distanceKm, fromId = 'sun') {
  const body = bodyById(bodyId);
  const toward = unit(sub(bodyById(fromId).position, body.position));
  return add(body.position, scale(toward, distanceKm));
}

test('there are eight missions with names and hints', () => {
  assert.equal(MISSIONS.length, 8);
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, 8);
  for (const m of MISSIONS) assert.ok(m.name && m.hint);
});

test('pale blue dot: Earth tiny but in frame', () => {
  // Outward from the Sun, so the Sun is behind Earth rather than between.
  const earth = bodyById('earth').position;
  const far = add(earth, scale(unit(sub(earth, bodyById('sun').position)), 1e7));
  assert.ok(shoot(far, 'earth').includes('paleBlueDot'));
  assert.ok(!shoot(START_POSITION, 'earth').includes('paleBlueDot'));
});

test('earthrise: Earth over the lunar horizon from low orbit', () => {
  const moon = bodyById('moon');
  const e = unit(sub(bodyById('earth').position, moon.position));
  const side = unit([e[2], 0, -e[0]]);
  // Local up 80 degrees away from the Earth direction: Earth sits low over the horizon.
  const upDir = add(scale(e, Math.cos(80 * DEG)), scale(side, Math.sin(80 * DEG)));
  const low = add(moon.position, scale(upDir, moon.radiusKm + 100));
  assert.ok(shoot(low, 'earth', { fovDeg: 70 }).includes('earthrise'));
  assert.ok(!shoot(near('moon', 20000, 'earth'), 'earth').includes('earthrise'));
});

test('eclipse: the Sun in frame behind the Moon', () => {
  const shadow = near('moon', 1737.4 + 2000, 'sun').map((n, i) => 2 * bodyById('moon').position[i] - n);
  assert.ok(shoot(shadow, 'sun').includes('eclipse'));
  assert.ok(!shoot(shadow, 'earth', { fovDeg: 5 }).includes('eclipse'));
  assert.ok(!shoot(START_POSITION, 'sun').includes('eclipse'));
});

test('lord of the rings: Saturn big in frame', () => {
  assert.ok(shoot(near('saturn', 200000), 'saturn').includes('ringLord'));
  assert.ok(!shoot(near('saturn', 1e6), 'saturn').includes('ringLord'));
});

test('great red spot: Jupiter fills the frame', () => {
  assert.ok(shoot(near('jupiter', 120000), 'jupiter').includes('greatRedSpot'));
  assert.ok(!shoot(near('jupiter', 400000), 'jupiter').includes('greatRedSpot'));
});

test('sun skim: taken within 50,000 km of the solar surface', () => {
  assert.ok(shoot(near('sun', 696340 + 10000, 'earth'), 'sun').includes('sunSkim'));
  assert.ok(!shoot(START_POSITION, 'sun').includes('sunSkim'));
});

test('hero selfie: character shown with a big world behind', () => {
  assert.ok(shoot(START_POSITION, 'earth', { heroVisible: true }).includes('heroSelfie'));
  assert.ok(!shoot(START_POSITION, 'earth', { heroVisible: false }).includes('heroSelfie'));
});

test('two planets in one shot, neither hidden behind the other', () => {
  const mars = bodyById('mars');
  const awayFromEarth = unit(sub(mars.position, bodyById('earth').position));
  const side = unit([awayFromEarth[2], 0, -awayFromEarth[0]]);
  const spot = add(add(mars.position, scale(awayFromEarth, 50000)), scale(side, 20000));
  assert.ok(shoot(spot, 'earth').includes('twoPlanets'));
  assert.ok(!shoot(START_POSITION, 'earth', { fovDeg: 5 }).includes('twoPlanets'));
});
