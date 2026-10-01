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
