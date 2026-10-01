import { test } from 'vitest';
import assert from 'node:assert/strict';
import { heliocentric, moonLongitudeDeg, todayData, startAbove, HALLEY_NEXT_PERIHELION } from '../src/core/ephemeris.js';
import { BODY_DATA, BODIES, placeBodies, bodyById, surfaceDistance, START_POSITION, START_ALTITUDE_KM } from '../src/core/bodies.js';
import { lookAtDirection, forward, right } from '../src/core/orientation.js';

const DAY = 86400;
const utc = (y, m, d, h = 0) => new Date(Date.UTC(y, m - 1, d, h));
const lon = (id, date) => heliocentric(id, date).lonDeg;
// Smallest difference between two angles in degrees.
const apart = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const unit = (v) => v.map((n) => n / Math.hypot(...v));

test('Earth is opposite the Sun: longitude 0 at the September equinox, 180 at the March one', () => {
  assert.ok(apart(lon('earth', utc(2026, 9, 23, 0)), 0) < 1, `${lon('earth', utc(2026, 9, 23))}`);
  assert.ok(apart(lon('earth', utc(2026, 3, 20, 15)), 180) < 1);
  assert.ok(apart(lon('earth', utc(2000, 1, 1, 12)), 100.4) < 1);
});

test('the giant planets are where the almanac puts them in October 2026', () => {
  const date = utc(2026, 10, 1);
  // Jupiter was at opposition near longitude 110 in January 2026 and moves 30 degrees a year.
  assert.ok(apart(lon('jupiter', date), 132) < 6, `jupiter ${lon('jupiter', date)}`);
  // Saturn was at opposition near 358 in September 2025 and moves 12 degrees a year.
  assert.ok(apart(lon('saturn', date), 10) < 5, `saturn ${lon('saturn', date)}`);
  // Neptune crossed longitude 0 (into Aries) in 2025-2026; Uranus is in Taurus.
  assert.ok(apart(lon('neptune', date), 2) < 4, `neptune ${lon('neptune', date)}`);
  assert.ok(apart(lon('uranus', date), 61) < 5, `uranus ${lon('uranus', date)}`);
});

test('distances come out in AU and latitudes stay small, except Pluto', () => {
  const date = utc(2026, 10, 1);
  for (const [id, lo, hi] of [['mercury', 0.3, 0.47], ['venus', 0.71, 0.73], ['earth', 0.98, 1.02], ['mars', 1.38, 1.67],
    ['jupiter', 4.9, 5.5], ['saturn', 9, 10.1], ['uranus', 18.2, 20.1], ['neptune', 29.7, 30.4], ['pluto', 29.6, 49.4]]) {
    const p = heliocentric(id, date);
    assert.ok(p.rAu > lo && p.rAu < hi, `${id} r ${p.rAu}`);
    assert.ok(Math.abs(p.latDeg) < (id === 'pluto' ? 18 : 7.1), `${id} lat ${p.latDeg}`);
  }
});

test('the Moon is opposite the Sun at full moon and beside it at new moon', () => {
  // Full moon 2026-09-26 16:49 UTC, new moon 2026-10-10 15:50 UTC.
  const full = utc(2026, 9, 26, 17);
  assert.ok(apart(moonLongitudeDeg(full), lon('earth', full)) < 10);
  const dark = utc(2026, 10, 10, 16);
  assert.ok(apart(moonLongitudeDeg(dark), lon('earth', dark) + 180) < 10);
});

test("today's layout keeps every body, radius and period; only the starting directions change", () => {
  const data = todayData(utc(2026, 10, 1));
  assert.deepEqual(data.map((d) => d.id), BODY_DATA.map((d) => d.id));
  for (const [i, d] of data.entries()) {
    assert.equal(d.radiusKm, BODY_DATA[i].radiusKm);
    assert.equal(d.orbitKm, BODY_DATA[i].orbitKm);
    assert.equal(d.periodS, BODY_DATA[i].periodS);
  }
  const changed = data.filter((d, i) => d.direction && d.direction.join() !== BODY_DATA[i].direction.join()).map((d) => d.id);
  assert.deepEqual(changed, ['mercury', 'venus', 'earth', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']);
  // BODY_DATA itself is untouched.
  assert.deepEqual(BODY_DATA.find((d) => d.id === 'earth').direction, [-1, -0.12, 0]);
});

test('in the layout each planet lies along its real longitude from the Sun', () => {
  const date = utc(2026, 10, 1);
  const bodies = placeBodies(todayData(date));
  for (const id of ['earth', 'jupiter', 'saturn', 'neptune']) {
    const p = bodyById(id, bodies).position;
    const placed = (Math.atan2(p[2], p[0]) * 180) / Math.PI;
    assert.ok(apart(placed, lon(id, date)) < 1e-6, id);
  }
  // Seen from Earth the Moon lies along its own longitude.
  const moon = sub(bodyById('moon', bodies).position, bodyById('earth', bodies).position);
  assert.ok(apart((Math.atan2(moon[2], moon[0]) * 180) / Math.PI, moonLongitudeDeg(date)) < 1e-6);
});

test('nothing overlaps on a spread of dates', () => {
  for (const date of [utc(2026, 10, 1), utc(2027, 3, 15), utc(2030, 7, 4), utc(2040, 12, 25)]) {
    const bodies = placeBodies(todayData(date));
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const gap = Math.hypot(...sub(bodies[i].position, bodies[j].position)) - bodies[i].radiusKm - bodies[j].radiusKm;
        assert.ok(gap > 0, `${bodies[i].id} and ${bodies[j].id} on ${date.toISOString()}`);
      }
    }
  }
});

test("Halley is far out and asleep in today's sky: its next perihelion is 28 July 2061", () => {
  const date = utc(2026, 10, 1);
  const halley = todayData(date).find((d) => d.id === 'halley');
  assert.equal(halley.ellipse.perihelionAtS, (HALLEY_NEXT_PERIHELION - date) / 1000);
  const placed = bodyById('halley', placeBodies(todayData(date)));
  assert.ok(placed.sunKm / 149597870.7 > 30);
  // The tour layout is unchanged.
  assert.equal(BODY_DATA.find((d) => d.id === 'halley').ellipse.perihelionAtS, 60 * DAY);
});

test('the start is 9,129 km above Earth with the Sun at a right angle, to the right', () => {
  for (const bodies of [BODIES, placeBodies(todayData(utc(2026, 10, 1))), placeBodies(todayData(utc(2031, 2, 2)))]) {
    const earth = bodyById('earth', bodies);
    const start = startAbove(bodies);
    assert.ok(Math.abs(surfaceDistance(start.position, earth) - START_ALTITUDE_KM) < 1e-6);
    const toSun = unit(sub(bodyById('sun', bodies).position, earth.position));
    const toEarth = unit(sub(earth.position, start.position));
    assert.ok(Math.abs(dot(toEarth, toSun)) < 0.13, 'right angle (the orbit is tilted a little)');
    // Looking at Earth, the Sun is on the right-hand side.
    const q = lookAtDirection(toEarth);
    assert.ok(dot(forward(q), toEarth) > 0.999);
    assert.ok(dot(right(q), toSun) > 0.9);
    assert.deepEqual(start.forward.map((n) => +n.toFixed(9)), toEarth.map((n) => +n.toFixed(9)));
  }
});

test('for the tour layout the computed start is the one the game has always used', () => {
  const start = startAbove(BODIES);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(start.position[i] - START_POSITION[i]) < 1500, `axis ${i}`);
});
