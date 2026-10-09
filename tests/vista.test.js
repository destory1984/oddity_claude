import { test } from 'vitest';
import assert from 'node:assert/strict';
import { HEART, PLUTO_DAY_VIEW, VISTAS, VISTA_HELD, EARTHRISE, RED_SPOT, RING_VIEW, SATURN_VIEW, MARINER_VIEW, PLUTO_VIEW, IO_VIEW, JET_VIEW, BULLSEYE_VIEW, NEPTUNE_RISE, DARK_SPOT, DARK_SPOT_VIEW, TITAN_VIEW, COMET_VIEW, vistaSpot, warpSpot, beltSpeed, redSpotLonDeg } from '../src/core/vista.js';
import { forward, up } from '../src/core/orientation.js';
import { CARRY_KM } from '../src/core/game.js';

const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const sun = { position: [0, 0, 0] };
// A Sun straight over where the view of a world stands at timeS (so its place is lit).
function noon(id, body, timeS) {
  for (const position of [[9e9, 0, 0], [-9e9, 0, 0], [0, 0, 9e9], [0, 0, -9e9]]) {
    const spot = vistaSpot(id, { body, sun: { position }, earth: { position: [0, 0, 0] }, timeS, of: () => ({ position: [1e5, 0, 0], radiusKm: 1000 }) });
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
  // A warp arrives elsewhere: off the rings' sunlit face, far enough to take them all in.
  for (const normal of [[0.2, 0.9, 0.1], [-0.2, -0.9, -0.1]]) {
    const warp = warpSpot('saturn', { body: saturn, sun, ringNormal: normal });
    const off = sub(warp.position, saturn.position);
    assert.ok(Math.abs(Math.hypot(...off) / saturn.radiusKm - RING_VIEW.radii) < 1e-9);
    const n = unit(normal);
    assert.ok(dot(off, n) * dot(toSun, n) > 0);
    assert.ok(Math.abs(Math.asin(Math.abs(dot(unit(off), n))) * 180 / Math.PI - RING_VIEW.overDeg) < 1e-6);
    assert.ok(dot(forward(warp.facing), unit(off).map((x) => -x)) > 0.98);
  }
  assert.equal(warpSpot('mars', { body: saturn, sun }), null);
  // A comet with a tail: 31,000 km off, where she is still carried with it, the same
  // place by its tails whichever way it goes; one asleep has the usual place.
  const comet = { id: 'haleBopp', kind: 'comet', radiusKm: 30, position: [2e6, 1e5, -3e5], sunKm: 1.4 * 149597870.7 };
  for (const moved of [[10, 3, -20], [-4, 25, 6]]) {
    const warp = warpSpot('haleBopp', { body: comet, sun, moved });
    const off = sub(warp.position, comet.position);
    assert.ok(Math.abs(Math.hypot(...off) - COMET_VIEW.km) < 1 && COMET_VIEW.km < CARRY_KM);
    const away = unit(sub(comet.position, sun.position));
    assert.ok(Math.abs(dot(unit(off), away)) < 0.1, 'beside the head, not up the tail');
    assert.ok(dot(off, moved) > 0, 'on the side it is going to, the dust tail leaning away');
    assert.ok(dot(forward(warp.facing), unit(off).map((x) => -x)) > 0.9);
    assert.ok(dot(up(warp.facing), away) > 0.7, 'the tails go up the view');
  }
  assert.ok(warpSpot('haleBopp', { body: comet, sun }), 'a place even before it is seen to move');
  assert.equal(warpSpot('halley', { body: { ...comet, sunKm: 35 * 149597870.7 }, sun, moved: [1, 0, 0] }), null);
  assert.deepEqual(VISTAS, ['moon', 'jupiter', 'saturn', 'mars', 'io', 'enceladus', 'pluto', 'uranus', 'neptune', 'titan']);
  assert.equal(vistaSpot('venus', { body: saturn, sun, earth: sun }), null);
});

test('the view of Mars: over a place of the ground, turning with it, looking down with north up', () => {
  const body = { position: [2e8, 5, -3e7], radiusKm: 3389.5 };
  const a = vistaSpot('mars', { body, sun: noon('mars', body, 0), earth: sun, timeS: 0 });
  assert.ok(Math.abs(Math.asin(a.up[1]) * 180 / Math.PI - MARINER_VIEW.latDeg) < 1e-6);
  assert.ok(Math.abs(Math.hypot(...sub(a.position, body.position)) / body.radiusKm - 1 - MARINER_VIEW.heightRadii) < 1e-9);
  assert.ok(dot(forward(a.facing), a.up) < -0.99);
  assert.ok(up(a.facing)[1] > 0.8);
  const b = vistaSpot('mars', { body, sun: noon('mars', body, 6000), earth: sun, timeS: 6000 });
  assert.ok(Math.hypot(...sub(a.position, b.position)) > 10);
  assert.ok(VISTA_HELD.includes('mars') && !a.free);
});

test('the view of Pluto: where the user stood, the whole globe before her with the heart in it, turning with the globe', () => {
  const body = { position: [2e8, 5, -3e7], radiusKm: 1188.3 };
  const a = vistaSpot('pluto', { body, sun: noon('pluto', body, 0), earth: sun, timeS: 0 });
  const out = sub(a.position, body.position);
  assert.ok(Math.abs(Math.hypot(...out) / body.radiusKm - Math.hypot(...PLUTO_VIEW.position)) < 1e-6);
  // She looks at the globe (a little under its middle), her head to its north.
  assert.ok(dot(forward(a.facing), unit(out).map((n) => -n)) > 0.9);
  assert.ok(up(a.facing)[1] > 0.9);
  // The heart is on her side of the globe.
  const heart = [-Math.cos(HEART.latDeg * Math.PI / 180) * Math.cos(HEART.lonDeg * Math.PI / 180), Math.sin(HEART.latDeg * Math.PI / 180), -Math.cos(HEART.latDeg * Math.PI / 180) * Math.sin(HEART.lonDeg * Math.PI / 180)];
  assert.ok(dot(unit(PLUTO_VIEW.position), heart) > 0.85);
  const b = vistaSpot('pluto', { body, sun: noon('pluto', body, 60000), earth: sun, timeS: 60000 });
  assert.ok(Math.hypot(...sub(a.position, b.position)) > 10);
  assert.ok(Math.abs(Math.hypot(...sub(b.position, body.position)) - Math.hypot(...out)) < 1e-6);
  assert.ok(VISTA_HELD.includes('pluto') && !a.free);
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

test('the view of Neptune: over its dark spot by day; by night low over Triton\'s ground, Neptune above the level', () => {
  const neptune = { position: [4.4e9, 0, 3e8], radiusKm: 24622 };
  const triton = { position: [4.4e9 + 50000, 4000, 3e8 - 30000], radiusKm: 1353.4 };
  const day = noon('neptune', neptune, 0);
  const over = vistaSpot('neptune', { body: neptune, sun: day, earth: sun, of: () => triton });
  assert.ok(!over.free && VISTA_HELD.includes('neptune'));
  assert.ok(Math.abs(Math.asin(over.up[1]) * 180 / Math.PI - DARK_SPOT_VIEW.latDeg) < 1e-6);
  assert.ok(DARK_SPOT_VIEW.latDeg < DARK_SPOT.latDeg && DARK_SPOT_VIEW.lonDeg === DARK_SPOT.lonDeg);
  assert.ok(dot(forward(over.facing), over.up) < -0.99);
  const night = { position: neptune.position.map((n, i) => 2 * n - day.position[i]) };
  const spot = vistaSpot('neptune', { body: neptune, sun: night, earth: sun, of: () => triton });
  assert.equal(spot.free, true);
  assert.ok(Math.abs(Math.hypot(...sub(spot.position, triton.position)) - triton.radiusKm - NEPTUNE_RISE.heightKm) < 1e-6);
  const ground = unit(sub(spot.position, triton.position));
  const toNeptune = unit(sub(neptune.position, spot.position));
  const lift = Math.asin(dot(toNeptune, ground)) * 180 / Math.PI;
  assert.ok(lift > 5 && lift < 20, String(lift));
  assert.ok(dot(forward(spot.facing), toNeptune) > 0.9);
  assert.ok(dot(up(spot.facing), ground) > 0.9);
  // `up` is the way from Neptune's centre to the place.
  assert.ok(Math.hypot(...sub(spot.up, unit(sub(spot.position, neptune.position)))) < 1e-9);
});

test('Titan\'s view: where the user said so, off the sunlit side with the whole globe in the middle', () => {
  const titan = { position: [1.4e9, 3e5, 2e8], radiusKm: 2574.7 };
  const spot = vistaSpot('titan', { body: titan, sun, earth: sun });
  const out = sub(spot.position, titan.position);
  assert.ok(Math.abs(Math.hypot(...out) / titan.radiusKm - 4.5) < 1e-3);
  const toSun = unit(sub(sun.position, titan.position));
  assert.ok(Math.abs(Math.acos(dot(unit(out), toSun)) * 180 / Math.PI - 32) < 3);
  // She looks at its middle, north at the top; the globe (26 degrees) fits a phone's 33.
  assert.ok(dot(forward(spot.facing), unit(out).map((x) => -x)) > 0.9999);
  assert.ok(up(spot.facing)[1] > 0.97);
  assert.ok(2 * Math.asin(1 / 4.5) * 180 / Math.PI < 33);
  assert.ok(!VISTA_HELD.includes('titan') && !spot.free);
  assert.ok(Math.abs(Math.hypot(...TITAN_VIEW.forward) - 1) < 1e-3 && Math.abs(dot(TITAN_VIEW.forward, TITAN_VIEW.up)) < 1e-3);
});
