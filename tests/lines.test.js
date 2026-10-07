import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  LANDED, IDLE, AGAIN, MILESTONES, freshLine, milestoneLine,
  NEAR, DEEP, REAR, PHOTO, JUMP, DOCK, FAST, SIGHTS, SIGHT_TELLS, fastLine,
} from '../src/core/lines.js';
import { MEMOS } from '../src/core/story.js';
import { BODIES } from '../src/core/bodies.js';

const short = (line, at) => {
  assert.ok(line.length <= 25, `${at}: ${line.length}`);
  assert.ok((line.match(/!/g) ?? []).length <= 1 && !line.includes('~'), at);
};

test('Sora has a line for landing on every body, different from the one for finding it', () => {
  assert.equal(Object.keys(LANDED).length, BODIES.length);
  for (const body of BODIES) {
    short(LANDED[body.id], body.id);
    assert.notEqual(LANDED[body.id], MEMOS[body.id].line, body.id);
  }
  assert.equal(new Set(Object.values(LANDED)).size, BODIES.length);
});

test('thirty idle lines, eight for coming back, three milestones: all short and all different', () => {
  assert.equal(IDLE.length, 30);
  assert.equal(AGAIN.length, 8);
  const all = [...IDLE, ...AGAIN, ...Object.values(MILESTONES)];
  all.forEach((line, i) => short(line, i));
  assert.equal(new Set(all).size, all.length);
});

test('she does not repeat herself: the next unsaid line, then nothing', () => {
  const used = new Set();
  const said = [];
  for (let i = 0; i < 9; i++) {
    const line = freshLine(AGAIN, used);
    said.push(line);
    if (line) used.add(line);
  }
  assert.deepEqual(said, [...AGAIN, null]);
});

test('a milestone line comes when the count crosses 80, 120 or 160', () => {
  assert.equal(milestoneLine(79, 80), MILESTONES[80]);
  assert.equal(milestoneLine(78, 81), MILESTONES[80]);
  assert.equal(milestoneLine(80, 81), null);
  assert.equal(milestoneLine(119, 120), MILESTONES[120]);
  assert.equal(milestoneLine(159, 161), MILESTONES[160]);
  assert.equal(milestoneLine(39, 40), null);
});

test('her lines about the world she is near, what she does and what she sees: all short, none said twice', () => {
  const all = [
    ...IDLE, ...AGAIN, ...Object.values(MILESTONES), ...Object.values(LANDED), ...Object.values(NEAR).flat(),
    ...DEEP, ...REAR, ...PHOTO, ...JUMP, ...DOCK, ...Object.values(FAST), ...Object.values(SIGHTS), ...Object.values(SIGHT_TELLS).flat(),
  ];
  all.forEach((line, i) => short(line, `${i} ${line}`));
  assert.equal(new Set(all).size, all.length);
  // Only worlds that exist have lines.
  for (const id of Object.keys(NEAR)) assert.ok(BODIES.some((b) => b.id === id), id);
  assert.ok(Object.keys(SIGHTS).length >= 26);
});

test('a speed line comes when she first passes one, ten and fifty times the speed of light', () => {
  assert.equal(fastLine(0.9, 1.1), FAST[1]);
  assert.equal(fastLine(1.1, 1.2), null);
  assert.equal(fastLine(9, 12), FAST[10]);
  assert.equal(fastLine(40, 60), FAST[50]);
  assert.equal(fastLine(60, 40), null);
});

test('Earth\'s weather she explains herself: two lines for each sight that has her word', () => {
  assert.equal(Object.keys(SIGHT_TELLS).length, 7);
  for (const [id, tells] of Object.entries(SIGHT_TELLS)) {
    assert.ok(SIGHTS[id], id);
    assert.equal(tells.length, 2, id);
  }
});
