import { test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUIZ } from '../src/core/storyQuiz.js';
import { READING_QUIZ } from '../src/core/readingQuiz.js';
import { addWords, setLanguage, t } from '../src/core/i18n.js';

// The rows are made in Korean, which is the key of each dictionary: what every question
// and choice becomes in the three other languages. (Four names stayed Korean on the
// English screen until 2026-10-07: 오퍼튜니티, 큐리오시티, 보이저 2호, 루시.)
test('in English, Japanese and Chinese no question or choice is left in Korean', () => {
  try {
    for (const lang of ['en', 'ja', 'zh']) {
      addWords(JSON.parse(fs.readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), 'utf8')), lang);
      setLanguage(lang);
      for (const [id, quiz] of [...Object.entries(QUIZ), ...Object.entries(READING_QUIZ)]) {
        const words = [quiz.question, quiz.answer, ...quiz.wrong].map((ko) => t(ko));
        for (const word of words) assert.ok(!/[가-힣]/.test(word), `${lang} ${id}: ${word}`);
        // The three choices stay three different ones.
        assert.equal(new Set(words.slice(1)).size, 3, `${lang} ${id}: ${words.slice(1).join(' / ')}`);
      }
    }
  } finally {
    setLanguage('ko');
  }
});
