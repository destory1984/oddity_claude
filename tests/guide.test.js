import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createGuide, updateGuide, guideGoal, skipGuide, GUIDE_STEPS } from '../src/core/guide.js';
import { createProgress } from '../src/core/progress.js';

const fresh = createProgress();
const AHEAD = [0, 0, 1];
const MOON = [0, 0, 1];
const turnedBy = (deg) => [Math.sin((deg * Math.PI) / 180), 0, Math.cos((deg * Math.PI) / 180)];
const tick = (guide, heading, progress = fresh, toMoon = MOON) => updateGuide(guide, { heading, toMoon, progress });

test('a newcomer starts at the first of five steps', () => {
  const guide = createGuide(fresh, false);
  assert.equal(guide.step, 'look');
  assert.deepEqual(GUIDE_STEPS, ['look', 'face', 'fly', 'land', 'photo']);
});

test('someone who already landed on the Moon, or skipped before, gets no guide', () => {
  assert.equal(createGuide({ ...fresh, landed: ['moon'] }, false).step, null);
  assert.equal(createGuide(fresh, true).step, null);
  assert.equal(guideGoal(createGuide(fresh, true)), null);
});

test('looking around more than 20 degrees finishes the first step', () => {
  let guide = tick(createGuide(fresh, false), AHEAD);
  guide = tick(guide, turnedBy(12));
  assert.equal(guide.step, 'look');
  guide = tick(guide, turnedBy(24));
  // 24 degrees off the Moon: next is to face it.
  assert.equal(guide.step, 'face');
});

test('facing the Moon within 10 degrees moves on to flying, turning far away goes back', () => {
  let guide = { ...createGuide(fresh, false), step: 'face' };
  guide = tick(guide, turnedBy(15));
  assert.equal(guide.step, 'face');
  guide = tick(guide, turnedBy(8));
  assert.equal(guide.step, 'fly');
  guide = tick(guide, turnedBy(25));
  assert.equal(guide.step, 'fly');
  guide = tick(guide, turnedBy(40));
  assert.equal(guide.step, 'face');
});

test('discovering the Moon asks for a landing, landing asks for the photo', () => {
  let guide = { ...createGuide(fresh, false), step: 'fly' };
  guide = tick(guide, AHEAD, { ...fresh, discovered: ['earth', 'moon'] });
  assert.equal(guide.step, 'land');
  guide = tick(guide, AHEAD, { ...fresh, discovered: ['earth', 'moon'], landed: ['moon'] });
  assert.equal(guide.step, 'photo');
});

test('a landing made out of order skips straight to the photo, even from the first step', () => {
  const guide = tick(createGuide(fresh, false), AHEAD, { ...fresh, discovered: ['earth', 'moon'], landed: ['moon'] });
  assert.equal(guide.step, 'photo');
});

test("the Moon already found at the start (today's sky can open beside it): look and face are still taught", () => {
  const found = { ...fresh, discovered: ['earth', 'moon'] };
  let guide = tick(createGuide(found, false), AHEAD, found, turnedBy(90));
  assert.equal(guide.step, 'look');
  guide = tick(guide, turnedBy(25), found, turnedBy(90));
  assert.equal(guide.step, 'face');
  // Facing it, there is nothing left to discover: go and land.
  guide = tick(guide, turnedBy(88), found, turnedBy(90));
  assert.equal(guide.step, 'land');
  // Asked to land, turning away does not send the player back.
  guide = tick(guide, turnedBy(0), found, turnedBy(90));
  assert.equal(guide.step, 'land');
});

test('the Earthrise photo ends the guide and says so once', () => {
  const done = { discovered: ['earth', 'moon'], landed: ['moon'], photos: ['earthrise'] };
  let guide = { ...createGuide(fresh, false), step: 'photo' };
  guide = tick(guide, AHEAD, done);
  assert.equal(guide.step, null);
  assert.equal(guide.finished, true);
  assert.equal(tick(guide, AHEAD, done).finished, false);
});

test('skipping turns the guide off', () => {
  const guide = skipGuide(createGuide(fresh, false));
  assert.equal(guide.step, null);
  assert.equal(guideGoal(guide), null);
});

test('each step has a goal line; all but the first point at the Moon', () => {
  GUIDE_STEPS.forEach((step, index) => {
    const goal = guideGoal({ step }, false);
    assert.equal(goal.count, `${index + 1}/5`);
    assert.ok(goal.text.length > 5 && goal.text.length <= 45, goal.text);
    assert.equal(goal.targetId, step === 'look' ? null : 'moon');
  });
});

test('touch screens are told about buttons, not keys', () => {
  assert.match(guideGoal({ step: 'fly' }, false).text, /W/);
  assert.doesNotMatch(guideGoal({ step: 'fly' }, true).text, /W/);
  assert.doesNotMatch(guideGoal({ step: 'photo' }, true).text, /P 키/);
});
