import { test } from 'vitest';
import assert from 'node:assert/strict';
import { objectParticle, subjectParticle, eventMessage, limitText } from '../src/ui/messages.js';
import { BODIES } from '../src/core/bodies.js';

test('object particle follows the final consonant', () => {
  assert.equal(objectParticle('달'), '을');
  assert.equal(objectParticle('태양'), '을');
  assert.equal(objectParticle('지구'), '를');
  assert.equal(objectParticle('Moon'), '을');
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

test('the live limit reads like 0.12c, 3.4c or 42c', () => {
  assert.equal(limitText(0.01), '0.01c');
  assert.equal(limitText(0.123), '0.12c');
  assert.equal(limitText(1), '1.0c');
  assert.equal(limitText(3.44), '3.4c');
  assert.equal(limitText(10), '10c');
  assert.equal(limitText(42.4), '42c');
  assert.equal(limitText(100), '100c');
});

test('speed zone events are gone', () => {
  assert.equal(eventMessage({ type: 'zoneChanged', from: 'near', to: 'far' }), null);
});
