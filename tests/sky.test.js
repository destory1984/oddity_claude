import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fromEquatorial, GALAXIES, NEBULAE, CONSTELLATIONS, BRIGHT_STARS, skyLabels, lookedAt } from '../src/core/sky.js';

const deg = (r) => (r * 180) / Math.PI;
const angle = (a, b) => deg(Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))));
const len = (v) => Math.hypot(...v);

test('sky coordinates turn into the game axes: y is north of the planets\' plane', () => {
  // Andromeda: ecliptic longitude 27.85, latitude +33.35 degrees.
  const m31 = fromEquatorial(0.712, 41.27);
  assert.ok(Math.abs(len(m31) - 1) < 1e-9);
  assert.ok(Math.abs(deg(Math.asin(m31[1])) - 33.35) < 0.1);
  assert.ok(Math.abs(deg(Math.atan2(m31[2], m31[0])) - 27.85) < 0.1);
  // The north celestial pole is tilted 23.44 degrees from the game's north.
  assert.ok(Math.abs(angle(fromEquatorial(0, 90), [0, 1, 0]) - 23.44) < 0.01);
});

test('four nearby galaxies', () => {
  assert.deepEqual(GALAXIES.map((g) => g.id), ['m31', 'm33', 'lmc', 'smc']);
  // The two Magellanic Clouds are neighbours in the far southern sky.
  const lmc = GALAXIES.find((g) => g.id === 'lmc');
  const smc = GALAXIES.find((g) => g.id === 'smc');
  const d = angle(fromEquatorial(lmc.raH, lmc.decDeg), fromEquatorial(smc.raH, smc.decDeg));
  assert.ok(d > 15 && d < 25, `${d}`);
});

test('twenty well-known constellations, each a named set of lines', () => {
  assert.deepEqual(CONSTELLATIONS.map((c) => c.id), [
    'ori', 'uma', 'umi', 'cas', 'cru', 'sco', 'cyg', 'leo', 'tau', 'gem',
    'cma', 'lyr', 'aql', 'sgr', 'and', 'peg', 'per', 'vir', 'cen', 'boo',
  ]);
  for (const c of CONSTELLATIONS) {
    assert.ok(c.name.endsWith('자리') && c.nameEn && c.lines.length >= 1, c.id);
    for (const line of c.lines) {
      assert.ok(line.length >= 2, c.id);
      for (const [raH, decDeg] of line) assert.ok(raH >= 0 && raH < 24 && decDeg >= -90 && decDeg <= 90, c.id);
    }
  }
});

test('Orion passes through Betelgeuse, Rigel and the three belt stars', () => {
  const orion = CONSTELLATIONS.find((c) => c.id === 'ori');
  const points = orion.lines.flat().map(([raH, decDeg]) => fromEquatorial(raH, decDeg));
  const has = (raH, decDeg) => points.some((p) => angle(p, fromEquatorial(raH, decDeg)) < 0.3);
  assert.ok(has(5.919, 7.41), 'Betelgeuse');
  assert.ok(has(5.242, -8.2), 'Rigel');
  for (const [raH, decDeg] of [[5.533, -0.3], [5.604, -1.2], [5.679, -1.94]]) assert.ok(has(raH, decDeg), 'belt');
});

test('Polaris marks the north celestial pole; Sirius is the brightest star listed', () => {
  const polaris = BRIGHT_STARS.find((s) => s.name === 'Polaris');
  assert.ok(angle(fromEquatorial(polaris.raH, polaris.decDeg), fromEquatorial(0, 90)) < 1);
  assert.equal([...BRIGHT_STARS].sort((a, b) => a.mag - b.mag)[0].name, 'Sirius');
});

test('one label per constellation and galaxy, each a unit direction inside its figure', () => {
  const labels = skyLabels();
  assert.equal(labels.length, CONSTELLATIONS.length + GALAXIES.length + NEBULAE.length);
  assert.deepEqual(NEBULAE.map((n) => n.id), ['m42', 'carina', 'm8', 'm45', 'omegaCen', 'hyades', 'm44', 'doubleCluster', 'tuc47', 'm7', 'coalsack']);
  // Every name has a line to tell, short enough for one row on a phone.
  for (const l of labels) assert.ok(l.note && l.note.length <= 30, l.id);
  // The Orion Nebula sits in Orion's sword, just south of the celestial equator.
  const m42 = fromEquatorial(5.588, -5.39);
  const belt = fromEquatorial(5.6, -1.2);
  assert.ok(m42.reduce((sum, n, i) => sum + n * belt[i], 0) > Math.cos(5 * Math.PI / 180));
  for (const l of labels) assert.ok(l.id && l.name && Math.abs(len(l.direction) - 1) < 1e-9, l.id);
  const orion = CONSTELLATIONS.find((c) => c.id === 'ori');
  const label = labels.find((l) => l.id === 'ori');
  for (const [raH, decDeg] of orion.lines.flat()) assert.ok(angle(label.direction, fromEquatorial(raH, decDeg)) < 25);
});

test('the sky name being looked at is the nearest to the middle of the view, within reach', () => {
  const spots = [{ id: 'ori', x: 40, y: -30 }, { id: 'tau', x: -90, y: 10 }, { id: 'm42', x: 20, y: 15 }];
  assert.equal(lookedAt(spots, 120), 'm42');
  assert.equal(lookedAt(spots, 20), null);
  assert.equal(lookedAt([], 120), null);
});

test('the Hyades lie behind the eye of the Bull, the Coalsack beside the Cross, 47 Tucanae beside the Small Magellanic Cloud', () => {
  const at = (id) => { const n = [...NEBULAE, ...GALAXIES].find((x) => x.id === id); return fromEquatorial(n.raH, n.decDeg); };
  // Aldebaran, the Bull's eye, stands in front of the Hyades.
  const eye = BRIGHT_STARS.find((x) => x.name === 'Aldebaran');
  const tau = fromEquatorial(eye.raH, eye.decDeg);
  const cru = skyLabels().find((l) => l.id === 'cru').direction;
  assert.ok(angle(at('hyades'), tau) < 3);
  assert.ok(angle(at('coalsack'), cru) < 8);
  assert.ok(angle(at('tuc47'), at('smc')) < 4);
});
