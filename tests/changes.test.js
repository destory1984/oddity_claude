import { test } from 'vitest';
import assert from 'node:assert/strict';
import { CHANGES, changesUntil, firstLines, PAGE_LINES, dayLabel, startedLine, STARTED } from '../src/core/changes.js';

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

test('the page shows every change up to today, the newest first', () => {
  const list = [
    { day: '2026-10-04', text: 'a' },
    { day: '2026-10-03', text: 'b' },
    { day: '2026-09-28', text: 'c' },
    { day: '2026-09-27', text: 'd' },
  ];
  assert.deepEqual(changesUntil('2026-11-20', list).map((c) => c.text), ['a', 'b', 'c', 'd']);
  // A change dated after today (the clock of the device is behind) is not shown yet.
  assert.deepEqual(changesUntil('2026-10-03', list).map((c) => c.text), ['b', 'c', 'd']);
  assert.deepEqual(changesUntil('2026-11-20', []), []);
});

test('a hundred lines are shown at a time, and the button for more stays while any are left', () => {
  assert.equal(PAGE_LINES, 100);
  const list = Array.from({ length: 230 }, (_, i) => i);
  assert.deepEqual(firstLines(list), { lines: list.slice(0, 100), more: true });
  assert.equal(firstLines(list, 200).lines.length, 200);
  assert.equal(firstLines(list, 200).more, true);
  assert.deepEqual(firstLines(list, 300), { lines: list, more: false });
  assert.deepEqual(firstLines(list.slice(0, 100)), { lines: list.slice(0, 100), more: false });
});

test('a day is written short', () => {
  assert.equal(dayLabel('2026-10-04'), '10.4');
  assert.equal(dayLabel('2026-12-25'), '12.25');
});

test('the page tells the day the making began and how many days it has been, the first day being day 1', () => {
  assert.equal(STARTED, '2026-09-30');
  assert.equal(startedLine('2026-09-30'), '만들기 시작한 날: 2026년 9월 30일\n우주 탐험 오늘로 1일째');
  assert.equal(startedLine('2026-10-04'), '만들기 시작한 날: 2026년 9월 30일\n우주 탐험 오늘로 5일째');
  assert.equal(startedLine('2029-06-26'), '만들기 시작한 날: 2026년 9월 30일\n우주 탐험 오늘로 1,001일째');
  // A clock set before the start tells only the day.
  assert.equal(startedLine('2026-09-01'), '만들기 시작한 날: 2026년 9월 30일');
});
