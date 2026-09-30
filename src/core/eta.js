import { step } from './game.js';
import { lookAtDirection } from './orientation.js';
import { surfaceDistance } from './bodies.js';
import { ZONES } from './flight.js';

// Seconds to land on a body by turning to face it now and holding full throttle,
// found by running the real flight rules ahead of time.
// Returns { seconds }, { blockedBy: bodyId } when another body is in the way,
// or null when the trip takes longer than maxSeconds.
export function estimateTravelSeconds(state, targetId, bodies, { dt = 1 / 20, maxSeconds = 600 } = {}) {
  if (state.restingOn === targetId) return { seconds: 0 };
  const target = bodies.find((b) => b.id === targetId);
  // Even at top speed from the first frame it would take longer: skip the simulation.
  if (surfaceDistance(state.position, target) / ZONES.far.maxSpeed > maxSeconds) return null;
  let sim = { ...state, orientation: lookAtDirection(target.position.map((n, i) => n - state.position[i])) };
  const steps = Math.ceil(maxSeconds / dt);
  for (let i = 1; i <= steps; i++) {
    sim = step(sim, { drive: 1 }, dt, bodies).state;
    if (sim.restingOn === targetId) return { seconds: i * dt };
    if (sim.restingOn) return { blockedBy: sim.restingOn };
  }
  return null;
}
