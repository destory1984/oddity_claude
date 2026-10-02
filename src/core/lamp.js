// Looking closely at a place that is in the night just then showed nothing: a black
// ground. While it is looked at, the body is lit as if the Sun stood 37 degrees up over
// the place, on the side the real Sun is on (so shadows still fall the right way).
// up: the direction out of the ground at the place; toSun: the direction to the Sun.
// Returns the direction to light the body from, or null when the place has daylight.
const DARK_BELOW = 0.25; // the Sun less than about 14 degrees up
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};

export function inspectLight(up, toSun) {
  const u = unit(up);
  const s = unit(toSun);
  if (dot(u, s) >= DARK_BELOW) return null;
  let along = s.map((n, i) => n - u[i] * dot(u, s));
  // The Sun straight under the place: any way along the ground will do.
  if (Math.hypot(...along) < 1e-6) along = Math.abs(u[1]) < 0.9 ? [-u[2], 0, u[0]] : [1, 0, 0];
  const a = unit(along);
  return unit(u.map((n, i) => n * 0.6 + a[i] * 0.8));
}
