import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  ratePhoto, dayOf, sendPostcard, arrivedReplies, replyFor, starText,
} from '../src/core/postcard.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { lookAtDirection, rotateLocal } from '../src/core/orientation.js';

const DEG = Math.PI / 180;
const moon = bodyById('moon');
const sun = bodyById('sun');
const unit = (v) => v.map((n) => n / Math.hypot(...v));
const sunward = unit(sun.position.map((n, i) => n - moon.position[i]));
// A camera `km` from the Moon's centre on its sunlit side, turned `yaw` off it.
function shot({ km = moon.radiusKm * 4, yaw = 0, heroVisible = false, from = sunward, bodies = BODIES } = {}) {
  const position = moon.position.map((n, i) => n + from[i] * km);
  const facing = lookAtDirection(moon.position.map((n, i) => n - position[i]));
  return ratePhoto({
    position, orientation: rotateLocal(facing, yaw, 0), fovY: 60 * DEG, aspect: 16 / 9, heroVisible, bodies,
  });
}

test('a photo is rated on size, place, light and company: two of four make one star', () => {
  // The full Moon dead centre, half the view high, alone: size and light.
  const plain = shot();
  assert.equal(plain.subject, 'moon');
  assert.deepEqual(plain.met, ['size', 'light']);
  assert.equal(plain.stars, 1);
  // Seora in the picture: three of four.
  assert.equal(shot({ heroVisible: true }).stars, 2);
  // And the Moon off to a third: all four.
  const best = shot({ heroVisible: true, yaw: 25 * DEG });
  assert.deepEqual(best.met, ['size', 'place', 'light', 'company']);
  assert.equal(best.stars, 3);
});

test('a subject too small or too large loses the size mark, and a half-lit one the light mark', () => {
  assert.ok(!shot({ km: moon.radiusKm * 30, bodies: [sun, moon] }).met.includes('size'));
  assert.ok(!shot({ km: moon.radiusKm * 1.2 }).met.includes('size'));
  // From the side, a quarter-lit disc: neither bright nor a thin crescent.
  const across = unit([sunward[2], 0, -sunward[0]]);
  const side = unit(sunward.map((n, i) => -0.5 * n + 0.866 * across[i]));
  assert.ok(!shot({ from: side }).met.includes('light'));
  // From behind: a thin backlit crescent counts.
  assert.ok(shot({ from: sunward.map((n) => -n) }).met.includes('light'));
});

test('a photo of nothing gets no star and no subject; a moon counts as its planet', () => {
  const away = ratePhoto({
    position: [0, 5e9, 0], orientation: lookAtDirection([0, 1, 0]), fovY: 60 * DEG, aspect: 1, heroVisible: true, bodies: BODIES,
  });
  assert.deepEqual(away, { stars: 0, subject: null, met: [] });
  const io = bodyById('io');
  const position = io.position.map((n, i) => n + (i === 1 ? io.radiusKm * 3 : 0));
  const rated = ratePhoto({
    position, orientation: lookAtDirection([0, -1, 0]), fovY: 40 * DEG, aspect: 1, heroVisible: false, bodies: BODIES,
  });
  assert.equal(rated.subject, 'jupiter');
});

test('a postcard is sent once, and its reply has come on any later day', () => {
  const album = [{ where: 'a' }, { where: 'b' }];
  const sent = sendPostcard(album, 1, '2026-10-02');
  assert.deepEqual(sent, [{ where: 'a' }, { where: 'b', sent: '2026-10-02' }]);
  assert.deepEqual(sendPostcard(sent, 1, '2026-10-05'), sent);
  assert.deepEqual(arrivedReplies(sent, '2026-10-02'), []);
  assert.deepEqual(arrivedReplies(sent, '2026-10-03'), [1]);
  // A week away loses nothing.
  assert.deepEqual(arrivedReplies(sent, '2026-10-10'), [1]);
  assert.deepEqual(arrivedReplies([{ sent: '2026-10-02', reply: '고맙다.' }], '2026-10-03'), []);
  assert.equal(dayOf(new Date(2026, 9, 2, 23, 59)), '2026-10-02');
  assert.equal(dayOf(new Date(2026, 0, 5)), '2026-01-05');
});

test("grandmother's reply speaks of the place, then gives her stars", () => {
  const jupiter = replyFor({ missions: [], rate: { stars: 3, subject: 'jupiter' } });
  assert.equal(jupiter, '그 붉은 점은 내가 처음 봤을 때보다 작아졌단다. 별 셋. 이건 액자에 넣어야겠다.');
  // A mission met comes before the place.
  assert.ok(replyFor({ missions: ['eclipse'], rate: { stars: 1, subject: 'moon' } }).startsWith('나는 평생 개기일식을 못 봤단다.'));
  // No subject: plain lines in turn. An old photo without a rating gets no stars.
  assert.notEqual(replyFor({ missions: [], rate: { stars: 0, subject: null } }, 0), replyFor({ missions: [], rate: { stars: 0, subject: null } }, 1));
  assert.ok(!replyFor({ missions: [] }, 0).includes('별'.concat(' 하나')));
  for (const id of BODIES.filter((b) => b.kind !== 'moon' || b.id === 'moon').map((b) => b.id)) {
    const text = replyFor({ missions: [], rate: { stars: 2, subject: id } });
    assert.ok(text.length <= 200 && !text.includes('~'), id);
    // Her own way of speaking, not the plain fallback.
    assert.ok(!text.startsWith('별이 참 많구나'), id);
  }
  assert.equal(starText(2), '★★☆');
});
