import { test } from 'vitest';
import assert from 'node:assert/strict';
import { objectParticle, subjectParticle, eventMessage, routeText } from '../src/ui/messages.js';
import { BODIES } from '../src/core/bodies.js';

test('object particle follows the final consonant', () => {
  assert.equal(objectParticle('달'), '을');
  assert.equal(objectParticle('태양'), '을');
  assert.equal(objectParticle('지구'), '를');
  assert.equal(objectParticle('Moon'), '을');
});

test('zone messages match the spec wording', () => {
  const msg = (from, to) => eventMessage({ type: 'zoneChanged', from, to });
  assert.equal(msg('near', 'far'), '근처에 별이 없어서, 광속의 1000배까지 속도를 올립니다.');
  assert.equal(msg('far', 'near'), '별 근처에서는 안전을 위해서 속도를 광속의 1/10로 낮춥니다.');
  assert.equal(msg('near', 'veryNear'), '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/100로 낮춥니다.');
  assert.equal(msg('veryNear', 'near'), '별 표면에서 멀어져서, 속도를 광속의 1/10까지 올립니다.');
});

test('surface arrival message', () => {
  assert.equal(
    eventMessage({ type: 'surfaceReached', bodyId: 'earth' }),
    '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.',
  );
  assert.equal(eventMessage({ type: 'unknown' }), null);
});

test('subject particle follows the final consonant', () => {
  assert.equal(subjectParticle('달'), '이');
  assert.equal(subjectParticle('태양'), '이');
  assert.equal(subjectParticle('지구'), '가');
  assert.equal(subjectParticle('토성'), '이');
});

test('explorer log messages name the body or mission', () => {
  assert.equal(eventMessage({ type: 'discovered', bodyId: 'mars' }, BODIES), '새 천체 발견: 화성');
  assert.equal(eventMessage({ type: 'landed', bodyId: 'moon' }, BODIES), '착지 기록: 달. 수첩에 남겼습니다.');
  assert.equal(eventMessage({ type: 'photo', missionName: '지구돋이' }, BODIES), '사진 임무 달성: 지구돋이');
});

test('route text says how long, or what is in the way', () => {
  assert.equal(routeText({ seconds: 5.6 }, BODIES), '곧장 가면 약 6초');
  assert.equal(routeText({ seconds: 0 }, BODIES), '도착');
  assert.equal(routeText({ seconds: 0.3 }, BODIES), '곧장 가면 1초 안');
  assert.equal(routeText({ blockedBy: 'sun' }, BODIES), '곧장 가면 태양이 막고 있음');
  assert.equal(routeText({ blockedBy: 'earth' }, BODIES), '곧장 가면 지구가 막고 있음');
  assert.equal(routeText(null, BODIES), '');
});
