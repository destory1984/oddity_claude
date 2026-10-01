import { test } from 'vitest';
import assert from 'node:assert/strict';
import { STORIES, storySitesAt, completedStories, siteHidden, siteFar, SITE_SHOWN_KM } from '../src/core/stories.js';
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

test('there are 40 story places, each with a name, a hint and a short story; events have a year', () => {
  assert.equal(STORIES.length, 40);
  assert.equal(new Set(STORIES.map((s) => s.id)).size, 40);
  assert.equal(new Set(STORIES.map((s) => s.name)).size, 40);
  for (const s of STORIES) {
    assert.ok(s.name && s.nameEn && s.hint, s.id);
    assert.ok(s.year === undefined || s.year > 1900, s.id);
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

test('the landers and rovers of the Moon and Mars: 21 on the Moon, 11 on Mars, with Apollo 11 and Viking 1 among them', () => {
  const on = (body) => STORIES.filter((s) => s.type === 'surface' && s.body === body);
  assert.equal(on('moon').length, 22);
  assert.equal(on('mars').length, 12);
  for (const s of [...on('moon'), ...on('mars')]) {
    assert.ok(s.year >= 1959 && s.year <= 2025, s.id);
    assert.ok(Math.abs(s.latDeg) <= 90 && Math.abs(s.lonDeg) <= 180, s.id);
    assert.equal(s.withinKm, 150);
    assert.match(s.hint, /^(달|화성) .+\((북위|남위) [0-9.]+도, (동경|서경) [0-9.]+도\) 150km 안에 내려앉기$/, s.id);
  }
  const byId = (id) => STORIES.find((s) => s.id === id);
  assert.equal(byId('change4').hint, '달 뒷면 폰 카르만 분화구(남위 45.4도, 동경 177.6도) 150km 안에 내려앉기');
  assert.equal(byId('opportunity').hint, '화성 메리디아니 평원(남위 1.9도, 서경 5.5도) 150km 안에 내려앉기');
  // No two on one body are so close that landing between them is the only way to tell:
  // each has a spot of its own at least 100 km from the next.
  const sites = storySitesAt(0, BODIES);
  for (const body of ['moon', 'mars']) {
    const here = sites.filter((s) => s.parent === body);
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        assert.ok(Math.hypot(...sub(here[i].position, here[j].position)) > 100, `${here[i].id} ${here[j].id}`);
      }
    }
  }
  // Landing on Jezero logs Perseverance and nothing else.
  assert.deepEqual(done(sites.find((s) => s.id === 'perseverance').position, 'mars'), ['perseverance']);
});

test("a place's label shows only from within 300,000 km of its body", () => {
  const moon = bodyById('moon');
  assert.equal(SITE_SHOWN_KM, 300000);
  assert.equal(siteFar(moon, add(moon.position, [0, moon.radiusKm + 300000, 0])), false);
  assert.equal(siteFar(moon, add(moon.position, [0, moon.radiusKm + 300001, 0])), true);
});

test('the places sit on the surface of their body and move as it spins', () => {
  const sites = storySitesAt(0, BODIES);
  assert.equal(sites.length, 36);
  assert.deepEqual(sites.slice(0, 4).map((s) => s.id), ['apollo11', 'viking1', 'huygens', 'dokdo']);
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

test('Dokdo lies in the East Sea and turns with Earth from its starting spin', () => {
  const dokdo = storySitesAt(0, BODIES).find((s) => s.id === 'dokdo');
  assert.equal(dokdo.parent, 'earth');
  // Earth starts turned 1.35 rad (render/planets.js), unlike the other bodies.
  const earth = bodyById('earth');
  const expected = surfaceDirection(37.2417, 131.8667, spinAngle(86164, 0, 1.35));
  near(Math.hypot(...sub(sub(dokdo.position, earth.position), expected.map((n) => n * earth.radiusKm))), 0, 1e-6);
  near(spinAngle(86164, 86164 / 4, 1.35), 1.35 - Math.PI / 2, 1e-12);
});

test('landing on Dokdo counts; landing 100 km away does not', () => {
  const dokdo = storySitesAt(0, BODIES).find((s) => s.id === 'dokdo');
  assert.deepEqual(done(dokdo.position, 'earth'), ['dokdo']);
  const earth = bodyById('earth');
  const up = unit(sub(dokdo.position, earth.position));
  const side = unit([up[2], 0, -up[0]]);
  const away = add(earth.position, unit(add(up, side, 100 / earth.radiusKm)), earth.radiusKm);
  assert.deepEqual(done(away, 'earth'), []);
});
