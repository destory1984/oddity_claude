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
//   Neptune (2026-10-08, of four shown: "1로 가보자", then "2번으로 가보자"): over its
//   Great Dark Spot (by the turning globe); with the spot in the night, low over Triton's
//   ground, Neptune filling the sky above its horizon (the first one chosen).
//   Titan (2026-10-08, sent there to see the moon itself: "여기"): off its sunlit side, the
//   whole orange globe before her (by where the Sun is).
import { surfaceDirection, spinOf } from './surface.js';
import { orientationFrom } from './orientation.js';
import { auroraSpot } from './home.js';
import { cometActivity } from './comet.js';
import { AU_KM } from './bodies.js';

export const VISTAS = ['moon', 'jupiter', 'saturn', 'mars', 'io', 'enceladus', 'pluto', 'uranus', 'neptune', 'titan'];
// The views over a place of a turning globe: once there she is held and turns with it.
export const VISTA_HELD = ['jupiter', 'mars', 'pluto', 'neptune'];

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
// Pluto: where the user stood (2026-10-08: "명왕성 명당 자리는 여기"): 4.44 radii from its
// centre over 3.8 S, 7 E of the map, the whole globe over her head with the heart
// (Tombaugh Regio, 18 N; on the map at 2 W, as core/stories.js has it) in the middle of
// it and Charon looking out from behind its edge. The three are in the frame that turns
// with the globe (x, y, z before the spin is put on, in radii): Charon keeps one face
// of Pluto under it, so it too stays where it was. (Before: 1.3 radii up over 4 S, 2 W,
// looking straight down.)
export const PLUTO_VIEW = {
  position: [-4.399, -0.2951, -0.5511],
  forward: [0.9791, -0.1564, 0.1299],
  up: [0.1587, 0.9873, -0.0078],
};
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
// Neptune's Great Dark Spot (18 S; on the map at 14 E, as core/stories.js has it), how
// high the Sun must stand over it (its sine) for the view of it, and the view: south of
// the spot, so that it lies over her head among its white clouds.
export const DARK_SPOT = { latDeg: -18, lonDeg: 14, sunAbove: 0.2 };
export const DARK_SPOT_VIEW = { latDeg: -32, lonDeg: 14, heightRadii: 1 };
// Uranus: as RING_VIEW; its rings stand nearly upright and face the Sun.
export const BULLSEYE_VIEW = { radii: 6.4, overDeg: 50, roundDeg: 30, lookDown: 0.05 };

// Titan: where the user said "여기" (2026-10-08), having asked to see Titan itself and not
// Saturn from it: 4.5 radii from its centre, 30 degrees round from the Sun's side and a
// little north, north at the top, the whole globe in the middle of the view (26 degrees
// across) with its night edge at the right. Kept to the Sun as Saturn's is (core/home.js
// auroraSpot: [toward the Sun, north, north x Sun], in radii); Saturn is out of view.
export const TITAN_VIEW = {
  body: 'titan',
  position: [3.8214, 0.8825, 2.2063],
  forward: [-0.8492, -0.1961, -0.4903],
  up: [-0.1698, 0.9806, -0.098],
};

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

// A place and a way of looking kept in the frame that turns with the globe (as
// core/surface.js surfaceDirection turns a place of the ground).
function turningSpot(body, view, spin) {
  const c = Math.cos(spin);
  const s = Math.sin(spin);
  const turn = ([x, y, z]) => [x * c + z * s, y, -x * s + z * c];
  const out = turn(view.position);
  return {
    position: body.position.map((n, i) => n + out[i] * body.radiusKm),
    up: unit(out),
    facing: orientationFrom(turn(view.forward), turn(view.up)),
  };
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
// A comet with a tail: off to its side, the head beside her and both tails going up
// across the view. The usual place, 120 km from the nucleus, showed a dark rock and no
// comet (the glow is thinned from near by; the user, 2026-10-08, having warped there:
// "혜성 안 보임", and of this place, where they had turned the view: "워프하면 대충 이 정도
// 느낌 나는 곳으로 이동시켜줘... 저 모양을 유지시켜줘"). `moved`: which way the comet is
// going, since the dust tail leans back along its path and the place is kept to that.
// One asleep, far from the Sun, has no tail to show: null, the usual place.
export function warpSpot(id, { body, sun, ringNormal = null, moved = null }) {
  if (id === 'saturn') return ringSpot(body, sun, ringNormal, RING_VIEW);
  if (body.kind === 'comet' && cometActivity((body.sunKm ?? Infinity) / AU_KM) > 0) return cometSpot(body, sun, moved);
  return null;
}

// The place by a comet where the user stood, 31,000 km from the nucleus (within
// game.js CARRY_KM, so she is carried along with it), in the frame [away from the Sun,
// back along its path, the third]. (45,000 km at first; the user, 2026-10-09, standing
// nearer by Hale-Bopp: "혜성 위치... 여기로 바꿔줘".)
export const COMET_VIEW = { km: 31000, position: [0.0883, -0.8314, 0.5486], forward: [0.0853, 0.8734, -0.4795], up: [0.7744, -0.3609, -0.5197] };

function cometSpot(body, sun, moved) {
  const away = unit(sub(body.position, sun.position));
  const across = moved ? sub(moved, away.map((n) => n * dot(moved, away))) : [0, 0, 0];
  const back = Math.hypot(...across) > 1e-9 ? unit(across.map((n) => -n)) : squareTo([0, 1, 0], away);
  const third = cross(away, back);
  const world = ([a, b, c]) => mix([a, away], [b, back], [c, third]);
  const out = world(COMET_VIEW.position);
  return {
    position: body.position.map((n, i) => n + out[i] * COMET_VIEW.km),
    up: unit(out),
    facing: orientationFrom(world(COMET_VIEW.forward), world(COMET_VIEW.up)),
  };
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
    const spin = spinOf('neptune', timeS);
    const toSun = unit(sub(sun.position, body.position));
    if (dot(surfaceDirection(DARK_SPOT.latDeg, DARK_SPOT.lonDeg, spin), toSun) >= DARK_SPOT.sunAbove) return overSpot(body, DARK_SPOT_VIEW, spin);
    // (up: the way from Neptune's centre, which the trip goes round: core/home.js homeStep.)
    const spot = riseSpot(of('triton'), body, NEPTUNE_RISE);
    return { ...spot, up: unit(sub(spot.position, body.position)), free: true };
  }
  if (id === 'mars') return overSpot(body, MARINER_VIEW, spinOf('mars', timeS));
  if (id === 'pluto') {
    const spin = spinOf('pluto', timeS);
    const toSun = unit(sub(sun.position, body.position));
    if (dot(surfaceDirection(HEART.latDeg, HEART.lonDeg, spin), toSun) >= HEART.sunAbove) return turningSpot(body, PLUTO_VIEW, spin);
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
  if (id === 'titan') return auroraSpot(body, sun.position, TITAN_VIEW);
  return null;
}
