// Which body labels the HUD shows, and how off-screen arrows avoid piling up.

// Bodies this close get an edge arrow even when off screen, so a neighbor such as
// the Moon never vanishes while you fly around Earth.
import { sweepSphere } from './flight.js';
import { surfaceDistance } from './bodies.js';

export const NEARBY_KM = 300000;

// always: Earth and the Sun, the two bearings a traveler should never lose.
// compact: a phone screen, where a dozen edge arrows covered the view. There only the
// chosen target, the nearest body (and a neighbour next nearest: nearestBodies) and the
// "always" ones keep an arrow when off screen.
// (The nearest had none until 2026-10-03, and what was closest was the hardest to find.)
// The bodies that count as "the nearest" for the labels: the one whose surface is
// closest, and the next one too when it is a neighbour (within NEARBY_KM). Between
// Earth and the Moon the nearest was Earth, which has its arrow anyway, and on a phone
// the Moon had none; the same between Jupiter and Io. Out between the planets the
// second is far away and gets nothing.
export function nearestBodies(position, bodies, nearbyKm = NEARBY_KM) {
  const byDistance = bodies
    .map((body) => ({ id: body.id, km: surfaceDistance(position, body) }))
    .sort((a, b) => a.km - b.km);
  return byDistance.filter(({ km }, i) => i === 0 || (i === 1 && km <= nearbyKm)).map(({ id }) => id);
}

export function keepMarker({ outside, selected, nearest, surfaceKm, always = false, compact = false }) {
  if (compact) return !outside || selected || nearest || always;
  return !outside || selected || nearest || always || surfaceKm <= NEARBY_KM;
}

// A screen this narrow (CSS pixels) is laid out as a phone: fewer labels, less text.
export const COMPACT_WIDTH = 480;

// Labels this close to the middle of the screen also show how far away the thing is:
// within a quarter of the screen's shorter side.
export function nearCentre(x, y, width, height) {
  return Math.hypot(x - width / 2, y - height / 2) <= Math.min(width, height) / 4;
}

// An off-screen arrow must not stand on the readouts, the minimap or the target panel.
// panels: [{ left, top, right, bottom }] in screen pixels. An arrow within `reach` to the
// side of a panel (its label is that wide) and within `gap` above or below it is brought
// down to `gap` under the panel. Returns the y to draw it at.
export function clearOfPanels({ x, y }, panels, gap = 18, reach = 90) {
  let at = y;
  // Twice: under one panel it may have come onto another.
  for (let pass = 0; pass < 2; pass++) {
    for (const { left, top, right, bottom } of panels) {
      if (x > left - reach && x < right + reach && at > top - gap && at < bottom + gap) at = bottom + gap;
    }
  }
  return at;
}

// Arrows closer than `gap` pixels (in both x and y) are pushed apart vertically,
// staying within the screen height.
export function spreadArrows(arrows, gap, height) {
  const placed = [];
  const order = arrows.map((a, i) => ({ ...a, i })).sort((a, b) => a.y - b.y);
  for (const a of order) {
    let y = a.y;
    for (const p of placed) {
      if (Math.abs(p.x - a.x) < gap && Math.abs(p.y - y) < gap) y = p.y + gap;
    }
    placed.push({ ...a, y });
  }
  // If the stack ran off the bottom, slide the whole overlapping run back up.
  const overflow = Math.max(0, ...placed.map((p) => p.y)) - height;
  if (overflow > 0) for (const p of placed) if (p.y !== arrows[p.i].y || p.y > height) p.y -= overflow;
  const result = [];
  for (const p of placed) result[p.i] = { ...arrows[p.i], y: Math.max(0, p.y) };
  return result;
}

// Labels drawn over each other cannot be read. Of any that overlap, the nearer thing
// keeps its label and the farther one waits until they have moved apart on screen.
// labels: [{ id, left, top, right, bottom, km, first, minor }]; first: the chosen target
// and the guide's goal, which are never hidden; minor: a spacecraft or a place on a
// surface, which gives way to any planet, moon or the Sun however near it is (Hubble's
// label once stood where Earth's should have been). Returns the ids to hide.
export function overlapped(labels, gap = 2) {
  // Worlds are placed first, then craft and places; within each, the chosen one, then the nearest.
  const order = [...labels].sort((a, b) => (Boolean(a.minor) - Boolean(b.minor)) || (Boolean(b.first) - Boolean(a.first)) || a.km - b.km);
  const shown = [];
  const hidden = new Set();
  for (const label of order) {
    const hit = shown.some((s) => label.left < s.right + gap && s.left < label.right + gap && label.top < s.bottom + gap && s.top < label.bottom + gap);
    // The chosen target stays, unless it is a craft or place that would cover a world's
    // name (placed after the worlds and its own kind's chosen one, that is all it can hit).
    if (hit && (!label.first || label.minor)) hidden.add(label.id);
    else shown.push(label);
  }
  return hidden;
}

// From far away a moon sits almost on its planet, and the later label covered the
// planet's. Hide such moon labels unless the moon is the selected one.
export function crowdedMoons(spots, gap = 40) {
  const byId = new Map(spots.map((s) => [s.id, s]));
  const hidden = new Set();
  for (const moon of spots) {
    if (!moon.parent || moon.outside || moon.selected) continue;
    const planet = byId.get(moon.parent);
    if (!planet || planet.outside) continue;
    if (Math.abs(moon.x - planet.x) < gap && Math.abs(moon.y - planet.y) < gap) hidden.add(moon.id);
  }
  return hidden;
}

// True when another body stands between the traveler and the target (a body or a
// craft; km): the straight line to the target's nearest point passes through that body.
// Such a thing cannot be seen, so it gets no label. Places on a surface are not asked
// here: core/stories.js siteHidden answers for them.
export function behindBody(target, position, bodies) {
  const to = target.position.map((n, i) => n - position[i]);
  const distance = Math.hypot(...to);
  const reach = distance - (target.radiusKm ?? 0);
  if (!(reach > 0)) return false;
  const direction = to.map((n) => n / distance);
  return bodies.some((body) => body.id !== target.id && sweepSphere(position, direction, reach, body.position, body.radiusKm) !== null);
}
