// The best view of a world: a key on its name plate takes her there, as the home key
// takes her to Korea (core/home.js; the user, 2026-10-07, of keys like it for other
// worlds: "1"). Each is kept by what makes the view, not by a fixed place:
//   the Moon: low over its ground where Earth hangs above the horizon (by where Earth is);
//   Jupiter: over the Great Red Spot (by where the spot is on the turning, sliding clouds);
//   Saturn: off the sunlit face of the rings, all of them in view (by the rings and the Sun).
import { surfaceDirection, spinOf } from './surface.js';
import { orientationFrom } from './orientation.js';

export const VISTAS = ['moon', 'jupiter', 'saturn'];

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
export function vistaSpot(id, { body, sun, earth, timeS = 0, elapsedS = 0, ringNormal = null }) {
  if (id === 'moon') {
    const toEarth = unit(sub(earth.position, body.position));
    const north = squareTo([0, 1, 0], toEarth);
    const lift = EARTHRISE.earthUpDeg * RAD;
    const up = unit(mix([Math.cos(lift), north], [Math.sin(lift), toEarth]));
    const position = body.position.map((n, i) => n + up[i] * (body.radiusKm + EARTHRISE.heightKm));
    return { position, up, facing: orientationFrom(unit(mix([1, toEarth], [-EARTHRISE.lookDown, up])), up) };
  }
  if (id === 'jupiter') {
    const spin = spinOf('jupiter', timeS);
    const up = surfaceDirection(RED_SPOT.latDeg, redSpotLonDeg(elapsedS) - RED_SPOT.asideDeg, spin);
    const position = body.position.map((n, i) => n + up[i] * body.radiusKm * (1 + RED_SPOT.heightRadii));
    return { position, up, facing: orientationFrom(up.map((n) => -n), squareTo([0, 1, 0], up)) };
  }
  if (id === 'saturn') {
    const toSun = unit(sub(sun.position, body.position));
    let normal = unit(ringNormal ?? [0, 1, 0]);
    if (dot(normal, toSun) < 0) normal = normal.map((n) => -n);
    const sunward = squareTo(toSun, normal);
    const aside = cross(normal, sunward);
    const over = RING_VIEW.overDeg * RAD;
    const round = RING_VIEW.roundDeg * RAD;
    const out = unit(mix([Math.cos(over) * Math.cos(round), sunward], [Math.cos(over) * Math.sin(round), aside], [Math.sin(over), normal]));
    const head = squareTo(normal, out);
    const position = body.position.map((n, i) => n + out[i] * body.radiusKm * RING_VIEW.radii);
    return { position, up: out, facing: orientationFrom(unit(mix([-1, out], [-RING_VIEW.lookDown, head])), head) };
  }
  return null;
}
