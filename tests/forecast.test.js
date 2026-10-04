import { test } from 'vitest';
import assert from 'node:assert/strict';
import { NEWS_MOONS, skyNews, newsLine, playMinutes } from '../src/core/forecast.js';
import { shadowSpot } from '../src/core/shadows.js';
import { bodiesAt, BODY_DATA, TIME_SCALE } from '../src/core/bodies.js';

const shadowOn = (moon, planet, timeS) => {
  const bodies = bodiesAt(timeS);
  const find = (id) => bodies.find((b) => b.id === id);
  return Boolean(shadowSpot(find(planet), find(moon), bodies.find((b) => b.kind === 'star').position));
};

test('the news is of the five large moons whose shadows show from afar', () => {
  assert.deepEqual(NEWS_MOONS, ['io', 'europa', 'ganymede', 'callisto', 'titan']);
});

test('the news lists the soonest crossings first, and they are true when their time comes', () => {
  const news = skyNews(bodiesAt, 0, 5);
  assert.equal(news.length, 5);
  for (let i = 1; i < news.length; i++) assert.ok(news[i - 1].inS <= news[i].inS);
  // When the game opens Io's shadow is on Jupiter.
  assert.equal(news[0].moon, 'io');
  assert.equal(news[0].inS, 0);
  for (const { moon, planet, inS, forS } of news) {
    const stepS = BODY_DATA.find((b) => b.id === moon).periodS / 240;
    assert.ok(shadowOn(moon, planet, inS + forS / 2), moon);
    if (inS > 0) assert.ok(!shadowOn(moon, planet, inS - 2 * stepS), moon);
    assert.ok(!shadowOn(moon, planet, inS + forS + stepS), moon);
    assert.ok(forS > 0 && forS < BODY_DATA.find((b) => b.id === moon).periodS / 4, moon);
  }
  assert.equal(skyNews(bodiesAt, 0).length, 2);
});

test('later the same crossing is told as nearer, and once it is over the next one is told', () => {
  const [ , second] = skyNews(bodiesAt, 0, 2);
  const later = skyNews(bodiesAt, second.inS / 2, 5).find((n) => n.moon === second.moon);
  assert.ok(Math.abs(later.inS - second.inS / 2) < second.forS / 10);
  const after = skyNews(bodiesAt, second.inS + second.forS * 1.2, 5).find((n) => n.moon === second.moon);
  assert.ok(after.inS > second.forS);
});

test('a line tells the time in minutes of play', () => {
  assert.equal(playMinutes(12 * 60 * TIME_SCALE), 12);
  assert.equal(playMinutes(5), 1);
  assert.equal(
    newsLine({ moon: 'ganymede', planet: 'jupiter', inS: 12 * 60 * TIME_SCALE, forS: 14 * 60 * TIME_SCALE }),
    '12분 뒤 가니메데의 그림자가 목성 위를 지나갑니다. 14분 동안 보입니다.',
  );
  assert.equal(
    newsLine({ moon: 'io', planet: 'jupiter', inS: 0, forS: 3 * 60 * TIME_SCALE }),
    '지금 이오의 그림자가 목성 위를 지나가고 있습니다. 3분 더 보입니다.',
  );
});
