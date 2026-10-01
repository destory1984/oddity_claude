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
