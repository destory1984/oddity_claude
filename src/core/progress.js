import { surfaceDistance } from './bodies.js';

// The explorer's log: which bodies were discovered and landed on, which photo
// missions were completed. Plain arrays of ids so it stores as JSON.

// A body counts as discovered once the traveler comes this close to its surface.
export const DISCOVERY_KM = 50000;

export function createProgress() {
  return { discovered: ['earth'], landed: [], photos: [] };
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

export function summarize(progress, bodies, missions) {
  return {
    discovered: progress.discovered.length,
    landed: progress.landed.length,
    photos: progress.photos.length,
    bodies: bodies.length,
    missions: missions.length,
  };
}

// Stored data may be old, edited or broken: keep only known, unique ids.
export function sanitizeProgress(raw, bodies, missions) {
  const fresh = createProgress();
  if (!raw || typeof raw !== 'object') return fresh;
  const bodyIds = new Set(bodies.map((b) => b.id));
  const missionIds = new Set(missions.map((m) => m.id));
  const clean = (list, known) => (Array.isArray(list) ? [...new Set(list.filter((id) => known.has(id)))] : []);
  return {
    discovered: [...new Set([...fresh.discovered, ...clean(raw.discovered, bodyIds)])],
    landed: clean(raw.landed, bodyIds),
    photos: clean(raw.photos, missionIds),
  };
}

export function score(summary) {
  return {
    done: summary.discovered + summary.landed + summary.photos,
    total: summary.bodies * 2 + summary.missions,
  };
}

export function isComplete(summary) {
  const { done, total } = score(summary);
  return done === total;
}
