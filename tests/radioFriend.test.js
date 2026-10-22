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
  // The known one kept, and the clues of every meeting counted (all of the station's) given back.
  const issGives = SPEAKERS.find((s) => s.id === 'issCrew').visits.flatMap((v) => v.gives);
  assert.deepEqual([...clean.clues].sort(), [...new Set([known, ...issGives])].sort());
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

test('a meeting is shown on the note card as pages of plain telling, never on grandmother\'s paper', async () => {
  const { talkNote } = await import('../src/core/radioFriend.js');
  for (const speaker of SPEAKERS) {
    speaker.visits.forEach((visit, index) => {
      const note = talkNote(speaker.id, { index, lines: visit.lines, gives: visit.gives });
      assert.equal(note.pages.length, visit.lines.length + 1);
      assert.ok(note.pages.every((page) => !page.text), speaker.id);
      assert.equal(note.radio, speaker.id);
      // Not one of grandmother's notes: no id, so it is not kept as read nor read over.
      assert.equal(note.id, undefined);
      assert.ok(note.title && note.button);
      // The first page is the speaker's own call (or the log's heading), not a line of telling.
      assert.equal(note.pages[0].scene, speaker.hail);
      assert.ok(speaker.hail, speaker.id);
    });
  }
});

test('a hidden place is not logged before it opens, and is once it has', async () => {
  const { foundHidden } = await import('../src/core/radioFriend.js');
  const ryugu = BODIES.find((b) => b.id === 'ryugu');
  const there = ryugu.position.map((n, i) => n + (i === 0 ? ryugu.radiusKm + 0.5 : 0));
  const closed = createRadio();
  assert.deepEqual(foundHidden({ radio: closed, position: there, restingOn: null, bodies: BODIES }), []);
  const marker = HIDDEN.find((h) => h.id === 'ryuguMarker');
  const open = { ...closed, clues: [...marker.needs] };
  assert.deepEqual(foundHidden({ radio: open, position: there, restingOn: null, bodies: BODIES }), ['ryuguMarker']);
});

test('only the open hidden places on the ground stand among the sites', async () => {
  const { hiddenSitesAt } = await import('../src/core/radioFriend.js');
  assert.deepEqual(hiddenSitesAt(createRadio(), 0, BODIES), []);
  const shore = HIDDEN.find((h) => h.id === 'shotaShore');
  const sites = hiddenSitesAt({ ...createRadio(), clues: [...shore.needs] }, 0, BODIES);
  assert.deepEqual(sites.map((s) => s.id), ['shotaShore']);
  const earth = BODIES.find((b) => b.id === 'earth');
  assert.ok(Math.abs(Math.hypot(...sites[0].position.map((n, i) => n - earth.position[i])) - earth.radiusKm) < 1e-6);
});

test('the Kibo window opens only once the other four are found, and finding it gives the call sign', async () => {
  const { recordFound } = await import('../src/core/radioFriend.js');
  const allClues = CLUES.map((c) => c.id);
  const others = HIDDEN.filter((h) => h.id !== 'kiboWindow').map((h) => h.id);
  assert.ok(!openHidden({ ...createRadio(), clues: allClues }).includes('kiboWindow'));
  assert.ok(!openHidden({ ...createRadio(), clues: allClues, found: others.slice(1) }).includes('kiboWindow'));
  const ready = { ...createRadio(), clues: allClues, found: others };
  assert.ok(openHidden(ready).includes('kiboWindow'));
  const done = recordFound(ready, ['kiboWindow'], 1000);
  assert.equal(done.callSign, true);
  assert.equal(done.noteAt, 1000);
  // Found again (or another found later): the time stays the first.
  assert.equal(recordFound(done, ['kiboWindow'], 5000), done);
});

test('there are eight speakers, five hidden places, and the logs speak in short dated lines', () => {
  assert.equal(SPEAKERS.length, 8);
  assert.equal(HIDDEN.length, 5);
  for (const speaker of SPEAKERS.filter((s) => s.kind === 'log')) {
    for (const visit of speaker.visits) for (const line of visit.lines) assert.match(line, /^\d{4}\.\d{2}\.\d{2} /, speaker.id);
  }
});

test('a hidden place reached is told on the card without grandmother\'s paper', async () => {
  const { foundNote } = await import('../src/core/radioFriend.js');
  for (const place of HIDDEN) {
    const note = foundNote(place.id);
    assert.equal(note.radioFound, place.id);
    assert.equal(note.id, undefined);
    assert.ok(note.pages.every((page) => !page.text && page.scene));
  }
});

test('the journal web: only the young radio operator is known at first; a clue brings its teller and where it points', async () => {
  const { radioWeb } = await import('../src/core/radioFriend.js');
  const fresh = radioWeb(createRadio());
  assert.deepEqual(fresh.nodes.filter((n) => n.known).map((n) => n.id), ['shota']);
  assert.deepEqual(fresh.links, []);
  for (const node of fresh.nodes) assert.ok(node.at.every((v) => v >= 0 && v <= 1), node.id);
  // Every speaker, clue and hidden place has a point.
  assert.equal(fresh.nodes.length, 1 + SPEAKERS.length + CLUES.length + HIDDEN.length);
  const heard = hear(createRadio(), 'issCrew');
  const web = radioWeb(heard);
  const known = new Set(web.nodes.filter((n) => n.known).map((n) => n.id));
  assert.ok(known.has('issCrew') && known.has('kiboLog') && known.has('tanegashimaCrew'));
  assert.deepEqual(web.links, [['issCrew', 'kiboLog'], ['kiboLog', 'tanegashimaCrew']]);
  // An open hidden place says so.
  const ryugu = HIDDEN.find((h) => h.id === 'ryuguMarker');
  const opened = radioWeb({ ...createRadio(), clues: [...ryugu.needs] });
  assert.equal(opened.nodes.find((n) => n.id === 'ryuguMarker').open, true);
});

test("grandmother's note comes ten minutes after the call sign, or at the next start, and once", async () => {
  const { noteDue, readNote, FINAL_NOTE } = await import('../src/core/radioFriend.js');
  const before = createRadio();
  assert.equal(noteDue(before, 10 ** 9, true), false);
  const got = { ...before, callSign: true, noteAt: 1000 };
  assert.equal(noteDue(got, 1000 + 60000, false), false);
  assert.equal(noteDue(got, 1000 + 600000, false), true);
  assert.equal(noteDue(got, 1000 + 1, true), true);
  const read = readNote(got);
  assert.equal(read.noteRead, true);
  assert.equal(noteDue(read, 10 ** 12, true), false);
  // In grandmother's hand: on the paper, with Sora's word after it, kept as a note.
  assert.ok(FINAL_NOTE.id && FINAL_NOTE.text && FINAL_NOTE.title && FINAL_NOTE.button);
  assert.ok(FINAL_NOTE.text.startsWith('어젯밤, 오십 년 만에 무전기를 켰단다.'));
  assert.ok(FINAL_NOTE.line.length <= 25);
});

test('every person met has a face on file; the logs have none', async () => {
  const { existsSync } = await import('node:fs');
  for (const speaker of SPEAKERS) {
    if (speaker.kind === 'log') assert.equal(speaker.portrait, null, speaker.id);
    else assert.ok(speaker.portrait && existsSync(`public/assets/notebook/${speaker.portrait}`), speaker.id);
  }
  assert.ok(existsSync('public/assets/notebook/radio-shota.png'));
});

// Docked, she stays DOCK_GAP_KM from the craft: a hidden place by a craft must take that
// in, or docking there (Kibo's window at the station, Akatsuki's orbit) never finds it
// (the whole-branch review, 2026-10-22).
test('a hidden place by a craft is found from where docking holds her', async () => {
  const { DOCK_GAP_KM } = await import('../src/core/dock.js');
  const craftIds = new Set(CRAFT.map((c) => c.id));
  const byCraft = HIDDEN.filter((h) => h.type === 'near' && craftIds.has(h.target));
  assert.ok(byCraft.length >= 2);
  for (const place of byCraft) assert.ok(place.withinKm > DOCK_GAP_KM, place.id);
});

// A save whose clues were lost (an id renamed in a later version) kept its meetings as
// heard, and the story could not go on: the clues of the meetings counted are given back
// (the whole-branch review, 2026-10-22).
test('a stored log gets back the clues of the meetings it counts as heard', () => {
  const clean = sanitizeRadio({ visits: { issCrew: 1 }, clues: [] });
  const first = SPEAKERS.find((s) => s.id === 'issCrew').visits[0].gives;
  for (const id of first) assert.ok(clean.clues.includes(id), id);
});
