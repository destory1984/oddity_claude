// The Sun is drawn on a flat card that faces the view, but what is on it belongs to
// the Sun itself: its spots, its prominences, the streamers of its corona. So the
// shader is told where the card's axes point in space, and looks its patterns up there.
// From another side of the Sun, or with the view rolled over, the corona is another shape.
//
// toSun: the unit direction from the eye to the Sun's centre. viewRight: the view's
// right axis. Returns three unit vectors at right angles: right and up across the
// card, and away (from the eye into the Sun). The Sun's centre need not be mid-screen:
// right is the view's right with its part along `away` taken out.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
};

export function sunFrame(toSun, viewRight) {
  const away = unit(toSun);
  let across = viewRight.map((n, i) => n - away[i] * dot(viewRight, away));
  // Looking square along the view's right axis at the Sun (it is far off to the side):
  // any direction across will do.
  if (Math.hypot(...across) < 1e-6) across = cross(Math.abs(away[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], away);
  const right = unit(across);
  // Left-handed axes (x right, y up, z ahead): up = away × right.
  return { right, up: cross(away, right), away };
}
