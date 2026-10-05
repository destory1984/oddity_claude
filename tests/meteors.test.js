import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  METEOR_RANGE_KM, METEOR_ALTITUDE_KM, METEOR_GAP_S, METEOR_LIFE_S, METEOR_LENGTH_KM, meteorSpot, meteorGap, meteorGlow,
} from '../src/core/meteors.js';
import { eventMessage } from '../src/ui/messages.js';
import { bodiesAt, bodyById, AU_KM } from '../src/core/bodies.js';

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
function seeded(seed) {
  let x = seed;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

test('shooting stars light only on the dark side of Earth that the traveler can see', () => {
  const toSun = [1, 0, 0];
  const toTraveler = [0, 0, 1];
  const rand = seeded(7);
  let found = 0;
  for (let i = 0; i < 400; i++) {
    const spot = meteorSpot(rand, toSun, toTraveler);
    if (!spot) continue;
    found += 1;
    near(Math.hypot(...spot.up), 1, 1e-9);
    assert.ok(dot(spot.up, toSun) <= -0.05, 'in the dark');
    assert.ok(dot(spot.up, toTraveler) >= 0.15, 'facing the traveler');
    // It runs level, along the top of the air.
    near(dot(spot.along, spot.up), 0, 1e-9);
    near(Math.hypot(...spot.along), 1, 1e-9);
    assert.ok(spot.lengthKm >= METEOR_LENGTH_KM[0] && spot.lengthKm <= METEOR_LENGTH_KM[1]);
  }
  assert.ok(found > 390, `${found}`);
});

test('none where the traveler sees only the day side', () => {
  // The Sun right behind the traveler: every part of Earth in view is lit.
  const rand = seeded(3);
  for (let i = 0; i < 50; i++) assert.equal(meteorSpot(rand, [0, 0, 1], [0, 0, 1]), null);
});

test('one every 0.4 to 1.2 seconds, each burning for 0.7: a quick flare, then fading', () => {
  assert.deepEqual(METEOR_GAP_S, [0.4, 1.2]);
  assert.equal(METEOR_LIFE_S, 0.7);
  assert.equal(METEOR_RANGE_KM, 30000);
  assert.equal(METEOR_ALTITUDE_KM, 90);
  assert.equal(meteorGap(() => 0), 0.4);
  near(meteorGap(() => 0.5), 0.8);
  assert.equal(meteorGlow(-0.1), 0);
  assert.equal(meteorGlow(0), 0);
  near(meteorGlow(0.14), 1);
  assert.ok(meteorGlow(0.4) < 1 && meteorGlow(0.4) > meteorGlow(0.6));
  assert.equal(meteorGlow(0.7), 0);
  assert.equal(
    eventMessage({ type: 'meteor' }),
    '지구의 밤 쪽에 별똥별이 떨어집니다. 혜성이 흘린 부스러기가 대기에서 타는 빛입니다.',
  );
});

test('Hale-Bopp starts just past its closest point and climbs steeply out of the plane of the planets', () => {
  const at = (days) => bodyById('haleBopp', bodiesAt(days * 86400));
  near(at(-20).sunKm / AU_KM, 0.914, 0.01);
  assert.ok(at(0).sunKm / AU_KM > 0.914 && at(0).sunKm / AU_KM < 1.2, `${at(0).sunKm / AU_KM}`);
  assert.ok(at(200).sunKm > at(0).sunKm * 2);
  // Its path stands almost upright: 200 days on it is far above or below the Sun.
  const sun = bodyById('sun');
  const later = at(200);
  const out = later.position.map((n, i) => n - sun.position[i]);
  assert.ok(Math.abs(out[1]) / Math.hypot(...out) > 0.7, `${out}`);
});

test('67P goes from 1.24 AU out to 5.68 AU and back in 6.44 years', () => {
  const at = (days) => bodyById('churyumov', bodiesAt(days * 86400)).sunKm / AU_KM;
  near(at(40), 1.243, 0.005);
  near(at(40 + 2352 / 2), 5.683, 0.01);
  near(at(40 + 2352), 1.243, 0.005);
  assert.ok(at(0) > 1.243 && at(0) < 1.4);
});

test('both new comets go round the same way as the planets; Halley goes backwards', () => {
  // Seen from the north, forwards turns +x toward +z.
  const swirl = (id) => {
    const a = bodyById(id, bodiesAt(0)).position;
    const b = bodyById(id, bodiesAt(86400)).position;
    return -a[2] * (b[0] - a[0]) + a[0] * (b[2] - a[2]);
  };
  assert.ok(swirl('earth') > 0);
  assert.ok(swirl('churyumov') > 0);
  assert.ok(swirl('haleBopp') > 0);
  assert.ok(swirl('halley') < 0);
});

test('a shower comes every 200 seconds near Earth, lasts 30, and its meteors run away from one point', async () => {
  const { inShower, showerGap, showerRadiant, showerSpot, SHOWER_EVERY_S, SHOWER_S } = await import('../src/core/meteors.js');
  assert.ok(!inShower(0) && !inShower(SHOWER_EVERY_S - SHOWER_S - 1));
  assert.ok(inShower(SHOWER_EVERY_S - SHOWER_S) && inShower(SHOWER_EVERY_S - 0.1) && !inShower(SHOWER_EVERY_S));
  assert.ok(showerGap(() => 0.5) < 0.25);
  let seed = 7;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const toSun = [1, 0, 0];
  const radiant = showerRadiant(rand, toSun);
  // Over the night side.
  assert.ok(radiant[0] < -0.8 && Math.abs(Math.hypot(...radiant) - 1) < 1e-9);
  let found = 0;
  for (let i = 0; i < 200; i++) {
    const spot = showerSpot(rand, toSun, [-1, 0, 0], radiant);
    if (!spot) continue;
    found += 1;
    const dot = (a, b) => a.reduce((sum, n, k) => sum + n * b[k], 0);
    // Level, and heading away from the radiant.
    assert.ok(Math.abs(dot(spot.along, spot.up)) < 1e-9);
    assert.ok(dot(spot.along, radiant) < 0);
  }
  assert.ok(found > 50);
});
