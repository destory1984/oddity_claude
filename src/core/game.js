import { rotateLocal, forward } from './orientation.js';
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
    zoneId: speedZone(nearestSurface(position, bodies).distance).id,
    restingOn: null,
  };
}

export function stopNow(state) {
  return { ...state, speed: 0, brakeRate: 0 };
}

export function step(state, input, dt, bodies = BODIES) {
  const events = [];
  if (!(dt > 0)) return { state, events };

  const { turnX = 0, turnY = 0, roll = 0, drive = 0, throttle = 1 } = input;
  const orientation = rotateLocal(
    state.orientation, turnX * TURN_RATE * dt, turnY * TURN_RATE * dt, roll * ROLL_RATE * dt,
  );

  let zone = speedZone(nearestSurface(state.position, bodies).distance);
  if (zone.id !== state.zoneId) events.push({ type: 'zoneChanged', from: state.zoneId, to: zone.id });

  let { speed, motionSign, brakeRate } = state;
  speed = Math.min(speed, zone.maxSpeed);

  if (drive !== 0 && drive !== motionSign && speed < STOPPED) motionSign = drive;
  const changingDirection = drive !== 0 && drive !== motionSign;

  if (drive !== 0 && !changingDirection) {
    brakeRate = 0;
    speed = accelerateSpeed(speed, throttle, dt, zone.maxSpeed);
  } else {
    if (speed > 0 && brakeRate === 0) brakeRate = speed;
    speed = brakeSpeed(speed, brakeRate, dt);
    if (speed === 0) {
      brakeRate = 0;
      if (changingDirection) {
        motionSign = drive;
        speed = accelerateSpeed(0, throttle, dt, zone.maxSpeed);
      }
    }
  }

  const direction = forward(orientation).map((n) => n * motionSign);
  const length = speed * dt;
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
      speed = Math.min(speed, zone.maxSpeed);
      restingOn = null;
    } else {
      const hit = firstSphereHit(state.position, direction, length, bodies, 0);
      if (hit) {
        position = hit.position;
        speed = 0;
        brakeRate = 0;
        if (restingOn !== hit.body.id) events.push({ type: 'surfaceReached', bodyId: hit.body.id });
        restingOn = hit.body.id;
      } else {
        position = state.position.map((n, i) => n + direction[i] * length);
        restingOn = null;
      }
    }
  }

  return {
    state: { position, orientation, speed, motionSign, brakeRate, zoneId: zone.id, restingOn },
    events,
  };
}

export { ZONES };
