import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, bodiesAt } from '../src/core/bodies.js';
import { CURIOS, curiosAt, hiddenCurios, nearSlab, CURIO_TELL_KM } from '../src/core/curios.js';
import { CRAFT } from '../src/core/craft.js';
import { glowsNear } from '../src/core/glows.js';

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
  assert.deepEqual(hiddenCurios(earth.position, bodies), ['monolith', 'unknown']);
  const [slab] = curiosAt(bodies, jupiter.position);
  const beside = slab.position.map((n, i) => n + (i === 0 ? CURIO_TELL_KM / 2 : 0));
  assert.deepEqual(hiddenCurios(beside, bodies), []);
  assert.ok(nearSlab(bodies, beside));
  assert.ok(glowsNear(bodies, beside).includes('curio:monolith'));
  assert.ok(!glowsNear(BODIES, earth.position).includes('curio:monolith'));
});
