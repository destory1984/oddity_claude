import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  NOTES, MEMOS, GREETINGS, dueNote, noteById, LAST_SLOT, LAST_SLOT_KM, lastSlotOpen, photoSlots, lastSlotLast } from '../src/core/story.js';
import { STORIES } from '../src/core/stories.js';
import { CRAFT } from '../src/core/craft.js';
import { existsSync } from 'node:fs';
import { createProgress, recordNote, sanitizeProgress } from '../src/core/progress.js';
import { BODIES } from '../src/core/bodies.js';
import { MISSIONS } from '../src/core/missions.js';

const seen = (...ids) => ({ ...createProgress(), notes: ids });

test("grandmother's notes come in the order of their years, each with a line from Seora", () => {
  assert.deepEqual(NOTES.map((n) => n.id), ['opening', 'y1969', 'y1979', 'y1986', 'last']);
  assert.equal(new Set(NOTES.map((n) => n.id)).size, NOTES.length);
  for (const note of NOTES) {
    assert.ok(note.title && note.text && note.button, note.id);
    // Seora: one short line, one exclamation at most.
    assert.ok(note.line.length <= 25, `${note.id}: ${note.line.length}`);
    assert.ok((note.line.match(/!/g) ?? []).length <= 1, note.id);
    // The paper must not break in a blog editor or look like a strikethrough.
    assert.ok(!note.text.includes('~'), note.id);
  }
  assert.equal(noteById('y1969').title, '1969.7.21');
  // Every note has its scene drawn, on file, with words for those who cannot see it.
  for (const note of NOTES) {
    assert.ok(existsSync(`public/assets/notebook/${note.image}`), note.id);
    assert.ok(note.imageAlt.length >= 10, note.id);
  }
  assert.equal(noteById('nothing'), null);
});

test('the opening is told over five pages: she arrives, finds the notebook, reads the letter in three parts', () => {
  const opening = noteById('opening');
  assert.equal(opening.pages.length, 5);
  for (const [i, page] of opening.pages.entries()) {
    // Each page is a scene or a part of the letter, never both, never neither.
    assert.ok(Boolean(page.scene) !== Boolean(page.text), `page ${i}`);
    if (page.image) {
      assert.ok(existsSync(`public/assets/notebook/${page.image}`), page.image);
      assert.ok(page.imageAlt.length >= 10, page.image);
    }
    if (page.say) assert.ok(page.say.length <= 25 && (page.say.match(/!/g) ?? []).length <= 1, page.say);
    assert.ok(!(page.text ?? page.scene).includes('~'), `page ${i}`);
  }
  // Two scenes first, then the letter; the first page has a picture; the last page leaves
  // her word to the speech bubble after the notebook is opened.
  assert.deepEqual(opening.pages.map((p) => (p.scene ? 'scene' : 'letter')), ['scene', 'scene', 'letter', 'letter', 'letter']);
  assert.ok(opening.pages[0].image);
  assert.equal(opening.pages[4].say, undefined);
  // Read again from the journal it is one sheet: the three parts joined.
  assert.equal(opening.text, opening.pages.filter((p) => p.text).map((p) => p.text).join('\n\n'));
  // Grandmother is out and speaks only in the letter; the first slot is the Moon of 1969.
  assert.ok(opening.text.includes('첫 칸은 달이다') && opening.text.includes('1969년 7월 21일'));
  // The last note is one sheet: the scene at the gate follows it.
  assert.equal(noteById('last').pages, undefined);
});

test('the notes of 1969, 1979 and 1986 are told over four pages: the scene, then a paragraph a page', () => {
  for (const id of ['y1969', 'y1979', 'y1986']) {
    const note = noteById(id);
    assert.equal(note.pages.length, 4, id);
    const [scene, ...sheets] = note.pages;
    // The first page is the drawing and the telling; no handwriting yet.
    assert.deepEqual([scene.image, scene.imageAlt, scene.scene, scene.text], [note.image, note.imageAlt, note.scene, undefined], id);
    // The rest are her hand only, and joined they are the one sheet read again from the journal.
    for (const sheet of sheets) assert.ok(sheet.text && !sheet.scene && !sheet.image, id);
    assert.equal(sheets.map((p) => p.text).join('\n\n'), note.text, id);
    // Seora has a word under every page but the last, where her line follows the note.
    for (const page of note.pages.slice(0, -1)) {
      assert.ok(page.say.length <= 25 && (page.say.match(/!/g) ?? []).length <= 1, page.say);
      assert.ok(!page.say.includes('~'), page.say);
    }
    assert.equal(note.pages.at(-1).say, undefined, id);
    assert.equal(new Set(note.pages.map((p) => p.say)).size, 4, id);
  }
});

test('the opening note is due on a new log, before anything is done', () => {
  assert.equal(dueNote(createProgress(), 1).id, 'opening');
  assert.equal(dueNote(seen('opening'), 1), null);
});

test('the 1969 note waits for the first landing on the Moon', () => {
  assert.equal(dueNote({ ...seen('opening'), landed: ['mars'] }, 30), null);
  assert.equal(dueNote({ ...seen('opening'), landed: ['mars', 'moon'] }, 3).id, 'y1969');
});

test('the 1979 and 1986 notes come at 40 and 100 filled slots', () => {
  const moon = { ...seen('opening', 'y1969'), landed: ['moon'] };
  assert.equal(dueNote(moon, 39), null);
  assert.equal(dueNote(moon, 40).id, 'y1979');
  const next = { ...moon, notes: [...moon.notes, 'y1979'] };
  assert.equal(dueNote(next, 99), null);
  assert.equal(dueNote(next, 100).id, 'y1986');
  assert.equal(dueNote({ ...next, notes: [...next.notes, 'y1986'] }, 180), null);
});

test('notes never jump the queue: a later one waits for the earlier one', () => {
  // 120 slots filled without ever landing on the Moon: still nothing after the opening.
  assert.equal(dueNote(seen('opening'), 120), null);
  // An old save with everything done gets them one at a time, oldest first.
  const old = { ...createProgress(), landed: ['moon'] };
  assert.equal(dueNote(old, 150).id, 'opening');
  assert.equal(dueNote({ ...old, notes: ['opening'] }, 150).id, 'y1969');
});

test('a note read is remembered once, and junk in storage is dropped', () => {
  const first = recordNote(createProgress(), 'opening');
  assert.deepEqual(first.notes, ['opening']);
  assert.equal(recordNote(first, 'opening'), first);
  const read = sanitizeProgress({ notes: ['y1969', 'y1969', 'forged', 4] }, BODIES, MISSIONS, [], [], NOTES);
  assert.deepEqual(read.notes, ['y1969']);
  assert.deepEqual(sanitizeProgress({ discovered: ['mars'] }, BODIES, MISSIONS, [], [], NOTES).notes, []);
});

test("every body has grandmother's memo and a line from Seora", () => {
  for (const body of BODIES) {
    const entry = MEMOS[body.id];
    assert.ok(entry, `${body.id} has no memo`);
    // Seen or read: one of the two, in a short record.
    assert.ok(/봤다|읽었다|신문에서/.test(entry.memo), body.id);
    assert.ok(entry.memo.length <= 50, `${body.id}: memo ${entry.memo.length}`);
    assert.ok(entry.memo.endsWith('.'), body.id);
    assert.ok(entry.line.length <= 25, `${body.id}: line ${entry.line.length}`);
    assert.ok((entry.line.match(/!/g) ?? []).length <= 1, body.id);
    assert.ok(!`${entry.memo}${entry.line}`.includes('~'), body.id);
  }
  assert.equal(Object.keys(MEMOS).length, BODIES.length);
  assert.equal(new Set(Object.values(MEMOS).map((m) => m.line)).size, BODIES.length);
});

test('the last page opens only when every slot is filled, after the other notes', () => {
  const read = { ...seen('opening', 'y1969', 'y1979', 'y1986'), landed: ['moon'] };
  assert.equal(dueNote(read, 179, 180), null);
  const last = dueNote(read, 180, 180);
  assert.equal(last.id, 'last');
  // Spoken at grandmother's gate, not in a speech bubble.
  assert.ok(last.gate);
  assert.equal(dueNote({ ...read, notes: [...read.notes, 'last'] }, 180, 180), null);
});

test('the last slot is the Pale Blue Dot: a mission and a story place, as far out as the story says', () => {
  assert.ok(MISSIONS.some((m) => m.id === LAST_SLOT));
  assert.equal(STORIES.find((s) => s.id === LAST_SLOT).beyondKm, LAST_SLOT_KM);
});

test('the last slot stays shut until the other 178 are filled', () => {
  const fresh = createProgress();
  assert.equal(lastSlotOpen(fresh, 1, 180), false);
  assert.equal(lastSlotOpen(fresh, 177, 180), false);
  assert.equal(lastSlotOpen(fresh, 178, 180), true);
  // An old log that already has one of the two: its own slot does not count toward the 178.
  const old = { ...fresh, stories: [LAST_SLOT] };
  assert.equal(lastSlotOpen(old, 178, 180), false);
  assert.equal(lastSlotOpen(old, 179, 180), true);
});

test('one photograph of Earth as a dot from 60 million km fills both slots, once they are open', () => {
  const fresh = createProgress();
  const shot = ['heroSelfie', LAST_SLOT];
  assert.deepEqual(photoSlots(['heroSelfie'], { open: false, earthKm: 10, progress: fresh }), { missions: ['heroSelfie'], stories: [], held: null });
  assert.deepEqual(photoSlots(shot, { open: false, earthKm: 7e7, progress: fresh }), { missions: ['heroSelfie'], stories: [], held: 'locked' });
  assert.deepEqual(photoSlots(shot, { open: true, earthKm: 5.9e7, progress: fresh }), { missions: ['heroSelfie'], stories: [], held: 'near' });
  assert.deepEqual(photoSlots(shot, { open: true, earthKm: 6e7, progress: fresh }), { missions: shot, stories: [LAST_SLOT], held: null });
});

test('a log that already had the last slot keeps it, and is told nothing more', () => {
  const both = { ...createProgress(), photos: [LAST_SLOT], stories: [LAST_SLOT] };
  assert.deepEqual(photoSlots([LAST_SLOT], { open: false, earthKm: 1e7, progress: both }), { missions: [LAST_SLOT], stories: [], held: null });
  // The mission only: the story place still waits for the others, then for the distance.
  const half = { ...createProgress(), photos: [LAST_SLOT] };
  assert.deepEqual(photoSlots([LAST_SLOT], { open: false, earthKm: 7e7, progress: half }), { missions: [LAST_SLOT], stories: [], held: 'locked' });
  assert.deepEqual(photoSlots([LAST_SLOT], { open: true, earthKm: 7e7, progress: half }), { missions: [LAST_SLOT], stories: [LAST_SLOT], held: null });
});

test('Seora has a word for each probe left alone, and each is a real place or craft', () => {
  const known = new Set([...STORIES.map((s) => s.id), ...CRAFT.map((c) => c.id)]);
  assert.deepEqual(Object.keys(GREETINGS).sort(), ['danuri', 'lunokhod1', 'opportunity', 'phoenix', 'spirit', 'voyager1', 'voyager2']);
  for (const [id, line] of Object.entries(GREETINGS)) {
    assert.ok(known.has(id), id);
    assert.ok(line.length <= 25 && (line.match(/!/g) ?? []).length <= 1, id);
  }
});

test('the last slot is listed last, wherever it stands in the data', () => {
  const list = [{ id: 'paleBlueDot' }, { id: 'earthrise' }, { id: 'eclipse' }];
  assert.deepEqual(lastSlotLast(list).map((m) => m.id), ['earthrise', 'eclipse', 'paleBlueDot']);
  assert.deepEqual(lastSlotLast(list, 'eclipse').map((m) => m.id), ['paleBlueDot', 'earthrise', 'eclipse']);
  assert.deepEqual(lastSlotLast([{ id: 'a' }, { id: 'b' }]).map((m) => m.id), ['a', 'b']);
});
