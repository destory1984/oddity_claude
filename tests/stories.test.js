import { test } from 'vitest';
import assert from 'node:assert/strict';
import { STORIES, storySitesAt, completedStories, siteHidden, siteFar, SITE_SHOWN_RADII } from '../src/core/stories.js';
import { surfaceDirection, spinAngle, SPIN_DAY_S } from '../src/core/surface.js';
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

test('there are 91 story places, each with a name, a hint and a short story; events have a year', () => {
  assert.equal(STORIES.length, 91);
  assert.equal(new Set(STORIES.map((s) => s.id)).size, 91);
  assert.equal(new Set(STORIES.map((s) => s.name)).size, 91);
  for (const s of STORIES) {
    assert.ok(s.name && s.nameEn && s.hint, s.id);
    assert.ok(s.year === undefined || s.year > 1900, s.id);
    assert.ok(s.text.length <= 90 && s.text.endsWith('.') && !s.text.includes('~'), `${s.id}: ${s.text.length}`);
  }
});

test('no story place shares its id with a body or a craft: labels and targets are found by id', () => {
  const taken = new Set([...BODIES.map((b) => b.id), ...craftAt(0, BODIES).map((c) => c.id)]);
  // The stories told at a body or a craft itself (not at a place on a surface) may carry its name.
  const clash = STORIES.filter((s) => s.type === 'surface' && taken.has(s.id)).map((s) => s.id);
  assert.deepEqual(clash, []);
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
  const on = (body) => STORIES.filter((s) => s.type === 'surface' && s.body === body && !s.landmark);
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
    const here = sites.filter((s) => s.parent === body && !s.landmark);
    for (let i = 0; i < here.length; i++) {
      for (let j = i + 1; j < here.length; j++) {
        assert.ok(Math.hypot(...sub(here[i].position, here[j].position)) > 100, `${here[i].id} ${here[j].id}`);
      }
    }
  }
  // Landing on Jezero logs Perseverance and nothing else.
  assert.deepEqual(done(sites.find((s) => s.id === 'perseverance').position, 'mars'), ['perseverance']);
});

test("a place's label shows only from within four radii of its body's surface", () => {
  const moon = bodyById('moon');
  assert.equal(SITE_SHOWN_RADII, 4);
  near(4 * moon.radiusKm, 6950, 5);
  assert.equal(siteFar(moon, add(moon.position, [0, moon.radiusKm * 5, 0])), false);
  assert.equal(siteFar(moon, add(moon.position, [0, moon.radiusKm * 5 + 1, 0])), true);
  // 18,000 km from the Moon, where the labels used to pile up on its disc: hidden.
  assert.equal(siteFar(moon, add(moon.position, [0, moon.radiusKm + 18000, 0])), true);
});

test('the places sit on the surface of their body and move as it spins', () => {
  const sites = storySitesAt(0, BODIES);
  assert.equal(sites.length, 80);
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
  const side = add(saturn.position, [0, 0, saturn.radiusKm]);
  assert.deepEqual(done(side, 'saturn'), ['cassini']);
  assert.deepEqual(done(add(side, [0, 0, 500]), null), []);
  // At the north pole the hexagon is logged with it.
  assert.deepEqual(done(add(saturn.position, [0, saturn.radiusKm, 0]), 'saturn').sort(), ['cassini', 'hexagon']);
});

test('New Horizons, Giotto and Voyager 1: passing close by', () => {
  const pluto = bodyById('pluto');
  assert.deepEqual(done(add(pluto.position, [0, pluto.radiusKm + 12000, 0])), ['newHorizons']);
  assert.deepEqual(done(add(pluto.position, [0, pluto.radiusKm + 13000, 0])), []);
  const halley = bodyById('halley');
  assert.deepEqual(done(add(halley.position, [0, 500, 0])), ['giotto']);
  assert.deepEqual(done(add(halley.position, [0, 700, 0])), []);
  const voyager = craftAt(0, BODIES).find((c) => c.id === 'voyager1');
  // Out where Voyager 1 is, Earth is also the pale blue dot it photographed.
  assert.deepEqual(done(add(voyager.position, [0, 4000, 0])).sort(), ['paleBlueDot', 'voyager1']);
  assert.deepEqual(done(add(voyager.position, [0, 9000, 0])), ['paleBlueDot']);
});

test('twenty famous places on the Moon and nine on Mars: craters, seas and mountains, with no machine standing there', () => {
  const marks = STORIES.filter((s) => s.landmark && (s.body === 'moon' || s.body === 'mars'));
  assert.deepEqual(marks.filter((s) => s.body === 'moon').map((s) => s.name), [
    '티코 분화구', '코페르니쿠스 분화구', '고요의 바다', '비의 바다', '폭풍의 대양', '남극-에이트켄 분지',
    '섀클턴 분화구', '아펜니노 산맥', '알프스 계곡', '직선벽', '모스크바의 바다', '치올콥스키 분화구',
    '맑음의 바다', '위난의 바다', '플라톤 분화구', '아리스타르코스 분화구', '케플러 분화구', '클라비우스 분화구',
    '무지개의 만', '라이너 감마',
  ]);
  assert.deepEqual(marks.filter((s) => s.body === 'mars').map((s) => s.name), [
    '올림푸스산', '마리너 계곡', '타르시스 세 화산', '헬라스 분지', '북극관', '남극관', '코롤료프 분화구', '시도니아의 얼굴',
    '시르티스 메이저',
  ]);
  assert.equal(marks.length, 29);
  for (const s of marks) {
    assert.equal(s.type, 'surface');
    assert.equal(s.year, undefined);
    assert.ok(Math.abs(s.latDeg) <= 90 && Math.abs(s.lonDeg) <= 180, s.id);
    assert.ok([150, 200, 300].includes(s.withinKm), s.id);
    assert.match(s.hint, /^(달|화성) .+\((북위|남위) [0-9.]+도, (동경|서경) [0-9.]+도\) (150|200|300)km 안에 내려앉기$/, s.id);
  }
  // The eight added to the Moon are all on the side that faces Earth.
  for (const s of marks.filter((m) => m.body === 'moon').slice(12)) assert.ok(Math.abs(s.lonDeg) < 90, s.id);
  const sites = storySitesAt(0, BODIES);
  assert.equal(sites.filter((s) => s.landmark && (s.parent === 'moon' || s.parent === 'mars')).length, 29);
  // Landing on top of Olympus Mons logs the mountain and nothing else.
  assert.deepEqual(done(sites.find((s) => s.id === 'olympus').position, 'mars'), ['olympus']);
  assert.equal(sites.find((s) => s.id === 'apollo11').landmark, false);
  // Landing in the middle of the Sea of Tranquility logs the sea, not Apollo 11 beside it.
  assert.deepEqual(done(sites.find((s) => s.id === 'tranquillitatis').position, 'moon'), ['tranquillitatis']);
  // Tycho and Surveyor 7 on its rim are logged together.
  assert.deepEqual(done(sites.find((s) => s.id === 'tycho').position, 'moon').sort(), ['surveyor7', 'tycho']);
});

test('the Pale Blue Dot: 60 million km from Earth, as far as Voyager 1 was on the game\'s scale', () => {
  const earth = bodyById('earth');
  const story = STORIES.find((s) => s.id === 'paleBlueDot');
  assert.equal(story.type, 'far');
  assert.equal(story.year, 1990);
  // Away from the Sun and every planet (straight up out of the plane).
  assert.deepEqual(done(add(earth.position, [0, 6.1e7, 0])), ['paleBlueDot']);
  assert.deepEqual(done(add(earth.position, [0, 5.9e7, 0])), []);
});

test('twenty places beyond the Moon and Mars: on eleven more bodies, at three craft and past two planets', () => {
  const far = STORIES.slice(71);
  assert.equal(far.length, 20);
  for (const s of far) assert.ok(s.year >= 1969 && s.year <= 2024, s.id);
  const ground = far.filter((s) => s.type === 'surface');
  assert.equal(ground.length, 15);
  assert.deepEqual([...new Set(ground.map((s) => s.body))].sort(), [
    'ceres', 'charon', 'earth', 'enceladus', 'europa', 'io', 'jupiter', 'mercury', 'neptune', 'pluto', 'saturn', 'titan', 'venus',
  ]);
  // Every body that carries a place turns on the same clock as its map.
  for (const s of ground) assert.ok(SPIN_DAY_S[s.body], s.body);
  const sites = storySitesAt(0, BODIES);
  for (const s of ground) {
    const site = sites.find((x) => x.id === s.id);
    assert.ok(site.position.every(Number.isFinite), s.id);
    assert.deepEqual(done(site.position, s.body).includes(s.id), true, s.id);
  }
  // Pele is where the game already draws its plume.
  assert.deepEqual([STORIES.find((s) => s.id === 'pele').latDeg, STORIES.find((s) => s.id === 'pele').lonDeg], [-18.7, 104.7]);
  // Pluto's map is centred on longitude 180: the heart, at 178 east, is 2 west of the map's middle.
  assert.equal(STORIES.find((s) => s.id === 'tombaughRegio').lonDeg, -2);
  assert.match(STORIES.find((s) => s.id === 'tombaughRegio').hint, /동경 178\.0도/);
  // Passing Neptune's cloud tops within 5,000 km, as Voyager 2 did; Uranus within 81,500 km.
  const neptune = bodyById('neptune');
  assert.ok(done(add(neptune.position, [0, neptune.radiusKm + 4000, 0])).includes('voyager2Neptune'));
  assert.ok(!done(add(neptune.position, [0, neptune.radiusKm + 6000, 0])).includes('voyager2Neptune'));
  const uranus = bodyById('uranus');
  assert.ok(done(add(uranus.position, [0, uranus.radiusKm + 80000, 0])).includes('voyager2Uranus'));
  // Beside the station, Voyager 2 and the Parker probe.
  const craft = craftAt(0, BODIES);
  for (const [id, story] of [['iss', 'yiSoyeon'], ['voyager2', 'voyager2Out'], ['parker', 'parkerPerihelion']]) {
    assert.ok(done(add(craft.find((c) => c.id === id).position, [0, 1000, 0])).includes(story), story);
  }
});

test('Rosetta: passing within 300 km of comet 67P', () => {
  const comet = bodyById('churyumov');
  assert.deepEqual(done(add(comet.position, [0, 250, 0])), ['rosetta']);
  assert.deepEqual(done(add(comet.position, [0, 400, 0])), []);
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
