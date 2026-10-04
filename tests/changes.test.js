import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CHANGES, weekChanges, dayLabel } from '../src/core/changes.js';

test('every change has a day and one short plain sentence, the newest day first', () => {
  assert.ok(CHANGES.length > 0);
  for (const c of CHANGES) {
    assert.match(c.day, /^\d{4}-\d{2}-\d{2}$/, c.text);
    assert.ok(c.text.length >= 10 && c.text.length <= 70, c.text);
    assert.match(c.text, /[.다"]$/, c.text);
  }
  for (let i = 1; i < CHANGES.length; i++) assert.ok(CHANGES[i - 1].day >= CHANGES[i].day, CHANGES[i].text);
  assert.equal(new Set(CHANGES.map((c) => c.text)).size, CHANGES.length);
});

test('the page shows the last seven days, today included', () => {
  const list = [
    { day: '2026-10-04', text: 'a' },
    { day: '2026-10-03', text: 'b' },
    { day: '2026-09-28', text: 'c' },
    { day: '2026-09-27', text: 'd' },
  ];
  assert.deepEqual(weekChanges('2026-10-04', list).map((c) => c.text), ['a', 'b', 'c']);
  assert.deepEqual(weekChanges('2026-10-05', list).map((c) => c.text), ['a', 'b']);
  // A change dated after today (the clock of the device is behind) is not shown yet.
  assert.deepEqual(weekChanges('2026-10-03', list).map((c) => c.text), ['b', 'c', 'd']);
});

test('a week with nothing new shows the last day that had something', () => {
  const list = [{ day: '2026-10-04', text: 'a' }, { day: '2026-10-04', text: 'b' }, { day: '2026-10-01', text: 'c' }];
  assert.deepEqual(weekChanges('2026-11-20', list).map((c) => c.text), ['a', 'b']);
  assert.deepEqual(weekChanges('2026-11-20', []), []);
});

test('a day is written short', () => {
  assert.equal(dayLabel('2026-10-04'), '10.4');
  assert.equal(dayLabel('2026-12-25'), '12.25');
});
