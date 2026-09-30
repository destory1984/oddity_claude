const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function blendFlight(current, speed, dt) {
  const t = clamp(speed / 120, 0, 1);
  const target = t * t * (3 - 2 * t);
  return target + (current - target) * Math.exp(-Math.max(0, dt) * 5);
}

export function hoverFlightPose(amount, bank, bend) {
  const t = clamp(amount, 0, 1);
  const mix = (a, b) => a + (b - a) * t;
  return {
    bodyPitch: mix(-Math.PI / 2, -0.4 + bend),
    bodyBank: bank * t,
    shoulderPitch: mix(Math.PI, -0.12 + Math.abs(bend) * 0.3),
    kneeFlex: mix(-0.03, -0.18),
  };
}

export function armPose(side, bank, bend) {
  const inside = Math.max(0, clamp(bank, -0.9, 0.9) * side);
  const folded = side === -1 ? 1 : 0;
  return {
    shoulderYaw: side * (0.06 + inside * 0.22 + folded * 0.16),
    shoulderPitch: -0.12 + Math.abs(clamp(bend, -0.3, 0.3)) * 0.3,
    // Local arm is +Z, back is +Y. A hinge about -X flexes toward the head/back.
    // Never drive the elbow from root roll or use a second rotation axis.
    elbowFlex: -clamp(0.08 + folded * 0.55 + inside * 0.3, 0.08, 1.15),
  };
}

const REST_BEFORE_TURN_S = 1.5;

// Turn about the body's vertical axis: 0 faces along the flight, PI faces the camera.
// Resting for a moment turns the hero around slowly; moving swings them back quickly.
export function lookBack(angle, idleSeconds, resting, dt) {
  const idle = resting ? idleSeconds + dt : 0;
  const target = idle > REST_BEFORE_TURN_S ? Math.PI : 0;
  const rate = target > angle ? 1.6 : 6;
  return { angle: target + (angle - target) * Math.exp(-dt * rate), idle };
}

// Cute moves while resting and facing the camera. Each lasts `seconds`; idlePose()
// gives the offsets for progress p in 0..1, all zero at both ends so moves blend in.
export const IDLE_ACTIONS = {
  tilt: { seconds: 1.6 },
  wave: { seconds: 2.2 },
  twirl: { seconds: 1.5 },
  hop: { seconds: 1.1 },
  lookAround: { seconds: 2.4 },
  stretch: { seconds: 2.0 },
};
const IDLE_NAMES = Object.keys(IDLE_ACTIONS);
const FIRST_MOVE_S = 3;

const smooth = (x) => x * x * (3 - 2 * x);
const bump = (p) => Math.sin(Math.PI * clamp(p, 0, 1)); // 0 → 1 → 0

// Scheduler: every 8 to 15 s start a move other than the last one.
// Facing away cancels the move. random is injectable for tests.
export function idleStep({ untilNext, name, t, last }, dt, facingCamera, random = Math.random) {
  if (!facingCamera) return { untilNext: FIRST_MOVE_S, name: null, t: 0, last };
  if (name) {
    const next = t + dt;
    if (next >= IDLE_ACTIONS[name].seconds) return { untilNext: 8 + random() * 7, name: null, t: 0, last: name };
    return { untilNext, name, t: next, last };
  }
  const wait = untilNext - dt;
  if (wait > 0) return { untilNext: wait, name: null, t: 0, last };
  const choices = IDLE_NAMES.filter((n) => n !== last);
  const pick = choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  return { untilNext: 0, name: pick, t: 0, last };
}

export function idleProgress({ name, t }) {
  return name ? t / IDLE_ACTIONS[name].seconds : 0;
}

// Offsets in the body frame: headTilt leans the head sideways, headTurn turns it,
// headNod tips it back, spin turns the whole body, hop lifts it; arms[s] is a target
// shoulder pitch/yaw and armBlend[s] how much of it to use (0 keeps the normal pose).
export function idlePose(name, p) {
  const pose = {
    headTilt: 0, headTurn: 0, headNod: 0, spin: 0, hop: 0,
    arms: { [-1]: { pitch: 0, yaw: 0 }, 1: { pitch: 0, yaw: 0 } },
    armBlend: { [-1]: 0, 1: 0 },
  };
  if (!name || p <= 0 || p >= 1) return pose;
  const env = bump(p);
  switch (name) {
    case 'tilt':
      pose.headTilt = 0.38 * env;
      break;
    case 'wave': {
      // Right arm up and out, swinging side to side three times.
      const raise = smooth(clamp(p / 0.2, 0, 1)) * smooth(clamp((1 - p) / 0.2, 0, 1));
      pose.armBlend[1] = raise;
      pose.arms[1] = { pitch: 0.35, yaw: 0.5 + 0.35 * Math.sin(p * Math.PI * 6) };
      pose.headTilt = -0.15 * env;
      break;
    }
    case 'twirl':
      pose.spin = 2 * Math.PI * smooth(p);
      pose.hop = 0.05 * env;
      break;
    case 'hop':
      // Two little hops.
      pose.hop = 0.2 * Math.abs(Math.sin(p * Math.PI * 2));
      break;
    case 'lookAround':
      pose.headTurn = 0.6 * Math.sin(p * Math.PI * 2) * env;
      break;
    case 'stretch':
      pose.armBlend[-1] = env;
      pose.armBlend[1] = env;
      pose.arms[-1] = { pitch: 0.15, yaw: -0.25 };
      pose.arms[1] = { pitch: 0.15, yaw: 0.25 };
      pose.headNod = -0.25 * env;
      pose.hop = 0.04 * env;
      break;
    default:
      break;
  }
  return pose;
}
