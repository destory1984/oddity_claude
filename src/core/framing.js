import { forward, right, up } from './orientation.js';

const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const clampUnit = (v) => Math.max(-1, Math.min(1, v));

// Where each body sits in a camera's view. The field of view is vertical, as in Babylon.
//   visible: some part of the body's disc reaches the frame (ignores other bodies)
//   hidden: a nearer body's disc covers this whole disc
//   fill: angular diameter as a fraction of the view height
export function frameBodies({ position, orientation, fovY, aspect, bodies }) {
  const f = forward(orientation);
  const r = right(orientation);
  const u = up(orientation);
  const halfY = fovY / 2;
  const halfX = Math.atan(Math.tan(halfY) * aspect);

  const inFrame = (d) => {
    const z = dot(d, f);
    if (z <= 0) return false;
    return Math.abs(Math.atan2(dot(d, r), z)) <= halfX && Math.abs(Math.atan2(dot(d, u), z)) <= halfY;
  };

  const frames = bodies.map((body) => {
    const offset = body.position.map((n, i) => n - position[i]);
    const distance = Math.hypot(...offset);
    const direction = offset.map((n) => n / distance);
    const angularRadius = Math.asin(Math.min(1, body.radiusKm / distance));
    const offAxis = Math.acos(clampUnit(dot(direction, f)));

    // The point of the disc closest to the view axis: if even that is outside, nothing is in.
    let visible;
    if (offAxis <= angularRadius) {
      visible = true;
    } else {
      const toward = direction.map((n, i) => n - f[i] * Math.cos(offAxis));
      const length = Math.hypot(...toward);
      const t = toward.map((n) => n / length);
      const angle = offAxis - angularRadius;
      visible = inFrame(f.map((n, i) => n * Math.cos(angle) + t[i] * Math.sin(angle)));
    }

    return {
      body,
      distance,
      direction,
      angularRadius,
      angularDiameter: 2 * angularRadius,
      fill: (2 * angularRadius) / fovY,
      visible,
      hidden: false,
    };
  });

  for (const frame of frames) {
    frame.hidden = frames.some((other) => {
      if (other === frame || other.distance >= frame.distance) return false;
      const separation = Math.acos(clampUnit(dot(frame.direction, other.direction)));
      return separation + frame.angularRadius <= other.angularRadius;
    });
  }
  return frames;
}
