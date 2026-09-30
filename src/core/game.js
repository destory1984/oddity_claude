import { rotateLocal, forward, right } from './orientation.js';
import { BODIES, nearestSurface } from './bodies.js';
import { speedLimit, accelerateSpeed, brakeSpeed, firstSphereHit } from './flight.js';

export const TURN_RATE = 0.7;
export const ROLL_RATE = 0.9;
// Opening view: turned about 31 degrees from Earth toward the Sun, so a wide screen
// shows Earth on the left and the edge of the Sun and its glow on the right.
export const START_ORIENTATION = rotateLocal([0, 0, 0, 1], 0.55, 0);

// A tall phone screen is too narrow to fit the Sun beside Earth, so it faces Earth.
export function startOrientation(aspect) {
  return aspect < 1 ? [0, 0, 0, 1] : START_ORIENTATION;
}
const STOPPED = 0.01;
// Within this distance of a surface the traveler rides along with that body.
export const CARRY_KM = 50000;

export function createState(position, orientation = [0, 0, 0, 1]) {
  return {
    position: [...position],
    orientation: [...orientation],
    speed: 0,
    motionSign: 1,
    brakeRate: 0,
    // Sideways channel (A/D), same rules as forward/back along the body's right axis.
    sideSpeed: 0,
    sideSign: 1,
    sideBrakeRate: 0,
    restingOn: null,
  };
}

export function stopNow(state) {
  return { ...state, speed: 0, brakeRate: 0, sideSpeed: 0, sideBrakeRate: 0 };
}

// Bodies move along their orbits between frames. Near a body (within CARRY_KM of its
// surface) the traveler moves with it, so a moon does not slide out from under a landing.
export function carryAlong(state, before, after) {
  const { body, distance } = nearestSurface(state.position, before);
  if (!body || distance > CARRY_KM) return state;
  const moved = after.find((b) => b.id === body.id);
  if (!moved) return state;
  return { ...state, position: state.position.map((n, i) => n + moved.position[i] - body.position[i]) };
}

// If a moving body has swept over the traveler, put them back on its surface.
function pushOut(position, bodies) {
  for (const body of bodies) {
    const offset = position.map((n, i) => n - body.position[i]);
    const distance = Math.hypot(...offset);
    if (distance < body.radiusKm - 1e-9) {
      const up = distance > 0 ? offset.map((n) => n / distance) : [0, 1, 0];
      return { body, position: body.position.map((n, i) => n + up[i] * body.radiusKm) };
    }
  }
  return null;
}

export function totalSpeed(state) {
  return Math.hypot(state.speed, state.sideSpeed ?? 0);
}

// One thrust axis: hold a direction to accelerate, let go to brake to a stop in one
// second, and press the other way to stop first and then accelerate back.
function thrust(speed, sign, brakeRate, command, throttle, dt, maxSpeed) {
  if (command !== 0 && command !== sign && speed < STOPPED) sign = command;
  const changingDirection = command !== 0 && command !== sign;
  if (command !== 0 && !changingDirection) {
    return { speed: accelerateSpeed(speed, throttle, dt, maxSpeed), sign, brakeRate: 0 };
  }
  if (speed > 0 && brakeRate === 0) brakeRate = speed;
  speed = brakeSpeed(speed, brakeRate, dt);
  if (speed === 0) {
    brakeRate = 0;
    if (changingDirection) {
      sign = command;
      speed = accelerateSpeed(0, throttle, dt, maxSpeed);
    }
  }
  return { speed, sign, brakeRate };
}

// Scale both axes down together so the combined speed stays within the limit.
function capTotal(main, side, maxSpeed) {
  const total = Math.hypot(main, side);
  if (total <= maxSpeed) return [main, side];
  const k = maxSpeed / total;
  return [main * k, side * k];
}

export function step(state, input, dt, bodies = BODIES) {
  const events = [];
  if (!(dt > 0)) return { state, events };

  const inside = pushOut(state.position, bodies);
  if (inside) {
    if (state.restingOn !== inside.body.id) events.push({ type: 'surfaceReached', bodyId: inside.body.id });
    state = {
      ...stopNow(state), position: inside.position, restingOn: inside.body.id,
    };
  }

  const { turnX = 0, turnY = 0, roll = 0, drive = 0, strafe = 0, throttle = 1 } = input;
  const orientation = rotateLocal(
    state.orientation, turnX * TURN_RATE * dt, turnY * TURN_RATE * dt, roll * ROLL_RATE * dt,
  );

  const limit = speedLimit(nearestSurface(state.position, bodies).distance);
  let [speed, sideSpeed] = capTotal(state.speed, state.sideSpeed ?? 0, limit);
  let { motionSign, brakeRate } = state;
  let sideSign = state.sideSign ?? 1;
  let sideBrakeRate = state.sideBrakeRate ?? 0;

  ({ speed, sign: motionSign, brakeRate } = thrust(speed, motionSign, brakeRate, drive, throttle, dt, limit));
  ({ speed: sideSpeed, sign: sideSign, brakeRate: sideBrakeRate } = thrust(
    sideSpeed, sideSign, sideBrakeRate, strafe, throttle, dt, limit,
  ));
  [speed, sideSpeed] = capTotal(speed, sideSpeed, limit);

  const f = forward(orientation);
  const r = right(orientation);
  const velocity = f.map((n, i) => n * speed * motionSign + r[i] * sideSpeed * sideSign);
  const combined = Math.hypot(...velocity);
  const direction = combined > 0 ? velocity.map((n) => n / combined) : f;
  const length = combined * dt;
  let position = state.position;
  let restingOn = state.restingOn;

  if (length > 0) {
    const hit = firstSphereHit(state.position, direction, length, bodies, 0);
    if (hit) {
      position = hit.position;
      speed = 0;
      brakeRate = 0;
      sideSpeed = 0;
      sideBrakeRate = 0;
      if (restingOn !== hit.body.id) events.push({ type: 'surfaceReached', bodyId: hit.body.id });
      restingOn = hit.body.id;
    } else {
      position = state.position.map((n, i) => n + direction[i] * length);
      restingOn = null;
      // Having moved closer, never carry more speed than the new spot allows.
      [speed, sideSpeed] = capTotal(speed, sideSpeed, speedLimit(nearestSurface(position, bodies).distance));
    }
  }

  return {
    state: {
      position, orientation, speed, motionSign, brakeRate, sideSpeed, sideSign, sideBrakeRate, restingOn,
    },
    events,
  };
}

