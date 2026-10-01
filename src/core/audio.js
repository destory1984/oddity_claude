// What the game should sound like, independent of the Web Audio plumbing.
// Space is silent; these are game sounds, not physics.

export function cueForEvent(event) {
  switch (event.type) {
    case 'surfaceReached':
      return 'landed';
    case 'slingshot':
      return 'sling';
    case 'docking':
      return 'docking';
    case 'docked':
      return 'dock';
    case 'undocked':
    case 'dockAborted':
      return 'undock';
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

// Flight sound: silent at rest, a faint wind while coasting, a little more under thrust,
// sliding slightly higher with speed (ui/sound.js plays it at half this volume). gain is
// linear volume (0..0.25), pitch 330..660 sets how high the wind sits. (sparkle, the
// kalimba notes per second of the first flight sound, is no longer played.)
// Docked, the traveler is carried: no wind, whatever speed the craft is going.
export function engineSound({ speed, maxSpeed, thrusting, docked = false }) {
  if (docked) return { gain: 0, pitch: 330, sparkle: 0 };
  const fraction = maxSpeed > 0 ? Math.min(1, Math.max(0, speed / maxSpeed)) : 0;
  if (!thrusting && fraction === 0) return { gain: 0, pitch: 330, sparkle: 0 };
  const gain = thrusting ? 0.08 + 0.12 * fraction : 0.06 * fraction;
  const sparkle = thrusting ? 1.5 + 4.5 * fraction : 0;
  return { gain, pitch: 330 + 330 * fraction, sparkle };
}
