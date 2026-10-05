import { test } from 'vitest';
import assert from 'node:assert/strict';
import { START_SPOTS, pickSpot, toSpot, fromSpot, sunFrame } from '../src/core/startSpots.js';
import { forward, up, lookAtDirection } from '../src/core/orientation.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { JWST_FROM_EARTH_KM } from '../src/core/craft.js';

const near = (a, b, slack) => a.every((n, i) => Math.abs(n - b[i]) <= slack);

test('a place written down and read back is the same place and the same view', () => {
  const earth = bodyById('earth');
  const sun = bodyById('sun');
  const state = {
    position: earth.position.map((n, i) => n + [-5200, 8100, 3300][i]),
    orientation: lookAtDirection([0.3, -0.5, 0.8]),
  };
  const back = fromSpot(toSpot(state, earth, sun), earth, sun);
  assert.ok(near(back.position, state.position, 0.2));
  assert.ok(near(forward(back.orientation), forward(state.orientation), 0.001));
  assert.ok(near(up(back.orientation), up(state.orientation), 0.001));
});

test('a place keeps its light when the body stands elsewhere round the Sun', () => {
  const sun = { id: 'sun', position: [0, 0, 0] };
  const here = { id: 'earth', position: [1.5e6, 2e4, 0] };
  const there = { id: 'earth', position: [-4e5, -1e4, 1.4e6] };
  const spot = { body: 'earth', at: [-9000, 2000, 4000], ahead: [0.6, 0.6, -0.5], above: [-0.5, 0.8, 0.2] };
  for (const body of [here, there]) {
    const { position, orientation } = fromSpot(spot, body, sun);
    const frame = sunFrame(body.position, sun.position);
    const off = position.map((n, i) => n - body.position[i]);
    // 9,000 km to the night side of the body, wherever the Sun is.
    assert.ok(Math.abs(off.reduce((sum, n, i) => sum + n * frame.toSun[i], 0) + 9000) < 0.01);
    assert.ok(Math.abs(forward(orientation).reduce((sum, n, i) => sum + n * frame.toSun[i], 0) - 0.6 / Math.hypot(0.6, 0.6, 0.5)) < 0.001);
  }
});

test('every place is whole, stands over its body and not inside it', () => {
  assert.equal(START_SPOTS[0].id, 'dawn');
  assert.equal(new Set(START_SPOTS.map((s) => s.id)).size, START_SPOTS.length);
  for (const spot of START_SPOTS.slice(1)) {
    const body = BODIES.find((b) => b.id === spot.body);
    assert.ok(body, spot.id);
    assert.ok(Math.hypot(...spot.at) > body.radiusKm, spot.id);
    for (const v of [spot.ahead, spot.above]) assert.ok(Math.abs(Math.hypot(...v) - 1) < 0.01, spot.id);
    // The view's top is square to the way she looks.
    assert.ok(Math.abs(spot.ahead.reduce((sum, n, i) => sum + n * spot.above[i], 0)) < 0.01, spot.id);
  }
});

test('the start is picked by chance among all the places, or by its number', () => {
  const n = START_SPOTS.length;
  assert.equal(pickSpot(0), START_SPOTS[0]);
  assert.equal(pickSpot(0.9999), START_SPOTS[n - 1]);
  assert.equal(pickSpot(1), START_SPOTS[n - 1]);
  for (let i = 0; i < n; i++) assert.equal(pickSpot((i + 0.5) / n), START_SPOTS[i]);
  assert.equal(pickSpot(0, '2'), START_SPOTS[1]);
  for (const bad of ['0', String(n + 1), 'x', '1.5', null]) assert.equal(pickSpot(0, bad), START_SPOTS[0]);
});

test('a first visit opens near Earth, never at a far place', () => {
  const near = START_SPOTS.filter((s) => !s.far);
  assert.ok(near.length >= 2 && near.length < START_SPOTS.length);
  for (let i = 0; i < 50; i++) assert.equal(pickSpot(i / 50, null, true).far, undefined);
  assert.equal(pickSpot(0.9999, null, true), near[near.length - 1]);
});

test('the place beside Webb is where Webb is kept: 150,000 km from Earth, away from the Sun', () => {
  const spot = START_SPOTS.find((s) => s.id === 'webb');
  assert.equal(spot.body, 'earth');
  assert.ok(Math.hypot(spot.at[0] + JWST_FROM_EARTH_KM, spot.at[1], spot.at[2]) < 100);
});
