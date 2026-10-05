import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  EXO_STAR, EXO_PLANETS, EXO_IDS, EXO_CENTRE, EXO_NORMAL, EXO_ARRIVAL_KM, EXO_SEEN_KM,
  exoBodiesAt, exoOrbitKm, inExo, exoArrival, createExoRecord, sanitizeExo, recordExo, exoNote, exoJournal,
} from '../src/core/exo.js';
import { BODIES } from '../src/core/bodies.js';
import { forward } from '../src/core/orientation.js';

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);

test('TRAPPIST-1 has seven planets, b to h, each farther out and slower than the last', () => {
  assert.deepEqual(EXO_PLANETS.map((p) => p.id), ['b', 'c', 'd', 'e', 'f', 'g', 'h'].map((l) => `trappist1${l}`));
  for (let i = 1; i < 7; i++) {
    assert.ok(EXO_PLANETS[i].orbitKm > EXO_PLANETS[i - 1].orbitKm);
    assert.ok(EXO_PLANETS[i].periodS > EXO_PLANETS[i - 1].periodS);
    assert.ok(EXO_PLANETS[i].light < EXO_PLANETS[i - 1].light);
  }
  assert.equal(EXO_IDS.length, 8);
});

test('the planets are about the size of Earth and the star a little larger than Jupiter', () => {
  for (const p of EXO_PLANETS) assert.ok(p.radiusKm > 4700 && p.radiusKm < 7300, p.id);
  const jupiter = BODIES.find((b) => b.id === 'jupiter');
  assert.ok(EXO_STAR.radiusKm > jupiter.radiusKm && EXO_STAR.radiusKm < jupiter.radiusKm * 1.3);
});

test('no id or name is shared with the Solar System', () => {
  const ids = new Set(BODIES.map((b) => b.id));
  for (const b of exoBodiesAt(0)) assert.ok(!ids.has(b.id), b.id);
});

test('the system is some 40 light-years away, squeezed a hundredfold like every distance from the Sun', () => {
  const km = Math.hypot(...EXO_CENTRE);
  assert.ok(Math.abs(km - 3.847e12) < 0.01e12, String(km));
});

test('each planet keeps its distance from the star and comes round in its period', () => {
  for (const timeS of [0, 12345, 9e6]) {
    const [star, ...planets] = exoBodiesAt(timeS);
    planets.forEach((b, i) => assert.ok(Math.abs(gap(b.position, star.position) - exoOrbitKm(EXO_PLANETS[i])) < 1, b.id));
  }
  const p = EXO_PLANETS[0];
  const at = (t) => exoBodiesAt(t)[1].position;
  assert.ok(gap(at(0), at(p.periodS)) < 1);
  assert.ok(gap(at(0), at(p.periodS / 2)) > exoOrbitKm(p) * 1.99);
});

test('neighbouring orbits stand well clear of each other, and of the star', () => {
  assert.ok(exoOrbitKm(EXO_PLANETS[0]) - EXO_STAR.radiusKm - EXO_PLANETS[0].radiusKm > 100000);
  for (let i = 1; i < 7; i++) {
    const clear = exoOrbitKm(EXO_PLANETS[i]) - exoOrbitKm(EXO_PLANETS[i - 1]) - EXO_PLANETS[i].radiusKm - EXO_PLANETS[i - 1].radiusKm;
    assert.ok(clear > 40000, `${EXO_PLANETS[i].id}: ${clear}`);
  }
});

test('the planets go round in a plane that holds the line home, so from the Sun they cross their star', () => {
  const home = EXO_CENTRE.map((n) => -n / Math.hypot(...EXO_CENTRE));
  assert.ok(Math.abs(dot(EXO_NORMAL, home)) < 1e-9);
  const [star, ...planets] = exoBodiesAt(4321);
  for (const b of planets) assert.ok(Math.abs(dot(b.position.map((n, i) => n - star.position[i]), EXO_NORMAL)) < 1, b.id);
});

test('the bodies are marked as outside the Solar System and the planets name their star', () => {
  const [star, ...planets] = exoBodiesAt(0);
  assert.equal(star.kind, 'exostar');
  assert.ok(star.exo);
  for (const b of planets) {
    assert.equal(b.kind, 'exoplanet');
    assert.equal(b.star, 'trappist1');
    assert.ok(b.exo);
  }
});

test('the jump arrives outside the last orbit, above the plane, with the star just off the middle of the view', () => {
  const { position, orientation } = exoArrival();
  const out = position.map((n, i) => n - EXO_CENTRE[i]);
  assert.ok(Math.abs(Math.hypot(...out) - EXO_ARRIVAL_KM) < 1);
  assert.ok(EXO_ARRIVAL_KM > exoOrbitKm(EXO_PLANETS[6]));
  assert.ok(dot(out, EXO_NORMAL) / EXO_ARRIVAL_KM > 0.5);
  // (Tipped 0.15 rad so the star is over her head, not behind it.)
  assert.ok(Math.abs(dot(forward(orientation), out.map((n) => -n / EXO_ARRIVAL_KM)) - Math.cos(0.15)) < 1e-6);
  assert.ok(inExo(position));
});

test('home is not there', () => {
  assert.ok(!inExo([0, 0, 0]));
  assert.ok(!inExo(BODIES.find((b) => b.id === 'pluto').position));
});

test('a planet is marked as seen from within 50,000 km of its ground, once', () => {
  const bodies = exoBodiesAt(0);
  const e = bodies.find((b) => b.id === 'trappist1e');
  const near = e.position.map((n, i) => n + (i === 1 ? e.radiusKm + EXO_SEEN_KM - 1 : 0));
  const far = e.position.map((n, i) => n + (i === 1 ? e.radiusKm + EXO_SEEN_KM + 1 : 0));
  assert.deepEqual(recordExo(createExoRecord(), far, bodies).newly, []);
  const first = recordExo(createExoRecord(), near, bodies);
  assert.deepEqual(first.newly, ['trappist1e']);
  assert.ok(first.record.been);
  assert.deepEqual(recordExo(first.record, near, bodies).newly, []);
});

test('a kept record holds only the seven planets, each once', () => {
  assert.deepEqual(sanitizeExo(null), { been: false, seen: [] });
  assert.deepEqual(sanitizeExo({ been: true, seen: ['trappist1b', 'earth', 'trappist1b', 7] }), { been: true, seen: ['trappist1b'] });
  assert.deepEqual(sanitizeExo({ seen: 'x' }), { been: false, seen: [] });
});

test('the notebook lists the other star once she has been there, then the planets seen, in their order', () => {
  assert.deepEqual(exoJournal(createExoRecord()), []);
  assert.deepEqual(exoJournal({ been: true, seen: [] }).map((r) => r.id), ['trappist1']);
  const rows = exoJournal({ been: true, seen: ['trappist1h', 'trappist1b'] });
  assert.deepEqual(rows.map((r) => r.id), ['trappist1', 'trappist1b', 'trappist1h']);
  assert.deepEqual(rows.map((r) => r.star), [true, false, false]);
  for (const row of rows) assert.equal(row.note, exoNote(row.id));
});

test('the star and every planet have a word about them, in plain polite sentences', () => {
  for (const id of EXO_IDS) {
    const note = exoNote(id);
    assert.ok(note.length >= 30 && note.length <= 110, `${id}: ${note.length}`);
    assert.match(note, /니다\.$/, id);
  }
  assert.equal(exoNote('earth'), null);
});
