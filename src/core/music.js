// Background music, decided here and played by ui/sound.js. No sound files: a slow pad
// of three notes per bar under a few music-box notes, different every bar but always
// the same for a given bar number.

export const BAR_S = 8;
// A minor, F, C, G: the pad's three notes (Hz) and a bass note under them.
export const CHORDS = [
  { bass: 110, pad: [220, 261.63, 329.63] },
  { bass: 87.31, pad: [174.61, 220, 261.63] },
  { bass: 130.81, pad: [196, 261.63, 329.63] },
  { bass: 98, pad: [196, 246.94, 293.66] },
];
// A minor pentatonic over two octaves: any of these fits any of the chords.
export const MELODY = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66];

// Where a melody note may fall inside a bar, in seconds.
const SLOTS = [0, 1, 2, 3, 4, 5, 6, 7];
// Share of slots that sound, by mood.
const BUSY = { near: 0.45, deep: 0.16, surface: 0 };

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

// What to play in bar number `bar`: { bass, pad: [3 Hz], notes: [{ freq, at, volume }] }.
export function barPlan(bar, mood) {
  const chord = CHORDS[bar % CHORDS.length];
  const octave = mood === 'deep' ? 0.5 : 1;
  const notes = [];
  for (const slot of SLOTS) {
    if (chance(bar, slot) >= BUSY[mood]) continue;
    notes.push({
      freq: MELODY[Math.floor(chance(bar, slot + 100) * MELODY.length)],
      // A little off the beat, like a hand-wound music box.
      at: Math.min(BAR_S - 0.6, slot + chance(bar, slot + 200) * 0.3),
      volume: 0.02 + chance(bar, slot + 300) * 0.025,
    });
  }
  return { bass: chord.bass * octave, pad: chord.pad.map((f) => f * octave), notes };
}
