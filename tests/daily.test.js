import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  dailyRequest, requestTarget, requestMet, createDaily, sanitizeDaily, recordDay, streak, lastWeek, ANNIVERSARY_COUNT,
} from '../src/core/daily.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { STORIES } from '../src/core/stories.js';
import { CRAFT, craftAt } from '../src/core/craft.js';
import { createProgress } from '../src/core/progress.js';

const fresh = createProgress();
const far = { ...fresh, discovered: ['earth', 'moon', 'mars', 'jupiter', 'io'], craft: ['voyager1'] };

test('on the day of a real event the errand is its place, with the year', () => {
  const apollo = dailyRequest('2026-07-21', fresh);
  assert.deepEqual({ kind: apollo.kind, id: apollo.id, year: apollo.year }, { kind: 'day', id: 'apollo11', year: 1969 });
  assert.equal(apollo.text, '1969년 오늘이 그날이란다. 달의 아폴로 11호 착륙지에 다녀와 다오.');
  assert.equal(dailyRequest('2031-10-04', far).id, 'sputnik');
  assert.equal(ANNIVERSARY_COUNT, 52);
  // Gagarin's day sends her to where he left from, and ALMA's opening to ALMA.
  assert.deepEqual([dailyRequest('2027-04-12', fresh).id, dailyRequest('2027-04-12', fresh).year], ['baikonur', 1961]);
  assert.equal(dailyRequest('2027-03-13', fresh).id, 'alma');
  // Lowell, Palomar and the VLA have their days; 18 February is Perseverance's too, so the two take turns by year.
  assert.deepEqual([dailyRequest('2027-06-03', fresh).id, dailyRequest('2027-06-03', fresh).year], ['palomar', 1948]);
  assert.deepEqual([dailyRequest('2027-10-10', fresh).id, dailyRequest('2027-10-10', fresh).year], ['vla', 1980]);
  assert.equal(dailyRequest('2026-02-18', fresh).id, 'perseverance');
  assert.deepEqual([dailyRequest('2027-02-18', fresh).id, dailyRequest('2027-02-18', fresh).year], ['lowell', 1930]);
});

// Each place once (the user, 2026-10-22, of errands sent to Venus again and again: "수첩은
// 한 장소에 한 번만 가게 해.. 반복하게 하지말구"): the errands are every world and craft
// once, nearest home first, those done left out; an anniversary comes first on its day.
test('the errands are every place once, nearest home first, those done left out', async () => {
  const { errandList } = await import('../src/core/daily.js');
  const all = errandList('2026-10-05', createDaily());
  const ids = all.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  // (Fewer moons since the same day: 75 then.)
  assert.ok(ids.length > 70, String(ids.length));
  assert.deepEqual(ids.slice(0, 3), ['moon', 'venus', 'iss']);
  assert.ok(!ids.includes('earth') && !ids.includes('sun'));
  for (const request of all) {
    const known = BODIES.some((b) => b.id === request.id) || CRAFT.some((c) => c.id === request.id) || STORIES.some((s) => s.id === request.id);
    assert.ok(known, request.id);
    assert.ok(/다오\.|두마\.|궁금하구나\.$/.test(request.text) && !request.text.includes('~'), request.text);
    assert.ok(requestTarget(request));
    // A photo of a moon of another planet would be rated as the planet: never asked for.
    if (request.kind === 'photo') assert.ok(BODIES.find((b) => b.id === request.id).kind !== 'moon' || request.id === 'moon', request.id);
  }
  assert.deepEqual([...new Set(all.map((r) => r.kind))].sort(), ['craft', 'photo', 'visit']);
  // Done once, never asked again; an anniversary first on its day, once.
  const done = { ...createDaily(), places: ['moon', 'venus'] };
  assert.equal(errandList('2026-10-05', done)[0].id, 'iss');
  assert.equal(errandList('2026-07-21', done)[0].id, 'apollo11');
  assert.equal(errandList('2026-07-21', { ...done, places: [...done.places, 'apollo11'] })[0].id, 'iss');
  // All done: none left.
  assert.deepEqual(errandList('2026-10-05', { ...createDaily(), places: ids }), []);
  assert.equal(dailyRequest('2026-10-05', { ...createDaily(), places: ids }), null);
});

// Fewer moons (the user, 2026-10-22: "수첩에서 가야할 곳이 너무 많은데, 토성 1개, 목성은
// 2개의 위성만 가자. 나머지는 모두 최대 1개씩").
test('the errands go to one moon of Saturn, two of Jupiter, at most one of any other', async () => {
  const { errandList } = await import('../src/core/daily.js');
  const moons = {};
  for (const { id } of errandList('2026-10-05', createDaily())) {
    const body = BODIES.find((b) => b.id === id);
    if (body?.kind === 'moon') (moons[body.parent] ??= []).push(id);
  }
  assert.equal(moons.saturn.length, 1);
  assert.equal(moons.jupiter.length, 2);
  for (const [parent, ids] of Object.entries(moons)) if (!['saturn', 'jupiter'].includes(parent)) assert.ok(ids.length <= 1, `${parent}: ${ids}`);
});

test('a place done is kept in the log, once', async () => {
  const { recordPlace } = await import('../src/core/daily.js');
  let daily = recordPlace(createDaily(), 'moon');
  daily = recordPlace(daily, 'moon');
  assert.deepEqual(daily.places, ['moon']);
  assert.deepEqual(sanitizeDaily({ days: [], places: ['moon', 3, 'moon', 'nowhere'] }).places, ['moon']);
});

test('an errand is met at the place, near the body, beside the craft, or by a photo of the body', () => {
  const craft = craftAt(0, BODIES);
  const moon = bodyById('moon');
  const near = [moon.position[0], moon.position[1] + moon.radiusKm + 1000, moon.position[2]];
  const at = (position, more = {}) => ({ storiesNow: [], position, bodies: BODIES, craft, ...more });
  assert.equal(requestMet({ kind: 'visit', id: 'moon' }, at(near)), true);
  assert.equal(requestMet({ kind: 'visit', id: 'mars' }, at(near)), false);
  assert.equal(requestMet({ kind: 'photo', id: 'moon' }, at(near)), false);
  assert.equal(requestMet({ kind: 'photo', id: 'moon' }, at(near, { photoSubject: 'moon' })), true);
  const iss = craft.find((c) => c.id === 'iss');
  assert.equal(requestMet({ kind: 'craft', id: 'iss' }, at(iss.position)), true);
  assert.equal(requestMet({ kind: 'craft', id: 'iss' }, at(near)), false);
  assert.equal(requestMet({ kind: 'day', id: 'apollo11' }, at(near)), false);
  assert.equal(requestMet({ kind: 'day', id: 'apollo11' }, at(near, { storiesNow: ['apollo11'] })), true);
  const sputnik = craft.find((c) => c.id === 'sputnik');
  assert.equal(requestMet({ kind: 'day', id: 'sputnik' }, at(sputnik.position)), true);
  assert.equal(requestTarget({ kind: 'day', id: 'giotto' }), 'halley');
  assert.equal(requestTarget({ kind: 'day', id: 'apollo11' }), 'apollo11');
  assert.equal(requestTarget({ kind: 'visit', id: 'mars' }), 'mars');
});

test('days done are kept once, and the run of days counts back from today or yesterday', () => {
  let daily = createDaily();
  for (const day of ['2026-10-01', '2026-10-02', '2026-10-02', '2026-09-28']) daily = recordDay(daily, day);
  assert.deepEqual(daily.days, ['2026-09-28', '2026-10-01', '2026-10-02']);
  assert.equal(streak(daily, '2026-10-02'), 2);
  // Today's not done yet: the run up to yesterday still stands.
  assert.equal(streak(daily, '2026-10-03'), 2);
  assert.equal(streak(daily, '2026-10-04'), 0);
  assert.equal(streak(createDaily(), '2026-10-02'), 0);
  // 26 Sept to 2 Oct: the 28th, the 1st and the 2nd were done.
  assert.deepEqual(lastWeek(daily, '2026-10-02'), [false, false, true, false, false, true, true]);
  assert.deepEqual(sanitizeDaily({ days: ['2026-10-02', 'junk', 3, '2026-10-02'] }), { days: ['2026-10-02'], places: [] });
  assert.deepEqual(sanitizeDaily(null), createDaily());
});
