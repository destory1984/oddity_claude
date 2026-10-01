import { test } from 'vitest';
import assert from 'node:assert/strict';
import { STORIES, storySitesAt, completedStories, siteHidden } from '../src/core/stories.js';
import { surfaceDirection, spinAngle } from '../src/core/surface.js';
import { BODIES, bodiesAt, bodyById } from '../src/core/bodies.js';
import { craftAt } from '../src/core/craft.js';

const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const add = (a, b, k = 1) => a.map((n, i) => n + b[i] * k);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const done = (position, restingOn = null, t = 0) => {
  const bodies = bodiesAt(t);
  return completedStories({ position, restingOn, bodies, craft: craftAt(t, bodies), sites: storySitesAt(t, bodies) });
};

test('there are seven story places, each with a name, a year, a hint and a short story', () => {
  assert.equal(STORIES.length, 7);
  assert.equal(new Set(STORIES.map((s) => s.id)).size, 7);
  for (const s of STORIES) {
    assert.ok(s.name && s.nameEn && s.hint && s.year > 1900, s.id);
    assert.ok(s.text.length <= 90 && s.text.endsWith('.') && !s.text.includes('~'), `${s.id}: ${s.text.length}`);
  }
});

test('a place on the map: the equator at longitude 0 faces -x, east is toward -z, north is +y', () => {
  // This is how Babylon wraps a map round a sphere with this game's flipped u (see body.vert).
  const eq = surfaceDirection(0, 0, 0);
  near(eq[0], -1, 1e-9);
  near(eq[2], 0, 1e-9);
  near(surfaceDirection(0, 90, 0)[2], -1, 1e-9);
  near(surfaceDirection(90, 0, 0)[1], 1, 1e-9);
});

test('the place turns with the body: a quarter turn of spin carries +x to -z', () => {
  const d = surfaceDirection(0, 180, Math.PI / 2);
  near(d[0], 0, 1e-9);
  near(d[2], -1, 1e-9);
  // Bodies spin with the game clock, eastward: one turn per day.
  near(spinAngle(100, 25), -Math.PI / 2, 1e-12);
});

test('three places sit on the surface of their body and move as it spins', () => {
  const sites = storySitesAt(0, BODIES);
  assert.deepEqual(sites.map((s) => s.id), ['apollo11', 'viking1', 'huygens']);
  for (const site of sites) {
    const body = bodyById(site.parent);
    near(Math.hypot(...sub(site.position, body.position)), body.radiusKm, 1e-6);
    assert.equal(site.kind, 'site');
    assert.equal(site.radiusKm, 0);
  }
  const later = storySitesAt(3600 * 20, bodiesAt(3600 * 20));
  const mars0 = sub(sites[1].position, bodyById('mars').position);
  const mars1 = sub(later[1].position, bodyById('mars', bodiesAt(3600 * 20)).position);
  assert.ok(Math.hypot(...sub(mars0, mars1)) > 1000);
  near(mars0[1], mars1[1], 1e-6);
});

test('Apollo 11: landed on the Moon within 150 km of Tranquility Base', () => {
  const site = storySitesAt(0, BODIES)[0];
  assert.deepEqual(done(site.position, 'moon'), ['apollo11']);
  // Hovering there, or landed on the far side, does not count.
  assert.deepEqual(done(site.position, null), []);
  const moon = bodyById('moon');
  const farSide = add(moon.position, sub(moon.position, site.position));
  assert.deepEqual(done(farSide, 'moon'), []);
  // 100 km along the ground still counts; 300 km does not.
  const along = (km) => {
    const up = unit(sub(site.position, moon.position));
    const side = unit([up[2], 0, -up[0]]);
    return add(moon.position, unit(add(up, side, km / moon.radiusKm)), moon.radiusKm);
  };
  assert.deepEqual(done(along(100), 'moon'), ['apollo11']);
  assert.deepEqual(done(along(300), 'moon'), []);
});

test('Cassini: touching Saturn anywhere', () => {
  const saturn = bodyById('saturn');
  const top = add(saturn.position, [0, saturn.radiusKm, 0]);
  assert.deepEqual(done(top, 'saturn'), ['cassini']);
  assert.deepEqual(done(add(top, [0, 500, 0]), null), []);
});

test('New Horizons, Giotto and Voyager 1: passing close by', () => {
  const pluto = bodyById('pluto');
  assert.deepEqual(done(add(pluto.position, [0, pluto.radiusKm + 12000, 0])), ['newHorizons']);
  assert.deepEqual(done(add(pluto.position, [0, pluto.radiusKm + 13000, 0])), []);
  const halley = bodyById('halley');
  assert.deepEqual(done(add(halley.position, [0, 500, 0])), ['giotto']);
  assert.deepEqual(done(add(halley.position, [0, 700, 0])), []);
  const voyager = craftAt(0, BODIES).find((c) => c.id === 'voyager1');
  assert.deepEqual(done(add(voyager.position, [0, 4000, 0])), ['voyager1']);
  assert.deepEqual(done(add(voyager.position, [0, 9000, 0])), []);
});

test('a place on the far side of its body is hidden from the traveler', () => {
  const site = storySitesAt(0, BODIES)[0];
  const moon = bodyById('moon');
  const up = unit(sub(site.position, moon.position));
  assert.equal(siteHidden(site, moon, add(site.position, up, 5000)), false);
  assert.equal(siteHidden(site, moon, add(moon.position, up, -8000)), true);
});
