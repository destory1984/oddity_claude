import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CRAFT, craftAt, HUBBLE_ALTITUDE_KM, JWST_FROM_EARTH_KM, CHANDRA_PERIOD_S } from '../src/core/craft.js';
import { bodiesAt } from '../src/core/bodies.js';
import { C } from '../src/core/flight.js';
import { createState, step } from '../src/core/game.js';

const dist = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('seventeen craft: probes, telescopes, space stations, the first satellite and a car', () => {
  assert.deepEqual(CRAFT.map((c) => c.id), [
    'voyager1', 'voyager2', 'hubble', 'jwst', 'kepler', 'chandra', 'euclid',
    'iss', 'tiangong', 'sputnik', 'mro', 'juno', 'cassini', 'parker', 'roadster', 'newHorizons', 'pioneer10',
  ]);
  assert.equal(new Set(CRAFT.map((c) => c.name)).size, CRAFT.length);
  for (const c of CRAFT) assert.ok(c.name && c.nameEn && c.kind === 'craft');
});

test('every craft has a launch year and a short introduction for the docking card', () => {
  for (const c of CRAFT) {
    assert.ok(c.launched >= 1957 && c.launched <= 2023, c.id);
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

const AU = 149597870.7;
const bodyOf = (bodies, id) => bodies.find((b) => b.id === id);
const craftOf = (t, bodies, id) => craftAt(t, bodies).find((c) => c.id === id);
// Lowest and highest height above a body's surface over one lap of `periodS`.
function heights(id, parentId, periodS) {
  const bodies = bodiesAt(0);
  const parent = bodyOf(bodies, parentId);
  let lowest = Infinity;
  let highest = 0;
  for (let i = 0; i <= 600; i++) {
    const km = dist(craftOf((i / 600) * periodS, bodies, id).position, parent.position) - parent.radiusKm;
    lowest = Math.min(lowest, km);
    highest = Math.max(highest, km);
  }
  return [lowest, highest];
}

test('the stations and the first satellite circle Earth at their own heights', () => {
  for (const [id, km] of [['iss', 420], ['tiangong', 390], ['sputnik', 900]]) {
    const [lowest, highest] = heights(id, 'earth', 800 * 720);
    near(lowest, km, 1e-3);
    near(highest, km, 1e-3);
  }
  // They do not fly in formation: at the start no two of the five near Earth are within 500 km.
  const bodies = bodiesAt(0);
  const near5 = ['hubble', 'iss', 'tiangong', 'sputnik', 'chandra'].map((id) => craftOf(0, bodies, id));
  for (let i = 0; i < near5.length; i++) {
    for (let j = i + 1; j < near5.length; j++) assert.ok(dist(near5[i].position, near5[j].position) > 500, `${near5[i].id} ${near5[j].id}`);
  }
});

test('MRO skims Mars at 300 km; Cassini circles Saturn outside the rings', () => {
  const [low, high] = heights('mro', 'mars', 600 * 720);
  near(low, 300, 1e-3);
  near(high, 300, 1e-3);
  const [cLow, cHigh] = heights('cassini', 'saturn', 900 * 720);
  near(cLow + 58232, 160000, 1e-3);
  near(cHigh + 58232, 160000, 1e-3);
  assert.ok(cLow + 58232 > 136775);
});

test('Juno swings from 420 km above Jupiter out to 800,000 km, over the poles', () => {
  // It whips past its lowest point in minutes, so look at that moment itself (day 6).
  const start = bodiesAt(0);
  const jupiter = bodyOf(start, 'jupiter');
  near(dist(craftOf(6 * 86400, start, 'juno').position, jupiter.position) - jupiter.radiusKm, 420, 1);
  const [low, high] = heights('juno', 'jupiter', 53 * 86400);
  assert.ok(low >= 420 - 1);
  near(high, 803000, 3000);
  // Polar: a quarter of the way round it is far above the planets' plane.
  const bodies = bodiesAt(0);
  let top = 0;
  for (let i = 0; i <= 200; i++) {
    const juno = craftOf((i / 200) * 53 * 86400, bodies, 'juno');
    top = Math.max(top, Math.abs(juno.position[1] - bodyOf(bodies, 'jupiter').position[1]));
  }
  assert.ok(top > 50000, `${top}`);
});

test('Parker dives to 62,000 km above the Sun and out past Venus; the Roadster loops between Earth and Mars', () => {
  const [pLow, pHigh] = heights('parker', 'sun', 88 * 86400);
  near(pLow, (6.9e6 - 696340) / 100, 500);
  near(pHigh, (0.73 * AU - 696340) / 100, 2000);
  const [rLow, rHigh] = heights('roadster', 'sun', 557 * 86400);
  near(rLow, (0.986 * AU - 696340) / 100, 2000);
  near(rHigh, (1.664 * AU - 696340) / 100, 2000);
});

test('New Horizons and Pioneer 10 are leaving, far beyond Pluto', () => {
  const bodies = bodiesAt(0);
  const pluto = dist(bodyOf(bodies, 'pluto').position, bodyOf(bodies, 'sun').position);
  for (const [id, au, kmPerS] of [['newHorizons', 63, 13.7], ['pioneer10', 140, 11.9]]) {
    const now = dist(craftOf(0, bodies, id).position, bodyOf(bodies, 'sun').position);
    assert.ok(now > pluto, id);
    near(now, (au * AU) / 100, 1);
    near(dist(craftOf(7200, bodies, id).position, bodyOf(bodies, 'sun').position) - now, (kmPerS * 7200) / 100, 1e-3);
  }
});

test('no craft is ever inside a body', () => {
  for (const t of [0, 1e5, 3.3e6, 2e7, 9e7]) {
    const bodies = bodiesAt(t);
    for (const c of craftAt(t, bodies)) {
      for (const b of bodies) assert.ok(dist(c.position, b.position) > b.radiusKm, `${c.id} inside ${b.id} at ${t}`);
    }
  }
});
