import { test } from 'vitest';
import assert from 'node:assert/strict';
import { englishVoice, koreanVoice, speaksKorean, callFor, KOREAN_CALLS } from '../src/core/voice.js';

const v = (name, lang, localService = true) => ({ name, lang, localService });

test('the calls are said by an English voice, American first, even on a Korean device', () => {
  const korean = v('Heami', 'ko-KR');
  assert.equal(englishVoice([korean, v('Hazel', 'en-GB'), v('Zira', 'en-US')]).name, 'Zira');
  assert.equal(englishVoice([korean, v('Hazel', 'en-GB')]).name, 'Hazel');
  assert.equal(englishVoice([korean, v('Karen', 'en-AU'), v('Hazel', 'en-GB')]).name, 'Hazel');
  // Android writes the language with an underscore.
  assert.equal(englishVoice([korean, v('English United States', 'en_US')]).name, 'English United States');
});

test('a voice on the device comes before one from the network; none when there is no English', () => {
  assert.equal(englishVoice([v('Google US English', 'en-US', false), v('David', 'en-US')]).name, 'David');
  assert.equal(englishVoice([v('Google US English', 'en-US', false), v('Hazel', 'en-GB')]).name, 'Google US English');
  assert.equal(englishVoice([v('Heami', 'ko-KR'), v('Kyoko', 'ja-JP')]), null);
  assert.equal(englishVoice([]), null);
});

test('a device set to Korean hears the calls in Korean, counted 삼, 이, 일, 영', () => {
  const voices = [v('Zira', 'en-US'), v('Google 한국의', 'ko-KR', false), v('Heami', 'ko-KR')];
  assert.equal(speaksKorean('ko-KR'), true);
  assert.equal(speaksKorean('ko'), true);
  assert.equal(speaksKorean('en-US'), false);
  assert.equal(speaksKorean(undefined), false);
  assert.equal(koreanVoice(voices).name, 'Heami');
  assert.equal(koreanVoice([v('Zira', 'en-US')]), null);
  const docking = callFor('Docking in progress.', 'ko-KR', voices);
  assert.deepEqual([docking.text, docking.lang, docking.voice.name], ['도킹 준비 중.', 'ko-KR', 'Heami']);
  assert.equal(callFor('Landing in progress.', 'ko-KR', voices).text, '착륙 준비 중.');
  assert.deepEqual(['3', '2', '1', '0'].map((n) => callFor(n, 'ko-KR', voices).text), ['삼', '이', '일', '영']);
  assert.equal(KOREAN_CALLS[5], '오');
  // No Korean voice on the device: the language alone is set.
  assert.deepEqual(callFor('3', 'ko-KR', [v('Zira', 'en-US')]), { text: '삼', lang: 'ko-KR', voice: null });
});

test('any other device hears them in English as before', () => {
  const voices = [v('Heami', 'ko-KR'), v('Zira', 'en-US')];
  const docking = callFor('Docking in progress.', 'en-US', voices);
  assert.deepEqual([docking.text, docking.lang, docking.voice.name], ['Docking in progress.', 'en-US', 'Zira']);
  assert.equal(callFor('3', 'ja-JP', voices).text, '3');
  assert.deepEqual(callFor('3', 'en-GB', []), { text: '3', lang: 'en-US', voice: null });
});
