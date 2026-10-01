import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CRAFT, craftAt, HUBBLE_ALTITUDE_KM, JWST_FROM_EARTH_KM } from '../src/core/craft.js';
import { bodiesAt } from '../src/core/bodies.js';
import { C } from '../src/core/flight.js';
import { createState, step } from '../src/core/game.js';

const dist = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

test('four craft: the two Voyagers, Hubble and Webb', () => {
  assert.deepEqual(CRAFT.map((c) => c.id), ['voyager1', 'voyager2', 'hubble', 'jwst']);
  for (const c of CRAFT) assert.ok(c.name && c.nameEn && c.kind === 'craft');
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
