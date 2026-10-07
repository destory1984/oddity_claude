import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mapStars, twinkle, cometAt, cometStart, COMET_S } from '../src/core/mapSky.js';

test('the stars round the big map stand outside its circle, the same ones every time', () => {
  const stars = mapStars(60, 380, 320, 150);
  assert.equal(stars.length, 60);
  assert.deepEqual(stars, mapStars(60, 380, 320, 150));
  for (const star of stars) {
    assert.ok(Math.hypot(star.x - 190, star.y - 160) >= 155, 'inside the circle');
    assert.ok(star.x >= 0 && star.x <= 380 && star.y >= 0 && star.y <= 320);
    assert.ok(star.size >= 0.6 && star.size <= 1.7);
  }
  assert.ok(stars.some((star) => star.cross) && stars.some((star) => !star.cross));
});

test('each star swells and falls at its own pace, never quite out', () => {
  const [a, b] = mapStars(2, 380, 320, 150);
  let low = 1; let high = 0;
  for (let t = 0; t < 20; t += 0.05) { const light = twinkle(a, t); low = Math.min(low, light); high = Math.max(high, light); }
  assert.ok(low >= 0.15 && low < 0.2 && high > 0.95 && high <= 1);
  assert.notEqual(twinkle(a, 3), twinkle(b, 3));
});

test('a comet goes by every seven to twelve seconds, across a corner, falling, clear of the circle', () => {
  const [w, h, r] = [363, 288, 134];
  const corners = new Set();
  for (let n = 0; n < 40; n += 1) {
    const gap = cometStart(n + 1) - cometStart(n);
    assert.ok(gap >= 7 && gap <= 12, `gap ${gap}`);
    const at = cometStart(n);
    const begin = cometAt(at + 0.01, w, h);
    const end = cometAt(at + COMET_S - 0.01, w, h);
    assert.ok(begin && end);
    assert.ok(end.head[1] > begin.head[1] && begin.way[1] > 0);
    assert.ok(begin.light < 0.2 && end.light < 0.2 && cometAt(at + COMET_S / 2, w, h).light === 1);
    for (let u = 0; u <= 1; u += 0.05) {
      const { head } = cometAt(at + COMET_S * Math.min(0.999, u), w, h);
      assert.ok(Math.hypot(head[0] - w / 2, head[1] - h / 2) > r + 8, `comet ${n} crosses the map`);
    }
    const mid = cometAt(at + COMET_S / 2, w, h).head;
    corners.add(`${mid[0] > w / 2 ? 'right' : 'left'} ${mid[1] > h / 2 ? 'low' : 'high'}`);
    assert.equal(cometAt(at + COMET_S + 0.5, w, h), null);
  }
  assert.equal(corners.size, 4);
  assert.equal(cometAt(0, w, h), null);
});
