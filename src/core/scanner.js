import { forward, right, up } from './orientation.js';

// The 3D scanner (ui/scanner.js): the few things nearest her laid on a flat ellipse round
// her, as in Elite's, each with a stalk up or down for how far above or below her level
// it is (the user, 2026-10-18, a frame of Oolite: "이런 계기판 넣어볼까?", then of three
// looks "B": gold lines, a name on each).
// things: [{ id, position (km), radiusKm? }]. Returns up to `count` of them, nearest
// first, each { id, x, z, h } in -1 → 1: x to her right, z ahead, h above. Distances
// go on a log scale between the nearest and the farthest shown, so a craft 60 km off
// and a moon 400,000 km off both find room; the farthest stands on the rim.
// A world whose surface is nearer than three times its radius fills her view and is
// named on the plate: it is left out, as the ground under her is. And as things at
// much the same distance fell in one heap (Earth, the station and Chandra, the user's
// first look), each one's distance from her on the scanner is half its log distance and
// half its place in the order, nearest to farthest.
export const SCANNER_COUNT = 5;

export function scannerPoints(position, orientation, things, count = SCANNER_COUNT) {
  const axes = [right(orientation), up(orientation), forward(orientation)];
  const near = things
    .map((thing) => {
      const rel = thing.position.map((n, i) => n - position[i]);
      const centre = Math.hypot(...rel);
      return { id: thing.id, rel, centre, surface: Math.max(0, centre - (thing.radiusKm ?? 0)), radius: thing.radiusKm ?? 0 };
    })
    .filter((n) => n.centre > 0 && !(n.radius > 0 && n.surface < n.radius * 3))
    .sort((a, b) => a.surface - b.surface)
    .slice(0, count);
  if (!near.length) return [];
  const nearest = Math.max(1, near[0].surface);
  const farthest = Math.max(nearest * 1.5, near[near.length - 1].surface);
  const reach = (d) => 0.18 + 0.82 * (Math.log1p(Math.max(0, d) / nearest) / Math.log1p(farthest / nearest));
  const rank = (k) => (near.length > 1 ? 0.25 + 0.75 * (k / (near.length - 1)) : 0.6);
  return near.map((n, k) => {
    const [x, h, z] = axes.map((a) => a.reduce((s, v, i) => s + v * n.rel[i], 0) / n.centre);
    const r = Math.min(1, (reach(n.surface) + rank(k)) / 2);
    return { id: n.id, x: x * r, z: z * r, h: h * r };
  });
}
