import { test } from 'vitest';
import assert from 'node:assert/strict';
import { QUIZ, quizFor } from '../src/core/storyQuiz.js';
import { STORIES } from '../src/core/stories.js';
import { STORY_DETAILS } from '../src/core/storyDetails.js';
import { createProgress, recordQuiz, sanitizeProgress } from '../src/core/progress.js';
import { BODIES } from '../src/core/bodies.js';
import { MISSIONS } from '../src/core/missions.js';

test('every story card has one question, answered by a phrase in the card itself', () => {
  assert.equal(Object.keys(QUIZ).length, STORIES.length);
  for (const story of STORIES) {
    const quiz = QUIZ[story.id];
    assert.ok(quiz, `${story.id} has no question`);
    const { detail } = STORY_DETAILS[story.id];
    assert.ok(quiz.question.endsWith('?') && quiz.question.length <= 40, story.id);
    assert.ok(detail.includes(quiz.answer), `${story.id}: "${quiz.answer}" is not in the card`);
    assert.equal(quiz.wrong.length, 2, story.id);
    // A wrong choice must not be something the card says, or it could be argued right.
    for (const wrong of quiz.wrong) {
      assert.ok(!detail.includes(wrong), `${story.id}: "${wrong}" is in the card`);
      assert.ok(!quiz.answer.includes(wrong) && !wrong.includes(quiz.answer), `${story.id}: "${wrong}" overlaps the answer`);
    }
    assert.equal(new Set([quiz.answer, ...quiz.wrong]).size, 3, story.id);
    // The question does not give the answer away.
    assert.ok(!quiz.question.includes(quiz.answer), story.id);
  }
});

test('the three choices come in a steady order, the answer not always first', () => {
  const places = new Set();
  for (const story of STORIES) {
    const a = quizFor(story.id);
    assert.deepEqual(a, quizFor(story.id));
    assert.equal(a.choices.length, 3);
    assert.equal(a.choices[a.right], QUIZ[story.id].answer);
    places.add(a.right);
  }
  assert.deepEqual([...places].sort(), [0, 1, 2]);
  assert.equal(quizFor('nowhere'), null);
});

test('a question answered right is remembered once; junk in storage is dropped', () => {
  const once = recordQuiz(createProgress(), 'apollo11');
  assert.deepEqual(once.quiz, ['apollo11']);
  assert.equal(recordQuiz(once, 'apollo11'), once);
  const read = sanitizeProgress({ quiz: ['apollo11', 'apollo11', 'forged', 2] }, BODIES, MISSIONS, STORIES);
  assert.deepEqual(read.quiz, ['apollo11']);
  assert.deepEqual(createProgress().quiz, []);
});
