// Which drawing of the sprite character to show (render/spriteHero.js draws it).
// Eight sheets of four frames each, in public/assets/seora-sprites.
//
// The camera sits behind the traveler, so the names read from the camera's side:
//   'backward' is her back (flying away from the camera: the usual forward flight),
//   'forward' is her front (coming toward the camera: flying in reverse).

export const SHEETS = ['forward', 'backward', 'left', 'right', 'up', 'down', 'brake', 'idle'];
export const FRAMES = 4;
// Frames per second: flight loops, the side-on loops (at ten a second her whole body
// flickered; they change more from frame to frame than the rear view does), the stop
// (played once), and hovering.
export const SPRITE_FPS = { flight: 10, side: 5, brake: 8, idle: 3 };
// A flight sheet stays up at least this long, so a wobble of the hand does not flip
// her between her back and her side several times a second.
export const SHEET_HOLD_S = 0.35;
// Slower than this (km/s) she is standing still.
const MOVING_KM_S = 1;
// Turning faster than this (radians per second) shows the turn instead of plain flight.
const TURN = 0.25;

export function createSpriteState() {
  return { sheet: 'idle', time: 0, moving: false, since: 0 };
}

// The flight sheet for what the traveler is doing.
// drive: 1 forward, -1 reverse, 0 coasting. strafe: 1 right, -1 left, 0 none.
// turn: [yaw, pitch] in radians per second; yaw > 0 turns right, pitch > 0 noses down.
export function flightSheet({ drive = 0, strafe = 0, turn = [0, 0] }) {
  // Sliding sideways with no thrust ahead: she flies side-on.
  if (strafe !== 0 && drive === 0) return strafe > 0 ? 'right' : 'left';
  const [yaw, pitch] = turn;
  if (Math.abs(pitch) > TURN && Math.abs(pitch) >= Math.abs(yaw)) return pitch > 0 ? 'down' : 'up';
  if (Math.abs(yaw) > TURN) return yaw > 0 ? 'right' : 'left';
  return drive < 0 ? 'forward' : 'backward';
}

// Advance by dt seconds. input: { speed, drive, strafe, turn }.
export function stepSprite(state, input, dt) {
  const moving = input.speed >= MOVING_KM_S;
  if (moving) {
    // Flight sheets share one beat, so switching between them does not restart the loop.
    if (!state.moving) return { sheet: flightSheet(input), time: 0, moving, since: 0 };
    const since = (state.since ?? 0) + dt;
    const wanted = flightSheet(input);
    if (wanted === state.sheet || since < SHEET_HOLD_S) return { sheet: state.sheet, time: state.time + dt, moving, since };
    return { sheet: wanted, time: state.time + dt, moving, since: 0 };
  }
  // Just stopped: the braking drawings, once.
  if (state.moving) return { sheet: 'brake', time: 0, moving, since: 0 };
  const time = state.time + dt;
  if (state.sheet === 'brake' && time < FRAMES / SPRITE_FPS.brake) return { sheet: 'brake', time, moving, since: 0 };
  if (state.sheet !== 'idle') return { sheet: 'idle', time: 0, moving, since: 0 };
  return { sheet: 'idle', time, moving, since: 0 };
}

// Which of the four frames (0..3) to show.
export function spriteFrame({ sheet, time }) {
  if (sheet === 'brake') return Math.min(FRAMES - 1, Math.floor(time * SPRITE_FPS.brake));
  const side = sheet === 'left' || sheet === 'right';
  const fps = sheet === 'idle' ? SPRITE_FPS.idle : side ? SPRITE_FPS.side : SPRITE_FPS.flight;
  return Math.floor(time * fps) % FRAMES;
}

// The file for a sheet and frame, under the site's assets folder.
export function spriteFile(sheet, frame) {
  return `seora-sprites/${sheet}-${frame + 1}.png`;
}
