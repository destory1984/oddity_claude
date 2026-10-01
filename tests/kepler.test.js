import { test } from 'vitest';
import assert from 'node:assert/strict';
import { eccentricAnomaly, ellipsePoint } from '../src/core/kepler.js';

const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const HALLEY = { semiMajorKm: 17.834 * 149597870.7, eccentricity: 0.96714, periodS: 27510 * 86400, perihelionAtS: 60 * 86400 };

test('a circle needs no solving', () => {
  for (const m of [-3, -1, 0, 0.5, 2.5]) near(eccentricAnomaly(m, 0), m, 1e-9);
});

test('the answer satisfies M = E - e sin E, even at e = 0.967', () => {
  for (const m of [-3.1, -1, -0.01, 0, 0.0003, 0.2, 3.1]) {
    const E = eccentricAnomaly(m, 0.96714);
    near(E - 0.96714 * Math.sin(E), m, 1e-9);
  }
});

test('any mean anomaly is wrapped into one turn', () => {
  near(eccentricAnomaly(0.4 + 4 * Math.PI, 0.5), eccentricAnomaly(0.4, 0.5), 1e-9);
});

test('perihelion, aphelion and one full period', () => {
  const { semiMajorKm: a, eccentricity: e, periodS, perihelionAtS } = HALLEY;
  const peri = ellipsePoint(HALLEY, perihelionAtS);
  near(peri.r, a * (1 - e), 1);
  near(peri.x, a * (1 - e), 1);
  near(peri.y, 0, 1);
  near(ellipsePoint(HALLEY, perihelionAtS + periodS / 2).r, a * (1 + e), 1);
  const again = ellipsePoint(HALLEY, perihelionAtS + periodS + 5e5);
  const once = ellipsePoint(HALLEY, perihelionAtS + 5e5);
  near(again.x, once.x, 1);
  near(again.y, once.y, 1);
});

test('after perihelion y is positive, before it negative, and r matches x and y', () => {
  const after = ellipsePoint(HALLEY, HALLEY.perihelionAtS + 86400 * 20);
  const before = ellipsePoint(HALLEY, 0);
  assert.ok(after.y > 0 && before.y < 0);
  near(Math.hypot(before.x, before.y), before.r, 1);
  // 60 days before perihelion Halley is about 1.32 AU from the Sun.
  near(before.r / 149597870.7, 1.324, 0.01);
});
