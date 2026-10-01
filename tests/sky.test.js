import { test } from 'vitest';
import assert from 'node:assert/strict';
import { fromEquatorial, GALAXIES, CONSTELLATIONS, BRIGHT_STARS, skyLabels } from '../src/core/sky.js';

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

test('all 88 official constellations, each a named set of lines', () => {
  assert.equal(CONSTELLATIONS.length, 88);
  assert.equal(new Set(CONSTELLATIONS.map((c) => c.id)).size, 88);
  for (const c of CONSTELLATIONS) {
    assert.ok(c.name.endsWith('자리') && c.nameEn && c.lines.length >= 1, c.id);
    for (const line of c.lines) {
      assert.ok(line.length >= 2, c.id);
      for (const [raH, decDeg] of line) assert.ok(raH >= 0 && raH < 24 && decDeg >= -90 && decDeg <= 90, c.id);
    }
  }
  for (const id of ['ori', 'uma', 'cas', 'cru', 'sco', 'cyg', 'leo', 'ser', 'oct']) assert.ok(CONSTELLATIONS.find((c) => c.id === id), id);
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
  assert.equal(labels.length, CONSTELLATIONS.length + GALAXIES.length);
  for (const l of labels) assert.ok(l.id && l.name && Math.abs(len(l.direction) - 1) < 1e-9, l.id);
  const orion = CONSTELLATIONS.find((c) => c.id === 'ori');
  const label = labels.find((l) => l.id === 'ori');
  for (const [raH, decDeg] of orion.lines.flat()) assert.ok(angle(label.direction, fromEquatorial(raH, decDeg)) < 25);
});
