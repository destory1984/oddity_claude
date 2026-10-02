import { test } from 'vitest';
import assert from 'node:assert/strict';
import { READING_QUIZ, readingQuizFor, readingKey } from '../src/core/readingQuiz.js';
import { READINGS } from '../src/core/readings.js';
import { BODIES } from '../src/core/bodies.js';
import { CRAFT } from '../src/core/craft.js';
import { STORIES } from '../src/core/stories.js';
import { MISSIONS } from '../src/core/missions.js';
import { recordQuiz, createProgress, sanitizeProgress } from '../src/core/progress.js';

test('every reading has one question, answered by a phrase in the reading itself', () => {
  assert.deepEqual(Object.keys(READING_QUIZ), Object.keys(READINGS));
  assert.equal(Object.keys(READING_QUIZ).length, 57);
  for (const [id, quiz] of Object.entries(READING_QUIZ)) {
    const text = READINGS[id];
    assert.ok(quiz.question.endsWith('?') && quiz.question.length <= 40, id);
    assert.ok(text.includes(quiz.answer), `${id}: "${quiz.answer}" is not in the reading`);
    assert.equal(quiz.wrong.length, 2, id);
    for (const wrong of quiz.wrong) {
      assert.ok(!text.includes(wrong), `${id}: "${wrong}" is in the reading`);
      assert.ok(!quiz.answer.includes(wrong) && !wrong.includes(quiz.answer), `${id}: "${wrong}" overlaps the answer`);
    }
    assert.equal(new Set([quiz.answer, ...quiz.wrong]).size, 3, id);
    assert.ok(!quiz.question.includes(quiz.answer), id);
  }
});

test('the three choices come in a steady order, the answer not always first', () => {
  const places = new Set();
  for (const id of Object.keys(READINGS)) {
    const a = readingQuizFor(id);
    assert.deepEqual(a, readingQuizFor(id));
    assert.equal(a.choices[a.right], READING_QUIZ[id].answer);
    places.add(a.right);
  }
  assert.deepEqual([...places].sort(), [0, 1, 2]);
  assert.equal(readingQuizFor('apollo11'), null);
});

test('a reading question answered right is kept beside the story ones', () => {
  const once = recordQuiz(recordQuiz(createProgress(), readingKey('saturn')), readingKey('hubble'));
  assert.deepEqual(once.quiz, ['r:saturn', 'r:hubble']);
  const read = sanitizeProgress({ quiz: ['r:saturn', 'r:hubble', 'apollo11', 'forged', 'r:saturn', 'saturn', 'r:apollo11'] }, BODIES, MISSIONS, STORIES, CRAFT);
  assert.deepEqual(read.quiz, ['r:saturn', 'r:hubble', 'apollo11']);
  // Voyager 1 is a craft and a story place: the two questions are kept apart.
  const both = sanitizeProgress({ quiz: ['voyager1'] }, BODIES, MISSIONS, STORIES, CRAFT);
  assert.deepEqual(both.quiz, ['voyager1']);
  assert.ok(STORIES.some((s) => s.id === 'voyager1') && CRAFT.some((c) => c.id === 'voyager1'));
  assert.ok(!both.quiz.includes(readingKey('voyager1')));
});
