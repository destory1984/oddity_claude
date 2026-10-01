import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BAR_S, CHORDS, MELODY, barPlan, moodFor } from '../src/core/music.js';

test('a bar lasts eight seconds and the four chords come round in order', () => {
  assert.equal(BAR_S, 8);
  assert.equal(CHORDS.length, 4);
  for (let bar = 0; bar < 8; bar++) assert.deepEqual(barPlan(bar, 'near').pad, CHORDS[bar % 4].pad);
});

test('the same bar always sounds the same', () => {
  assert.deepEqual(barPlan(13, 'near'), barPlan(13, 'near'));
  assert.notDeepEqual(barPlan(13, 'near').notes, barPlan(14, 'near').notes);
});

test('melody notes come from the five-note scale, inside the bar, and stay quiet', () => {
  for (let bar = 0; bar < 64; bar++) {
    for (const mood of ['near', 'deep', 'surface']) {
      const { notes, pad, bass } = barPlan(bar, mood);
      assert.ok(pad.length === 3 && bass > 40 && bass < 140);
      for (const note of notes) {
        assert.ok(MELODY.includes(note.freq), `${note.freq}`);
        assert.ok(note.at >= 0 && note.at < BAR_S - 0.5);
        assert.ok(note.volume > 0 && note.volume <= 0.05);
      }
      const times = notes.map((n) => n.at);
      assert.deepEqual(times, [...times].sort((a, b) => a - b));
    }
  }
});

test('near a world the tune is busier than in deep space; on the ground it rests', () => {
  const count = (mood) => {
    let total = 0;
    for (let bar = 0; bar < 64; bar++) total += barPlan(bar, mood).notes.length;
    return total;
  };
  assert.ok(count('near') > count('deep') * 1.5);
  assert.ok(count('deep') > 0);
  assert.equal(count('surface'), 0);
  // Deep space drops the pad an octave.
  assert.deepEqual(barPlan(0, 'deep').pad, CHORDS[0].pad.map((f) => f / 2));
});

test('the mood follows where the traveler is', () => {
  assert.equal(moodFor({ restingOn: 'moon', surfaceKm: 0 }), 'surface');
  assert.equal(moodFor({ restingOn: null, surfaceKm: 9000 }), 'near');
  assert.equal(moodFor({ restingOn: null, surfaceKm: 300000 }), 'near');
  assert.equal(moodFor({ restingOn: null, surfaceKm: 300001 }), 'deep');
});
