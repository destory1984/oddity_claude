import { surfaceDistance } from './bodies.js';

// The explorer's log: which bodies were discovered and landed on, which photo
// missions were completed, which story places were visited, which craft were met (not
// scored; it only allows jumping back to them, core/teleport.js). Plain arrays of ids
// so it stores as JSON.

// A body counts as discovered once the traveler comes this close to its surface.
export const DISCOVERY_KM = 50000;

export function createProgress() {
  return { discovered: ['earth'], landed: [], photos: [], stories: [], craft: [] };
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
export function sanitizeProgress(raw, bodies, missions, stories = [], craft = []) {
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
  };
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
