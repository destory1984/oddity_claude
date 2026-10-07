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
import { AURORAS } from './glows.js';
import { BODIES } from './bodies.js';

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

// Saturn's (the user, 2026-10-07: "토성도 오로라 있으니까, 오로라 버튼 넣어주고"): the
// same stand, at the latitude of its ring of light (75 degrees; core/glows.js AURORAS)
// and a tenth of the way up its curtain (500 → 4,100 km), as Earth's place is in Earth's.
// Her head as the user set it there (2026-10-08: "토성 코로나 위치는 여기로 수정", "각도가
// 달라"): the same place and the same way ahead, turned about it by some seven degrees
// so that Saturn's ground lies level (with Earth's head-line it sloped).
export const SATURN_AURORA_VIEW = {
  body: 'saturn',
  position: [-0.155, 0.9802, -0.212],
  forward: [-0.5565, 0.1373, 0.8194],
  up: [-0.1047, 0.9668, -0.2331],
};
// Jupiter's: where the user stood and said "목성의 코로나 위치는 여기로 해" (2026-10-08;
// the aurora was meant): on the night side at 70.5 degrees north, 4,376 km over the
// clouds, the curtain standing to her left and the stars before her.
export const JUPITER_AURORA_VIEW = {
  body: 'jupiter',
  position: [-0.3484, 1.0017, 0.0648],
  forward: [0.7867, 0.1441, -0.6003],
  up: [-0.2004, 0.9793, -0.0276],
};
// The same stand in any other ring of light (core/glows.js AURORAS): at its latitude, a
// tenth of the way up its curtain, as far round from midnight as Earth's place is, and
// facing as Earth's place faces, tipped along the meridian by the difference in latitude
// (left as it was, the level ground of a ring at 40 degrees stood 27 degrees askew). In
// a southern ring it is that place upside down.
// asideDeg: this far on the equator's side of the ring (the pole's side when negative).
export function auroraViewOf(aurora, radiusKm, asideDeg = 0) {
  const sign = aurora.only === 'south' ? -1 : 1;
  const lat = ((aurora.latDeg - asideDeg) * Math.PI) / 180;
  const far = 1 + (aurora.baseKm + 0.1 * aurora.heightKm) / radiusKm;
  const from = unit(AURORA_VIEW.position);
  const flat = Math.hypot(from[0], from[2]);
  const to = [(from[0] / flat) * Math.cos(lat), Math.sin(lat), (from[2] / flat) * Math.cos(lat)];
  // The turn that takes Earth's place to this one: about the level line across the meridian.
  const axis = unit([from[1] * to[2] - from[2] * to[1], from[2] * to[0] - from[0] * to[2], from[0] * to[1] - from[1] * to[0]]);
  const angle = Math.acos(Math.max(-1, Math.min(1, dot(from, to))));
  const tip = (v) => {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const k = dot(axis, v) * (1 - c);
    const x = [axis[1] * v[2] - axis[2] * v[1], axis[2] * v[0] - axis[0] * v[2], axis[0] * v[1] - axis[1] * v[0]];
    return v.map((n, i) => n * c + x[i] * s + axis[i] * k);
  };
  const turn = ([x, y, z]) => [x, sign * y, z];
  return {
    body: aurora.body,
    position: turn(to.map((n) => n * far)),
    forward: turn(angle < 1e-6 ? AURORA_VIEW.forward : tip(AURORA_VIEW.forward)),
    up: turn(angle < 1e-6 ? AURORA_VIEW.up : tip(AURORA_VIEW.up)),
  };
}
// (Inside the pale, tall curtains of Uranus and Neptune the whole view was washed white,
// and she stood a few degrees aside: both now have places of their own, below. The
// list is kept for another such ring.)
const ASIDE_DEG = {};
const drawn = Object.fromEntries(AURORAS.map((aurora) => [aurora.body, auroraViewOf(aurora, BODIES.find((b) => b.id === aurora.body).radiusKm, ASIDE_DEG[aurora.body] ?? 0)]));
// Uranus's: where the user stood (2026-10-08: "여기로 해", said of Neptune by a slip: they
// were at Uranus). They had asked for a place that shows the aurora and the Milky Way
// together ("천왕성 코로나도 보면서 은하수도 볼 수 있는 위치 추천해줘"); I reckoned one (64
// degrees north, 900 km up, 40 degrees round from midnight, where the Milky Way's
// bright side, 40 degrees from the galaxy's centre, lies 24 degrees up: the centre
// itself is 25 degrees from the Sun as seen from Uranus now, on the day side), and from
// it they went into the curtain itself: 62 degrees north, 1,916 km over the clouds, 43
// degrees round from midnight, the rays at her left and the Milky Way before her.
// Reckoned for the planets as they stand today ("오늘의 하늘"); Uranus goes round in 84
// years, so it holds for years. With the planets laid out the other way the stand is
// the same and the Milky Way is elsewhere.
export const URANUS_AURORA_VIEW = {
  body: 'uranus',
  position: [-0.3698, 0.9498, -0.3433],
  forward: [0.8658, -0.1237, -0.4849],
  up: [-0.1222, 0.8874, -0.4445],
};
// Neptune's: where the user stood (2026-10-08, at Neptune: "코로나 위치는 여기로"): on the
// pole's side of the northern ring (50 degrees) at 56.6 degrees north, 450 km over the
// clouds, 82 degrees round from midnight, looking back across the curtain and a little
// down: the wall of light stands before her with the Milky Way and a red nebula over it.
export const NEPTUNE_AURORA_VIEW = {
  body: 'neptune',
  position: [-0.0812, 0.8498, -0.555],
  forward: [-0.125, -0.3909, -0.9119],
  up: [-0.0338, 0.9203, -0.3899],
};
// Ganymede's: where the user stood (2026-10-08: "가니메데 코로나 위치는 여기로 해"): on
// the pole's side of the northern belt (40 degrees) at 51.2 degrees north, 175 km over
// the ground, 53 degrees round from midnight, looking back over the belt and down: the
// red and green curtain runs across before her, the Orion nebula over it.
export const GANYMEDE_AURORA_VIEW = {
  body: 'ganymede',
  position: [-0.4059, 0.8312, -0.5306],
  forward: [-0.6346, -0.6074, -0.478],
  up: [-0.3721, 0.7821, -0.4998],
};
// Mars's: where the user stood (2026-10-08, sent to the place in its southern ring:
// "여기"): on the equator's side of the ring (52 degrees south) at 46.2 degrees south,
// 98 km over the ground, 48 degrees round from midnight, looking toward the pole: the
// green rays stand before her, the Milky Way and a red nebula over them.
export const MARS_AURORA_VIEW = {
  body: 'mars',
  position: [-0.4779, -0.7422, -0.5288],
  forward: [0.0005, -0.8444, 0.5357],
  up: [-0.4482, -0.4791, -0.7547],
};
// (The places the user or I stood at or chose are kept as they are.)
export const AURORA_VIEWS = { ...drawn, earth: AURORA_VIEW, saturn: SATURN_AURORA_VIEW, jupiter: JUPITER_AURORA_VIEW, uranus: URANUS_AURORA_VIEW, neptune: NEPTUNE_AURORA_VIEW, ganymede: GANYMEDE_AURORA_VIEW, mars: MARS_AURORA_VIEW };

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
