import { rotateLocal, forward, right } from './orientation.js';
import { BODIES, nearestSurface } from './bodies.js';
import { speedLimit, accelerateSpeed, brakeSpeed, firstSphereHit, MAX_SPEED } from './flight.js';

export const TURN_RATE = 0.7;
export const ROLL_RATE = 0.9;
// Opening view: turned about 31 degrees from Earth toward the Sun, so a wide screen
// shows Earth on the left and the edge of the Sun and its glow on the right.
export const START_YAW = 0.55;
export const START_ORIENTATION = rotateLocal([0, 0, 0, 1], START_YAW, 0);

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
    // Speed kept from something the traveler rode with (km/s, in world axes): it does
    // not turn with the traveler and lasts until they stop or land.
    drift: [0, 0, 0],
    // A fling that lifts the speed limit for a while: { factor, seconds, total }, or
    // null. (The slingshot that set it was taken out of the game; nothing sets it now.)
    boost: null,
  };
}

export function stopNow(state) {
  return { ...state, speed: 0, brakeRate: 0, sideSpeed: 0, sideBrakeRate: 0, drift: [0, 0, 0], boost: null };
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

// The traveler's velocity: their own thrust along the way they face, plus any drift.
function velocityOf(state, orientation = state.orientation) {
  const f = forward(orientation);
  const r = right(orientation);
  const drift = state.drift ?? [0, 0, 0];
  return f.map((n, i) => n * state.speed * state.motionSign + r[i] * (state.sideSpeed ?? 0) * (state.sideSign ?? 1) + drift[i]);
}

export function totalSpeed(state) {
  return Math.hypot(...velocityOf(state));
}

// The traveler's velocity in world axes, km/s.
export function velocity(state) {
  return velocityOf(state);
}

// How many times the usual limit a fling allows right now: its factor at the start,
// fading evenly to 1 as it runs out.
export function boostLift(state) {
  const boost = state.boost;
  return boost ? 1 + (boost.factor - 1) * Math.max(0, boost.seconds / boost.total) : 1;
}

// One thrust axis: hold a direction to accelerate, let go to coast at the speed
// reached, and press the other way to brake to a stop in one second and then
// accelerate back. (Space stops at once; the limit near a body still slows a coast.)
function thrust(speed, sign, brakeRate, command, throttle, dt, maxSpeed) {
  if (command === 0) return { speed, sign, brakeRate: 0 };
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

// The speed allowed at a spot: set by the nearest surface, and also by the nearest
// slow point (a spacecraft), which lowers the limit the same way but blocks nothing.
function limitAt(position, bodies, slowPoints) {
  let km = nearestSurface(position, bodies).distance;
  for (const point of slowPoints) km = Math.min(km, Math.hypot(...point.map((n, i) => n - position[i])));
  return speedLimit(km);
}

export function step(state, input, dt, bodies = BODIES, slowPoints = []) {
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

  const lift = boostLift(state);
  const lifted = (at) => Math.min(MAX_SPEED, limitAt(at, bodies, slowPoints) * lift);
  const limit = lifted(state.position);
  let boost = state.boost ?? null;
  if (boost) boost = boost.seconds > dt ? { ...boost, seconds: boost.seconds - dt } : null;
  let [speed, sideSpeed] = capTotal(state.speed, state.sideSpeed ?? 0, limit);
  let { motionSign, brakeRate } = state;
  let sideSign = state.sideSign ?? 1;
  let sideBrakeRate = state.sideBrakeRate ?? 0;

  ({ speed, sign: motionSign, brakeRate } = thrust(speed, motionSign, brakeRate, drive, throttle, dt, limit));
  ({ speed: sideSpeed, sign: sideSign, brakeRate: sideBrakeRate } = thrust(
    sideSpeed, sideSign, sideBrakeRate, strafe, throttle, dt, limit,
  ));
  [speed, sideSpeed] = capTotal(speed, sideSpeed, limit);

  // A drift is held to the limit too, on its own and together with the thrust.
  let drift = state.drift ?? [0, 0, 0];
  const drifting = Math.hypot(...drift);
  // A fling keeps the traveler at the lifted limit of wherever they are, so they speed
  // up as the planet falls behind; otherwise a drift is only ever cut down.
  if (drifting > 0 && (state.boost || drifting > limit)) drift = drift.map((n) => (n * limit) / drifting);
  let velocity = velocityOf({ speed, motionSign, sideSpeed, sideSign, drift }, orientation);
  let combined = Math.hypot(...velocity);
  if (combined > limit) {
    velocity = velocity.map((n) => (n * limit) / combined);
    combined = limit;
  }
  const direction = combined > 0 ? velocity.map((n) => n / combined) : forward(orientation);
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
      drift = [0, 0, 0];
      boost = null;
      if (restingOn !== hit.body.id) events.push({ type: 'surfaceReached', bodyId: hit.body.id });
      restingOn = hit.body.id;
    } else {
      position = state.position.map((n, i) => n + direction[i] * length);
      restingOn = null;
      // Having moved closer, never carry more speed than the new spot allows.
      [speed, sideSpeed] = capTotal(speed, sideSpeed, lifted(position));
    }
  }

  return {
    state: {
      position, orientation, speed, motionSign, brakeRate, sideSpeed, sideSign, sideBrakeRate, restingOn, drift, boost,
    },
    events,
  };
}

