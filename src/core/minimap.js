// Top-down solar-system map, seen from north (+y): x to the right, z up the map.
// Distances from the Sun shrink by their square root so the inner planets do not
// huddle in the middle next to Neptune's far orbit.

export function mapPoint(position, sunPosition, outerKm, radiusPx) {
  const dx = position[0] - sunPosition[0];
  const dz = position[2] - sunPosition[2];
  const r = Math.hypot(dx, dz);
  if (r === 0) return [0, 0];
  const scaled = radiusPx * Math.sqrt(Math.min(r, outerKm) / outerKm);
  return [(dx / r) * scaled, (-dz / r) * scaled];
}

// Unit 2D direction on the map, or null when the flight heading is nearly vertical.
export function mapHeading(forward) {
  const length = Math.hypot(forward[0], forward[2]);
  if (length < 1e-6) return null;
  return [forward[0] / length, -forward[2] / length];
}

export function pickNearest([px, py], dots, within = 12) {
  let best = null;
  let bestDistance = within;
  for (const dot of dots) {
    const d = Math.hypot(dot.x - px, dot.y - py);
    if (d <= bestDistance) {
      best = dot.id;
      bestDistance = d;
    }
  }
  return best;
}

// The one letter beside a planet's dot on the map: the first of its English name
// (Saturn: S). The Sun in the middle and the comets get none; nor do the planets inside
// Earth's orbit, Mercury and Venus: on a map this small there is no room for letters
// that close to the middle (the user, 2026-10-04: "자리가 모자란다").
const NO_LETTER = ['mercury', 'venus'];
// A planet of another star (core/exo.js) has its own letter: TRAPPIST-1 e is "e".
export function mapLetter(body) {
  if (NO_LETTER.includes(body.id)) return null;
  if (body.kind === 'exoplanet') return body.nameEn.slice(-1);
  return body.kind === 'planet' || body.kind === 'dwarf' ? body.nameEn[0].toUpperCase() : null;
}

// Where that letter goes: `gap` pixels from the dot, on the side away from the Sun
// (the middle of the map), so the letters of the inner planets spread outward and not
// over one another. Straight up when the dot is on the middle. A dot so far out that
// the letter would pass `edge` pixels from the middle (Pluto, on the rim of the map)
// has its letter on the inner side.
export function letterPoint([x, y], gap, edge = Infinity) {
  const r = Math.hypot(x, y);
  if (r < 1e-6) return [x, y - gap];
  const out = r + gap > edge ? -gap : gap;
  return [x + (x / r) * out, y + (y / r) * out];
}
