import { test } from 'vitest';
import assert from 'node:assert/strict';
import { planetshine, SHINE_MAX, SHINE_COLOR } from '../src/core/shine.js';

const earth = { id: 'earth', position: [0, 0, 0], radiusKm: 6371 };
const sun = { position: [1e8, 0, 0], radiusKm: 696340 };

test('earthshine falls on the Moon from Earth, strongest when the Moon is on the Sun side (new Moon, full Earth)', () => {
  const newMoon = planetshine({ position: [60000, 0, 0], radiusKm: 1737 }, earth, sun);
  assert.deepEqual(newMoon.direction, [-1, 0, 0]);
  assert.deepEqual(newMoon.color, SHINE_COLOR.earth);
  const half = planetshine({ position: [0, 0, 60000], radiusKm: 1737 }, earth, sun);
  const fullMoon = planetshine({ position: [-60000, 0, 0], radiusKm: 1737 }, earth, sun);
  assert.ok(newMoon.strength > half.strength && half.strength > fullMoon.strength);
  assert.equal(fullMoon.strength, 0);
  assert.ok(Math.abs(half.strength - newMoon.strength / 2) < 1e-9);
});

test('planetshine is never stronger than its ceiling, and weaker from farther off', () => {
  const close = planetshine({ position: [10000, 0, 0], radiusKm: 100 }, earth, sun);
  assert.equal(close.strength, SHINE_MAX);
  const far = planetshine({ position: [600000, 0, 0], radiusKm: 1737 }, earth, sun);
  assert.ok(far.strength > 0 && far.strength < 0.01);
});
