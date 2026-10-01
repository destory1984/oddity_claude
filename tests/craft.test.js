import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CRAFT, craftAt, HUBBLE_ALTITUDE_KM, JWST_FROM_EARTH_KM, CHANDRA_PERIOD_S } from '../src/core/craft.js';
import { bodiesAt } from '../src/core/bodies.js';
import { C } from '../src/core/flight.js';
import { createState, step } from '../src/core/game.js';

const dist = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('seven craft: the two Voyagers and five space telescopes', () => {
  assert.deepEqual(CRAFT.map((c) => c.id), ['voyager1', 'voyager2', 'hubble', 'jwst', 'kepler', 'chandra', 'euclid']);
  for (const c of CRAFT) assert.ok(c.name && c.nameEn && c.kind === 'craft');
});

test('every craft has a launch year and a short introduction for the docking card', () => {
  for (const c of CRAFT) {
    assert.ok(c.launched >= 1977 && c.launched <= 2023, c.id);
    assert.ok(c.intro.length >= 40 && c.intro.length <= 150, `${c.id}: ${c.intro.length}`);
    assert.ok(c.intro.endsWith('.') && !c.intro.includes('~'), c.id);
  }
  // The card's data travels with each frame's craft.
  assert.equal(craftAt(0, bodiesAt(0)).find((c) => c.id === 'kepler').launched, 2009);
});

test('Kepler trails Earth round the Sun: same distance out, 60 degrees behind', () => {
  for (const t of [0, 4e6]) {
    const bodies = bodiesAt(t);
    const sun = bodies.find((b) => b.kind === 'star');
    const earth = bodies.find((b) => b.id === 'earth');
    const kepler = craftAt(t, bodies).find((c) => c.id === 'kepler');
    near(dist(kepler.position, sun.position), dist(earth.position, sun.position), 1e-3);
    const angle = (p) => Math.atan2(p[2] - sun.position[2], p[0] - sun.position[0]);
    // The planets go round with this angle growing, so behind means smaller.
    const behind = ((angle(earth.position) - angle(kepler.position)) * 180 / Math.PI + 360) % 360;
    near(behind, 60, 1e-6);
    near(kepler.position[1], earth.position[1], 1e-6);
  }
});

test('Chandra swings round Earth on a long ellipse: 1,600 to 13,300 km up after the 1/10 squeeze', () => {
  const bodies = bodiesAt(0);
  const earth = bodies.find((b) => b.id === 'earth');
  let lowest = Infinity;
  let highest = 0;
  // One lap is 63.5 hours on the game clock.
  for (let i = 0; i <= 400; i++) {
    const t = (i / 400) * CHANDRA_PERIOD_S;
    const km = dist(craftAt(t, bodies).find((c) => c.id === 'chandra').position, earth.position) - earth.radiusKm;
    lowest = Math.min(lowest, km);
    highest = Math.max(highest, km);
  }
  near(lowest, 1600, 20);
  near(highest, 13300, 20);
  // Always above Hubble, never inside the Moon's orbit's far reaches.
  assert.ok(lowest > HUBBLE_ALTITUDE_KM);
  const again = craftAt(CHANDRA_PERIOD_S, bodies).find((c) => c.id === 'chandra');
  near(dist(again.position, craftAt(0, bodies).find((c) => c.id === 'chandra').position), 0, 1e-3);
});

test('Euclid shares the L2 point with Webb, 50,000 km to one side', () => {
  const bodies = bodiesAt(900);
  const earth = bodies.find((b) => b.id === 'earth');
  const sun = bodies.find((b) => b.kind === 'star');
  const craft = craftAt(900, bodies);
  const euclid = craft.find((c) => c.id === 'euclid');
  const webb = craft.find((c) => c.id === 'jwst');
  near(dist(euclid.position, webb.position), 50000, 1e-3);
  // Both are farther from the Sun than Earth is.
  assert.ok(dist(euclid.position, sun.position) > dist(earth.position, sun.position));
  near(dist(euclid.position, earth.position), Math.hypot(JWST_FROM_EARTH_KM, 50000), 1e-3);
});

test('Hubble circles 540 km above Earth and keeps up with Earth as it orbits the Sun', () => {
  for (const t of [0, 137, 5000]) {
    const bodies = bodiesAt(t);
    const earth = bodies.find((b) => b.id === 'earth');
    const hubble = craftAt(t, bodies).find((c) => c.id === 'hubble');
    near(dist(hubble.position, earth.position), earth.radiusKm + HUBBLE_ALTITUDE_KM, 1e-3);
  }
  const a = craftAt(0, bodiesAt(0)).find((c) => c.id === 'hubble');
  // A quarter of its ten-minute lap: 150 s of play, 108,000 s on the game clock.
  const b = craftAt(108000, bodiesAt(0)).find((c) => c.id === 'hubble');
  assert.ok(dist(a.position, b.position) > 1000, 'it moves round the Earth');
});

test('Webb sits behind Earth, straight away from the Sun', () => {
  const bodies = bodiesAt(900);
  const earth = bodies.find((b) => b.id === 'earth');
  const sun = bodies.find((b) => b.kind === 'star');
  const jwst = craftAt(900, bodies).find((c) => c.id === 'jwst');
  near(dist(jwst.position, earth.position), JWST_FROM_EARTH_KM, 1e-3);
  near(dist(jwst.position, sun.position), dist(earth.position, sun.position) + JWST_FROM_EARTH_KM, 1e-3);
});

test('the Voyagers are far past Neptune, one north and one south of the planets', () => {
  const bodies = bodiesAt(0);
  const sun = bodies.find((b) => b.kind === 'star');
  const neptune = bodies.find((b) => b.id === 'neptune');
  const craft = craftAt(0, bodies);
  const v1 = craft.find((c) => c.id === 'voyager1');
  const v2 = craft.find((c) => c.id === 'voyager2');
  assert.ok(dist(v1.position, sun.position) > 4 * dist(neptune.position, sun.position));
  assert.ok(dist(v1.position, sun.position) > dist(v2.position, sun.position), 'Voyager 1 is the farther one');
  assert.ok(v1.position[1] > sun.position[1] && v2.position[1] < sun.position[1]);
});

test('near a craft the speed limit falls with distance, as near a planet, but nothing blocks the way', () => {
  const bodies = bodiesAt(0);
  const v1 = craftAt(0, bodies).find((c) => c.id === 'voyager1');
  // 30,000 km short of Voyager 1, flying at it flat out.
  const start = createState([v1.position[0], v1.position[1], v1.position[2] - 30000]);
  let state = { ...start, speed: 100 * C };
  const free = step(state, { drive: 1 }, 1 / 60, bodies).state;
  assert.ok(free.speed > C, 'deep space without the craft: far above 1c');
  const slowed = step(state, { drive: 1 }, 1 / 60, bodies, [v1.position]);
  assert.ok(slowed.state.speed <= 30000 + 1e-6, `limit is the distance per second, got ${slowed.state.speed}`);
  assert.deepEqual(slowed.events, []);
  // Flying on through the craft is allowed: it is not a surface.
  state = slowed.state;
  for (let i = 0; i < 60 * 20; i++) state = step(state, { drive: 1 }, 1 / 60, bodies, [v1.position]).state;
  assert.equal(state.restingOn, null);
  assert.ok(state.position[2] > v1.position[2], 'passed through');
});

test('the Voyagers keep leaving: 17 and 15.3 km/s, shrunk 1/100 like every distance from the Sun', () => {
  const sunAt = (t) => bodiesAt(t).find((b) => b.kind === 'star').position;
  const out = (id, t) => dist(craftAt(t, bodiesAt(t)).find((c) => c.id === id).position, sunAt(t));
  // One second of play is 720 s on the game clock.
  near(out('voyager1', 720) - out('voyager1', 0), (17 * 720) / 100, 1e-3);
  near(out('voyager2', 720) - out('voyager2', 0), (15.3 * 720) / 100, 1e-3);
  // Straight out: the direction from the Sun does not change.
  const dir = (t) => {
    const p = craftAt(t, bodiesAt(t)).find((c) => c.id === 'voyager2').position;
    const s = sunAt(t);
    const d = out('voyager2', t);
    return p.map((n, i) => (n - s[i]) / d);
  };
  const a = dir(0);
  const b = dir(5e6);
  for (let i = 0; i < 3; i++) near(a[i], b[i], 1e-9);
});
