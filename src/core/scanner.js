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
  return spread(near.map((n, k) => {
    const [x, h, z] = axes.map((a) => a.reduce((s, v, i) => s + v * n.rel[i], 0) / n.centre);
    const r = Math.min(1, (reach(n.surface) + rank(k)) / 2);
    return { id: n.id, x: x * r, z: z * r, h: h * r };
  }));
}

// The world she is close to, which scannerPoints leaves out (its surface nearer than three
// of its radii), comes into the scanner as ground (the user, 2026-10-19: "스캐너는 근거리
// 스캐너잖아.. 행성이나 위성 부근에 가면, 지평선이 보일텐데", then of three looks "A"): the
// nearest such world; the way to its middle in her own frame (x right, h up, z ahead); and
// how far in its ground comes, a quarter of the way at three radii up to 0.85 on its surface.
export function scannerGround(position, orientation, things) {
  const axes = [right(orientation), up(orientation), forward(orientation)];
  let best = null;
  for (const thing of things) {
    const radius = thing.radiusKm ?? 0;
    if (!(radius > 0)) continue;
    const rel = thing.position.map((n, i) => n - position[i]);
    const centre = Math.hypot(...rel);
    const surface = Math.max(0, centre - radius);
    if (!(centre > 0) || surface >= radius * 3) continue;
    if (best && best.surface <= surface) continue;
    const [x, h, z] = axes.map((a) => a.reduce((s, v, i) => s + v * rel[i], 0) / centre);
    best = { id: thing.id, x, h, z, surface, fill: 0.25 + 0.6 * (1 - Math.log1p(surface / radius) / Math.log1p(3)) };
  }
  return best;
}

// Where a point's ball is drawn, as ui/scanner.js draws it (the ellipse is about a third
// as tall as it is wide, the stalk 1.4 times its height): x across, y up, in half-widths.
const FLAT = 0.35;
const ballAt = (p) => [p.x, (p.z + 1.4 * p.h) * FLAT];

// Things that lie much the same way from her stood in one heap, their names piled up
// (the user's worry on 2026-10-18 when the scanner came in, taken up the same day): two
// balls nearer than `gap` are turned apart round her, a little at a time, keeping how
// far each is from her and how high.
export function spread(points, gap = 0.22, rounds = 60) {
  const out = points.map((p) => ({ ...p }));
  for (let round = 0; round < rounds; round += 1) {
    let moved = false;
    for (let a = 0; a < out.length; a += 1) {
      for (let b = a + 1; b < out.length; b += 1) {
        const [ax, ay] = ballAt(out[a]);
        const [bx, by] = ballAt(out[b]);
        if (Math.hypot(ax - bx, ay - by) >= gap) continue;
        // Turn each the other way round her, the farther from her (on the flat) the less.
        const side = Math.sign(out[a].x * out[b].z - out[a].z * out[b].x) || (a % 2 ? 1 : -1);
        for (const [p, s] of [[out[a], -side], [out[b], side]]) {
          const r = Math.hypot(p.x, p.z);
          if (r < 1e-6) continue;
          const turn = (s * 0.04) / Math.max(r, 0.3);
          const c = Math.cos(turn);
          const sn = Math.sin(turn);
          [p.x, p.z] = [p.x * c - p.z * sn, p.x * sn + p.z * c];
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return out;
}
