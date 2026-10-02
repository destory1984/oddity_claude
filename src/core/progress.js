import { surfaceDistance, BODY_DATA } from './bodies.js';

// The explorer's log: which bodies were discovered and landed on, which photo
// missions were completed, which story places were visited, which craft were met (not
// scored; it only allows jumping back to them, core/teleport.js), which of grandmother's
// notes were read (not scored either, core/story.js), which tours were gone round and
// the one under way (core/tours.js). Plain arrays of ids
// so it stores as JSON.

// A body counts as discovered once the traveler comes this close to its surface.
export const DISCOVERY_KM = 50000;

// The order the journal lists bodies in: the Sun, then everything that circles it from
// the nearest out (by mean distance), each followed by its moons from the largest down.
// Returns [{ body, moon }].
export function journalOrder(bodies) {
  const data = (b) => BODY_DATA.find((d) => d.id === b.id) ?? b;
  const reach = (b) => data(b).orbitKm ?? data(b).ellipse?.semiMajorKm ?? 0;
  const out = [];
  for (const body of bodies.filter((b) => b.kind === 'star')) out.push({ body, moon: false });
  const round = bodies.filter((b) => b.kind !== 'star' && b.kind !== 'moon').sort((a, b) => reach(a) - reach(b));
  for (const body of round) {
    out.push({ body, moon: false });
    const moons = bodies.filter((b) => b.kind === 'moon' && b.parent === body.id).sort((a, b) => b.radiusKm - a.radiusKm);
    for (const moon of moons) out.push({ body: moon, moon: true });
  }
  return out;
}

export function createProgress() {
  return { discovered: ['earth'], landed: [], photos: [], stories: [], craft: [], notes: [], tours: [], tour: null, quiz: [] };
}

// A question answered right: a story card's (core/storyQuiz.js) or the one under a
// body's or a craft's reading (core/readingQuiz.js). Not scored.
export function recordQuiz(progress, id) {
  const have = progress.quiz ?? [];
  if (have.includes(id)) return progress;
  return { ...progress, quiz: [...have, id] };
}

// A note from grandmother that has been read (core/story.js). Not scored.
export function recordNote(progress, id) {
  const have = progress.notes ?? [];
  if (have.includes(id)) return progress;
  return { ...progress, notes: [...have, id] };
}

// Discovery happens within DISCOVERY_KM of a body's surface.
export function updateProgress(progress, state, bodies) {
  const events = [];
  let { discovered, landed } = progress;
  for (const body of bodies) {
    if (!discovered.includes(body.id) && surfaceDistance(state.position, body) <= DISCOVERY_KM) {
      discovered = [...discovered, body.id];
      events.push({ type: 'discovered', bodyId: body.id });
    }
  }
  if (state.restingOn && !landed.includes(state.restingOn)) {
    landed = [...landed, state.restingOn];
    events.push({ type: 'landed', bodyId: state.restingOn });
  }
  if (events.length === 0) return { progress, events };
  return { progress: { ...progress, discovered, landed }, events };
}

export function recordPhotos(progress, missionIds) {
  const newly = missionIds.filter((id) => !progress.photos.includes(id));
  if (newly.length === 0) return { progress, newly };
  return { progress: { ...progress, photos: [...progress.photos, ...newly] }, newly };
}

export function recordStories(progress, storyIds) {
  const have = progress.stories ?? [];
  const newly = storyIds.filter((id) => !have.includes(id));
  if (newly.length === 0) return { progress, newly };
  return { progress: { ...progress, stories: [...have, ...newly] }, newly };
}

// Craft the traveler has come within docking range of.
export function recordCraft(progress, craftIds) {
  const have = progress.craft ?? [];
  const newly = craftIds.filter((id) => !have.includes(id));
  if (newly.length === 0) return { progress, newly };
  return { progress: { ...progress, craft: [...have, ...newly] }, newly };
}

export function summarize(progress, bodies, missions, stories = []) {
  return {
    discovered: progress.discovered.length,
    landed: progress.landed.length,
    photos: progress.photos.length,
    stories: (progress.stories ?? []).length,
    bodies: bodies.length,
    missions: missions.length,
    storyTotal: stories.length,
  };
}

// Stored data may be old, edited or broken: keep only known, unique ids.
// tours: core/tours.js TOURS. The tour under way is kept only if its step exists.
export function sanitizeProgress(raw, bodies, missions, stories = [], craft = [], notes = [], tours = []) {
  const fresh = createProgress();
  if (!raw || typeof raw !== 'object') return fresh;
  const bodyIds = new Set(bodies.map((b) => b.id));
  const missionIds = new Set(missions.map((m) => m.id));
  const storyIds = new Set(stories.map((s) => s.id));
  const craftIds = new Set(craft.map((c) => c.id));
  const clean = (list, known) => (Array.isArray(list) ? [...new Set(list.filter((id) => known.has(id)))] : []);
  return {
    discovered: [...new Set([...fresh.discovered, ...clean(raw.discovered, bodyIds)])],
    landed: clean(raw.landed, bodyIds),
    photos: clean(raw.photos, missionIds),
    stories: clean(raw.stories, storyIds),
    craft: clean(raw.craft, craftIds),
    notes: clean(raw.notes, new Set(notes.map((n) => n.id))),
    tours: clean(raw.tours, new Set(tours.map((t) => t.id))),
    tour: underWay(raw.tour, tours),
    quiz: clean(raw.quiz, new Set([...storyIds, ...bodyIds, ...craftIds])),
  };
}

function underWay(raw, tours) {
  const tour = raw && typeof raw === 'object' ? tours.find((t) => t.id === raw.id) : null;
  if (!tour || !Number.isInteger(raw.step) || raw.step < 0 || raw.step >= tour.stops.length) return null;
  return { id: tour.id, step: raw.step };
}

export function score(summary) {
  return {
    done: summary.discovered + summary.landed + summary.photos + summary.stories,
    total: summary.bodies * 2 + summary.missions + summary.storyTotal,
  };
}

export function isComplete(summary) {
  const { done, total } = score(summary);
  return done === total;
}
