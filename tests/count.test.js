import { test } from 'vitest';
import assert from 'node:assert/strict';
import { COUNT_AT, shouldCount, plainReferrer, countUrl } from '../src/core/count.js';

test('only the real site is counted, once, and never a test tool', () => {
  assert.equal(shouldCount({ hostname: 'destory1984.github.io' }), true);
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'old.test', 'app.localhost', '']) assert.equal(shouldCount({ hostname }), false);
  assert.equal(shouldCount({ hostname: 'destory1984.github.io', inFrame: true }), false);
  assert.equal(shouldCount({ hostname: 'destory1984.github.io', webdriver: true }), false);
});

test('a referrer is sent without its query and fragment', () => {
  assert.equal(plainReferrer('https://www.google.com/search?q=who+am+i#top'), 'https://www.google.com/search');
  assert.equal(plainReferrer('https://github.com/destory1984/oddity_claude'), 'https://github.com/destory1984/oddity_claude');
  assert.equal(plainReferrer(''), '');
  assert.equal(plainReferrer('android-app://com.example/'), '');
  assert.equal(plainReferrer('not a url'), '');
});

test('the request tells the path, the title, the referrer and the screen, and nothing else', () => {
  const url = new URL(countUrl({ path: '/oddity_claude/', title: 'Space Oddity', referrer: 'https://a.example/x?y=1', screen: { width: 390, height: 844, scale: 3 }, rnd: 'abc' }));
  assert.equal(url.origin + url.pathname, COUNT_AT);
  assert.deepEqual([...url.searchParams.keys()], ['p', 't', 'r', 's', 'rnd']);
  assert.equal(url.searchParams.get('p'), '/oddity_claude/');
  assert.equal(url.searchParams.get('r'), 'https://a.example/x');
  assert.equal(url.searchParams.get('s'), '390,844,3');
  assert.ok(!countUrl({ path: '/', rnd: 1 }).includes('s='));
});
