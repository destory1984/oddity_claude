import { test } from 'vitest';
import assert from 'node:assert/strict';
import { SKY_EVENTS, nextSkyEvent, skyEventNews } from '../src/core/skyEvents.js';

test('the sky news tells the next meteor shower, planet pairing or Apophis, by the real calendar', () => {
  assert.equal(skyEventNews(new Date(2026, 9, 19)), '다음 하늘 소식: 2026년 10월 21일 오리온자리 유성우가 가장 많은 밤. 2일 남았습니다.');
  assert.equal(skyEventNews(new Date(2026, 10, 15)), '화성과 목성이 나란히 보이는 날: 오늘 밤입니다.');
  assert.equal(nextSkyEvent(new Date(2029, 3, 10)).day, '2029-04-13');
  assert.match(skyEventNews(new Date(2029, 3, 13)), /^아포피스가 지구 곁 3만 2천km를 지나가는 날: 오늘 밤입니다\.$/);
  // Seven showers a year for ten years and seven days of their own, in order.
  assert.equal(SKY_EVENTS.length, 77);
  for (let i = 1; i < SKY_EVENTS.length; i++) assert.ok(SKY_EVENTS[i - 1].day <= SKY_EVENTS[i].day);
});
