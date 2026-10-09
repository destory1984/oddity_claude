// Quaternions are [x, y, z, w] arrays.

export function multiply(a, b) {
  const [x, y, z, w] = a;
  const [u, v, t, s] = b;
  return [
    w * u + x * s + y * t - z * v,
    w * v - x * t + y * s + z * u,
    w * t + x * v - y * u + z * s,
    w * s - x * u - y * v - z * t,
  ];
}

function axisRotation(angle, axisIndex) {
  const q = [0, 0, 0, Math.cos(angle / 2)];
  q[axisIndex] = Math.sin(angle / 2);
  return q;
}

// Rotate about the body's own axes: yaw (Y), then pitch (X), then roll (Z).
export function rotateLocal(q, yaw, pitch, roll = 0) {
  const out = multiply(multiply(multiply(q, axisRotation(yaw, 1)), axisRotation(pitch, 0)), axisRotation(roll, 2));
  const length = Math.hypot(...out);
  return out.map((n) => n / length);
}

export function forward([x, y, z, w]) {
  return [2 * (x * z + w * y), 2 * (y * z - w * x), 1 - 2 * (x * x + y * y)];
}

export function lookAtDirection(d) {
  const length = Math.hypot(...d) || 1;
  const [x, y, z] = d.map((n) => n / length);
  return rotateLocal([0, 0, 0, 1], Math.atan2(x, z), -Math.asin(Math.max(-1, Math.min(1, y))));
}

// Inverse of a unit quaternion.
export function conjugate([x, y, z, w]) {
  return [-x, -y, -z, w];
}

// Rotate vector v by unit quaternion q (q v q*).
export function rotateVector([x, y, z, w], v) {
  const t = [2 * (y * v[2] - z * v[1]), 2 * (z * v[0] - x * v[2]), 2 * (x * v[1] - y * v[0])];
  return [
    v[0] + w * t[0] + (y * t[2] - z * t[1]),
    v[1] + w * t[1] + (z * t[0] - x * t[2]),
    v[2] + w * t[2] + (x * t[1] - y * t[0]),
  ];
}

export function right(q) {
  return rotateVector(q, [1, 0, 0]);
}

export function up(q) {
  return rotateVector(q, [0, 1, 0]);
}

// The orientation that looks along `ahead` with `above` up (as near as it can be while
// square to `ahead`).
export function orientationFrom(ahead, above) {
  const unit = (v) => {
    const length = Math.hypot(...v) || 1;
    return v.map((n) => n / length);
  };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const f = unit(ahead);
  const r = unit(cross(above, f));
  const u = cross(f, r);
  // The rotation whose columns are r, u, f, as a quaternion.
  const trace = r[0] + u[1] + f[2];
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return [(u[2] - f[1]) / s, (f[0] - r[2]) / s, (r[1] - u[0]) / s, s / 4];
  }
  if (r[0] > u[1] && r[0] > f[2]) {
    const s = Math.sqrt(1 + r[0] - u[1] - f[2]) * 2;
    return [s / 4, (u[0] + r[1]) / s, (f[0] + r[2]) / s, (u[2] - f[1]) / s];
  }
  if (u[1] > f[2]) {
    const s = Math.sqrt(1 + u[1] - r[0] - f[2]) * 2;
    return [(u[0] + r[1]) / s, s / 4, (f[1] + u[2]) / s, (f[0] - r[2]) / s];
  }
  const s = Math.sqrt(1 + f[2] - r[0] - u[1]) * 2;
  return [(f[0] + r[2]) / s, (f[1] + u[2]) / s, s / 4, (r[1] - u[0]) / s];
}

// Part-way from orientation a to b (t from 0 to 1), by the short way round.
export function blend(a, b, t) {
  const same = a.reduce((sum, n, i) => sum + n * b[i], 0) >= 0 ? 1 : -1;
  const out = a.map((n, i) => n + (b[i] * same - n) * t);
  const length = Math.hypot(...out) || 1;
  return out.map((n) => n / length);
}

// Turns orientation q so that its own line `local` (a unit vector in the view's axes)
// points along the world direction `way`, by the shortest turn; t (0..1) is how much of
// that turn is made. Nothing here knows which way is up, so the view does not flip when
// the direction passes straight overhead or underfoot, as one built by lookAtDirection
// does (target lock used that: sliding round a target, over its top, the view span half
// round at the top, the slide keys then pushed the other way, and she whirled).
export function swingToward(q, local, way, t = 1) {
  const length = Math.hypot(...way) || 1;
  const to = way.map((n) => n / length);
  const from = rotateVector(q, local);
  let axis = [from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]];
  let sine = Math.hypot(...axis);
  const cosine = from[0] * to[0] + from[1] * to[1] + from[2] * to[2];
  if (sine < 1e-12) {
    if (cosine > 0) return q;
    // Straight behind: any axis square to the line will do; her own up, or her right.
    const other = Math.abs(local[1]) < 0.9 ? up(q) : right(q);
    axis = [from[1] * other[2] - from[2] * other[1], from[2] * other[0] - from[0] * other[2], from[0] * other[1] - from[1] * other[0]];
    sine = 0;
  }
  const size = Math.hypot(...axis) || 1;
  const half = (Math.atan2(sine, cosine) * t) / 2;
  const turn = [...axis.map((n) => (n / size) * Math.sin(half)), Math.cos(half)];
  const out = multiply(turn, q);
  const norm = Math.hypot(...out);
  return out.map((n) => n / norm);
}

// A turn of `angle` radians about the world Y axis, to apply in front of an
// orientation: multiply(turnAboutY(angle), q).
export function turnAboutY(angle) {
  return axisRotation(angle, 1);
}

// Looking behind: the view turned half round about the traveler's own up axis. Their
// orientation times this is the way the view looks; up stays up, right becomes left.
export const REAR_VIEW = [0, 1, 0, 0];

// A turn asked for while looking behind (a drag, the arrow keys): left and right stay
// as they are on screen, up and down are the other way round for the body.
export function rearTurn(yaw, pitch) {
  return [yaw, -pitch];
}

// Part of the way from orientation q to orientation goal, by the shortest turn (t: 0
// stays, 1 arrives): for a view that comes round to where it is to look rather than
// being put there at a blow.
export function turnToward(q, goal, t = 1) {
  let cosine = q[0] * goal[0] + q[1] * goal[1] + q[2] * goal[2] + q[3] * goal[3];
  // (The same turning is written by a quaternion and by its negative: take the near one.)
  const to = cosine < 0 ? goal.map((n) => -n) : goal;
  cosine = Math.abs(cosine);
  if (cosine > 0.999999) return [...goal];
  const angle = Math.acos(Math.min(1, cosine));
  const a = Math.sin((1 - t) * angle) / Math.sin(angle);
  const b = Math.sin(t * angle) / Math.sin(angle);
  const out = q.map((n, i) => n * a + to[i] * b);
  const length = Math.hypot(...out);
  return out.map((n) => n / length);
}
