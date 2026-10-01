import { AU_KM, DISTANCE_COMPRESSION } from './bodies.js';

// The asteroid belt: scenery, not bodies. Nothing here is landed on, logged or hit.
// Distances are game km (after the 1/100 squeeze), measured from the Sun's centre.
export const BELT = {
  innerKm: (2.2 * AU_KM) / DISTANCE_COMPRESSION,
  outerKm: (3.2 * AU_KM) / DISTANCE_COMPRESSION,
  halfHeightKm: 20000,
  // Space is cut into cubes this wide; each may hold one rock.
  cellKm: 20000,
};
const ROCK_SHARE = 0.4;

export function inBelt(position, sunPosition) {
  const dx = position[0] - sunPosition[0];
  const dy = position[1] - sunPosition[1];
  const dz = position[2] - sunPosition[2];
  const r = Math.hypot(dx, dz);
  return r >= BELT.innerKm && r <= BELT.outerKm && Math.abs(dy) <= BELT.halfHeightKm;
}

// Three steady numbers in 0..1 for a cell, the same every time (negative cells too).
function cellNumbers(i, j, k) {
  let h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) >>> 0;
  const next = () => {
    // The murmur3 finishing mix: neighbouring cells come out unrelated.
    h = (h + 0x9e3779b9) >>> 0;
    let x = h;
    x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
  return [next(), next(), next(), next(), next()];
}

// The rocks in the 27 cells round the traveler. Real asteroids are far smaller and a
// million km apart; these are enlarged and crowded so there is something to see.
export function rocksNear(position, sunPosition) {
  const { cellKm } = BELT;
  const base = position.map((n, a) => Math.floor((n - sunPosition[a]) / cellKm));
  const rocks = [];
  for (let i = base[0] - 1; i <= base[0] + 1; i++) {
    for (let j = base[1] - 1; j <= base[1] + 1; j++) {
      for (let k = base[2] - 1; k <= base[2] + 1; k++) {
        const [has, x, y, z, size] = cellNumbers(i, j, k);
        if (has >= ROCK_SHARE) continue;
        const at = [
          sunPosition[0] + (i + x) * cellKm, sunPosition[1] + (j + y) * cellKm, sunPosition[2] + (k + z) * cellKm,
        ];
        if (!inBelt(at, sunPosition)) continue;
        rocks.push({ position: at, radiusKm: 10 + size * 50, seed: Math.floor(has * 1e6) });
      }
    }
  }
  return rocks;
}

// Fixed points for the faint band seen from afar, relative to the Sun.
export function beltPoints(count) {
  let seed = 41233;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const points = [];
  for (let n = 0; n < count; n++) {
    const angle = rand() * Math.PI * 2;
    const r = BELT.innerKm + rand() * (BELT.outerKm - BELT.innerKm);
    points.push([r * Math.cos(angle), (rand() * 2 - 1) * BELT.halfHeightKm, r * Math.sin(angle)]);
  }
  return points;
}
