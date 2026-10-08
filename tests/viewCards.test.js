import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { VIEW_CARDS, AURORA_ROUND, AURORA_STAMP, VIEWS_STAMP, cardFile, cardById, sanitizeViews, roundDone, allCards, arriveAt, cardless } from '../src/core/viewCards.js';
import { AURORAS } from '../src/core/glows.js';

test('thirteen cards: one for every best view, Korea\'s sky, Earth\'s aurora and the round; each has its picture', () => {
  assert.equal(VIEW_CARDS.length, 13);
  assert.equal(new Set(VIEW_CARDS.map((card) => card.id)).size, 13);
  assert.deepEqual(cardless(), []);
  for (const card of VIEW_CARDS) assert.ok(existsSync(`public/assets/${cardFile(card.id)}`), card.id);
  assert.ok(existsSync(`public/assets/${AURORA_STAMP}`));
  assert.ok(existsSync(`public/assets/${VIEWS_STAMP}`));
  assert.equal(cardById('pluto').by[1], 'pluto');
  assert.equal(cardById('nowhere'), null);
});

test('a card is got once, by the key of its place', () => {
  const empty = sanitizeViews(null);
  const first = arriveAt(empty, 'vista', 'saturn');
  assert.deepEqual(first.cards.map((card) => card.id), ['saturn']);
  assert.deepEqual(first.views.cards, ['saturn']);
  assert.equal(first.round, false);
  const again = arriveAt(first.views, 'vista', 'saturn');
  assert.deepEqual(again.cards, []);
  assert.deepEqual(again.views, first.views);
  assert.deepEqual(arriveAt(first.views, 'home', 'earth').cards.map((card) => card.id), ['korea']);
  // Saturn's aurora key gives no card of its own, but counts for the round.
  const aurora = arriveAt(first.views, 'aurora', 'saturn');
  assert.deepEqual(aurora.cards, []);
  assert.deepEqual(aurora.views.auroras, ['saturn']);
});

test('the round of the auroras: all eight worlds that have one, the stamp and the last card at the eighth', () => {
  assert.deepEqual([...AURORA_ROUND].sort(), AURORAS.map((a) => a.body).sort());
  let views = sanitizeViews(null);
  const rounds = [];
  for (const id of AURORA_ROUND) {
    const step = arriveAt(views, 'aurora', id);
    views = step.views;
    rounds.push(step.round);
    if (id === 'earth') assert.ok(step.cards.some((card) => card.id === 'auroraEarth'));
  }
  assert.deepEqual(rounds, [...AURORA_ROUND.slice(1).map(() => false), true]);
  assert.ok(roundDone(views) && views.cards.includes('auroraRound'));
  // Standing in one again does not finish it a second time.
  assert.equal(arriveAt(views, 'aurora', 'earth').round, false);
});

test('the twelfth card, whichever it is, ends the set once', () => {
  let views = sanitizeViews(null);
  const alls = [];
  const go = (kind, id) => {
    const step = arriveAt(views, kind, id);
    views = step.views;
    alls.push(step.all);
  };
  for (const id of AURORA_ROUND) go('aurora', id);
  for (const card of VIEW_CARDS.filter((c) => c.by[0] === 'vista')) go('vista', card.by[1]);
  assert.ok(alls.every((all) => !all) && !allCards(views));
  go('home', 'earth');
  assert.ok(alls.at(-1) && allCards(views));
  go('home', 'earth');
  assert.equal(alls.at(-1), false);
  // The round's card can be the last one too.
  const butRound = { cards: VIEW_CARDS.map((c) => c.id).filter((id) => id !== 'auroraRound'), auroras: AURORA_ROUND.slice(1) };
  const last = arriveAt(butRound, 'aurora', AURORA_ROUND[0]);
  assert.ok(last.round && last.all);
});

test('a saved record keeps only what is known', () => {
  assert.deepEqual(sanitizeViews({ cards: ['moon', 'moon', 'nope'], auroras: ['earth', 'sun'], more: 1 }), { cards: ['moon'], auroras: ['earth'] });
  assert.deepEqual(sanitizeViews('x'), { cards: [], auroras: [] });
});
