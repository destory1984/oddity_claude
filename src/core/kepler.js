// Elliptical orbits (Halley's Comet). Circular orbits stay in bodies.js.

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
  const E = eccentricAnomaly((2 * Math.PI * (timeS - perihelionAtS)) / periodS, eccentricity);
  return {
    x: semiMajorKm * (Math.cos(E) - eccentricity),
    y: semiMajorKm * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E),
    r: semiMajorKm * (1 - eccentricity * Math.cos(E)),
  };
}
