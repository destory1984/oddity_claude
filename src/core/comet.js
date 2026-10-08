// How lively a comet is at a given real distance from the Sun (AU, before the
// distance squeeze): 1 at Halley's perihelion, fading to nothing by 5 AU.
const PERIHELION_AU = 0.586;
const ASLEEP_AU = 5;
export const TAIL_MAX_KM = 500000;
// Radius of the glow round the nucleus at full activity.
export const COMA_KM = 3000;

export function cometActivity(rAu) {
  if (rAu > ASLEEP_AU) return 0;
  return Math.min(1, (PERIHELION_AU / rAu) ** 1.5);
}

export function tailLengthKm(rAu) {
  return TAIL_MAX_KM * cometActivity(rAu);
}

// A tail is drawn as two planes crossed along its length (render/comet.js), and seen
// along that length they stand as four wedges round the head. So each tail fades as
// she comes onto its line: [out, whole] are the sines of the angle between the tail and
// the way from the nucleus to her at which it is gone and at which it is whole. The
// dust tail is the wider of the two and needs more room.
export const TAIL_END_ON = { gas: [0.15, 0.5], dust: [0.25, 0.6] };

// How much of a tail is drawn (0..1) seen from `off` its line (a sine).
export function tailShown(off, [out, whole]) {
  const k = Math.min(1, Math.max(0, (off - out) / (whole - out)));
  return k * k * (3 - 2 * k);
}
