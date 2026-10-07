// The best view of a world: a key on its name plate takes her there, as the home key
// takes her to Korea (core/home.js; the user, 2026-10-07, of keys like it for other
// worlds: "1"). Each is kept by what makes the view, not by a fixed place:
//   the Moon: low over its ground where Earth hangs above the horizon (by where Earth is);
//   Jupiter: over the Great Red Spot (by where the spot is on the turning, sliding clouds);
//   Saturn: where the user stood (2026-10-08): behind it, the Sun shining through the rings.
// Five more (the user, 2026-10-07: "넣어"):
//   Mars: over the Mariner valley, the Tharsis volcanoes beside it (by the turning ground);
//   Io: off its sunlit side away from Jupiter, the moon before the giant's clouds;
//   Enceladus: off its far side from Saturn, the ice jets under it and Saturn behind;
//   Pluto: over its heart (by the turning ground);
//   Uranus: off the sunlit face of its rings, the bull's eye open (by the rings and the Sun).
//   Neptune (2026-10-08, of four shown: "1로 가보자"): low over Triton's ground, Neptune
//   filling the sky above its horizon (by where Triton and Neptune are).
import { surfaceDirection, spinOf } from './surface.js';
import { orientationFrom } from './orientation.js';
import { auroraSpot } from './home.js';

export const VISTAS = ['moon', 'jupiter', 'saturn', 'mars', 'io', 'enceladus', 'pluto', 'uranus', 'neptune'];
// The views over a place of a turning globe: once there she is held and turns with it.
export const VISTA_HELD = ['jupiter', 'mars', 'pluto'];

const RAD = Math.PI / 180;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};
const mix = (...parts) => parts.reduce((sum, [k, v]) => sum.map((n, i) => n + k * v[i]), [0, 0, 0]);
// The part of v square to the unit vector n, made a unit.
const squareTo = (v, n) => unit(sub(v, n.map((x) => x * dot(v, n))));

// The Moon: this high, with Earth this far above the level; she looks a little under
// Earth, so it stands over her head and the Moon's edge runs under her feet.
export const EARTHRISE = { heightKm: 90, earthUpDeg: 10, lookDown: 0.2 };
// Jupiter's Great Red Spot on the map (public/assets/planets/jupiter.jpg): its
// latitude and its east longitude when the clouds have not slid. Its belt slides with
// the rest (render/shaders/textured.frag: belt 8 of fourteen, `flow` turns a second
// times beltSpeed). She stands west of it by asideDeg, as over Korea, looking down.
export const RED_SPOT = { latDeg: -21, lonDeg: -46.8, belt: 8, flow: 0.0016, heightRadii: 1, asideDeg: 8 };
// Saturn: this far from its centre, this high over the rings' sunlit face and this far
// round from the Sun's side (so the globe's shadow on the rings is seen).
export const RING_VIEW = { radii: 8.2, overDeg: 20, roundDeg: 40, lookDown: 0.13 };
// Saturn's view since 2026-10-08, where the user stood and said "토성의 명당 위치는 여기로
// 해줘": behind the globe and under the rings, 3.4 radii from its centre, head down to
// the planets' plane, so that the dark globe stands at her left, the rings sweep across
// under her lit from behind, and the Sun shines over them. Kept as she stood to the
// Sun, as the places in the auroras are (core/home.js auroraSpot: [toward the Sun,
// north, north x Sun], in radii). RING_VIEW was Saturn's before: a warp still arrives
// there (warpSpot), and it is the pattern of Uranus's.
export const SATURN_VIEW = {
  body: 'saturn',
  position: [-2.3825, -1.7615, -1.6741],
  forward: [0.8921, 0.4341, 0.1254],
  up: [0.4317, -0.9008, 0.047],
};

// Mars: south of the Mariner valley (13.9 S, 59.2 W), so that the canyon runs across the
// view above her head, with the three Tharsis volcanoes at its western end.
export const MARINER_VIEW = { latDeg: -22, lonDeg: -68, heightRadii: 1.1 };
// Pluto: south of the heart (Tombaugh Regio, 18 N; on the map it lies at 2 W, as
// core/stories.js has it), the heart over her head.
export const HEART_VIEW = { latDeg: -4, lonDeg: -2, heightRadii: 1.3 };
// The heart itself, and how high the Sun must stand over it (its sine) for that view.
// Pluto turns once in 6.4 days (some three hours of play): with the heart in the night
// she is taken off the day side, the lit globe over her head, and is not held.
export const HEART = { latDeg: 18, lonDeg: -2, sunAbove: 0.2 };
export const PLUTO_DAY_VIEW = { radii: 8, lookDown: 0.2, lookAside: 0 };
// Io: this far from its centre, on the side away from Jupiter leaned this much toward
// the Sun (so the face she sees is lit); she looks under the moon, so it stands over her
// head with Jupiter's clouds behind it. (Low over Io's ground Jupiter filled the whole
// view and no ground showed: Io goes round only 35,000 km above the clouds here.)
export const IO_VIEW = { radii: 5, sunLean: 0.8, lookDown: 0.28, lookAside: 0 };
// Enceladus: this far from its centre, on the side away from Saturn and this far round
// from straight away (Saturn stands beside the moon, not behind it), this far south of
// its equator; she looks to one side of the moon and a little under it, so that it
// stands beside her with the jets of the south pole falling clear of her.
export const JET_VIEW = { radii: 7, roundDeg: 22, southDeg: 12, lookDown: 0.12, lookAside: 0.13 };
// Neptune, seen from its moon Triton: this high over Triton's ground, Neptune's middle
// this far above the level (Triton goes round 2.4 radii from Neptune's centre here, so
// the globe is some 49 degrees across and fills the sky). With Triton on Neptune's night
// side the dark globe has its aurora along the edge; on the day side it is blue.
export const NEPTUNE_RISE = { heightKm: 60, upDeg: 12, lookDown: 0.2 };
// Uranus: as RING_VIEW; its rings stand nearly upright and face the Sun.
export const BULLSEYE_VIEW = { radii: 6.4, overDeg: 50, roundDeg: 30, lookDown: 0.05 };

// textured.frag's beltSpeed: a steady number in -0.5..0.5 for each belt.
export function beltSpeed(belt) {
  const x = Math.sin(belt * 91.7 + 3.1) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

// The red spot's east longitude after the clouds have slid for elapsedS seconds of
// the picture's own clock.
export function redSpotLonDeg(elapsedS, spot = RED_SPOT) {
  return spot.lonDeg - 360 * elapsedS * spot.flow * beltSpeed(spot.belt);
}

// Where the view of world `id` is now: { position, up, facing }, as core/home.js
// homeSpot gives. body: the world; sun, earth: where they are; timeS: game time;
// elapsedS: the picture's clock (render/world.js); ringNormal: square to its rings.
// Low over `body` where `other` stands upDeg above the level: she looks a little under it.
function riseSpot(body, other, { heightKm, upDeg, lookDown }) {
  const toOther = unit(sub(other.position, body.position));
  const north = squareTo([0, 1, 0], toOther);
  const lift = upDeg * RAD;
  const up = unit(mix([Math.cos(lift), north], [Math.sin(lift), toOther]));
  const position = body.position.map((n, i) => n + up[i] * (body.radiusKm + heightKm));
  return { position, up, facing: orientationFrom(unit(mix([1, toOther], [-lookDown, up])), up) };
}

// Over a place of a turning globe, looking straight down with north at the top.
function overSpot(body, { latDeg, lonDeg, heightRadii }, spin) {
  const up = surfaceDirection(latDeg, lonDeg, spin);
  const position = body.position.map((n, i) => n + up[i] * body.radiusKm * (1 + heightRadii));
  return { position, up, facing: orientationFrom(up.map((n) => -n), squareTo([0, 1, 0], up)) };
}

// Off a world along `out`, north at the top, looking at it and a little aside and under.
function offSpot(body, out, north, { radii, lookDown, lookAside }) {
  const head = squareTo(north, out);
  const right = cross(head, out);
  const position = body.position.map((n, i) => n + out[i] * body.radiusKm * radii);
  return { position, up: out, facing: orientationFrom(unit(mix([-1, out], [-lookDown, head], [lookAside, right])), head) };
}

// Off the sunlit face of a ringed world, looking at the globe.
function ringSpot(body, sun, ringNormal, view) {
  const toSun = unit(sub(sun.position, body.position));
  let normal = unit(ringNormal ?? [0, 1, 0]);
  if (dot(normal, toSun) < 0) normal = normal.map((n) => -n);
  // (Rings that face the Sun squarely: any way round will do.)
  const flat = sub(toSun, normal.map((x) => x * dot(toSun, normal)));
  const sunward = Math.hypot(...flat) > 1e-3 ? unit(flat) : squareTo(Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0], normal);
  const aside = cross(normal, sunward);
  const over = view.overDeg * RAD;
  const round = view.roundDeg * RAD;
  const out = unit(mix([Math.cos(over) * Math.cos(round), sunward], [Math.cos(over) * Math.sin(round), aside], [Math.sin(over), normal]));
  const head = squareTo(normal, out);
  const position = body.position.map((n, i) => n + out[i] * body.radiusKm * view.radii);
  return { position, up: out, facing: orientationFrom(unit(mix([-1, out], [-view.lookDown, head])), head) };
}

// Where a warp to world `id` arrives, for the worlds that have a place of their own for
// it; null for the rest (core/teleport.js bodyVista places those). Saturn: off the
// sunlit face of the rings, all of them in view (RING_VIEW). It was Saturn's best view
// until the user chose another, and they kept it for the warp (2026-10-08: "명당 자리와
// 워프 자리를 헷갈렸구나.. 워프 자리는 이전 것이 맞아").
export function warpSpot(id, { body, sun, ringNormal = null }) {
  return id === 'saturn' ? ringSpot(body, sun, ringNormal, RING_VIEW) : null;
}

// of: the body with an id, as it is now (Io's view needs Jupiter, Enceladus's Saturn).
export function vistaSpot(id, { body, sun, earth, timeS = 0, elapsedS = 0, ringNormal = null, of = () => null }) {
  if (id === 'moon') return riseSpot(body, earth, { heightKm: EARTHRISE.heightKm, upDeg: EARTHRISE.earthUpDeg, lookDown: EARTHRISE.lookDown });
  if (id === 'io') {
    const toJupiter = unit(sub(of('jupiter').position, body.position));
    const toSun = unit(sub(sun.position, body.position));
    const out = unit(mix([-1, toJupiter], [IO_VIEW.sunLean, toSun]));
    return offSpot(body, out, [0, 1, 0], IO_VIEW);
  }
  if (id === 'neptune') {
    // (up: the way from Neptune's centre, which the trip goes round: core/home.js homeStep.)
    const spot = riseSpot(of('triton'), body, NEPTUNE_RISE);
    return { ...spot, up: unit(sub(spot.position, body.position)) };
  }
  if (id === 'mars') return overSpot(body, MARINER_VIEW, spinOf('mars', timeS));
  if (id === 'pluto') {
    const spin = spinOf('pluto', timeS);
    const toSun = unit(sub(sun.position, body.position));
    if (dot(surfaceDirection(HEART.latDeg, HEART.lonDeg, spin), toSun) >= HEART.sunAbove) return overSpot(body, HEART_VIEW, spin);
    return { ...offSpot(body, toSun, [0, 1, 0], PLUTO_DAY_VIEW), free: true };
  }
  if (id === 'uranus') return ringSpot(body, sun, ringNormal, BULLSEYE_VIEW);
  if (id === 'enceladus') {
    const toSaturn = unit(sub(of('saturn').position, body.position));
    const north = squareTo([0, 1, 0], toSaturn);
    const aside = cross(north, toSaturn);
    const round = JET_VIEW.roundDeg * RAD;
    const south = JET_VIEW.southDeg * RAD;
    const out = unit(mix([-Math.cos(south) * Math.cos(round), toSaturn], [Math.cos(south) * Math.sin(round), aside], [-Math.sin(south), north]));
    return offSpot(body, out, north, JET_VIEW);
  }
  if (id === 'jupiter') {
    const spin = spinOf('jupiter', timeS);
    const up = surfaceDirection(RED_SPOT.latDeg, redSpotLonDeg(elapsedS) - RED_SPOT.asideDeg, spin);
    const position = body.position.map((n, i) => n + up[i] * body.radiusKm * (1 + RED_SPOT.heightRadii));
    return { position, up, facing: orientationFrom(up.map((n) => -n), squareTo([0, 1, 0], up)) };
  }
  if (id === 'saturn') return auroraSpot(body, sun.position, SATURN_VIEW);
  return null;
}
