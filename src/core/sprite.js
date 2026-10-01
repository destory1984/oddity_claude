// Which drawing of the sprite character to show (render/spriteHero.js draws it).
// Eight sheets of four frames each, in public/assets/seora-sprites.
//
// The camera sits behind the traveler, so the names read from the camera's side:
//   'backward' is her back (flying away from the camera: the usual forward flight),
//   'forward' is her front (coming toward the camera: flying in reverse).

export const SHEETS = ['forward', 'backward', 'left', 'right', 'up', 'down', 'brake', 'idle'];
export const FRAMES = 4;
// Frames per second: flight loops, and the turn-round (the four 'brake' drawings,
// played once: forwards as she stops and turns to face the camera, backwards as she
// turns away again to fly off). At 8 a second the turn was over in half a second and
// looked like a snap; at 5 it takes 0.8 s.
export const SPRITE_FPS = { flight: 10, brake: 5 };
const TURN_ROUND_S = FRAMES / SPRITE_FPS.brake;
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
// Turning faster than this (radians per second) shows the turn instead of plain flight;
// once showing, the turn sheet stays until the turn eases below the lower figure.
const TURN = 0.25;
const TURN_EASED = 0.1;
// A mouse drag arrives in bursts: a big turn one frame, none the next. Read raw, it
// flipped her between her back and her side dozens of times a second. So the turn is
// smoothed over about a fifth of a second, and a flight sheet, once shown, stays up at
// least this long.
const TURN_SMOOTHING = 5;
export const SHEET_HOLD_S = 0.3;

export function createSpriteState() {
  return { sheet: 'idle', time: 0, moving: false, since: 0, turn: [0, 0] };
}

// The flight sheet for what the traveler is doing.
// drive: 1 forward, -1 reverse, 0 coasting. strafe: 1 right, -1 left, 0 none.
// turn: [yaw, pitch] in radians per second; yaw > 0 turns right, pitch > 0 noses down.
// showing: the sheet up now, which a turn that is only easing off does not yet leave.
export function flightSheet({ drive = 0, strafe = 0, turn = [0, 0] }, showing = null) {
  // Sliding sideways with no thrust ahead: she flies side-on.
  if (strafe !== 0 && drive === 0) return strafe > 0 ? 'right' : 'left';
  const [yaw, pitch] = turn;
  if (Math.abs(pitch) > TURN && Math.abs(pitch) >= Math.abs(yaw)) return pitch > 0 ? 'down' : 'up';
  if (Math.abs(yaw) > TURN) return yaw > 0 ? 'right' : 'left';
  const still = { right: yaw > TURN_EASED, left: yaw < -TURN_EASED, down: pitch > TURN_EASED, up: pitch < -TURN_EASED };
  if (still[showing]) return showing;
  return drive < 0 ? 'forward' : 'backward';
}

// Advance by dt seconds. input: { speed, drive, strafe, turn, held }.
// held: latched to a craft. She rides at rest, whatever the craft's own speed (which
// wavers from frame to frame and would flip her between flying and stopping).
export function stepSprite(state, input, dt) {
  const moving = !input.held && input.speed >= MOVING_KM_S;
  if (moving) {
    // Flight sheets share one beat, so switching between them does not restart the loop.
    const raw = input.turn ?? [0, 0];
    const was = state.moving ? state.turn ?? [0, 0] : [0, 0];
    const k = 1 - Math.exp(-dt * TURN_SMOOTHING);
    const turn = was.map((n, i) => n + (raw[i] - n) * k);
    // Setting off: turn away from the camera first, by the brake drawings in reverse
    // (from wherever a stop that was still under way had got to).
    if (!state.moving) {
      const time = state.sheet === 'brake' ? Math.max(0, TURN_ROUND_S - state.time) : 0;
      return { sheet: 'brake', reverse: true, time, moving, since: 0, turn };
    }
    if (state.reverse) {
      const time = state.time + dt;
      if (time < TURN_ROUND_S) return { ...state, time, turn };
      return { sheet: flightSheet({ ...input, turn }), time: 0, moving, since: 0, turn };
    }
    const since = (state.since ?? 0) + dt;
    const wanted = flightSheet({ ...input, turn }, state.sheet);
    if (wanted === state.sheet || since < SHEET_HOLD_S) return { sheet: state.sheet, time: state.time + dt, moving, since, turn };
    return { sheet: wanted, time: state.time + dt, moving, since: 0, turn };
  }
  const rest = { moving, since: 0, turn: [0, 0] };
  // Just stopped: the turn-round, once (picking up from where a take-off had got to).
  if (state.moving) return { sheet: 'brake', time: state.reverse ? Math.max(0, TURN_ROUND_S - state.time) : 0, ...rest };
  const time = state.time + dt;
  if (state.sheet === 'brake' && time < TURN_ROUND_S) return { sheet: 'brake', time, ...rest };
  if (state.sheet !== 'idle') return { sheet: 'idle', time: 0, ...rest };
  return { sheet: 'idle', time, ...rest };
}

// Which of the four frames (0..3) to show.
export function spriteFrame({ sheet, time, reverse = false }) {
  if (sheet === 'brake') {
    const frame = Math.min(FRAMES - 1, Math.floor(time * SPRITE_FPS.brake));
    return reverse ? FRAMES - 1 - frame : frame;
  }
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
