// Which body labels the HUD shows, and how off-screen arrows avoid piling up.

// Bodies this close get an edge arrow even when off screen, so a neighbor such as
// the Moon never vanishes while you fly around Earth.
export const NEARBY_KM = 300000;

// always: Earth and the Sun, the two bearings a traveler should never lose.
export function keepMarker({ outside, selected, nearest, surfaceKm, always = false }) {
  return !outside || selected || nearest || always || surfaceKm <= NEARBY_KM;
}

// Labels this close to the middle of the screen also show how far away the thing is:
// within a quarter of the screen's shorter side.
export function nearCentre(x, y, width, height) {
  return Math.hypot(x - width / 2, y - height / 2) <= Math.min(width, height) / 4;
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
// labels: [{ id, left, top, right, bottom, km, first }]; first: the chosen target and the
// guide's goal, which are never hidden. Returns the ids to hide.
export function overlapped(labels, gap = 2) {
  const order = [...labels].sort((a, b) => (Boolean(b.first) - Boolean(a.first)) || a.km - b.km);
  const shown = [];
  const hidden = new Set();
  for (const label of order) {
    const hit = shown.some((s) => label.left < s.right + gap && s.left < label.right + gap && label.top < s.bottom + gap && s.top < label.bottom + gap);
    if (hit && !label.first) hidden.add(label.id);
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
