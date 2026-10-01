// Did the traveler pass through a planet's rings this frame? prev and now are the
// traveler's position relative to the planet's centre (km) before and after the move,
// normal is the ring plane's unit normal. Returns where along the rings the path
// crossed (t = 0 at the inner edge, 1 at the outer edge), or null.
export function ringCrossing(prev, now, normal, innerKm, outerKm) {
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const before = dot(prev, normal);
  const after = dot(now, normal);
  if (before * after >= 0) return null;
  const f = before / (before - after);
  const hit = prev.map((n, i) => n + (now[i] - n) * f);
  const r = Math.hypot(...hit);
  if (r < innerKm || r > outerKm) return null;
  return { t: (r - innerKm) / (outerKm - innerKm) };
}

// Rough share of Saturn's ring material at t (same bands as shaders/rings.glsl):
// thin C ring, dense B ring, nearly empty Cassini division, medium A ring.
export function ringDensity(t) {
  if (t < 0 || t > 1) return 0;
  if (t < 0.28) return 0.25;
  if (t < 0.69) return 1;
  if (t < 0.765) return 0.08;
  return 0.7;
}
