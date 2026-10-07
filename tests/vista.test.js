import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEART, PLUTO_DAY_VIEW, VISTAS, VISTA_HELD, EARTHRISE, RED_SPOT, RING_VIEW, SATURN_VIEW, MARINER_VIEW, HEART_VIEW, IO_VIEW, JET_VIEW, BULLSEYE_VIEW, vistaSpot, beltSpeed, redSpotLonDeg } from '../src/core/vista.js';
import { forward, up } from '../src/core/orientation.js';

const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const sun = { position: [0, 0, 0] };
// A Sun straight over where the view of a world stands at timeS (so its place is lit).
function noon(id, body, timeS) {
  for (const position of [[9e9, 0, 0], [-9e9, 0, 0], [0, 0, 9e9], [0, 0, -9e9]]) {
    const spot = vistaSpot(id, { body, sun: { position }, earth: { position: [0, 0, 0] }, timeS });
    if (!spot.free) return { position: body.position.map((n, i) => n + spot.up[i] * 1e9) };
  }
  throw new Error('no lit side');
}

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

test('Saturn\'s view: where the user stood, behind the globe and under the rings, looking to the Sun', () => {
  const saturn = { position: [1.4e9, 0, 2e8], radiusKm: 58232 };
  const spot = vistaSpot('saturn', { body: saturn, sun, earth: sun, ringNormal: [0.2, 0.9, 0.1] });
  const out = sub(spot.position, saturn.position);
  assert.ok(Math.abs(Math.hypot(...out) / saturn.radiusKm - Math.hypot(...SATURN_VIEW.position)) < 1e-6);
  const toSun = unit(sub(sun.position, saturn.position));
  assert.ok(dot(unit(out), toSun) < -0.5);
  assert.ok(out[1] < 0);
  assert.ok(dot(forward(spot.facing), toSun) > 0.8);
  assert.ok(up(spot.facing)[1] < -0.8);
  assert.ok(RING_VIEW.radii > 0);
  assert.deepEqual(VISTAS, ['moon', 'jupiter', 'saturn', 'mars', 'io', 'enceladus', 'pluto', 'uranus']);
  assert.equal(vistaSpot('venus', { body: saturn, sun, earth: sun }), null);
});

test('the views of Mars and Pluto: over a place of the ground, turning with it, looking down with north up', () => {
  for (const [id, view, radiusKm] of [['mars', MARINER_VIEW, 3389.5], ['pluto', HEART_VIEW, 1188.3]]) {
    const body = { position: [2e8, 5, -3e7], radiusKm };
    // (The Sun stood where it lights the place: Pluto's view is another by night.)
    const a = vistaSpot(id, { body, sun: noon(id, body, 0), earth: sun, timeS: 0 });
    assert.ok(Math.abs(Math.asin(a.up[1]) * 180 / Math.PI - view.latDeg) < 1e-6);
    assert.ok(Math.abs(Math.hypot(...sub(a.position, body.position)) / radiusKm - 1 - view.heightRadii) < 1e-9);
    assert.ok(dot(forward(a.facing), a.up) < -0.99);
    assert.ok(up(a.facing)[1] > 0.8);
    const b = vistaSpot(id, { body, sun: noon(id, body, 6000), earth: sun, timeS: 6000 });
    assert.ok(Math.hypot(...sub(a.position, b.position)) > 10);
    assert.ok(VISTA_HELD.includes(id) && !a.free);
  }
});

test('the view of Pluto with its heart in the night: off the day side, the lit globe over her head, not held', () => {
  const pluto = { position: [2e8, 5, -3e7], radiusKm: 1188.3 };
  const day = noon('pluto', pluto, 0);
  const night = { position: pluto.position.map((n, i) => 2 * n - day.position[i]) };
  const spot = vistaSpot('pluto', { body: pluto, sun: night, earth: sun, timeS: 0 });
  assert.equal(spot.free, true);
  const out = sub(spot.position, pluto.position);
  assert.ok(Math.abs(Math.hypot(...out) / pluto.radiusKm - PLUTO_DAY_VIEW.radii) < 1e-9);
  assert.ok(dot(unit(out), unit(sub(night.position, pluto.position))) > 0.999);
  assert.ok(dot(forward(spot.facing), unit(out)) < -0.9);
  assert.ok(HEART.sunAbove > 0);
});

test('the view of Io: off its sunlit side, away from Jupiter, the giant behind the moon', () => {
  const io = { position: [7e8, 0, 3e5], radiusKm: 1821.6 };
  const jupiter = { position: [7e8, 2000, 0], radiusKm: 69911 };
  const spot = vistaSpot('io', { body: io, sun, earth: sun, of: () => jupiter });
  const out = sub(spot.position, io.position);
  assert.ok(Math.abs(Math.hypot(...out) / io.radiusKm - IO_VIEW.radii) < 1e-9);
  assert.ok(dot(unit(out), unit(sub(jupiter.position, io.position))) < -0.5);
  assert.ok(dot(unit(out), unit(sub(sun.position, io.position))) > 0.3);
  // She looks under the moon, and Jupiter is before her.
  const ahead = forward(spot.facing);
  assert.ok(dot(ahead, unit(out)) < -0.9 && dot(ahead, up(spot.facing)) < 1e-9);
  assert.ok(dot(ahead, unit(sub(jupiter.position, spot.position))) > 0.5);
});

test('the view of Enceladus: on the side away from Saturn and south of the equator, north up, Saturn beside the moon', () => {
  const enceladus = { position: [1.4e9, 0, 2e8], radiusKm: 252.1 };
  const saturn = { position: [1.4e9 + 2e5, 300, 2e8 + 1e5], radiusKm: 58232 };
  const spot = vistaSpot('enceladus', { body: enceladus, sun, earth: sun, of: () => saturn });
  const out = sub(spot.position, enceladus.position);
  assert.ok(Math.abs(Math.hypot(...out) / enceladus.radiusKm - JET_VIEW.radii) < 1e-9);
  assert.ok(dot(unit(out), unit(sub(saturn.position, enceladus.position))) < -0.8);
  assert.ok(out[1] < 0);
  const ahead = forward(spot.facing);
  assert.ok(dot(ahead, unit(out)) < -0.95);
  assert.ok(up(spot.facing)[1] > 0.9);
  // Saturn is in front of her, off to one side of the moon.
  const toSaturn = unit(sub(saturn.position, spot.position));
  assert.ok(dot(ahead, toSaturn) > 0.7 && dot(ahead, toSaturn) < 0.99);
});

test('the view of Uranus: off the sunlit face of its rings, though they face the Sun squarely', () => {
  const uranus = { position: [-2.5e9, 0, 1.4e9], radiusKm: 25362 };
  const toSun = unit(sub(sun.position, uranus.position));
  for (const normal of [[0.3, 0.2, 0.9], toSun, toSun.map((x) => -x)]) {
    const spot = vistaSpot('uranus', { body: uranus, sun, earth: sun, ringNormal: normal });
    const out = sub(spot.position, uranus.position);
    assert.ok(spot.position.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...out) / uranus.radiusKm - BULLSEYE_VIEW.radii) < 1e-9);
    assert.ok(dot(out, unit(normal)) * dot(toSun, unit(normal)) > 0);
    assert.ok(dot(forward(spot.facing), unit(out).map((x) => -x)) > 0.98);
  }
});
