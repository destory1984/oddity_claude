import { test } from 'vitest';
import assert from 'node:assert/strict';
import { TIME_SCALE } from '../src/core/bodies.js';
import { TOUR_EPOCH_MS, skyAnchor, clockTime } from '../src/core/clock.js';

test('two players at the same moment have the same game time, whenever they opened the game', () => {
  const now = Date.UTC(2026, 9, 19, 6, 30);
  assert.equal(clockTime(skyAnchor('tour', now), now), clockTime(skyAnchor('tour', now - 3600000), now));
  // Fifty times as fast as the real clock.
  assert.equal(clockTime(TOUR_EPOCH_MS, TOUR_EPOCH_MS + 2000), 2 * TIME_SCALE);
  assert.equal(clockTime(TOUR_EPOCH_MS, TOUR_EPOCH_MS - 5000), 0);
});

test("today's sky counts from midnight in Korea, the same in every time zone", () => {
  // 2026-10-19 15:30 in Korea is 06:30 UTC; midnight in Korea is 15:00 UTC the day before.
  assert.equal(skyAnchor('today', Date.UTC(2026, 9, 19, 6, 30)), Date.UTC(2026, 9, 18, 15, 0));
  assert.equal(skyAnchor('today', Date.UTC(2026, 9, 19, 14, 59)), Date.UTC(2026, 9, 18, 15, 0));
  assert.equal(skyAnchor('today', Date.UTC(2026, 9, 19, 15, 0)), Date.UTC(2026, 9, 19, 15, 0));
  assert.equal(skyAnchor('tour', Date.UTC(2026, 9, 19, 6, 30)), TOUR_EPOCH_MS);
});
