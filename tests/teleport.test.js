import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  VISTA_RADII, CRAFT_ARRIVAL_KM, SITE_ARRIVAL_KM, visited, farFrom, bodyVista, craftArrival, siteArrival, teleportSpot,
} from '../src/core/teleport.js';
import { bodiesAt, bodyById } from '../src/core/bodies.js';
import { craftAt } from '../src/core/craft.js';
import { storySitesAt } from '../src/core/stories.js';
import { createProgress, recordCraft, sanitizeProgress } from '../src/core/progress.js';
import { CRAFT } from '../src/core/craft.js';
import { MISSIONS } from '../src/core/missions.js';
import { BODIES } from '../src/core/bodies.js';

const bodies = bodiesAt(0);
const craft = craftAt(0, bodies);
const sites = storySitesAt(0, bodies);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const gap = (a, b) => Math.hypot(...sub(a, b));
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const far = [9e8, 3e8, -9e8];

test('only somewhere already visited can be jumped to', () => {
  const fresh = createProgress();
  assert.equal(visited(bodyById('earth', bodies), fresh), true);
  assert.equal(visited(bodyById('mars', bodies), fresh), false);
  assert.equal(visited(bodyById('mars', bodies), { ...fresh, discovered: ['earth', 'mars'] }), true);
  const hubble = craft.find((c) => c.id === 'hubble');
  assert.equal(visited(hubble, fresh), false);
  assert.equal(visited(hubble, { ...fresh, craft: ['hubble'] }), true);
  // A log saved before craft were recorded has no list at all.
  assert.equal(visited(hubble, { discovered: ['earth'], landed: [], photos: [], stories: [] }), false);
  const apollo = sites.find((s) => s.id === 'apollo11');
  assert.equal(visited(apollo, fresh), false);
  assert.equal(visited(apollo, { ...fresh, stories: ['apollo11'] }), true);
});

test('craft the traveler has come within docking range of are remembered', () => {
  let { progress, newly } = recordCraft(createProgress(), ['hubble', 'iss']);
  assert.deepEqual(newly, ['hubble', 'iss']);
  ({ progress, newly } = recordCraft(progress, ['hubble']));
  assert.deepEqual(newly, []);
  assert.deepEqual(progress.craft, ['hubble', 'iss']);
  // Stored lists are cleaned like the others; old logs read as none.
  assert.deepEqual(sanitizeProgress({ craft: ['hubble', 'hubble', 'ufo', 3] }, BODIES, MISSIONS, [], CRAFT).craft, ['hubble']);
  assert.deepEqual(sanitizeProgress({ discovered: ['mars'] }, BODIES, MISSIONS, [], CRAFT).craft, []);
});

test('a jump happens only from far away: nearby, choosing a name works as before', () => {
  const mars = bodyById('mars', bodies);
  const at = (km) => [mars.position[0], mars.position[1] + km, mars.position[2]];
  assert.equal(farFrom(mars, at(10 * mars.radiusKm + 1)), true);
  assert.equal(farFrom(mars, at(10 * mars.radiusKm - 1)), false);
  const hubble = craft.find((c) => c.id === 'hubble');
  assert.equal(farFrom(hubble, [hubble.position[0], hubble.position[1] + 3001, hubble.position[2]]), true);
  assert.equal(farFrom(hubble, [hubble.position[0], hubble.position[1] + 2999, hubble.position[2]]), false);
  const apollo = sites.find((s) => s.id === 'apollo11');
  assert.equal(farFrom(apollo, [apollo.position[0], apollo.position[1] + 2001, apollo.position[2]]), true);
  assert.equal(farFrom(apollo, [apollo.position[0], apollo.position[1] + 1999, apollo.position[2]]), false);
  // Beside another body the target is a journey however close it is: Earth from the Moon.
  const earth = bodyById('earth', bodies);
  const moon = bodyById('moon', bodies);
  const onMoon = moon.position.map((n, i) => n + (i === 1 ? moon.radiusKm + 3 : 0));
  const known = { ...createProgress(), discovered: ['earth', 'moon'] };
  assert.equal(farFrom(earth, onMoon), false);
  assert.equal(farFrom(earth, onMoon, bodies), true);
  assert.ok(teleportSpot(earth, { position: onMoon, progress: known, bodies }));
  // Where a jump to the Moon ends, Earth is a jump away too, and from there the Moon is near.
  const atMoon = teleportSpot(moon, { position: earth.position.map((n, i) => n + (i === 1 ? earth.radiusKm + 6794 : 0)), progress: known, bodies });
  assert.ok(teleportSpot(earth, { position: atMoon, progress: known, bodies }));
  assert.equal(teleportSpot(moon, { position: atMoon, progress: known, bodies }), null);
  // And where a jump to Earth ends, Earth is near.
  assert.equal(teleportSpot(earth, { position: bodyVista(earth, bodies), progress: known, bodies }), null);
  // In open space as near to Earth as the Moon is, Earth is still near.
  const open = earth.position.map((n, i) => n - (moon.position[i] - earth.position[i]));
  assert.equal(farFrom(earth, open, bodies), farFrom(earth, open));
  const seen = { ...createProgress(), discovered: ['earth', 'mars'] };
  assert.equal(teleportSpot(mars, { position: at(1000 + mars.radiusKm), progress: seen, bodies }), null);
  assert.equal(teleportSpot(mars, { position: far, progress: createProgress(), bodies }), null);
  assert.ok(teleportSpot(mars, { position: far, progress: seen, bodies }));
  // The journal's button jumps even from close by, but still only to somewhere visited.
  assert.ok(teleportSpot(mars, { position: at(1000 + mars.radiusKm), progress: seen, bodies, anywhere: true }));
  assert.equal(teleportSpot(mars, { position: far, progress: createProgress(), bodies, anywhere: true }), null);
});

test('a body is seen from five radii, mostly sunlit, a little from above, clear of every other body', () => {
  assert.equal(VISTA_RADII, 5);
  const sun = bodyById('sun', bodies);
  for (const body of bodies) {
    const spot = bodyVista(body, bodies);
    const out = sub(spot, body.position);
    const km = Math.hypot(...out);
    const most = body.id === 'saturn' ? 9 : 5;
    assert.ok(km <= most * body.radiusKm * 1.0001 && km >= most * 0.4 * body.radiusKm * 0.9999, `${body.id} ${km / body.radiusKm}`);
    for (const other of bodies) {
      if (other.id !== body.id) assert.ok(gap(spot, other.position) > other.radiusKm + 100, `${body.id} vista inside ${other.id}`);
    }
    // (Halley's orbit is steeply tilted, so its sunward side can point below the plane.)
    if (body.kind !== 'comet') assert.ok(out[1] > 0, `${body.id} from above`);
    if (body.kind === 'star') continue;
    // The Sun is behind the traveler's shoulder: between 30 and 55 degrees off the line.
    const toSun = sub(sun.position, body.position);
    const cos = dot(out, toSun) / (km * Math.hypot(...toSun));
    assert.ok(cos > Math.cos((55 * Math.PI) / 180) && cos < Math.cos((30 * Math.PI) / 180), `${body.id} ${cos}`);
  }
  // Most keep the full five radii; Saturn stands back for its rings.
  near(gap(bodyVista(bodyById('mars', bodies), bodies), bodyById('mars', bodies).position), 5 * 3389.5, 1);
  near(gap(bodyVista(bodyById('saturn', bodies), bodies), bodyById('saturn', bodies).position), 9 * 58232, 1);
});

test('a craft is met 300 km off: away from the ground when low, else on its sunlit side', () => {
  assert.equal(CRAFT_ARRIVAL_KM, 300);
  const sun = bodyById('sun', bodies);
  for (const c of craft) {
    const spot = craftArrival(c, bodies);
    near(gap(spot, c.position), 300, 1e-6);
    for (const b of bodies) assert.ok(gap(spot, b.position) > b.radiusKm + 100, `${c.id} arrival inside ${b.id}`);
  }
  const lro = craft.find((c) => c.id === 'lro');
  const moon = bodyById('moon', bodies);
  near(gap(craftArrival(lro, bodies), moon.position) - moon.radiusKm, 120 + 300, 1e-6);
  const voyager = craft.find((c) => c.id === 'voyager1');
  assert.ok(gap(craftArrival(voyager, bodies), sun.position) < gap(voyager.position, sun.position));
});

test('a story place is seen from 400 km up and 400 km to one side', () => {
  assert.equal(SITE_ARRIVAL_KM, 400);
  for (const site of sites) {
    const body = bodyById(site.parent, bodies);
    const spot = siteArrival(site, body);
    near(gap(spot, site.position), 400 * Math.SQRT2, 1e-6);
    assert.ok(gap(spot, body.position) > body.radiusKm + 399, site.id);
  }
});

test('a ringed body is seen from 30 degrees off its rings, on their sunlit side, still nine radii away', () => {
  const saturn = bodyById('saturn', bodies);
  const sun = bodyById('sun', bodies);
  const toSun = sub(sun.position, saturn.position);
  for (const normal of [[0, 1, 0], [0.45, 0.89, 0], [-0.3, -0.85, 0.43], [0.2, 0.9, -0.39]]) {
    const length = Math.hypot(...normal);
    const n = normal.map((x) => x / length);
    const out = sub(bodyVista(saturn, bodies, normal), saturn.position);
    const km = Math.hypot(...out);
    near(km, 9 * saturn.radiusKm, 1);
    const lift = dot(out, n) / km;
    // 30 degrees off the plane of the rings, whichever way the normal was given.
    near(Math.abs(lift), 0.5, 1e-6);
    // On the side the Sun lights.
    const lit = dot(toSun, n);
    if (Math.abs(lit) / Math.hypot(...toSun) > 0.02) assert.ok(lift * lit > 0, `${normal}`);
    // Still on the sunward half, so the globe is mostly lit.
    assert.ok(dot(out, toSun) > 0, `${normal}`);
  }
});
