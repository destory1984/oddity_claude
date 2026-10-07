import { t } from './i18n.js';
// Background music, decided here and played by ui/sound.js. No sound files: a slow pad
// of three notes per bar under a few bell notes, different every bar but always the
// same for a given bar number. Twenty tunes take turns, each with its own four chords,
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
// bell: how long a note rings, and its overtone (a multiple of the note, and how loud);
//   wave: 'triangle' for a plucked sound (a sine, the music box, when left out).
// motif: a figure, as places in the melody; the notes that sound walk along it in
//   order instead of being picked by chance (which notes sound is still by chance).
export const TUNES = [
  {
    id: 'box', name: t('오르골'),
    chords: CHORDS, melody: MELODY,
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.45,
    bell: { length: 1.4, overtone: 3, overtoneVolume: 0.2 },
  },
  {
    // C major, bright and open.
    id: 'dawn', name: t('새벽'),
    chords: [chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('G2', 'G3', 'B3', 'D4')],
    melody: scale('C5 D5 E5 G5 A5 C6 D6 E6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.5,
    bell: { length: 1.0, overtone: 2, overtoneVolume: 0.25 },
  },
  {
    // D dorian: minor with a raised sixth, like a calm sea.
    id: 'sea', name: t('먼 바다'),
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('G2', 'G3', 'B3', 'D4'), chord('C3', 'G3', 'C4', 'E4'), chord('A2', 'A3', 'C4', 'E4')],
    melody: scale('D5 F5 G5 A5 C6 D6 F6 G6'),
    slots: [0, 1.5, 3, 4, 5.5, 7], busy: 0.5,
    bell: { length: 1.8, overtone: 3, overtoneVolume: 0.15 },
  },
  {
    // F major in threes: a cradle song.
    id: 'lullaby', name: t('자장가'),
    chords: [chord('F2', 'A3', 'C4', 'F4'), chord('D2', 'A3', 'D4', 'F4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('C3', 'G3', 'C4', 'E4')],
    melody: scale('C5 D5 F5 G5 A5 C6 D6 F6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.6,
    bell: { length: 1.6, overtone: 4, overtoneVolume: 0.12 },
  },
  {
    // E minor, high and glassy.
    id: 'stars', name: t('별무리'),
    chords: [chord('E2', 'G3', 'B3', 'E4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('E5 G5 A5 B5 D6 E6 G6 A6'),
    slots: [0, 0.5, 1, 2, 3, 4, 4.5, 5, 6, 7], busy: 0.35,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.3 },
  },
  {
    // D minor, low and slow, one long note at a time.
    id: 'night', name: t('깊은 밤'),
    chords: [chord('D2', 'A3', 'D4', 'F4'), chord('A2', 'A3', 'C4', 'E4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('D4 F4 G4 A4 C5 D5 F5 G5'),
    slots: [0, 2, 4, 6], busy: 0.7,
    bell: { length: 2.6, overtone: 2, overtoneVolume: 0.2 },
  },
  // The five below came later (2026-10-03: six were heard too often). Each also has a
  // figure of its own, so they do not sound like the first six with other notes.
  {
    // G major in fives: a slow climb and back down.
    id: 'drift', name: t('유영'),
    chords: [chord('G2', 'G3', 'B3', 'D4'), chord('E2', 'G3', 'B3', 'E4'), chord('C3', 'G3', 'C4', 'E4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('G4 A4 B4 D5 E5 G5 A5 B5'),
    slots: [0, 1.6, 3.2, 4.8, 6.4], busy: 0.62,
    bell: { length: 2.0, overtone: 2, overtoneVolume: 0.18 },
    motif: [0, 2, 3, 5, 7, 5, 3, 2],
  },
  {
    // B minor, many short drops: rain on a window.
    id: 'rain', name: t('빗방울'),
    chords: [chord('B2', 'F#3', 'B3', 'D4'), chord('G2', 'G3', 'B3', 'D4'), chord('D2', 'A3', 'D4', 'F#4'), chord('A2', 'A3', 'C#4', 'E4')],
    melody: scale('D5 E5 F#5 A5 B5 D6 E6 F#6'),
    slots: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7], busy: 0.24,
    bell: { length: 0.8, overtone: 4, overtoneVolume: 0.1, wave: 'triangle' },
  },
  {
    // The five notes of a Korean tune on G, plucked: two close together, then a wait.
    id: 'gayageum', name: t('가야금'),
    chords: [chord('G2', 'G3', 'C4', 'D4'), chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'A3', 'D4'), chord('D2', 'A3', 'D4', 'E4')],
    melody: scale('D4 E4 G4 A4 C5 D5 E5 G5'),
    slots: [0, 0.4, 2, 2.4, 4, 5, 5.4, 7], busy: 0.5,
    bell: { length: 1.3, overtone: 2, overtoneVolume: 0.3, wave: 'triangle' },
    motif: [3, 5, 4, 3, 2, 3, 5, 7, 6, 5, 3, 2],
  },
  {
    // D major, wide and bright, a falling line.
    id: 'aurora', name: t('오로라'),
    chords: [chord('D2', 'A3', 'D4', 'F#4'), chord('B2', 'F#3', 'B3', 'D4'), chord('G2', 'G3', 'B3', 'D4'), chord('A2', 'A3', 'C#4', 'E4')],
    melody: scale('A4 B4 D5 E5 F#5 A5 B5 D6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.4,
    bell: { length: 2.4, overtone: 3, overtoneVolume: 0.12 },
    motif: [7, 6, 4, 5, 4, 2, 3, 1],
  },
  {
    // B flat major in threes, up and down like a merry-go-round.
    id: 'carousel', name: t('회전목마'),
    chords: [chord('Bb2', 'Bb3', 'D4', 'F4'), chord('G2', 'G3', 'Bb3', 'D4'), chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('Bb4 C5 D5 F5 G5 Bb5 C6 D6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.62,
    bell: { length: 1.1, overtone: 2, overtoneVolume: 0.22 },
    motif: [0, 2, 4, 1, 3, 5, 2, 4, 6, 4, 2, 1],
  },
  // The nine below made it twenty (the user, 2026-10-07: "BGM 더 넣자. 20개 채워").
  {
    // A major, high and thin, with gaps: snow coming down.
    id: 'snow', name: t('눈송이'),
    chords: [chord('A2', 'A3', 'C#4', 'E4'), chord('F#2', 'F#3', 'A3', 'C#4'), chord('D2', 'A3', 'D4', 'F#4'), chord('E2', 'G#3', 'B3', 'E4')],
    melody: scale('A4 B4 C#5 E5 F#5 A5 B5 C#6'),
    slots: [0, 1, 2.5, 4, 5, 6.5], busy: 0.42,
    bell: { length: 1.5, overtone: 4, overtoneVolume: 0.1 },
  },
  {
    // E dorian, low and warm, a small figure that turns back on itself.
    id: 'lantern', name: t('등불'),
    chords: [chord('E2', 'G3', 'B3', 'E4'), chord('A2', 'A3', 'C#4', 'E4'), chord('D2', 'A3', 'D4', 'F#4'), chord('B2', 'F#3', 'B3', 'D4')],
    melody: scale('E4 F#4 A4 B4 D5 E5 F#5 A5'),
    slots: [0, 2, 3, 4, 6, 7], busy: 0.55,
    bell: { length: 2.0, overtone: 2, overtoneVolume: 0.22 },
    motif: [0, 3, 2, 4, 3, 5, 4, 2],
  },
  {
    // G minor in threes: a slow waltz.
    id: 'waltz', name: t('달빛 왈츠'),
    chords: [chord('G2', 'G3', 'Bb3', 'D4'), chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('Bb2', 'Bb3', 'D4', 'F4'), chord('D2', 'A3', 'D4', 'F#4')],
    melody: scale('G4 Bb4 C5 D5 F5 G5 Bb5 C6'),
    slots: [0, 1.33, 2.67, 4, 5.33, 6.67], busy: 0.55,
    bell: { length: 1.4, overtone: 3, overtoneVolume: 0.15 },
    motif: [4, 3, 1, 2, 4, 5, 7, 5, 4, 2, 3, 1],
  },
  {
    // F major, plucked and quick: a walk across a field.
    id: 'meadow', name: t('풀밭'),
    chords: [chord('F2', 'A3', 'C4', 'F4'), chord('C3', 'G3', 'C4', 'E4'), chord('D2', 'A3', 'D4', 'F4'), chord('Bb2', 'Bb3', 'D4', 'F4')],
    melody: scale('F4 G4 A4 C5 D5 F5 G5 A5'),
    slots: [0, 0.5, 1, 2, 3, 4, 4.5, 5, 6, 7], busy: 0.4,
    bell: { length: 0.9, overtone: 2, overtoneVolume: 0.25, wave: 'triangle' },
    motif: [0, 2, 4, 3, 2, 4, 5, 7, 5, 4, 2, 1],
  },
  {
    // A minor: all the way up the scale and all the way down, as the tide comes in.
    id: 'tide', name: t('밀물'),
    chords: [chord('A2', 'A3', 'C4', 'E4'), chord('E2', 'G3', 'B3', 'E4'), chord('F2', 'A3', 'C4', 'F4'), chord('G2', 'G3', 'B3', 'D4')],
    melody: scale('E4 G4 A4 C5 D5 E5 G5 A5'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.5,
    bell: { length: 2.2, overtone: 2, overtoneVolume: 0.15 },
    motif: [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1],
  },
  {
    // C major, a short bright bell on every beat, always coming back to the same note.
    id: 'clock', name: t('시계탑'),
    chords: [chord('C3', 'G3', 'C4', 'E4'), chord('G2', 'G3', 'B3', 'D4'), chord('A2', 'A3', 'C4', 'E4'), chord('F2', 'A3', 'C4', 'F4')],
    melody: scale('G4 A4 C5 D5 E5 G5 A5 C6'),
    slots: [0, 1, 2, 3, 4, 5, 6, 7], busy: 0.6,
    bell: { length: 0.8, overtone: 5, overtoneVolume: 0.12 },
    motif: [2, 4, 2, 5, 2, 6, 3, 0],
  },
  {
    // E minor, plucked, in pairs with a gap: sparks from a fire.
    id: 'campfire', name: t('모닥불'),
    chords: [chord('E2', 'G3', 'B3', 'E4'), chord('D2', 'A3', 'D4', 'F#4'), chord('C3', 'G3', 'C4', 'E4'), chord('B2', 'F#3', 'B3', 'D4')],
    melody: scale('B4 D5 E5 F#5 G5 B5 D6 E6'),
    slots: [0, 1.5, 2, 3.5, 4, 5.5, 6, 7], busy: 0.45,
    bell: { length: 1.2, overtone: 3, overtoneVolume: 0.18, wave: 'triangle' },
    motif: [1, 2, 4, 2, 1, 0, 2, 4, 5, 4, 2, 0],
  },
  {
    // E flat major, long notes far apart, the longest ring of all.
    id: 'galaxy', name: t('은하수'),
    chords: [chord('Eb2', 'G3', 'Bb3', 'Eb4'), chord('C3', 'G3', 'C4', 'Eb4'), chord('Ab2', 'Ab3', 'C4', 'Eb4'), chord('Bb2', 'Bb3', 'D4', 'F4')],
    melody: scale('Bb4 C5 Eb5 F5 G5 Bb5 C6 Eb6'),
    slots: [0, 1, 3, 4, 5, 7], busy: 0.5,
    bell: { length: 2.8, overtone: 2, overtoneVolume: 0.12 },
  },
  {
    // F sharp minor, high: two quick notes and a wait, lights going on and off.
    id: 'firefly', name: t('반딧불'),
    chords: [chord('F#2', 'F#3', 'A3', 'C#4'), chord('D2', 'A3', 'D4', 'F#4'), chord('A2', 'A3', 'C#4', 'E4'), chord('E2', 'G#3', 'B3', 'E4')],
    melody: scale('C#5 E5 F#5 A5 B5 C#6 E6 F#6'),
    slots: [0, 0.3, 1.5, 3, 3.3, 4.5, 6, 6.3], busy: 0.38,
    bell: { length: 0.8, overtone: 3, overtoneVolume: 0.2 },
    motif: [5, 4, 2, 4, 5, 7, 6, 4, 2, 1, 2, 4],
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

// The tunes in a chance order for one sitting (random: a function giving 0..1), so the
// game does not open with the same tune every time. Every tune comes once a round.
export function tuneOrder(random = Math.random) {
  const order = TUNES.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

// The bar number to play at `position` (bars played so far in this sitting) when the
// tunes go round in `order`: the same place in the tune, in a later round each time
// round, so a tune's notes differ from its last turn.
export function barInOrder(position, order) {
  const turn = Math.floor(position / BARS_PER_TUNE);
  const round = Math.floor(turn / order.length);
  return (round * TUNES.length + order[turn % order.length]) * BARS_PER_TUNE + (position % BARS_PER_TUNE);
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
      freq: tune.motif
        ? tune.melody[tune.motif[(bar * tune.slots.length + i) % tune.motif.length]]
        : tune.melody[Math.floor(chance(bar, i + 100) * tune.melody.length)],
      // A little off the beat, like a hand-wound music box.
      at: Math.min(BAR_S - 0.6, slot + chance(bar, i + 200) * 0.3),
      volume: 0.02 + chance(bar, i + 300) * 0.025,
    });
  });
  return { bass: bass * octave, pad: pad.map((f) => f * octave), notes, bell: tune.bell };
}
