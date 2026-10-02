import { test } from 'vitest';
import assert from 'node:assert/strict';
import { READINGS, bodyFacts } from '../src/core/readings.js';
import { BODY_DATA } from '../src/core/bodies.js';
import { CRAFT } from '../src/core/craft.js';
import { STORIES } from '../src/core/stories.js';
import { STORY_DETAILS } from '../src/core/storyDetails.js';
import { STORY_MORE } from '../src/core/storyMore.js';

test('every body and every craft has something to read: two paragraphs, plain sentences', () => {
  const ids = [...BODY_DATA.map((b) => b.id), ...CRAFT.map((c) => c.id)];
  assert.equal(ids.length, 57);
  assert.deepEqual(Object.keys(READINGS).sort(), [...ids].sort());
  for (const id of ids) {
    const text = READINGS[id];
    const paragraphs = text.split('\n\n');
    assert.equal(paragraphs.length, 2, id);
    assert.ok(text.length >= 180, `${id} ${text.length}`);
    for (const p of paragraphs) assert.ok(p.endsWith('다.'), `${id}: ${p.slice(-12)}`);
    // No tilde (a strikethrough in a blog editor), no doubled spaces.
    assert.ok(!text.includes('~') && !text.includes('  '), id);
  }
});

test('a reading opens with its subject, by the name the game uses', () => {
  for (const item of [...BODY_DATA, ...CRAFT]) {
    const short = item.name.replace(/ (혜성|우주망원경|우주정거장|X선 망원경|태양 탐사선)$/, '');
    assert.ok(READINGS[item.id].slice(0, 30).includes(short), `${item.id}: ${READINGS[item.id].slice(0, 30)}`);
  }
});

test("a body's numbers come from the table the game flies by", () => {
  const by = (id) => BODY_DATA.find((b) => b.id === id);
  assert.deepEqual(bodyFacts(by('moon'), '지구'), [
    ['지름', '3,475km'], ['지구에서', '38.4만km'], ['한 바퀴 도는 데', '27.3일'], ['하루(자전)', '27.3일'],
  ]);
  assert.deepEqual(bodyFacts(by('jupiter'), '태양'), [
    ['지름', '139,822km'], ['태양에서', '7.8억km (5.2AU)'], ['한 바퀴 도는 데', '11.9년'], ['하루(자전)', '9.9시간'],
  ]);
  // Venus turns backwards; the Sun goes round nothing; a comet's distance is its mean.
  assert.deepEqual(bodyFacts(by('venus'), '태양').at(-1), ['하루(자전)', '243일 (거꾸로 돈다)']);
  assert.deepEqual(bodyFacts(by('sun')), [['지름', '1,392,680km']]);
  assert.equal(bodyFacts(by('halley'), '태양')[2][1], '75.3년');
  for (const body of BODY_DATA) {
    for (const [label, value] of bodyFacts(body, '태양')) assert.ok(label && value && !value.includes('NaN'), body.id);
  }
});

test('every story place has a second paragraph to read, which does not repeat its card', () => {
  assert.equal(STORIES.length, 94);
  assert.deepEqual(Object.keys(STORY_MORE).sort(), STORIES.map((s) => s.id).sort());
  for (const story of STORIES) {
    const more = STORY_MORE[story.id];
    assert.ok(more.length >= 70, `${story.id} ${more.length}`);
    assert.ok(more.endsWith('다.'), `${story.id}: ${more.slice(-12)}`);
    assert.ok(!more.includes('~') && !more.includes('  ') && !more.includes(String.fromCharCode(10)), story.id);
    // Not a sentence of the card over again.
    const card = STORY_DETAILS[story.id]?.detail ?? story.text;
    for (const sentence of more.split('. ')) assert.ok(sentence.length < 12 || !card.includes(sentence), `${story.id}: ${sentence}`);
  }
});
