import { rotateLocal, forward, right } from './orientation.js';
import { BODIES, nearestSurface } from './bodies.js';
import {
  speedZone, stricterZoneBelow, accelerateSpeed, brakeSpeed, firstSphereHit, ZONES,
} from './flight.js';

export const TURN_RATE = 0.7;
export const ROLL_RATE = 0.9;
const STOPPED = 0.01;
// Step this far past a zone shell so the next frame measures the new zone despite rounding.
const SHELL_INSET_KM = 0.001;

export function createState(position, orientation = [0, 0, 0, 1], bodies = BODIES) {
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
    zoneId: speedZone(nearestSurface(position, bodies).distance).id,
    restingOn: null,
  };
}

export function stopNow(state) {
  return { ...state, speed: 0, brakeRate: 0, sideSpeed: 0, sideBrakeRate: 0 };
}

// Bodies move along their orbits between frames. Near a body (inside its 0.1c zone)
// the traveler moves with it, so a moon does not slide out from under a landing.
export function carryAlong(state, before, after) {
  const { body, distance } = nearestSurface(state.position, before);
  if (!body || distance > ZONES.near.margin) return state;
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

  let zone = speedZone(nearestSurface(state.position, bodies).distance);
  if (zone.id !== state.zoneId) events.push({ type: 'zoneChanged', from: state.zoneId, to: zone.id });

  let [speed, sideSpeed] = capTotal(state.speed, state.sideSpeed ?? 0, zone.maxSpeed);
  let { motionSign, brakeRate } = state;
  let sideSign = state.sideSign ?? 1;
  let sideBrakeRate = state.sideBrakeRate ?? 0;

  ({ speed, sign: motionSign, brakeRate } = thrust(speed, motionSign, brakeRate, drive, throttle, dt, zone.maxSpeed));
  ({ speed: sideSpeed, sign: sideSign, brakeRate: sideBrakeRate } = thrust(
    sideSpeed, sideSign, sideBrakeRate, strafe, throttle, dt, zone.maxSpeed,
  ));
  [speed, sideSpeed] = capTotal(speed, sideSpeed, zone.maxSpeed);

  const f = forward(orientation);
  const r = right(orientation);
  const velocity = f.map((n, i) => n * speed * motionSign + r[i] * sideSpeed * sideSign);
  const combined = Math.hypot(...velocity);
  const direction = combined > 0 ? velocity.map((n) => n / combined) : f;
  const length = combined * dt;
  let position = state.position;
  let restingOn = state.restingOn;

  if (length > 0) {
    const inner = stricterZoneBelow(zone);
    const shell = inner ? firstSphereHit(state.position, direction, length, bodies, inner.margin) : null;
    if (shell) {
      const travel = Math.min(length, shell.t + SHELL_INSET_KM);
      position = state.position.map((n, i) => n + direction[i] * travel);
      events.push({ type: 'zoneChanged', from: zone.id, to: inner.id });
      zone = inner;
      [speed, sideSpeed] = capTotal(speed, sideSpeed, zone.maxSpeed);
      restingOn = null;
    } else {
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
      }
    }
  }

  return {
    state: {
      position, orientation, speed, motionSign, brakeRate, sideSpeed, sideSign, sideBrakeRate, zoneId: zone.id, restingOn,
    },
    events,
  };
}

export { ZONES };
