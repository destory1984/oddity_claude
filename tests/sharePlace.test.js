import { test } from 'vitest';
import assert from 'node:assert/strict';
import { encodeSpot, decodeSpot, encodeSky, decodeSky } from '../src/core/sharePlace.js';

const IDS = ['earth', 'moon', 'saturn'];

test('a place goes into one short line and comes back out of it', () => {
  const spot = { body: 'moon', at: [26.31, 1833.24, -150.4], ahead: [0.16843, -0.19991, 0.96521], above: [0.0344, 0.97982, 0.197] };
  const line = encodeSpot(spot);
  assert.equal(line, 'moon_26.3_1833.2_-150.4_0.168_-0.2_0.965_0.034_0.98_0.197');
  assert.match(line, /^[a-z0-9._-]+$/i);
  const back = decodeSpot(line, IDS);
  assert.equal(back.body, 'moon');
  assert.deepEqual(back.at, [26.3, 1833.2, -150.4]);
  assert.ok(Math.abs(Math.hypot(...back.ahead) - 1) < 1e-9 && Math.abs(Math.hypot(...back.above) - 1) < 1e-9);
  assert.ok(back.ahead.every((n, i) => Math.abs(n - spot.ahead[i]) < 0.002));
});

test('a line that is not a place is turned away', () => {
  for (const line of [null, '', 'moon', 'pluto_1_2_3_0_0_1_0_1_0', 'moon_1_2_3_0_0_1_0_1', 'moon_1_2_x_0_0_1_0_1_0',
    'moon_1_2_3_0_0_0_0_1_0', 'moon_1_2_3_0_0_1_0_0_1', 'moon_1e12_2_3_0_0_1_0_1_0', 'moon_1__3_0_0_1_0_1_0', 'x'.repeat(300)]) {
    assert.equal(decodeSpot(line, IDS), null, String(line));
  }
});

test('the sky goes along: the layout, when the game was opened, the game clock', () => {
  const line = encodeSky({ layout: 'today', openedAt: 1797600000123, simTime: 3190.04 });
  assert.equal(line, 'd.1797600000123.3190');
  assert.deepEqual(decodeSky(line), { layout: 'today', openedAt: 1797600000123, simTime: 3190 });
  assert.deepEqual(decodeSky(encodeSky({ layout: 'tour', openedAt: 5, simTime: 12.5 })), { layout: 'tour', openedAt: 5, simTime: 12.5 });
  for (const bad of [null, '', 'x.1.2', 'd.1', 'd.-1.2', 'd.1.2.3.4', 'd.1.e5']) assert.equal(decodeSky(bad), null, String(bad));
});
