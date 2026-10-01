import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, BODY_DATA, AU_KM, bodiesAt, bodyById, nearestLocalBody } from '../src/core/bodies.js';
import { carryAlong, createState } from '../src/core/game.js';
import { inBelt } from '../src/core/belt.js';

const DAY = 86400;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dist = (a, b) => Math.hypot(...sub(a, b));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const at = (t, id) => bodyById(id, bodiesAt(t));

test('four new bodies with real radii and kinds: 33 in all', () => {
  assert.equal(BODIES.length, 33);
  assert.deepEqual(BODIES.slice(-4).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
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
