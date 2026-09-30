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
