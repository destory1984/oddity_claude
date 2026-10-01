import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  objectParticle, subjectParticle, withParticle, eventMessage, limitText, dateText, distanceText,
} from '../src/ui/messages.js';
import { BODIES } from '../src/core/bodies.js';
import { FACTS } from '../src/core/facts.js';

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
  assert.equal(
    eventMessage({ type: 'discovered', bodyId: 'mars' }, BODIES),
    `새 천체 발견: 화성\n${FACTS.mars}`,
  );
  assert.equal(eventMessage({ type: 'discovered', bodyId: 'nowhere' }, BODIES), '새 천체 발견: nowhere');
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

test('entering the asteroid belt says how empty the real one is', () => {
  assert.equal(
    eventMessage({ type: 'beltEntered' }),
    '소행성대에 들어섰습니다.\n실제로는 소행성 사이가 평균 100만km쯤 떨어져 있습니다.',
  );
});

test('reaching a story place names it and tells its story on the next line', () => {
  assert.equal(
    eventMessage({ type: 'story', name: '지오토의 혜성 통과', text: '1986년의 일입니다.' }),
    '이야기 장소: 지오토의 혜성 통과\n1986년의 일입니다.',
  );
});

test("the game clock's date reads like 2026.10.1", () => {
  assert.equal(dateText(new Date(2026, 9, 1, 15)), '2026.10.1');
  assert.equal(dateText(new Date(2027, 0, 31)), '2027.1.31');
});

test('docking messages name the craft with the right particle', () => {
  assert.equal(withParticle('허블 우주망원경'), '과');
  assert.equal(withParticle('보이저 1호'), '와');
  assert.equal(
    eventMessage({ type: 'docked', name: '허블 우주망원경' }),
    '허블 우주망원경과 도킹했습니다. 이제 함께 날아갑니다. 전진이나 후진을 누르면 떨어집니다.',
  );
  assert.equal(eventMessage({ type: 'undocked', name: '보이저 1호' }), '보이저 1호와 도킹을 풀었습니다.');
  assert.equal(eventMessage({ type: 'docking', name: '허블 우주망원경' }), '허블 우주망원경에 도킹 중입니다. 0에 맞춰 붙습니다.');
  assert.equal(eventMessage({ type: 'dockAborted', name: '허블 우주망원경' }), '허블 우주망원경 도킹을 그만두었습니다.');
  assert.equal(eventMessage({ type: 'dockRefused', name: '달 정찰 궤도선' }), '달 정찰 궤도선은 지표면과 너무 가까워 도킹할 수 없습니다.');
  assert.equal(eventMessage({ type: 'dockRefused', name: '다누리' }), '다누리는 지표면과 너무 가까워 도킹할 수 없습니다.');
});

test('distances read in km, then in 만 and 억 as they grow', () => {
  assert.equal(distanceText(0), '0km');
  assert.equal(distanceText(540.4), '540km');
  assert.equal(distanceText(9129), '9,129km');
  assert.equal(distanceText(45737), '4.6만km');
  assert.equal(distanceText(999499), '99.9만km');
  assert.equal(distanceText(2190000), '219만km');
  assert.equal(distanceText(59063800), '5,906만km');
  assert.equal(distanceText(254000000), '2.5억km');
});
