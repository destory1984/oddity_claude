// The sky round the big map (ui/mapSky.js draws it): stars that twinkle outside the map's
// circle, and now and then a comet going by (the user, 2026-10-07: "동그라미 안은 그대로
// 두고, 그 밖 외곽은 반짝반짝하는 느낌 나게 해줘.. 가끔씩 혜성도 지나가고").
// Everything here is in the sheet's own pixels: a rectangle w by h with the map's circle,
// radius r, at its middle.

// Steady numbers 0 → 1 from a seed, so the stars stand where they stood.
export function seeded(seed) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

// `count` stars outside the circle (a few pixels clear of it): where each is, how large,
// how fast and from what moment it twinkles, and whether it flares into a little cross.
export function mapStars(count, w, h, r, seed = 7) {
  const random = seeded(seed);
  const stars = [];
  for (let tries = 0; stars.length < count && tries < count * 40; tries += 1) {
    const x = random() * w;
    const y = random() * h;
    const size = 0.6 + 1.1 * random() ** 2;
    const pace = 0.7 + 1.9 * random();
    const from = random() * Math.PI * 2;
    const cross = random() < 0.16;
    if (Math.hypot(x - w / 2, y - h / 2) < r + 5) continue;
    stars.push({ x, y, size, pace, from, cross });
  }
  return stars;
}

// How bright a star is t seconds in (0.15 → 1): a slow swell and fall, each at its own pace.
export function twinkle(star, t) {
  const wave = 0.5 + 0.5 * Math.sin(star.from + t * star.pace);
  return 0.15 + 0.85 * wave * wave;
}

export const COMET_S = 1.1;
// A comet every seven to twelve seconds: the n-th one begins at cometStart(n).
export function cometStart(n, seed = 11) {
  const random = seeded(seed);
  let at = 2.5;
  for (let i = 0; i < n; i += 1) at += 7 + 5 * random();
  return at;
}

// The comet in the sky t seconds in, or null: its head [x, y], the unit way it goes, how
// far through its pass it is (0 → 1) and how bright (it fades in and out at the ends).
// The map's circle fills the middle of the sheet, so each cuts across one of the four
// corners, from the top or bottom edge down to the side: clear of the circle all the way.
export function cometAt(t, w, h, seed = 11) {
  let n = 0;
  while (cometStart(n + 1, seed) <= t) n += 1;
  const since = t - cometStart(n, seed);
  if (since < 0 || since > COMET_S) return null;
  const random = seeded(seed * 31 + n * 97 + 5);
  const right = random() < 0.5;
  const low = random() < 0.35;
  const along = (0.16 + 0.12 * random()) * w;
  const down = (0.24 + 0.16 * random()) * h;
  const u = since / COMET_S;
  // From the upper end of the cut to the lower: it always falls.
  const top = [right ? w - along : along, 0];
  const side = [right ? w : 0, down];
  const [from, to] = low ? [[side[0], h - down], [top[0], h]] : [top, side];
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const way = [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  // (It comes in from a little off the sheet and leaves a little off it.)
  const far = -24 + (length + 48) * u;
  return {
    head: [from[0] + way[0] * far, from[1] + way[1] * far],
    way,
    u,
    light: Math.min(1, u / 0.15, (1 - u) / 0.25),
  };
}
