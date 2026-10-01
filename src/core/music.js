// Background music, decided here and played by ui/sound.js. No sound files: a slow pad
// of three notes per bar under a few bell notes, different every bar but always the
// same for a given bar number. Six tunes take turns, each with its own four chords,
// five-note scale, beat and bell.

export const BAR_S = 8;
// Each tune plays this many bars (about two minutes), then the next one starts.
export const BARS_PER_TUNE = 16;

const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// 'A4' → 440, 'Bb2' → 116.54, 'F#4' → 369.99.
function hz(name) {
  const [, letter, mark, octave] = name.match(/^([A-G])([#b]?)(\d)$/);
  const midi = 12 * (Number(octave) + 1) + STEPS[letter] + { '#': 1, b: -1, '': 0 }[mark];
  return Math.round(440 * 2 ** ((midi - 69) / 12) * 100) / 100;
}
const chord = (bass, ...pad) => ({ bass: hz(bass), pad: pad.map(hz) });
const scale = (names) => names.split(' ').map(hz);

// A minor, F, C, G: the pad's three notes (Hz) and a bass note under them.
export const CHORDS = [
  chord('A2', 'A3', 'C4', 'E4'),
  chord('F2', 'F3', 'A3', 'C4'),
  chord('C3', 'G3', 'C4', 'E4'),
  chord('G2', 'G3', 'B3', 'D4'),
];
// A minor pentatonic over two octaves: any of these fits any of the chords.
export const MELODY = scale('A4 C5 D5 E5 G5 A5 C6 D6');

// slots: where a melody note may fall inside a bar, in seconds.
// busy: the share of slots that sound near a world (deep space: about a third of it).
// bell: how long a note rings, and its overtone (a multiple of the note, and how loud).
export const TUNES = [
  {
    id: 'box', name: '오르골',
    chords: CHORDS, melody: MELODY,
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.45,
    bell: { length: 1.4, overtone: 3, overtoneVolume: 0.2 },
  },
  {
    // C major, bright and open.
    id: 'dawn', name: '새벽',
    chords: [chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('G2', 'G3', 'B3', 'D4')],
    melody: scale('C5 D5 E5 G5 A5 C6 D6 E6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.5,
    bell: { length: 1.0, overtone: 2, overtoneVolume: 0.25 },
  },
  {
    // D dorian: minor with a raised sixth, like a calm sea.
    id: 'sea', name: '먼 바다',
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('G2', 'G3', 'B3', 'D4'), chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4')],
    melody: scale('D5 F5 G5 A5 C6 D6 F6 G6'),
    slots: [0, 1.5, 3, 4, 5.5, 7], busy: 0.5,
    bell: { length: 1.8, overtone: 3, overtoneVolume: 0.15 },
  },
  {
    // F major in threes: a cradle song.
    id: 'lullaby', name: '자장가',
    chords: [chord('F2', 'A3', 'C4', 'F4'), chord('D2', 'A3', 'D4', 'F4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('C3', 'G3', 'C4', 'E4')],
    melody: scale('C5 D5 F5 G5 A5 C6 D6 F6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.6,
    bell: { length: 1.6, overtone: 4, overtoneVolume: 0.12 },
  },
  {
    // E minor, high and glassy.
    id: 'stars', name: '별무리',
    chords: [chord('E2', 'G3', 'B3', 'E4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('E5 G5 A5 B5 D6 E6 G6 A6'),
    slots: [0, 0.5, 1, 2, 3, 4, 4.5, 5, 6, 7], busy: 0.35,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.3 },
  },
  {
    // D minor, low and slow, one long note at a time.
    id: 'night', name: '깊은 밤',
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('A2', 'A3', 'C4', 'E4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('D4 F4 G4 A4 C5 D5 F5 G5'),
    slots: [0, 2, 4, 6], busy: 0.7,
    bell: { length: 2.6, overtone: 2, overtoneVolume: 0.2 },
  },
];

// How much of a tune's busyness is left in each mood.
const BUSY = { near: 1, deep: 0.36, surface: 0 };

// Steady numbers in 0..1 for (bar, n), the same every time.
function chance(bar, n) {
  let x = (Math.imul(bar + 1, 0x9e3779b1) ^ Math.imul(n + 1, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// 'surface' while standing on a world, 'near' within 300,000 km of one, else 'deep'.
export function moodFor({ restingOn, surfaceKm }) {
  if (restingOn) return 'surface';
  return surfaceKm <= 300000 ? 'near' : 'deep';
}

// The tune that bar number `bar` belongs to.
export function tuneFor(bar) {
  return TUNES[Math.floor(bar / BARS_PER_TUNE) % TUNES.length];
}

// The first bar of the tune after the one `bar` is in.
export function nextTuneBar(bar) {
  return (Math.floor(bar / BARS_PER_TUNE) + 1) * BARS_PER_TUNE;
}

// What to play in bar number `bar`:
// { bass, pad: [3 Hz], notes: [{ freq, at, volume }], bell: { length, overtone, overtoneVolume } }.
export function barPlan(bar, mood) {
  const tune = tuneFor(bar);
  const { bass, pad } = tune.chords[bar % tune.chords.length];
  const octave = mood === 'deep' ? 0.5 : 1;
  const notes = [];
  tune.slots.forEach((slot, i) => {
    if (chance(bar, i) >= tune.busy * BUSY[mood]) return;
    notes.push({
      freq: tune.melody[Math.floor(chance(bar, i + 100) * tune.melody.length)],
      // A little off the beat, like a hand-wound music box.
      at: Math.min(BAR_S - 0.6, slot + chance(bar, i + 200) * 0.3),
      volume: 0.02 + chance(bar, i + 300) * 0.025,
    });
  });
  return { bass: bass * octave, pad: pad.map((f) => f * octave), notes, bell: tune.bell };
}
