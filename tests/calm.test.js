import { test } from 'vitest';
import assert from 'node:assert/strict';
import { clockOffset, sleepState, wallpaperSize } from '../src/core/calm.js';

test('clock drifts slowly inside a twelve pixel circle, once each minute', () => {
  for (let minute = 0; minute < 1440; minute += 1) {
    const here = clockOffset(minute * 60000);
    assert.ok(Math.hypot(here.x, here.y) <= 12.00001);
    assert.deepEqual(here, clockOffset(minute * 60000 + 59999));
    const next = clockOffset((minute + 1) * 60000);
    assert.ok(Math.hypot(next.x - here.x, next.y - here.y) < 4);
  }
});

test('sleep countdown rounds up and fades music and veil over sixty seconds', () => {
  assert.deepEqual(sleepState(null, 0), { minutes: 0, fade: 0, music: 1, veil: 0, done: false });
  assert.equal(sleepState(900000, 1).minutes, 15);
  assert.equal(sleepState(900000, 899999).minutes, 1);
  assert.equal(sleepState(900000, 900000).fade, 0);
  assert.deepEqual(sleepState(900000, 930000), { minutes: 0, fade: 0.5, music: 0.5, veil: 0.46, done: false });
  assert.deepEqual(sleepState(900000, 990000), { minutes: 0, fade: 1, music: 0, veil: 0.92, done: true });
});

test('wallpaper uses device pixels up to three and respects both texture limits', () => {
  assert.deepEqual(wallpaperSize(402, 657, 4, 8192), { width: 1206, height: 1971 });
  assert.deepEqual(wallpaperSize(2000, 3000, 3, 8192), { width: 2730, height: 4096 });
  assert.deepEqual(wallpaperSize(2000, 3000, 3, 2048), { width: 1365, height: 2048 });
});
