import { test } from 'vitest';
import assert from 'node:assert/strict';
import { VISTAS, EARTHRISE, RED_SPOT, RING_VIEW, vistaSpot, beltSpeed, redSpotLonDeg } from '../src/core/vista.js';
import { forward, up } from '../src/core/orientation.js';

const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const sun = { position: [0, 0, 0] };

test('the Moon\'s view: low over the ground, Earth a little above the level and over the middle of the view', () => {
  const moon = { position: [1.5e8, 100, 3e5], radiusKm: 1737.4 };
  const earth = { position: [1.5e8, 0, -8.4e4] };
  const spot = vistaSpot('moon', { body: moon, sun, earth });
  assert.ok(Math.abs(Math.hypot(...sub(spot.position, moon.position)) - moon.radiusKm - EARTHRISE.heightKm) < 1e-6);
  const toEarth = unit(sub(earth.position, spot.position));
  const lift = Math.asin(dot(toEarth, spot.up)) * 180 / Math.PI;
  assert.ok(lift > 5 && lift < 15, String(lift));
  // She looks toward Earth and a little under it, head up.
  const ahead = forward(spot.facing);
  assert.ok(dot(ahead, toEarth) > 0.95);
  assert.ok(dot(ahead, spot.up) < dot(toEarth, spot.up));
  assert.ok(dot(up(spot.facing), spot.up) > 0.95);
});

test('Jupiter\'s view: over the red spot\'s latitude, a little west of it, wherever the clouds have slid it', () => {
  const jupiter = { position: [7e8, 0, 0], radiusKm: 69911 };
  const a = vistaSpot('jupiter', { body: jupiter, sun, earth: sun, timeS: 0, elapsedS: 0 });
  assert.ok(Math.abs(Math.asin(a.up[1]) * 180 / Math.PI - RED_SPOT.latDeg) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...sub(a.position, jupiter.position)) / jupiter.radiusKm - 1 - RED_SPOT.heightRadii) < 1e-9);
  assert.ok(dot(forward(a.facing), a.up) < -0.99);
  assert.ok(up(a.facing)[1] > 0.9);
  // Every belt has its own steady pace; the spot's belt moves, and the view with it.
  assert.ok(Math.abs(beltSpeed(RED_SPOT.belt)) > 0.01 && Math.abs(beltSpeed(RED_SPOT.belt)) <= 0.5);
  assert.equal(beltSpeed(3), beltSpeed(3));
  assert.notEqual(redSpotLonDeg(600), redSpotLonDeg(0));
  const b = vistaSpot('jupiter', { body: jupiter, sun, earth: sun, timeS: 0, elapsedS: 600 });
  assert.ok(Math.hypot(...sub(a.position, b.position)) > 1000);
  // ...and with the globe's own turning.
  const c = vistaSpot('jupiter', { body: jupiter, sun, earth: sun, timeS: 3000, elapsedS: 0 });
  assert.ok(Math.hypot(...sub(a.position, c.position)) > 1000);
});

test('Saturn\'s view: off the rings\' sunlit face, far enough to take them all in, looking at the globe', () => {
  const saturn = { position: [1.4e9, 0, 2e8], radiusKm: 58232 };
  for (const normal of [[0.2, 0.9, 0.1], [-0.2, -0.9, -0.1]]) {
    const spot = vistaSpot('saturn', { body: saturn, sun, earth: sun, ringNormal: normal });
    const out = sub(spot.position, saturn.position);
    assert.ok(Math.abs(Math.hypot(...out) / saturn.radiusKm - RING_VIEW.radii) < 1e-9);
    // On the same side of the rings as the Sun, and not edge on.
    const n = unit(normal);
    const toSun = unit(sub(sun.position, saturn.position));
    assert.ok(dot(out, n) * dot(toSun, n) > 0);
    const over = Math.asin(Math.abs(dot(unit(out), n))) * 180 / Math.PI;
    assert.ok(Math.abs(over - RING_VIEW.overDeg) < 1e-6);
    assert.ok(dot(forward(spot.facing), unit(out).map((x) => -x)) > 0.98);
  }
  assert.deepEqual(VISTAS, ['moon', 'jupiter', 'saturn']);
  assert.equal(vistaSpot('mars', { body: saturn, sun, earth: sun }), null);
});
