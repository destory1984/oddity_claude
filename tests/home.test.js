import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HOME, HOME_NEAR_S, HOME_ROUND_S, AURORA_VIEW, auroraSpot, homeSpot, startHome, homeStep, homeArrived, slerp } from '../src/core/home.js';
import { forward, up } from '../src/core/orientation.js';

const earth = { id: 'earth', position: [1000, 2000, 3000], radiusKm: 6371 };
const still = (position) => ({ position, orientation: [0, 0, 0, 1], velocity: [0, 0, 0], restingOn: null });
const from = (v) => v.map((n, i) => n - earth.position[i]);

test('the place over Korea: above the peninsula, looking down with north up', () => {
  const spot = homeSpot(earth, 0);
  const out = from(spot.position);
  assert.ok(Math.abs(Math.hypot(...out) - earth.radiusKm - HOME.heightKm) < 1e-6);
  // In the northern half, at Korea's latitude.
  assert.ok(Math.abs(Math.asin(spot.up[1]) * 180 / Math.PI - HOME.latDeg) < 1e-6);
  // She looks mostly down, and the top of her view leans north.
  assert.ok(forward(spot.facing).reduce((sum, n, i) => sum + n * -spot.up[i], 0) > 0.9);
  assert.ok(up(spot.facing)[1] > 0.5);
  // The ground turns: later the place is elsewhere, at the same height.
  const later = homeSpot(earth, 600);
  assert.ok(Math.hypot(...later.position.map((n, i) => n - spot.position[i])) > 100);
  assert.ok(Math.abs(Math.hypot(...from(later.position)) - Math.hypot(...out)) < 1e-6);
});

test('the way there goes round the globe, never through it, and ends held over the place', () => {
  const spot = homeSpot(earth, 0);
  // From low over the far side of the globe.
  const start = earth.position.map((n, i) => n - spot.up[i] * (earth.radiusKm + 400) + (i === 0 ? 50 : 0));
  let state = still(start);
  let home = startHome(state, earth, spot);
  assert.ok(home.seconds > HOME_NEAR_S + 0.9 * HOME_ROUND_S && home.seconds <= HOME_NEAR_S + HOME_ROUND_S + 1e-9);
  let arrivals = 0;
  let last = start;
  for (let i = 0; i < 600 && arrivals === 0; i++) {
    const went = homeStep(state, home, 1 / 30, { spot, body: earth, spun: 0 });
    ({ state, home } = went);
    assert.ok(Math.hypot(...from(state.position)) > earth.radiusKm + 5, 'above the ground');
    // No leap from one frame to the next.
    assert.ok(Math.hypot(...state.position.map((n, k) => n - last[k])) < 1500);
    last = state.position;
    if (went.arrived) arrivals += 1;
  }
  assert.equal(arrivals, 1);
  assert.ok(homeArrived(home));
  assert.deepEqual(state.position, spot.position);
  assert.deepEqual(state.orientation, spot.facing);
  // From right over Korea it is a short trip; from far out it comes all the way in.
  assert.ok(startHome(still(spot.position), earth, spot).seconds < HOME_NEAR_S + 0.01);
  let far = still(earth.position.map((n, i) => n + (i === 2 ? 4e6 : 0)));
  let trip = startHome(far, earth, spot);
  for (let i = 0; i < 600 && !homeArrived(trip); i++) ({ state: far, home: trip } = homeStep(far, trip, 1 / 30, { spot, body: earth, spun: 0 }));
  assert.deepEqual(far.position, spot.position);
});

test('slerp keeps to the unit sphere, also straight across it', () => {
  for (const [a, b] of [[[1, 0, 0], [0, 1, 0]], [[1, 0, 0], [-1, 0, 0]], [[0, 0, 1], [0, 0, 1]]]) {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) assert.ok(Math.abs(Math.hypot(...slerp(a, b, t)) - 1) < 1e-6);
  }
  assert.ok(Math.hypot(...slerp([1, 0, 0], [0, 1, 0], 1).map((n, i) => n - [0, 1, 0][i])) < 1e-9);
});

test('the place in the aurora: on the night side at the ring\'s latitude, the Sun behind her, wherever the Sun is', () => {
  for (const angle of [0, 1, 2.5, 4, 5.5]) {
    const sun = earth.position.map((n, i) => n + [Math.cos(angle), 0, Math.sin(angle)][i] * 1.5e8);
    const toSun = [Math.cos(angle), 0, Math.sin(angle)];
    const spot = auroraSpot(earth, sun);
    const out = from(spot.position);
    const high = Math.hypot(...out) - earth.radiusKm;
    // Inside the curtain (it stands from 100 km to 1,500 km), over the night side.
    assert.ok(high > 150 && high < 400, String(high));
    assert.ok(Math.abs(Math.asin(spot.up[1]) * 180 / Math.PI - 67) < 2);
    assert.ok(out.reduce((sum, n, i) => sum + n * toSun[i], 0) < 0);
    // She looks away from the Sun, nearly level, head up.
    const ahead = forward(spot.facing);
    assert.ok(ahead.reduce((sum, n, i) => sum + n * toSun[i], 0) < -0.4);
    assert.ok(Math.abs(ahead[1] - AURORA_VIEW.forward[1]) < 1e-3);
    assert.ok(up(spot.facing)[1] > 0.9);
  }
});
