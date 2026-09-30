export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function normalize(v) {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
}
