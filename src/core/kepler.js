// Elliptical orbits (Halley's Comet), and the open paths of visitors from between the
// stars (eccentricity over 1). Circular orbits stay in bodies.js.

// Solves Kepler's equation M = E - e sin E. The left side grows steadily with E, so
// halving the interval always works, even for a comet's e of 0.967 where Newton's
// method can overshoot near perihelion.
export function eccentricAnomaly(meanAnomaly, e) {
  const turn = 2 * Math.PI;
  const m = meanAnomaly - turn * Math.round(meanAnomaly / turn);
  let lo = -Math.PI;
  let hi = Math.PI;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mid - e * Math.sin(mid) < m) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Position in the orbit's own plane, in km: the Sun at the origin, +x toward
// perihelion, y positive after perihelion. r is the distance from the Sun.
export function ellipsePoint({ semiMajorKm, eccentricity, periodS, perihelionAtS }, timeS) {
  if (eccentricity > 1) return hyperbolaPoint({ semiMajorKm, eccentricity, periodS, perihelionAtS }, timeS);
  const E = eccentricAnomaly((2 * Math.PI * (timeS - perihelionAtS)) / periodS, eccentricity);
  return {
    x: semiMajorKm * (Math.cos(E) - eccentricity),
    y: semiMajorKm * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E),
    r: semiMajorKm * (1 - eccentricity * Math.cos(E)),
  };
}

// The Sun's gravity, km^3/s^2.
export const SUN_GM = 1.32712440018e11;

// Solves M = e sinh H - H for the hyperbolic anomaly H, by halving (the right side
// grows steadily with H).
export function hyperbolicAnomaly(meanAnomaly, e) {
  let lo = -40;
  let hi = 40;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (e * Math.sinh(mid) - mid < meanAnomaly) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// A visitor from between the stars passes the Sun once on an open path (a hyperbola)
// and never comes back. The game clock runs 50 times faster than the real one, so
// here the pass is shown again and again: periodS is how long one pass is seen, from
// half of it before perihelion to half after (then it starts in again from afar).
// semiMajorKm is the hyperbola's a = perihelion distance / (e - 1).
export function hyperbolaPoint({ semiMajorKm, eccentricity, periodS, perihelionAtS }, timeS) {
  const a = semiMajorKm;
  const e = eccentricity;
  let since = timeS - perihelionAtS;
  since -= periodS * Math.round(since / periodS);
  const H = hyperbolicAnomaly(Math.sqrt(SUN_GM / (a * a * a)) * since, e);
  return {
    x: a * (e - Math.cosh(H)),
    y: a * Math.sqrt(e * e - 1) * Math.sinh(H),
    r: a * (e * Math.cosh(H) - 1),
  };
}
