import { test } from 'vitest';
import assert from 'node:assert/strict';
import { englishVoice } from '../src/core/voice.js';

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
