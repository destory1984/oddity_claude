import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  LANDED, IDLE, AGAIN, MILESTONES, freshLine, milestoneLine,
} from '../src/core/lines.js';
import { MEMOS } from '../src/core/story.js';
import { BODIES } from '../src/core/bodies.js';

const short = (line, at) => {
  assert.ok(line.length <= 25, `${at}: ${line.length}`);
  assert.ok((line.match(/!/g) ?? []).length <= 1 && !line.includes('~'), at);
};

test('Seora has a line for landing on every body, different from the one for finding it', () => {
  assert.equal(Object.keys(LANDED).length, BODIES.length);
  for (const body of BODIES) {
    short(LANDED[body.id], body.id);
    assert.notEqual(LANDED[body.id], MEMOS[body.id].line, body.id);
  }
  assert.equal(new Set(Object.values(LANDED)).size, BODIES.length);
});

test('twelve idle lines, eight for coming back, three milestones: all short and all different', () => {
  assert.equal(IDLE.length, 12);
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
