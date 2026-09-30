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
