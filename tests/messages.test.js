import { test } from 'vitest';
import assert from 'node:assert/strict';
import { objectParticle, eventMessage } from '../src/ui/messages.js';

test('object particle follows the final consonant', () => {
  assert.equal(objectParticle('달'), '을');
  assert.equal(objectParticle('태양'), '을');
  assert.equal(objectParticle('지구'), '를');
  assert.equal(objectParticle('Moon'), '을');
});

test('zone messages match the spec wording', () => {
  const msg = (from, to) => eventMessage({ type: 'zoneChanged', from, to });
  assert.equal(msg('near', 'far'), '근처에 별이 없어서, 광속의 100배까지 속도를 올립니다.');
  assert.equal(msg('far', 'near'), '별 근처에서는 안전을 위해서 속도를 광속으로 낮춥니다.');
  assert.equal(msg('near', 'veryNear'), '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/10로 낮춥니다.');
  assert.equal(msg('veryNear', 'near'), '별 표면에서 멀어져서, 속도를 광속까지 올립니다.');
});

test('surface arrival message', () => {
  assert.equal(
    eventMessage({ type: 'surfaceReached', bodyId: 'earth' }),
    '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.',
  );
  assert.equal(eventMessage({ type: 'unknown' }), null);
});
