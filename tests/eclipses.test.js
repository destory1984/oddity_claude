import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ECLIPSES, ECLIPSE_DAYS, eclipseNow, nextEclipse, eclipseNews, eclipseTitle, eclipseDayText, daysUntil,
  eclipseSpot, sunHeight, canWatch, showFrame, showSeconds, stagedMoon, sanitizeEclipses, SUN_UP,
} from '../src/core/eclipses.js';
import { BODIES, bodyById } from '../src/core/bodies.js';

const sun = bodyById('sun');
const earth = bodyById('earth');
const moon = bodyById('moon');
const unit = (v) => { const l = Math.hypot(...v); return v.map((n) => n / l); };
const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, unit(a).reduce((s, n, i) => s + n * unit(b)[i], 0))));

test('the eclipses are in order of their day, each solar one with its place', () => {
  for (let i = 1; i < ECLIPSES.length; i++) assert.ok(ECLIPSES[i].day > ECLIPSES[i - 1].day);
  assert.equal(new Set(ECLIPSES.map((e) => e.id)).size, ECLIPSES.length);
  for (const e of ECLIPSES) {
    assert.match(e.day, /^\d{4}-\d{2}-\d{2}$/);
    if (e.kind === 'solar') assert.ok(Math.abs(e.latDeg) <= 90 && Math.abs(e.lonDeg) <= 180 && e.long);
    else assert.equal(e.type, 'total');
  }
  assert.equal(eclipseTitle(ECLIPSES[0]), '금환일식');
  assert.equal(eclipseTitle(ECLIPSES[1]), '개기일식');
  assert.equal(eclipseTitle(ECLIPSES[4]), '개기월식');
  assert.equal(eclipseDayText(ECLIPSES[1]), '2027년 8월 2일');
});

test('an eclipse is on for the day itself and three days either side', () => {
  assert.equal(ECLIPSE_DAYS, 3);
  assert.equal(eclipseNow(new Date(2027, 7, 2, 12)).id, 's20270802');
  assert.equal(eclipseNow(new Date(2027, 6, 30, 0, 5)).id, 's20270802');
  assert.equal(eclipseNow(new Date(2027, 7, 5, 23, 50)).id, 's20270802');
  assert.equal(eclipseNow(new Date(2027, 6, 29, 23, 50)), null);
  assert.equal(eclipseNow(new Date(2027, 7, 6, 0, 5)), null);
  assert.equal(eclipseNow(new Date(2026, 9, 4)), null);
  assert.equal(daysUntil(ECLIPSES[1], new Date(2027, 7, 1, 23)), 1);
});

test('the sky news tells of the next one and how many days are left', () => {
  assert.equal(nextEclipse(new Date(2026, 9, 4)).id, 's20270206');
  assert.match(eclipseNews(new Date(2026, 9, 4)), /^다음 일식: 2027년 2월 6일 금환일식\(브라질 남쪽 대서양\)\. 125일 남았습니다\.$/);
  assert.match(eclipseNews(new Date(2027, 7, 2)), /개기일식: 오늘입니다\. 이번 주 내내 이집트 룩소르 근처에서/);
  assert.match(eclipseNews(new Date(2027, 7, 4)), /2일 전이었습니다/);
  assert.match(eclipseNews(new Date(2028, 11, 29)), /개기월식: 2일 뒤입니다/);
  // A week after one, the next is told of.
  assert.equal(nextEclipse(new Date(2027, 7, 10)).id, 's20280126');
  assert.equal(eclipseNews(new Date(2031, 0, 1)), null);
});

test('the spot of a solar eclipse is on the ground at its latitude; of a lunar one, the middle of the night side', () => {
  const luxor = eclipseSpot(ECLIPSES[1], earth, sun, 0);
  const high = Math.hypot(...luxor.position.map((n, i) => n - earth.position[i]));
  assert.ok(Math.abs(high - earth.radiusKm) < 1e-6);
  assert.ok(Math.abs(Math.asin(luxor.up[1]) * 180 / Math.PI - 25.5) < 1e-6);
  const night = eclipseSpot(ECLIPSES[4], earth, sun, 1.2);
  assert.ok(Math.abs(sunHeight(night, sun) + 1) < 1e-3);
});

test('watching needs to be within 800 km of the spot, and for a solar one, daylight there', () => {
  const event = ECLIPSES[1];
  // Turn Earth until the Sun is high over the spot, and until it is night there.
  let day = null; let dark = null;
  for (let spin = 0; spin < 2 * Math.PI; spin += 0.05) {
    const spot = eclipseSpot(event, earth, sun, spin);
    if (!day && sunHeight(spot, sun) > 0.8) day = spot;
    if (!dark && sunHeight(spot, sun) < -0.3) dark = spot;
  }
  assert.ok(day && dark);
  const over = (spot, km) => spot.position.map((n, i) => n + spot.up[i] * km);
  assert.equal(canWatch(event, day, sun, over(day, 30)), 'yes');
  assert.equal(canWatch(event, day, sun, over(day, 900)), 'far');
  assert.equal(canWatch(event, dark, sun, over(dark, 30)), 'night');
  assert.ok(SUN_UP > 0.25 && SUN_UP < 0.27);
  const lunar = ECLIPSES[4];
  const spot = eclipseSpot(lunar, earth, sun, 0);
  assert.equal(canWatch(lunar, spot, sun, over(spot, 30)), 'yes');
});

test('a solar show: the Moon comes in from one side, sits on the Sun, and leaves by the other', () => {
  const total = ECLIPSES[1];
  const at = (t) => showFrame(total, t);
  assert.ok(at(0).offset < -2);
  assert.ok(at(4.5).offset < 0 && at(4.5).offset > at(0).offset);
  for (const t of [9, 12, 15]) assert.equal(at(t).offset, 0);
  assert.ok(at(20).offset > 0);
  assert.ok(at(24).offset > 2);
  assert.equal(at(0).size, 1.04);
  assert.equal(showFrame(ECLIPSES[0], 12).size, 0.94);
  assert.equal(showSeconds(total), 26);
  assert.ok(!at(25.9).done && at(26).done);
  assert.equal(at(8.9).line, 0);
  assert.match(at(9).text, /코로나.*6분 23초/);
  assert.match(showFrame(ECLIPSES[0], 9).text, /빛의 고리.*7분 51초/);
  assert.match(at(15).text, /다이아몬드 반지/);
});

test('a lunar show: the shadow comes over the Moon, stays, and goes', () => {
  const lunar = ECLIPSES[4];
  const at = (t) => showFrame(lunar, t);
  assert.equal(at(0).shade, 0);
  assert.ok(at(4).shade > 0.4 && at(4).shade < 0.5);
  for (const t of [9, 12, 16]) assert.equal(at(t).shade, 1);
  assert.ok(at(20).shade > 0 && at(20).shade < 1);
  assert.equal(at(24).shade, 0);
  assert.match(at(9).text, /붉어집니다.*71분/);
  assert.ok(!/undefined|null/.test(showFrame(ECLIPSES[6], 9).text));
  assert.ok(at(26).done);
});

test('the staged Moon covers the Sun as seen from the spot at the middle of the show, and a ring is left when annular', () => {
  const event = ECLIPSES[1];
  let spot = null;
  for (let spin = 0; spin < 2 * Math.PI && !spot; spin += 0.05) {
    const s = eclipseSpot(event, earth, sun, spin);
    if (sunHeight(s, sun) > 0.8) spot = s;
  }
  const eye = spot.position.map((n, i) => n + spot.up[i] * 13);
  const toSun = sun.position.map((n, i) => n - eye[i]);
  const sunRad = Math.asin(sun.radiusKm / Math.hypot(...toSun));
  const widthOf = (at) => Math.asin(moon.radiusKm / Math.hypot(...at.map((n, i) => n - eye[i])));
  const mid = stagedMoon(event, showFrame(event, 12), eye, spot.up, sun, moon, earth);
  assert.ok(angle(mid.map((n, i) => n - eye[i]), toSun) < 1e-6);
  assert.ok(Math.abs(widthOf(mid) / sunRad - 1.04) < 1e-6);
  // It never dips into the ground.
  assert.ok(Math.hypot(...mid.map((n, i) => n - earth.position[i])) > earth.radiusKm + moon.radiusKm);
  const start = stagedMoon(event, showFrame(event, 0), eye, spot.up, sun, moon, earth);
  assert.ok(Math.abs(angle(start.map((n, i) => n - eye[i]), toSun) / sunRad - 2.15) < 1e-6);
  const ring = stagedMoon(ECLIPSES[0], showFrame(ECLIPSES[0], 12), eye, spot.up, sun, moon, earth);
  assert.ok(Math.abs(widthOf(ring) / sunRad - 0.94) < 1e-6);
});

test('the staged Moon of a lunar eclipse is up in the night sky, as far as it ever is', () => {
  const lunar = ECLIPSES[4];
  const spot = eclipseSpot(lunar, earth, sun, 0);
  const eye = spot.position.map((n, i) => n + spot.up[i] * 13);
  const at = stagedMoon(lunar, showFrame(lunar, 12), eye, spot.up, sun, moon, earth);
  const way = unit(at.map((n, i) => n - eye[i]));
  assert.ok(way.reduce((s, n, i) => s + n * spot.up[i], 0) > 0.5);
  const km = Math.hypot(...moon.position.map((n, i) => n - earth.position[i]));
  assert.ok(Math.abs(Math.hypot(...at.map((n, i) => n - eye[i])) - km) < 1e-6);
});

test('a stored record keeps only eclipses that are known', () => {
  assert.deepEqual(sanitizeEclipses(null), { seen: [] });
  assert.deepEqual(sanitizeEclipses({ seen: ['s20270802', 'x', 's20270802'] }), { seen: ['s20270802'] });
  assert.ok(BODIES.length > 0);
});
