import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, BODY_DATA, AU_KM, bodiesAt, bodyById, nearestLocalBody, placeBodies } from '../src/core/bodies.js';
import { todayData } from '../src/core/ephemeris.js';
import { bodyFacts } from '../src/core/readings.js';
import { carryAlong, createState } from '../src/core/game.js';
import { inBelt } from '../src/core/belt.js';

const DAY = 86400;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dist = (a, b) => Math.hypot(...sub(a, b));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const at = (t, id) => bodyById(id, bodiesAt(t));

test('four new bodies with real radii and kinds, two more comets, six small bodies, two visitors from between the stars and eleven more: 54 in all', () => {
  assert.equal(BODIES.length, 54);
  assert.deepEqual(BODIES.slice(-11).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['eris', 'dwarf', 1163, 'sun'],
    ['haumea', 'dwarf', 1161, 'sun'],
    ['makemake', 'dwarf', 715, 'sun'],
    ['sedna', 'tno', 500, 'sun'],
    ['arrokoth', 'tno', 18, 'sun'],
    ['hyperion', 'moon', 180, 'saturn'],
    ['phoebe', 'moon', 106.5, 'saturn'],
    ['proteus', 'moon', 210, 'neptune'],
    ['eurybates', 'asteroid', 31.9, 'sun'],
    ['patroclus', 'asteroid', 56.5, 'sun'],
    ['menoetius', 'moon', 52, 'patroclus'],
  ]);
  assert.deepEqual(BODIES.slice(-13, -11).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['oumuamua', 'interstellar', 0.08, 'sun'],
    ['atlas3i', 'comet', 1, 'sun'],
  ]);
  assert.deepEqual(BODIES.slice(-19, -13).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['vesta', 'asteroid', 262.7, 'sun'],
    ['bennu', 'asteroid', 0.245, 'sun'],
    ['ryugu', 'asteroid', 0.448, 'sun'],
    ['didymos', 'asteroid', 0.39, 'sun'],
    ['dimorphos', 'moon', 0.075, 'didymos'],
    ['apophis', 'asteroid', 0.17, 'sun'],
  ]);
  assert.deepEqual(BODIES.slice(-21, -19).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['haleBopp', 'comet', 30, 'sun'],
    ['churyumov', 'comet', 2, 'sun'],
  ]);
  assert.deepEqual(BODIES.slice(-25, -21).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['ceres', 'dwarf', 469.7, 'sun'],
    ['pluto', 'dwarf', 1188.3, 'sun'],
    ['charon', 'moon', 606, 'pluto'],
    ['halley', 'comet', 5.5, 'sun'],
  ]);
});

test('Ceres sits between Mars and Jupiter, Pluto beyond Neptune', () => {
  const out = (id) => Math.hypot(...bodyById(id).position);
  assert.ok(out('mars') < out('ceres') && out('ceres') < out('jupiter'));
  assert.ok(out('pluto') > out('neptune'));
});

test('Charon is squeezed 1/10 toward Pluto: 3,574 km centre to centre', () => {
  near(dist(bodyById('charon').position, bodyById('pluto').position), 1188.3 + 606 + (19591 - 1794.3) / 10, 0.01);
});

test('Halley starts about 1.32 AU out and reaches 0.586 AU sixty days later', () => {
  near(at(0, 'halley').sunKm / AU_KM, 1.324, 0.01);
  const peri = at(60 * DAY, 'halley');
  near(peri.sunKm / AU_KM, 0.586, 0.001);
  // Squeezed like every distance from the Sun: the radii plus 1/100 of the gap.
  const radii = 696340 + 5.5;
  near(Math.hypot(...peri.position), radii + (peri.sunKm - radii) / 100, 1);
});

test('Halley goes round the other way from the planets', () => {
  // The y part of position x velocity: its sign is the direction of travel seen from north.
  const swirl = (id) => {
    const a = at(59 * DAY, id).position;
    const b = at(61 * DAY, id).position;
    return a[2] * (b[0] - a[0]) - a[0] * (b[2] - a[2]);
  };
  assert.ok(swirl('halley') * swirl('earth') < 0);
});

test('nothing overlaps at the start, at perihelion, or months later', () => {
  for (const t of [0, 30 * DAY, 60 * DAY, 61 * DAY, 90 * DAY, 200 * DAY, 3000 * DAY]) {
    const bodies = bodiesAt(t);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const gap = dist(bodies[i].position, bodies[j].position) - bodies[i].radiusKm - bodies[j].radiusKm;
        assert.ok(gap > 0, `${bodies[i].id} and ${bodies[j].id} overlap at day ${t / DAY}`);
      }
    }
  }
});

test('a traveler standing on Halley is carried along with it', () => {
  const before = bodiesAt(50 * DAY);
  const after = bodiesAt(50 * DAY + 720 / 60);
  const comet = bodyById('halley', before);
  const state = createState([comet.position[0], comet.position[1] + comet.radiusKm, comet.position[2]]);
  const moved = carryAlong(state, before, after);
  near(dist(moved.position, bodyById('halley', after).position), comet.radiusKm, 1e-6);
});

test('the altitude label names dwarf planets and the comet', () => {
  const pluto = bodyById('pluto');
  assert.equal(nearestLocalBody([pluto.position[0], pluto.position[1] + 5000, pluto.position[2]]).label, '명왕성 상공');
  const halley = bodyById('halley');
  assert.equal(nearestLocalBody([halley.position[0], halley.position[1] + 100, halley.position[2]]).label, '핼리 혜성 상공');
});

test('only bodies on an ellipse carry their real distance from the Sun', () => {
  assert.equal(bodyById('earth').sunKm, undefined);
  assert.ok(BODY_DATA.find((d) => d.id === 'halley').ellipse);
});

test('Charon circles Pluto backwards, the way Pluto spins, so each keeps one face to the other', () => {
  const swirl = (id, parentId, t) => {
    const from = (time) => sub(at(time, id).position, at(time, parentId).position);
    const a = from(t);
    const b = from(t + 3600);
    return a[2] * (b[0] - a[0]) - a[0] * (b[2] - a[2]);
  };
  assert.ok(swirl('charon', 'pluto', 0) * swirl('moon', 'earth', 0) < 0);
});

test('Ceres lives inside the asteroid belt, all the way round its orbit', () => {
  for (const t of [0, 400 * DAY, 800 * DAY, 1200 * DAY]) {
    assert.equal(inBelt(at(t, 'ceres').position, at(t, 'sun').position), true, `day ${t / DAY}`);
  }
});

test('the visitors from between the stars pass the Sun on open paths, again every three game years', () => {
  near(at(-200 * DAY, 'atlas3i').sunKm / AU_KM, 1.357, 0.001);
  near(at(300 * DAY, 'oumuamua').sunKm / AU_KM, 0.2559, 0.001);
  // 500 days after perihelion 'Oumuamua is far out, still going.
  assert.ok(at(800 * DAY, 'oumuamua').sunKm / AU_KM > 5);
  assert.ok(at(800 * DAY, 'oumuamua').sunKm > at(700 * DAY, 'oumuamua').sunKm);
  // One pass later it is there again.
  near(at(300 * DAY + 3 * 365.25 * DAY, 'oumuamua').sunKm, at(300 * DAY, 'oumuamua').sunKm, 1);
});

// The Trojans, 60 degrees either side of Jupiter round the Sun (seen from north).
const lonFromSun = (bodies, id) => {
  const sun = bodyById('sun', bodies).position;
  const p = bodyById(id, bodies).position;
  return Math.atan2(p[2] - sun[2], p[0] - sun[0]) * 180 / Math.PI;
};
const turn = (deg) => ((deg % 360) + 540) % 360 - 180;

test('Eurybates goes round 60 degrees ahead of Jupiter and Patroclus 60 behind, in both layouts', () => {
  const jupiterYear = BODY_DATA.find((d) => d.id === 'jupiter').periodS;
  for (const t of [0, 100 * DAY, jupiterYear / 3, 5000 * DAY]) {
    const bodies = bodiesAt(t);
    near(turn(lonFromSun(bodies, 'eurybates') - lonFromSun(bodies, 'jupiter')), 60, 0.01);
    near(turn(lonFromSun(bodies, 'patroclus') - lonFromSun(bodies, 'jupiter')), -60, 0.01);
    // Ahead: where Jupiter will be a sixth of its year later.
    near(turn(lonFromSun(bodiesAt(t + jupiterYear / 6), 'jupiter') - lonFromSun(bodies, 'eurybates')), 0, 0.01);
  }
  for (const date of [Date.UTC(2026, 9, 19), Date.UTC(2031, 1, 2)]) {
    const bodies = placeBodies(todayData(new Date(date)), 3e7);
    near(turn(lonFromSun(bodies, 'eurybates') - lonFromSun(bodies, 'jupiter')), 60, 0.01);
    near(turn(lonFromSun(bodies, 'patroclus') - lonFromSun(bodies, 'jupiter')), -60, 0.01);
  }
});

test('Menoetius goes round Patroclus 680 km out, squeezed as a moon: 165.7 km centre to centre', () => {
  near(dist(at(0, 'menoetius').position, at(0, 'patroclus').position), 108.5 + (680 - 108.5) / 10, 0.01);
});

test('Phoebe goes round Saturn backwards, Hyperion the way Titan does', () => {
  const swirl = (id) => {
    const s = (t) => sub(at(t, id).position, at(t, 'saturn').position);
    const a = s(0);
    const b = s(DAY);
    return a[2] * (b[0] - a[0]) - a[0] * (b[2] - a[2]);
  };
  assert.ok(swirl('phoebe') * swirl('titan') < 0);
  assert.ok(swirl('hyperion') * swirl('titan') > 0);
});

test('the far ones start about where they really are: Eris near its farthest, Sedna coming in', () => {
  near(at(0, 'eris').sunKm / AU_KM, 95.2, 1);
  near(at(0, 'sedna').sunKm / AU_KM, 82.7, 1);
  near(at(0, 'haumea').sunKm / AU_KM, 49.9, 1);
  near(at(0, 'makemake').sunKm / AU_KM, 52.7, 1);
  // Sedna's long year: nearest the Sun in 2076, 76 AU.
  near(at(Date.UTC(2076, 0, 1) / 1000 - Date.UTC(2026, 9, 1) / 1000, 'sedna').sunKm / AU_KM, 76.2, 0.3);
  // Today's sky counts from today: the same place on the same day.
  const day = Date.UTC(2027, 4, 1);
  const today = placeBodies(todayData(new Date(day)), 0);
  near(bodyById('eris', today).sunKm, at((day - Date.UTC(2026, 9, 1)) / 1000, 'eris').sunKm, 1);
});

test('Haumea is an egg and Arrokoth a snowman: their sizes are three lengths', () => {
  assert.deepEqual(bodyFacts(BODY_DATA.find((d) => d.id === 'haumea'), '태양')[0], ['크기', '2,322 × 1,704 × 1,026km']);
  assert.deepEqual(bodyFacts(BODY_DATA.find((d) => d.id === 'arrokoth'), '태양')[0], ['크기', '36 × 20 × 10km']);
  assert.deepEqual(bodyFacts(BODY_DATA.find((d) => d.id === 'eris'), '태양')[0], ['지름', '2,326km']);
});
