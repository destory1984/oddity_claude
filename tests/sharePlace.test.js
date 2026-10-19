import { test } from 'vitest';
import assert from 'node:assert/strict';
import { encodePlace, decodePlace, SHARE_BASE } from '../src/core/sharePlace.js';

const IDS = ['earth', 'moon', 'saturn'];
const PLACE = {
  spot: { body: 'earth', at: [18640.1, 7248.9, 4.3], ahead: [-0.932, -0.362, 0], above: [-0.362, 0.932, 0] },
  sky: { layout: 'tour', openedAt: 1792379325451, simTime: 1227.4 },
};

test('a place and its sky go into one short line and come back out of it', () => {
  const line = encodePlace(PLACE);
  assert.match(line, /^[a-z0-9.-]+$/);
  // (The first try took 107 characters, two lines of a chat bubble.)
  assert.ok(line.length <= 50, `${line.length}: ${line}`);
  const back = decodePlace(line, IDS);
  assert.equal(back.spot.body, 'earth');
  assert.deepEqual(back.spot.at, [18640, 7249, 4]);
  assert.ok(back.spot.ahead.every((n, i) => Math.abs(n - PLACE.spot.ahead[i]) < 0.002));
  assert.ok(back.spot.above.every((n, i) => Math.abs(n - PLACE.spot.above[i]) < 0.002));
  assert.deepEqual(back.sky, { layout: 'tour', openedAt: 1792379325000, simTime: 1227 });
  assert.equal(decodePlace(encodePlace({ ...PLACE, sky: { ...PLACE.sky, layout: 'today' } }), IDS).sky.layout, 'today');
});

test('a line that is not a place is turned away', () => {
  const good = encodePlace(PLACE).split('.');
  const bad = (i, value) => good.map((p, j) => (j === i ? value : p)).join('.');
  for (const line of [null, '', 'earth', bad(0, 'pluto'), bad(2, 'x!'), bad(2, ''), good.map((p, j) => (j >= 4 && j <= 6 ? '0' : p)).join('.'),
    bad(10, 'q'), bad(11, '-5'), good.slice(1).join('.'), 'x'.repeat(300)]) {
    assert.equal(decodePlace(line, IDS), null, String(line));
  }
});

test('the link is the published game, whatever page it is sent from', () => {
  assert.equal(SHARE_BASE, 'https://destory1984.github.io/oddity_claude/');
});
