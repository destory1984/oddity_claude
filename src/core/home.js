// The way home: with Earth chosen, a key on its name plate takes her from wherever she
// is to a place over Korea, looking down on it with north up (the user, 2026-10-07:
// "지구일 때에는 저 위치에 home 버튼 그리고, 사용자가 누르면, 딱 한국이 보이는 위치로
// 옮겨줘 (지금 있는 위치에서 자연스럽게 이동시켜줘야해)"). She is not flashed there: she
// goes round the globe on an arc, never through it, and settles. Earth turns under
// anyone who only hovers (once in 29 minutes of play), so once there she is held over
// the same ground and turns with it, as when standing at a place (core/visit.js). Any
// thrust lets go.
import { stopNow } from './game.js';
import { surfaceDirection, spinOf } from './surface.js';
import { orientationFrom, blend, multiply, turnAboutY } from './orientation.js';

// Where the user stood when they said "여기로 해줘" (2026-10-07; it was 3,400 km right
// over the peninsula before): at Korea's latitude, some nine degrees west of it and
// 7,000 km up, looking straight down with north up. She stands in the middle of the
// view, so from there Korea (127.8 E) lies just to her right with the sea and Japan
// beyond it, and China to her left.
export const HOME = { body: 'earth', latDeg: 36.3, lonDeg: 118.5, heightKm: 7000 };
// The trip takes this long from right over Korea, and this much more from the far
// side of the globe; a little more again from far out.
export const HOME_NEAR_S = 3;
export const HOME_ROUND_S = 4;
export const HOME_FAR_S = 2;
const FAR_RADII = 10;

const sub = (a, b) => a.map((n, i) => n - b[i]);
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);

// From unit vector a to unit vector b along the great circle, t in 0..1.
export function slerp(a, b, t) {
  const cos = Math.max(-1, Math.min(1, dot(a, b)));
  const angle = Math.acos(cos);
  if (angle < 1e-6) return a;
  // Straight across the globe there are many ways round: go over the north.
  if (Math.PI - angle < 1e-3) {
    const over = unit(sub([0, 1, 0], a.map((n) => n * a[1])));
    return slerp(a, unit(b.map((n, i) => n + 0.01 * over[i])), t);
  }
  const sin = Math.sin(angle);
  return a.map((n, i) => (Math.sin((1 - t) * angle) * n + Math.sin(t * angle) * b[i]) / sin);
}

// Where she ends up at game time timeS: { position, up, facing }. Fixed to the ground,
// so it turns with Earth.
export function homeSpot(body, timeS, home = HOME) {
  const up = surfaceDirection(home.latDeg, home.lonDeg, spinOf(home.body, timeS));
  const position = body.position.map((n, i) => n + up[i] * (body.radiusKm + home.heightKm));
  // North along the ground under her: the top of the view.
  const north = unit(sub([0, 1, 0], up.map((n) => n * up[1])));
  return { position, up, facing: orientationFrom(up.map((n) => -n), north) };
}

// A trip under way: where she was from Earth's centre, how she faced, how long it has
// run and how long it takes.
export function startHome(state, body, spot) {
  const from = sub(state.position, body.position);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(unit(from), spot.up))));
  const far = Math.hypot(...from) > FAR_RADII * body.radiusKm ? HOME_FAR_S : 0;
  return { from, facing: state.orientation, elapsed: 0, seconds: HOME_NEAR_S + HOME_ROUND_S * (angle / Math.PI) + far };
}

export function homeArrived(home) {
  return home.elapsed >= home.seconds;
}

// The traveler dt seconds on. spot: this frame's homeSpot; body: Earth now; spun: how
// far (radians) Earth turned in this frame. Returns { state, home, arrived }: arrived
// is true in the frame she gets there.
export function homeStep(state, home, dt, { spot, body, spun }) {
  const elapsed = home.elapsed + dt;
  const next = { ...home, elapsed };
  if (elapsed < home.seconds) {
    // Sets off from rest and settles gently.
    const t = elapsed / home.seconds;
    const eased = t * t * (3 - 2 * t);
    const way = slerp(unit(home.from), spot.up, eased);
    // Her height runs evenly in its logarithm: from far out she comes in fast and slows
    // as the ground grows, and she is never under it.
    const high0 = Math.max(10, Math.hypot(...home.from) - body.radiusKm);
    const high1 = Math.hypot(...sub(spot.position, body.position)) - body.radiusKm;
    const high = Math.exp(Math.log(high0) + (Math.log(high1) - Math.log(high0)) * eased);
    return {
      state: { ...stopNow(state), restingOn: null, position: body.position.map((n, i) => n + way[i] * (body.radiusKm + high)), orientation: blend(home.facing, spot.facing, eased) },
      home: next,
      arrived: false,
    };
  }
  const arrived = !homeArrived(home);
  // There: carried round with the ground, free to look about.
  const orientation = arrived ? spot.facing : multiply(turnAboutY(spun), state.orientation);
  return { state: { ...stopNow(state), restingOn: null, position: spot.position, orientation }, home: next, arrived };
}

// The aurora key, beside the home key: to the place the user flew to and said "누르면
// 지금 위치로 오게 해줘" of (2026-10-07). She stands inside the northern curtain on the
// night side, 235 km up at 67 degrees north, and looks along it with the rays standing
// tall to her right and the stars behind (that evening Perseus and the Pleiades). The
// Sun is behind her and out of the view. Kept as she stood to the Sun, not to the
// ground or the stars: the aurora shows on the night side only, and the night side goes
// round the year. Each of the three is [toward the Sun along the equator's plane, north,
// the third way (north x Sun)], the place in Earth radii from the centre.
export const AURORA_VIEW = {
  body: 'earth',
  position: [-0.2387, 0.9547, -0.3265],
  forward: [-0.5564, 0.1373, 0.8195],
  up: [-0.2116, 0.9303, -0.2995],
};

// Where that is now: { position, up, facing }, as homeSpot gives.
export function auroraSpot(body, sunPosition, view = AURORA_VIEW) {
  const toSun = sub(sunPosition, body.position);
  const flat = Math.hypot(toSun[0], toSun[2]) || 1;
  const s = [toSun[0] / flat, 0, toSun[2] / flat];
  const e = [s[2], 0, -s[0]];
  const world = ([a, b, c]) => [a * s[0] + c * e[0], b, a * s[2] + c * e[2]];
  const out = world(view.position);
  return {
    position: body.position.map((n, i) => n + out[i] * body.radiusKm),
    up: unit(out),
    facing: orientationFrom(world(view.forward), world(view.up)),
  };
}
