import { forward, up, orientationFrom } from './orientation.js';

// Where the game may open. One of these is picked by chance at each start (the user,
// 2026-10-05: "시작 위치를 몇 군데 정해놓고 랜덤하게 돌리자"); the user finds the places
// and they are written down here.
//
// A place is kept as seen from its body with the Sun as the fixed direction, so it shows
// the same light whichever way the planets are laid out: `at` is where she stands from
// the body's centre in km (toward the Sun, up, aside), `ahead` and `above` are the way
// she looks and the top of her view in those same three directions. What land lies under
// her is not kept: the body has turned by the next start.
// To write a new one down: stand there and read `window.oddity.spot()` (the nearest body
// is taken to measure from; `spot('earth')` names another). target: what is chosen as
// the target there, when it is not the body. dock: the craft she is docked with from the
// first moment (no glide, no count).
// 'dawn' is the first start (main.js startAtDawn), kept as it was.
export const START_SPOTS = [
  { id: 'dawn' },
  // Over Earth's night side, 4,108 km up, looking out past the lit edge and its aurora
  // to the stars; the Moon is high on the left.
  { id: 'nightEdge', body: 'earth', at: [-9327.6, 2335.4, 4165.9], ahead: [0.6662, 0.5823, -0.466], above: [-0.5544, 0.8046, 0.2129] },
  // Docked with the Webb telescope, 60 km from it, looking up at its mirror and sunshield
  // (the user, 2026-10-05: "도킹한 상태이어야 해").
  // Webb is kept 150,000 km from Earth straight away from the Sun (core/craft.js), which
  // in these three directions is always (-150000, 0, 0): it is there at every start. The
  // place is measured from Earth, not from the Moon (the nearest body there), which goes
  // round. far: 144,000 km from Earth, so not for a first visit, whose steps lead to the
  // Moon.
  { id: 'webb', body: 'earth', target: 'jwst', dock: 'jwst', far: true, at: [-149958.9, -29.9, -31.9], ahead: [-0.8245, 0.3647, 0.4326], above: [0.3351, 0.9308, -0.146] },
  // Under Earth's south pole on the night side, 9,633 km off, the view turned over so
  // the pole is at the foot of the screen: the whole ring of the southern aurora.
  { id: 'auroraRing', body: 'earth', at: [-8500.5, -8539.7, 10532.4], ahead: [0.5767, -0.0241, -0.8166], above: [-0.0954, -0.9947, -0.038] },
  // Behind the Moon, 14,536 km off its night side, looking past its dark disc at the Sun;
  // the target is the place where SLIM came down. Measured from the Moon. far: a first
  // visit's steps are the way to the Moon, which would be over before they began.
  { id: 'moonNight', body: 'moon', target: 'slim', far: true, at: [-12491.1, 830.4, -10397.5], ahead: [0.8446, -0.2456, 0.4758], above: [0.2881, -0.5406, -0.7904] },
];

const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// The three directions a place is measured in: toward the Sun, up (the world's up, made
// square to the first), aside.
export function sunFrame(bodyPosition, sunPosition) {
  const toSun = unit(sunPosition.map((n, i) => n - bodyPosition[i]));
  // Straight under or over the Sun's pole there is no "aside": take the world's x.
  const flat = Math.hypot(toSun[0], toSun[2]) < 1e-9;
  const aside = unit(cross(flat ? [0, 0, 1] : [0, 1, 0], toSun));
  return { toSun, above: cross(toSun, aside), aside };
}

const into = (frame, v) => [dot(v, frame.toSun), dot(v, frame.above), dot(v, frame.aside)];
const outOf = (frame, [a, b, c]) => [0, 1, 2].map((i) => a * frame.toSun[i] + b * frame.above[i] + c * frame.aside[i]);

// A state as a place: for writing a new start down.
export function toSpot({ position, orientation }, body, sun) {
  const frame = sunFrame(body.position, sun.position);
  const round = (v, digits) => v.map((n) => Number(n.toFixed(digits)));
  return {
    body: body.id,
    at: round(into(frame, position.map((n, i) => n - body.position[i])), 1),
    ahead: round(into(frame, forward(orientation)), 4),
    above: round(into(frame, up(orientation)), 4),
  };
}

// A place as a state's position and orientation, with the bodies where they are now.
export function fromSpot(spot, body, sun) {
  const frame = sunFrame(body.position, sun.position);
  const offset = outOf(frame, spot.at);
  return {
    position: body.position.map((n, i) => n + offset[i]),
    orientation: orientationFrom(outOf(frame, spot.ahead), outOf(frame, spot.above)),
  };
}

// The place for this start. random: a number from 0 up to 1. forced: a place's number
// from 1 (the address's ?start=2), for looking at one. newcomer: on a first visit only
// the places near Earth are picked from (the first steps lead to the Moon).
export function pickSpot(random = Math.random(), forced = null, newcomer = false) {
  const n = Number(forced);
  if (Number.isInteger(n) && n >= 1 && n <= START_SPOTS.length) return START_SPOTS[n - 1];
  const among = newcomer ? START_SPOTS.filter((spot) => !spot.far) : START_SPOTS;
  return among[Math.min(among.length - 1, Math.floor(random * among.length))];
}
