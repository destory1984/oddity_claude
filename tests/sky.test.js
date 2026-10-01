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

test('seven well-known constellations, each a set of stars joined by lines', () => {
  assert.deepEqual(CONSTELLATIONS.map((c) => c.id), ['orion', 'ursaMajor', 'cassiopeia', 'crux', 'scorpius', 'cygnus', 'leo']);
  for (const c of CONSTELLATIONS) {
    assert.ok(c.name && c.stars.length >= 4, c.id);
    for (const [a, b] of c.lines) {
      assert.ok(c.stars[a] && c.stars[b] && a !== b, `${c.id} line ${a}-${b}`);
      const d = angle(fromEquatorial(c.stars[a].raH, c.stars[a].decDeg), fromEquatorial(c.stars[b].raH, c.stars[b].decDeg));
      assert.ok(d > 0.5 && d < 30, `${c.id} line ${a}-${b} spans ${d} degrees`);
    }
    // Every star is used by some line.
    const used = new Set(c.lines.flat());
    assert.equal(used.size, c.stars.length, c.id);
  }
});

test('Orion\'s belt is three stars in a row about 3 degrees long', () => {
  const orion = CONSTELLATIONS.find((c) => c.id === 'orion');
  const at = (name) => { const s = orion.stars.find((x) => x.name === name); return fromEquatorial(s.raH, s.decDeg); };
  const whole = angle(at('Mintaka'), at('Alnitak'));
  assert.ok(whole > 2.4 && whole < 3.1, `${whole}`);
  assert.ok(Math.abs(angle(at('Mintaka'), at('Alnilam')) + angle(at('Alnilam'), at('Alnitak')) - whole) < 0.05);
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
  const orion = CONSTELLATIONS.find((c) => c.id === 'orion');
  const label = labels.find((l) => l.id === 'orion');
  for (const s of orion.stars) assert.ok(angle(label.direction, fromEquatorial(s.raH, s.decDeg)) < 15);
});
