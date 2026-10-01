// Which drawing of the sprite character to show (render/spriteHero.js draws it).
// Eight sheets of four frames each, in public/assets/seora-sprites.
//
// The camera sits behind the traveler, so the names read from the camera's side:
//   'backward' is her back (flying away from the camera: the usual forward flight),
//   'forward' is her front (coming toward the camera: flying in reverse).

export const SHEETS = ['forward', 'backward', 'left', 'right', 'up', 'down', 'brake', 'idle'];
export const FRAMES = 4;
// Frames per second: flight loops, and the stop (played once).
export const SPRITE_FPS = { flight: 10, brake: 8 };
// Hovering is mostly stillness. The four idle drawings are: 0 eyes open, 1 eyes shut,
// 2 looking aside, 3 waving. Over a ten-second round she blinks twice, glances aside
// once and waves once; the rest of the time she just hangs there. (Run as a loop at
// three frames a second she never stopped fidgeting.)
export const IDLE_ROUND_S = 10;
const IDLE_MOMENTS = [
  { from: 2.5, to: 2.65, frame: 1 },
  { from: 4.0, to: 4.9, frame: 2 },
  { from: 6.0, to: 6.15, frame: 1 },
  { from: 8.0, to: 9.2, frame: 3, flutter: 0.3 },
];
// Slower than this (km/s) she is standing still.
const MOVING_KM_S = 1;
// Turning faster than this (radians per second) shows the turn instead of plain flight.
const TURN = 0.25;

export function createSpriteState() {
  return { sheet: 'idle', time: 0, moving: false };
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

// Advance by dt seconds. input: { speed, drive, strafe, turn, held }.
// held: latched to a craft. She rides at rest, whatever the craft's own speed (which
// wavers from frame to frame and would flip her between flying and stopping).
export function stepSprite(state, input, dt) {
  const moving = !input.held && input.speed >= MOVING_KM_S;
  if (moving) {
    // Flight sheets share one beat, so switching between them does not restart the loop.
    const flying = state.moving;
    return { sheet: flightSheet(input), time: flying ? state.time + dt : 0, moving };
  }
  // Just stopped: the braking drawings, once.
  if (state.moving) return { sheet: 'brake', time: 0, moving };
  const time = state.time + dt;
  if (state.sheet === 'brake' && time < FRAMES / SPRITE_FPS.brake) return { sheet: 'brake', time, moving };
  if (state.sheet !== 'idle') return { sheet: 'idle', time: 0, moving };
  return { sheet: 'idle', time, moving };
}

// Which of the four frames (0..3) to show.
export function spriteFrame({ sheet, time }) {
  if (sheet === 'brake') return Math.min(FRAMES - 1, Math.floor(time * SPRITE_FPS.brake));
  if (sheet === 'idle') {
    const t = time % IDLE_ROUND_S;
    const now = IDLE_MOMENTS.find((m) => t >= m.from && t < m.to);
    if (!now) return 0;
    // The wave: hand up, down to rest, up again.
    if (now.flutter && Math.floor((t - now.from) / now.flutter) % 2 === 1) return 0;
    return now.frame;
  }
  return Math.floor(time * SPRITE_FPS.flight) % FRAMES;
}

// The file for a sheet and frame, under the site's assets folder.
export function spriteFile(sheet, frame) {
  return `seora-sprites/${sheet}-${frame + 1}.png`;
}
