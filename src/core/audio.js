// What the game should sound like, independent of the Web Audio plumbing.
// Space is silent; these are game sounds, not physics.

const ZONE_RANK = { veryNear: 0, near: 1, far: 2 };

export function cueForEvent(event) {
  switch (event.type) {
    case 'zoneChanged':
      return ZONE_RANK[event.to] > ZONE_RANK[event.from] ? 'zoneUp' : 'zoneDown';
    case 'surfaceReached':
      return 'landed';
    case 'discovered':
      return 'discovered';
    case 'photo':
      return 'mission';
    default:
      // 'landed' is logged in the same frame as 'surfaceReached', which already thuds.
      return null;
  }
}

// Engine hum: silent at rest, a soft rush while coasting, louder and higher under thrust.
// gain is linear volume (0..0.25), pitch the hum's base frequency in Hz.
export function engineSound({ speed, maxSpeed, thrusting }) {
  const fraction = maxSpeed > 0 ? Math.min(1, Math.max(0, speed / maxSpeed)) : 0;
  if (!thrusting && fraction === 0) return { gain: 0, pitch: 55 };
  const gain = thrusting ? 0.1 + 0.15 * fraction : 0.08 * fraction;
  return { gain, pitch: 55 + 125 * fraction };
}
