import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES } from '../src/core/bodies.js';
import { CRAFT } from '../src/core/craft.js';
import { CURIOS } from '../src/core/curios.js';
import { STORIES } from '../src/core/stories.js';
import {
  SPEAKERS, CLUES, HIDDEN, createRadio, nextVisit, hear, openHidden, sanitizeRadio, speakerAt,
} from '../src/core/radioFriend.js';

test('a fresh radio log has nothing heard or found', () => {
  assert.deepEqual(createRadio(), { visits: {}, clues: [], found: [], callSign: false, noteAt: null, noteRead: false });
});

test('the station crew member speaks first, and what is heard is written down once', () => {
  const fresh = createRadio();
  const first = nextVisit(fresh, 'issCrew');
  assert.equal(first.index, 0);
  const after = hear(fresh, 'issCrew');
  assert.equal(after.visits.issCrew, 1);
  for (const id of first.gives) assert.ok(after.clues.includes(id), id);
  assert.equal(new Set(after.clues).size, after.clues.length);
  // Heard all there is for now: the same log comes back, nothing doubled.
  let log = after;
  while (nextVisit(log, 'issCrew')) log = hear(log, 'issCrew');
  assert.equal(hear(log, 'issCrew'), log);
  assert.equal(new Set(log.clues).size, log.clues.length);
});

test('a meeting whose clues are not yet known does not come', () => {
  for (const speaker of SPEAKERS) {
    speaker.visits.forEach((visit, index) => {
      if (!visit.needs.length) return;
      const log = { ...createRadio(), visits: { [speaker.id]: index } };
      assert.equal(nextVisit(log, speaker.id), null, `${speaker.id} ${index}`);
    });
  }
});

test('every clue has a speaker, every given clue exists, every needed clue can be given', () => {
  const speakerIds = new Set(SPEAKERS.map((s) => s.id));
  const clueIds = new Set(CLUES.map((c) => c.id));
  const given = new Set(SPEAKERS.flatMap((s) => s.visits.flatMap((v) => v.gives)));
  for (const clue of CLUES) assert.ok(speakerIds.has(clue.from), clue.id);
  for (const id of given) assert.ok(clueIds.has(id), id);
  const needed = [...SPEAKERS.flatMap((s) => s.visits.flatMap((v) => v.needs)), ...HIDDEN.flatMap((h) => h.needs)];
  for (const id of needed) assert.ok(given.has(id), id);
});

// Meet whoever has something to say, in any order, until no one has: every hidden
// place is open (finding the open ones as they open, which can open the last).
test('in any order of meetings every hidden place opens', () => {
  let seed = 7;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let round = 0; round < 200; round += 1) {
    let log = createRadio();
    for (;;) {
      const ready = SPEAKERS.filter((s) => nextVisit(log, s.id));
      const open = openHidden(log).filter((id) => !log.found.includes(id));
      if (!ready.length && !open.length) break;
      if (open.length && (!ready.length || random() < 0.3)) log = { ...log, found: [...log.found, open[Math.floor(random() * open.length)]] };
      else log = hear(log, ready[Math.floor(random() * ready.length)].id);
    }
    assert.deepEqual([...openHidden(log)].sort(), HIDDEN.map((h) => h.id).sort(), `round ${round}`);
  }
});

test('no new id is already a body, craft, story place or curio', () => {
  const taken = new Set([...BODIES, ...CRAFT, ...STORIES, ...CURIOS].map((x) => x.id));
  for (const { id } of [...SPEAKERS, ...CLUES, ...HIDDEN]) assert.ok(!taken.has(id), id);
  const all = [...SPEAKERS, ...CLUES, ...HIDDEN].map((x) => x.id);
  assert.equal(new Set(all).size, all.length);
});

test('a stored log is cleaned: unknown ids dropped, meetings held to how many there are', () => {
  assert.deepEqual(sanitizeRadio(null), createRadio());
  assert.deepEqual(sanitizeRadio('junk'), createRadio());
  const known = CLUES[0].id;
  const clean = sanitizeRadio({ clues: ['nowhere', known, known], visits: { issCrew: 99, nobody: 2 }, found: ['nowhere'], callSign: 'yes', noteAt: 'x', noteRead: 1 });
  assert.deepEqual(clean.clues, [known]);
  assert.deepEqual(clean.visits, { issCrew: SPEAKERS.find((s) => s.id === 'issCrew').visits.length });
  assert.deepEqual(clean.found, []);
  assert.equal(clean.callSign, false);
  assert.equal(clean.noteAt, null);
  assert.equal(clean.noteRead, false);
});

test('the speaker is found by the craft she is docked with, or the place she stays at', () => {
  assert.equal(speakerAt({ docked: { id: 'iss' }, visit: null }), 'issCrew');
  assert.equal(speakerAt({ docked: null, visit: null }), null);
  assert.equal(speakerAt({ docked: { id: 'hubble' }, visit: null }), null);
});
