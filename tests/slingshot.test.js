import { test } from 'vitest';
import assert from 'node:assert/strict';
import { slingshot, SLING_RADII, SLING_SECONDS, SLING_BEND_DEG } from '../src/core/slingshot.js';
import { createState, step, stopNow, totalSpeed, boostLift, velocity } from '../src/core/game.js';
import { speedLimit, MAX_SPEED } from '../src/core/flight.js';
import { BODIES, bodyById } from '../src/core/bodies.js';
import { lookAtDirection } from '../src/core/orientation.js';
import { eventMessage } from '../src/ui/messages.js';
import { cueForEvent } from '../src/core/audio.js';

const jupiter = bodyById('jupiter');
const R = jupiter.radiusKm;
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

// A straight fly-by of Jupiter along +x, passing `missKm` above its surface on the +z
// side, at `share` of the allowed speed. Returns what the watcher says at each point.
function flyBy(missKm, share = 1, { from = -4, to = 4, steps = 400 } = {}) {
  let pass = null;
  const seen = [];
  for (let i = 0; i <= steps; i++) {
    const x = (from + ((to - from) * i) / steps) * R;
    const position = [jupiter.position[0] + x, jupiter.position[1], jupiter.position[2] + R + missKm];
    const km = Math.hypot(x, R + missKm) - R;
    const state = { ...createState(position, lookAtDirection([1, 0, 0])), speed: speedLimit(km) * share };
    const out = slingshot(pass, state, BODIES);
    pass = out.pass;
    seen.push({ x, km, flung: out.flung });
  }
  return seen;
}

test('a fast pass within three radii of a planet flings the traveler off, once, just after the closest point', () => {
  assert.equal(SLING_RADII, 3);
  assert.equal(SLING_SECONDS, 6);
  const seen = flyBy(0.5 * R);
  const flings = seen.filter((s) => s.flung);
  assert.equal(flings.length, 1);
  const { x, flung } = flings[0];
  assert.ok(x > 0 && x < 0.6 * R, `${x / R}`);
  assert.equal(flung.bodyId, 'jupiter');
  // Half a radius up: closeness 5/6, so 2.83 times the limit and a bend of 33 degrees.
  near(flung.factor, 2 + 5 / 6, 1e-6);
  assert.deepEqual(flung.state.boost, { factor: flung.factor, seconds: 6, total: 6 });
  assert.equal(flung.state.speed, 0);
  const drift = flung.state.drift;
  near(Math.hypot(...drift), speedLimit(flings[0].km) * flung.factor, 1e-3);
  // Bent toward the planet: it was passing on +z of Jupiter, so the new path leans to -z.
  const bend = (Math.atan2(-drift[2], drift[0]) * 180) / Math.PI;
  near(bend, (SLING_BEND_DEG * 5) / 6, 0.01);
  near(drift[1], 0, 1e-6);
});

test('the closer the pass the stronger the fling: twice the limit at the edge, three times at the surface', () => {
  const factor = (missKm) => flyBy(missKm).find((s) => s.flung).flung.factor;
  near(factor(2.9 * R), 2 + 0.1 / 3, 1e-6);
  near(factor(0.01 * R), 3 - 0.01 / 3, 1e-6);
  assert.ok(factor(0.2 * R) > factor(1.5 * R));
});

test('no fling for a slow pass, a pass outside the zone, a landing, or a take-off', () => {
  assert.equal(flyBy(0.5 * R, 0.4).filter((s) => s.flung).length, 0);
  assert.equal(flyBy(0.5 * R, 0.5).filter((s) => s.flung).length, 1);
  assert.equal(flyBy(3.2 * R).filter((s) => s.flung).length, 0);
  // Leaving from close in without having come in from farther out (a take-off).
  assert.equal(flyBy(0.5 * R, 1, { from: 0, to: 4 }).filter((s) => s.flung).length, 0);
  // Resting on the surface uses the pass up.
  const top = [jupiter.position[0], jupiter.position[1] + R, jupiter.position[2]];
  let out = slingshot(null, { ...createState([top[0], top[1] + R, top[2]]), speed: 9e4 }, BODIES);
  out = slingshot(out.pass, { ...createState(top), restingOn: 'jupiter' }, BODIES);
  out = slingshot(out.pass, { ...createState([top[0], top[1] + R, top[2]]), speed: 9e4 }, BODIES);
  assert.equal(out.flung, null);
  assert.equal(out.pass.done, true);
  // Far from every planet nothing is watched.
  assert.deepEqual(slingshot({ id: 'jupiter', enteredKm: 1, minKm: 1, done: true }, createState([9e9, 9e9, 9e9]), BODIES), { pass: null, flung: null });
});

test('moons and dwarf planets do not fling; the Sun does', () => {
  const past = (id) => {
    const body = bodyById(id);
    let pass = null;
    let flung = 0;
    for (let i = 0; i <= 400; i++) {
      const x = (-4 + (8 * i) / 400) * body.radiusKm;
      const position = [body.position[0] + x, body.position[1] + body.radiusKm * 1.5, body.position[2]];
      const km = Math.hypot(x, body.radiusKm * 1.5) - body.radiusKm;
      const out = slingshot(pass, { ...createState(position, lookAtDirection([1, 0, 0])), speed: speedLimit(km) }, [body]);
      pass = out.pass;
      if (out.flung) flung += 1;
    }
    return flung;
  };
  assert.equal(past('sun'), 1);
  assert.equal(past('mars'), 1);
  assert.equal(past('titan'), 0);
  assert.equal(past('pluto'), 0);
});

test('for six seconds the fling outruns the usual limit, speeding up as the planet falls behind, then coasts', () => {
  const flung = flyBy(0.5 * R).find((s) => s.flung).flung;
  let state = flung.state;
  near(boostLift(state), flung.factor, 1e-9);
  const started = totalSpeed(state);
  let fastest = 0;
  for (let t = 0; t < 6.5; t += 1 / 60) {
    const before = state;
    state = step(state, {}, 1 / 60, BODIES).state;
    // (Jupiter's moons are about: the limit is set by whichever surface is nearest.)
    const usual = speedLimit(Math.min(...BODIES.map((b) => Math.hypot(...before.position.map((n, i) => n - b.position[i])) - b.radiusKm)));
    if (before.boost && boostLift(before) > 1.2 && usual < MAX_SPEED / 4) assert.ok(totalSpeed(state) > usual * 1.1, `t=${t}`);
    fastest = Math.max(fastest, totalSpeed(state));
    assert.ok(totalSpeed(state) <= MAX_SPEED * (1 + 1e-9));
  }
  assert.ok(fastest > started * 20, `${fastest / started}`);
  // The fling is over; the speed it left is kept as a coast, no faster than the limit there.
  assert.equal(state.boost, null);
  assert.equal(boostLift(state), 1);
  assert.ok(totalSpeed(state) > 0);
  const here = Math.min(...BODIES.map((b) => Math.hypot(...state.position.map((n, i) => n - b.position[i])) - b.radiusKm));
  assert.ok(totalSpeed(state) <= speedLimit(here) * (1 + 1e-6));
  // It flew off along the bent path, without the traveler steering.
  const v = velocity(state);
  assert.ok(v[0] > 0 && v[2] < 0);
});

test('Space ends a fling at once', () => {
  const flung = flyBy(0.5 * R).find((s) => s.flung).flung;
  const stopped = stopNow(flung.state);
  assert.equal(stopped.boost, null);
  assert.equal(totalSpeed(stopped), 0);
  assert.equal(createState([0, 0, 0]).boost, null);
});

test('a fling is announced and heard', () => {
  assert.equal(
    eventMessage({ type: 'slingshot', bodyId: 'jupiter', factor: 2.83 }, BODIES),
    '목성 스윙바이! 제한 속도의 2.8배로 튕겨 나갑니다. Space로 멈춥니다.',
  );
  assert.equal(cueForEvent({ type: 'slingshot', bodyId: 'jupiter', factor: 2 }), 'sling');
});
