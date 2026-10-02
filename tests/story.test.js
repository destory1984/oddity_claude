import { test } from 'vitest';
import assert from 'node:assert/strict';
import { NOTES, MEMOS, dueNote, noteById } from '../src/core/story.js';
import { createProgress, recordNote, sanitizeProgress } from '../src/core/progress.js';
import { BODIES } from '../src/core/bodies.js';
import { MISSIONS } from '../src/core/missions.js';

const seen = (...ids) => ({ ...createProgress(), notes: ids });

test("grandmother's notes come in the order of their years, each with a line from Seora", () => {
  assert.deepEqual(NOTES.map((n) => n.id), ['opening', 'y1969', 'y1979', 'y1986']);
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
  assert.equal(noteById('nothing'), null);
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
