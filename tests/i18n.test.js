import { test, afterEach } from 'vitest';
import assert from 'node:assert/strict';
import { pickLanguage, t, addWords, englishOf, setLanguage, language, words, named, counted, pageLanguage } from '../src/core/i18n.js';
import '../src/i18n/en.js';
import '../src/i18n/ja.js';
import '../src/i18n/zh.js';

afterEach(() => setLanguage('ko'));

test('the language is the player\'s choice, else the device\'s: Korean, Japanese and Chinese devices their own, others English', () => {
  assert.equal(pickLanguage('en', 'ko-KR'), 'en');
  assert.equal(pickLanguage('ko', 'en-US'), 'ko');
  assert.equal(pickLanguage(null, 'ko-KR'), 'ko');
  assert.equal(pickLanguage(null, 'ko'), 'ko');
  assert.equal(pickLanguage(null, 'en-US'), 'en');
  assert.equal(pickLanguage(null, 'ja-JP'), 'ja');
  assert.equal(pickLanguage(null, 'zh-CN'), 'zh');
  assert.equal(pickLanguage(null, 'zh-Hant-TW'), 'zh');
  assert.equal(pickLanguage('ja', 'ko-KR'), 'ja');
  assert.equal(pickLanguage('zh', 'en-US'), 'zh');
  assert.equal(pickLanguage('xx', 'fr'), 'en');
  // The tests themselves run in Korean.
  assert.equal(language(), 'ko');
});

test('a sentence is given in the language in use; one not in the dictionary stays Korean', () => {
  addWords({ '시험 문장입니다.': 'A test sentence.', '{}에 도킹했습니다. {}번째입니다.': 'Docked with {0}, for time number {1}.', '{}{} 바라봅니다.': 'Facing {0}.' });
  const name = '허블';
  assert.equal(t('시험 문장입니다.'), '시험 문장입니다.');
  assert.equal(t`${name}에 도킹했습니다. ${3}번째입니다.`, '허블에 도킹했습니다. 3번째입니다.');
  setLanguage('en');
  assert.equal(t('시험 문장입니다.'), 'A test sentence.');
  assert.equal(t('사전에 없는 문장'), '사전에 없는 문장');
  assert.equal(t`${'Hubble'}에 도킹했습니다. ${3}번째입니다.`, 'Docked with Hubble, for time number 3.');
  // A particle has no English: its value is left out.
  assert.equal(t`${'Mars'}${'를'} 바라봅니다.`, 'Facing Mars.');
  assert.equal(t`${'Mars'} 없는 틀`, 'Mars 없는 틀');
  // "the" goes before the Sun and the Moon only.
  addWords({ '{} 상공 시험': 'Over {the0}' });
  assert.equal(t`${'Moon'} 상공 시험`, 'Over the Moon');
  assert.equal(t`${'Mars'} 상공 시험`, 'Over Mars');
});

test('a text of several lines is found whole or line by line', () => {
  addWords({ '첫 줄입니다.\n둘째 줄입니다.': 'The first line.\nThe second line.', '따로 있는 줄.': 'A line of its own.' });
  assert.equal(englishOf('첫 줄입니다.\n둘째 줄입니다.'), 'The first line.\nThe second line.');
  assert.equal(englishOf('따로 있는 줄.\n둘째 줄입니다.'), 'A line of its own.\nThe second line.');
  assert.equal(englishOf('따로 있는 줄.\n사전에 없는 줄'), null);
  assert.equal(englishOf('사전에 없는 줄'), null);
});

test('every sentence in another language names only values its Korean has, and none is empty or still Korean', () => {
  for (const of of ['en', 'ja', 'zh']) {
    for (const [ko, en] of words(of)) {
      assert.ok(en.trim().length > 0, `${of}: ${ko}`);
      assert.ok(!/[가-힣]/.test(en), `${of}: ${ko} → ${en}`);
      const slots = ko.split('{}').length - 1;
      for (const [, n] of en.matchAll(/\{(?:the)?(\d+)\}/g)) assert.ok(Number(n) < slots, `${of}: ${ko} → ${en}`);
      if (of !== 'en') assert.ok(!en.includes('{the'), `${of}: ${ko} → ${en}`);
    }
  }
});

test('Japanese and Chinese have each their own dictionary, names and counting words', () => {
  addWords({ '시험 문장입니다.': '試験の文です。', '시험별': '試験星', '{}에 도킹했습니다. {}번째입니다.': '{0}にドッキングしました。{1}回目です。' }, 'ja');
  addWords({ '시험 문장입니다.': '这是一句测试。' }, 'zh');
  setLanguage('ja');
  assert.equal(pageLanguage(), 'ja');
  assert.equal(t('시험 문장입니다.'), '試験の文です。');
  assert.equal(t`${'ハッブル'}에 도킹했습니다. ${3}번째입니다.`, 'ハッブルにドッキングしました。3回目です。');
  assert.equal(counted('4.2만km'), '4.2万km');
  assert.equal(counted('5.9억km (39.5AU)'), '5.9億km (39.5AU)');
  assert.equal(counted('84년'), '84年');
  // A name goes by the dictionary and keeps its English beside it; one not there goes by its English.
  assert.deepEqual(named([{ name: '시험별', nameEn: 'Test Star' }, { name: '없는별', nameEn: 'No Star' }, { name: t('시험별'), nameEn: 'Test Star' }]),
    [{ name: '試験星', nameEn: 'Test Star' }, { name: 'No Star', nameEn: '' }, { name: '試験星', nameEn: 'Test Star' }]);
  setLanguage('zh');
  assert.equal(pageLanguage(), 'zh-Hans');
  assert.equal(t('시험 문장입니다.'), '这是一句测试。');
  assert.equal(counted('5.9억km'), '5.9亿km');
  assert.equal(counted('385.0조km'), '385.0万亿km');
  setLanguage('en');
  assert.equal(counted('4.2만km'), '4.2만km');
  assert.deepEqual(named([{ name: '시험별', nameEn: 'Test Star' }]), [{ name: 'Test Star', nameEn: '' }]);
  setLanguage('ko');
  assert.equal(counted('4.2만km'), '4.2만km');
  assert.equal(pageLanguage(), 'ko');
});
