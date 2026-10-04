const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Character size by screen shape: full size on wide screens, 60% on a tall phone,
// easing in between, so she never covers most of a narrow view.
export function heroScaleFor(aspect) {
  const t = clamp((aspect - 390 / 844) / (1.2 - 390 / 844), 0, 1);
  return 0.78 + (1.3 - 0.78) * t;
}
