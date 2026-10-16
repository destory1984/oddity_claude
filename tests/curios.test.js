import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, bodiesAt } from '../src/core/bodies.js';
import { CURIOS, curiosAt, hiddenCurios, nearSlab, curiosNear, carryingCurio } from '../src/core/curios.js';
import { BELT } from '../src/core/belt.js';
import { createProgress, recordCurios } from '../src/core/progress.js';
import { CRAFT } from '../src/core/craft.js';
import { glowsNear } from '../src/core/glows.js';

// (The slab's: core/curios.js CURIOS tellKm.)
const CURIO_TELL_KM = 2500;

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

test('the slab floats in the open between Jupiter and Io, the ship on its Sun side', () => {
  const bodies = bodiesAt(0);
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  const io = bodies.find((b) => b.id === 'io');
  const sun = bodies.find((b) => b.kind === 'star');
  const [slab, ship] = curiosAt(bodies, jupiter.position.map((n, i) => n + (i === 1 ? 3 * jupiter.radiusKm : 0)));
  assert.ok(gap(slab.position, jupiter.position) > jupiter.radiusKm + 5000);
  assert.ok(gap(slab.position, io.position) > io.radiusKm + 5000);
  assert.ok(gap(ship.position, sun.position) < gap(slab.position, sun.position));
  // Not craft: nothing docks with them and the notebook does not count them.
  assert.ok(CURIOS.every((c) => c.kind === 'curio' && !CRAFT.some((k) => k.id === c.id)));
});

test('they are named only near Jupiter, and she speaks of the slab only beside it', () => {
  const bodies = bodiesAt(0);
  const jupiter = bodies.find((b) => b.id === 'jupiter');
  const earth = bodies.find((b) => b.id === 'earth');
  assert.ok(['monolith', 'unknown'].every((id) => hiddenCurios(earth.position, bodies).includes(id)));
  const [slab] = curiosAt(bodies, jupiter.position);
  const beside = slab.position.map((n, i) => n + (i === 0 ? CURIO_TELL_KM / 2 : 0));
  assert.ok(['monolith', 'unknown'].every((id) => !hiddenCurios(beside, bodies).includes(id)));
  assert.ok(nearSlab(bodies, beside));
  assert.ok(glowsNear(bodies, beside).includes('curio:monolith'));
  assert.ok(!glowsNear(BODIES, earth.position).includes('curio:monolith'));
});

test('the teapot goes round between Earth and Mars, the little star in the belt, the slab on the Moon stands in Tycho', () => {
  const bodies = bodiesAt(0);
  const at = (id) => bodies.find((b) => b.id === id);
  const sun = at('sun');
  const all = curiosAt(bodies, at('earth').position);
  const one = (id) => all.find((c) => c.id === id);
  const fromSun = (c) => gap(c.position, sun.position);
  assert.ok(fromSun(one('teapot')) > gap(at('earth').position, sun.position) && fromSun(one('teapot')) < gap(at('mars').position, sun.position));
  assert.ok(fromSun(one('rose')) > BELT.innerKm && fromSun(one('rose')) < BELT.outerKm);
  const moon = at('moon');
  const tycho = one('tycho');
  // On the ground, upright: its middle a few km over the Moon's surface, its up the ground's.
  const over = gap(tycho.position, moon.position) - moon.radiusKm;
  assert.ok(over > 0 && over < 20, String(over));
  const out = tycho.position.map((n, i) => (n - moon.position[i]) / gap(tycho.position, moon.position));
  assert.ok(out.reduce((s, n, i) => s + n * tycho.up[i], 0) > 0.999);
  // In Tycho's south: the Moon's southern half.
  assert.ok(tycho.up[1] < -0.6);
});

test('each is told of, logged and carried by itself; the ship goes by the slab', () => {
  const bodies = bodiesAt(0);
  const [slab] = curiosAt(bodies, bodies[0].position);
  const teapot = curiosAt(bodies, bodies[0].position).find((c) => c.id === 'teapot');
  const by = teapot.position.map((n, i) => n + (i === 2 ? 1000 : 0));
  assert.deepEqual(curiosNear(bodies, by), ['teapot']);
  assert.ok(glowsNear(bodies, by).includes('curio:teapot'));
  assert.equal(carryingCurio(bodies, by).id, 'teapot');
  assert.equal(carryingCurio(bodies, slab.position.map((n, i) => n + (i === 0 ? 100 : 0))).id, 'monolith');
  const log = recordCurios(createProgress(), ['monolith']);
  assert.deepEqual(log.curios, ['monolith', 'unknown']);
  assert.deepEqual(recordCurios(log, ['teapot']).curios, ['monolith', 'unknown', 'teapot']);
});
