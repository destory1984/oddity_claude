// What the game should sound like, independent of the Web Audio plumbing.
// Space is silent; these are game sounds, not physics.

export function cueForEvent(event) {
  switch (event.type) {
    case 'surfaceReached':
    case 'docked':
      return 'landed';
    case 'discovered':
      return 'discovered';
    case 'photo':
    case 'story':
      return 'mission';
    default:
      // 'landed' is logged in the same frame as 'surfaceReached', which already thuds.
      return null;
  }
}

// Flight sound: silent at rest, a soft rush of air while coasting; under thrust paper
// flutters faster and brighter with speed, with kalimba notes. No engine rumble: this is
// a paper doll, not a car. gain is linear volume (0..0.25), pitch 330..660 sets flutter,
// sparkle the kalimba notes per second.
export function engineSound({ speed, maxSpeed, thrusting }) {
  const fraction = maxSpeed > 0 ? Math.min(1, Math.max(0, speed / maxSpeed)) : 0;
  if (!thrusting && fraction === 0) return { gain: 0, pitch: 330, sparkle: 0 };
  const gain = thrusting ? 0.08 + 0.12 * fraction : 0.06 * fraction;
  const sparkle = thrusting ? 1.5 + 4.5 * fraction : 0;
  return { gain, pitch: 330 + 330 * fraction, sparkle };
}
