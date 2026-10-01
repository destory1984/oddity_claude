import { test } from 'vitest';
import assert from 'node:assert/strict';
import { MISSIONS, completedMissions } from '../src/core/missions.js';
import { BODIES, START_POSITION, bodyById } from '../src/core/bodies.js';
import { craftAt } from '../src/core/craft.js';
import { fromEquatorial } from '../src/core/sky.js';
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

test('there are nineteen missions with names and hints', () => {
  assert.equal(MISSIONS.length, 19);
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, 19);
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
  assert.ok(shoot(spot, 'earth', { fovDeg: 30 }).includes('twoPlanets'));
  assert.ok(!shoot(spot, 'earth', { fovDeg: 60 }).includes('twoPlanets'), 'Earth is under 5 px unzoomed');
  assert.ok(!shoot(START_POSITION, 'earth', { fovDeg: 5 }).includes('twoPlanets'));
});

test('two planets needs more than specks: Mars and Jupiter from the start do not count', () => {
  assert.ok(!shoot(START_POSITION, 'jupiter').includes('twoPlanets'));
});

// ---- missions after famous photographs ----
const CRAFT = craftAt(0, BODIES);
const craftById = (id) => CRAFT.find((c) => c.id === id);
function shootWith(position, target, { fovDeg = 60 } = {}) {
  return completedMissions({
    position, orientation: lookAtDirection(sub(target, position)), fovY: fovDeg * DEG, aspect: 16 / 9,
    heroVisible: false, bodies: BODIES, craft: CRAFT,
  });
}

test('family portrait: six planets in one frame from beyond Neptune', () => {
  const sun = bodyById('sun').position;
  const high = add(sun, [0, 2e8, 0]);
  assert.ok(shootWith(high, sun, { fovDeg: 60 }).includes('familyPortrait'));
  // Inside Neptune's orbit it does not count, however many planets show.
  assert.ok(!shootWith(add(sun, [0, 2e7, 0]), sun, { fovDeg: 95 }).includes('familyPortrait'));
});

test('blue marble: the fully lit Earth filling the frame', () => {
  const day = near('earth', 6371 + 8000, 'sun');
  assert.ok(shoot(day, 'earth').includes('blueMarble'));
  const earth = bodyById('earth').position;
  const night = day.map((n, i) => 2 * earth[i] - n);
  assert.ok(!shoot(night, 'earth').includes('blueMarble'));
  assert.ok(!shoot(near('earth', 6371 + 200000, 'sun'), 'earth').includes('blueMarble'));
});

test("in Saturn's shadow: Saturn large with the Sun hidden behind it", () => {
  const saturn = bodyById('saturn');
  const behind = near('saturn', 58232 + 150000, 'sun').map((n, i) => 2 * saturn.position[i] - n);
  assert.ok(shoot(behind, 'saturn').includes('saturnShadow'));
  assert.ok(!shoot(near('saturn', 58232 + 150000, 'sun'), 'saturn').includes('saturnShadow'));
});

test("Galileo's discovery: Jupiter and its four big moons together", () => {
  const jupiter = bodyById('jupiter').position;
  const above = add(jupiter, [0, 600000, 0]);
  assert.ok(shoot(above, 'jupiter', { fovDeg: 60 }).includes('galileo'));
  assert.ok(!shoot(above, 'jupiter', { fovDeg: 5 }).includes('galileo'));
});

test('the moons of Mars: Phobos and Deimos in one frame from close by', () => {
  const mars = bodyById('mars').position;
  const above = add(mars, [0, 3389.5 + 15000, 0]);
  assert.ok(shoot(above, 'mars', { fovDeg: 70 }).includes('marsMoons'));
  assert.ok(!shoot(add(mars, [0, 3389.5 + 40000, 0]), 'mars', { fovDeg: 70 }).includes('marsMoons'));
});

test('Earth and Moon from afar: both in frame, Earth small but more than a dot', () => {
  const earth = bodyById('earth').position;
  const out = add(earth, scale(unit(sub(earth, bodyById('sun').position)), 1.5e6));
  assert.ok(shoot(out, 'earth').includes('earthAndMoon'));
  assert.ok(!shoot(START_POSITION, 'earth').includes('earthAndMoon'));
});

test('Hubble over Earth: the telescope close by with Earth in the frame', () => {
  const hubble = craftById('hubble');
  const earth = bodyById('earth').position;
  const outward = unit(sub(hubble.position, earth));
  const spot = add(hubble.position, scale(outward, 500));
  assert.ok(shootWith(spot, hubble.position).includes('hubbleEarth'));
  assert.ok(!shootWith(add(hubble.position, scale(outward, 20000)), hubble.position).includes('hubbleEarth'));
  // Without the craft list the mission is simply not met.
  assert.ok(!shoot(spot, hubble.position).includes('hubbleEarth'));
});

test('golden record: a Voyager close by with the Sun in the frame', () => {
  const v1 = craftById('voyager1');
  const sun = bodyById('sun').position;
  const beyond = add(v1.position, scale(unit(sub(v1.position, sun)), 1000));
  assert.ok(shootWith(beyond, sun, { fovDeg: 40 }).includes('goldenRecord'));
  assert.ok(!shootWith(add(v1.position, [0, 1e6, 0]), sun).includes('goldenRecord'));
});

test('heart of the Milky Way: the galactic centre in the middle of the frame', () => {
  const centre = fromEquatorial(17.761, -29.0);
  const from = add(bodyById('sun').position, [0, 5e7, 0]);
  assert.ok(shoot(from, add(from, centre)).includes('milkyWayHeart'));
  assert.ok(!shoot(from, add(from, scale(centre, -1))).includes('milkyWayHeart'));
});

test('Pluto and Charon: both in frame from within 50,000 km of Pluto', () => {
  const pluto = bodyById('pluto');
  const charon = bodyById('charon');
  // Stand off to the side so the two sit next to each other.
  const side = unit([charon.position[2] - pluto.position[2], 0, pluto.position[0] - charon.position[0]]);
  const spot = add(pluto.position, scale(side, 20000));
  const middle = scale(add(pluto.position, charon.position), 0.5);
  assert.ok(shoot(spot, middle).includes('plutoCharon'));
  const far = add(pluto.position, scale(side, 200000));
  assert.ok(!shoot(far, middle).includes('plutoCharon'));
  // Close, but looking away.
  assert.ok(!shoot(spot, sub(scale(spot, 2), middle)).includes('plutoCharon'));
});

test('the comet tail: Halley and the Sun together from within 5,000 km', () => {
  const halley = bodyById('halley');
  const away = unit(sub(halley.position, bodyById('sun').position));
  const behind = add(halley.position, scale(away, 2000));
  assert.ok(shoot(behind, 'sun').includes('cometTail'));
  assert.ok(!shoot(add(halley.position, scale(away, 20000)), 'sun').includes('cometTail'));
  assert.ok(!shoot(behind, add(behind, away)).includes('cometTail'));
});
