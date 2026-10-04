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
  assert.equal(apollo.text, '1969년 오늘이 그날이란다. 아폴로 11호 착륙지에 다녀와 다오.');
  assert.equal(dailyRequest('2031-10-04', far).id, 'sputnik');
  assert.equal(ANNIVERSARY_COUNT, 35);
  // Gagarin's day sends her to where he left from, and ALMA's opening to ALMA.
  assert.deepEqual([dailyRequest('2027-04-12', fresh).id, dailyRequest('2027-04-12', fresh).year], ['baikonur', 1961]);
  assert.equal(dailyRequest('2027-03-13', fresh).id, 'alma');
});

test('every day of a year has an errand whose place exists, in grandmother\'s words', () => {
  const kinds = new Set();
  for (let i = 0; i < 366; i++) {
    const date = new Date(Date.UTC(2028, 0, 1 + i));
    const day = date.toISOString().slice(0, 10);
    for (const progress of [fresh, far]) {
      const request = dailyRequest(day, progress);
      kinds.add(request.kind);
      const known = BODIES.some((b) => b.id === request.id) || CRAFT.some((c) => c.id === request.id) || STORIES.some((s) => s.id === request.id);
      assert.ok(known, `${day}: ${request.id}`);
      assert.ok(/다오\.|두마\.|궁금하구나\.$/.test(request.text) && !request.text.includes('~'), request.text);
      assert.ok(requestTarget(request), day);
    }
  }
  assert.deepEqual([...kinds].sort(), ['craft', 'day', 'photo', 'visit']);
});

test('the same day gives the same errand; a new log is sent near home, a later one where it has been', () => {
  assert.deepEqual(dailyRequest('2026-10-02', far), dailyRequest('2026-10-02', far));
  for (let d = 5; d <= 10; d++) {
    const request = dailyRequest(`2026-10-${String(d).padStart(2, '0')}`, fresh);
    assert.ok(['moon', 'iss', 'hubble'].includes(request.id), request.id);
    const later = dailyRequest(`2026-10-${String(d).padStart(2, '0')}`, far);
    assert.ok(['moon', 'mars', 'jupiter', 'io', 'voyager1'].includes(later.id), later.id);
    // A photo of a moon of another planet would be rated as the planet: never asked for.
    if (later.kind === 'photo') assert.notEqual(later.id, 'io');
  }
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
  assert.deepEqual(sanitizeDaily({ days: ['2026-10-02', 'junk', 3, '2026-10-02'] }), { days: ['2026-10-02'] });
  assert.deepEqual(sanitizeDaily(null), createDaily());
});
