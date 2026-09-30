import { test } from 'vitest';
import assert from 'node:assert/strict';
import { armPose, hoverFlightPose, blendFlight, lookBack, idleStep, idlePose, IDLE_ACTIONS, heroScaleFor } from '../src/core/pose.js';

test('both elbows flex toward the back/head, never hyperextend toward the chest', () => {
  for (const side of [-1, 1]) {
    for (const bank of [-4, -0.9, 0, 0.9, 4]) {
      const pose = armPose(side, bank, 0.3);
      // Arm points along local +Z; negative X rotation moves the hand toward +Y (back).
      assert.ok(-Math.sin(pose.elbowFlex) > 0);
      assert.ok(pose.elbowFlex >= -Math.PI / 2 && pose.elbowFlex <= 0);
      assert.ok(Math.cos(pose.elbowFlex) > 0);
    }
  }
});

test('stopped pose stands upright with arms down and straight knees', () => {
  const p = hoverFlightPose(0, 0, 0);
  assert.equal(p.bodyPitch, -Math.PI / 2);
  assert.equal(p.shoulderPitch, Math.PI);
  assert.equal(p.kneeFlex, -0.03);
  assert.ok(-Math.sin(p.bodyPitch) > 0.99);
  assert.ok(-Math.sin(p.bodyPitch + p.shoulderPitch) < -0.99);
});

test('stop smoothly transitions into hover and acceleration restores flying pose', () => {
  const stopping = blendFlight(1, 0, 0.1);
  assert.ok(stopping > 0 && stopping < 1);
  assert.ok(blendFlight(1, 0, 1) < 0.01);
  assert.ok(blendFlight(0, 1000, 1) > 0.99);
  assert.ok(hoverFlightPose(1, 0, 0).bodyPitch > -0.5);
});

test('turns remain bounded and smoothly vary around straight flight', () => {
  for (const side of [-1, 1]) {
    const a = armPose(side, -0.00001, 0);
    const b = armPose(side, 0.00001, 0);
    assert.ok(Math.abs(a.elbowFlex - b.elbowFlex) < 0.001);
    assert.ok(Math.abs(armPose(side, 10, 10).shoulderYaw) <= 0.5);
  }
});

test('after resting a moment the hero turns around to face the camera, then turns back to fly', () => {
  let angle = 0;
  let idle = 0;
  for (let i = 0; i < 60; i++) ({ angle, idle } = lookBack(angle, idle, true, 1 / 60));
  assert.ok(angle < 0.05, 'waits about a second and a half before turning');
  for (let i = 0; i < 240; i++) ({ angle, idle } = lookBack(angle, idle, true, 1 / 60));
  assert.ok(Math.abs(angle - Math.PI) < 0.05, `faces back after resting: ${angle}`);
  for (let i = 0; i < 60; i++) ({ angle, idle } = lookBack(angle, idle, false, 1 / 60));
  assert.ok(angle < 0.1, 'swings forward within a second once moving');
  assert.equal(idle, 0);
});

test('facing the camera she does a cute move every 8 to 15 s, never the same one twice in a row', () => {
  let n = 0;
  const cycle = () => { n = (n + 0.37) % 1; return n; }; // deterministic spread of "random" values
  let idle = { untilNext: 3, name: null, t: 0, last: null };
  const starts = [];
  for (let i = 0; i < 60 * 120; i++) {
    const before = idle.name;
    idle = idleStep(idle, 1 / 60, true, cycle);
    if (idle.name && idle.name !== before) starts.push({ at: i / 60, name: idle.name });
  }
  assert.ok(starts.length >= 7, `moves in two minutes: ${starts.length}`);
  for (let i = 1; i < starts.length; i++) {
    assert.notEqual(starts[i].name, starts[i - 1].name, 'no immediate repeat');
    assert.ok(starts[i].at - starts[i - 1].at >= 8, 'at least 8 s apart');
  }
  assert.ok(new Set(starts.map((s) => s.name)).size >= 4, 'uses a variety of moves');
});

test('turning away stops the move at once and waits a moment before the next', () => {
  const away = idleStep({ untilNext: 0, name: 'wave', t: 0.5, last: 'tilt' }, 1 / 60, false);
  assert.equal(away.name, null);
  assert.ok(away.untilNext >= 3);
});

test('every move starts and ends in the resting pose and stays within gentle limits', () => {
  for (const name of Object.keys(IDLE_ACTIONS)) {
    for (const p of [0, 1]) {
      const pose = idlePose(name, p);
      for (const [key, value] of Object.entries(pose)) {
        if (typeof value === 'number') assert.ok(Math.abs(value) < 1e-9, `${name} ${key} at ${p}: ${value}`);
      }
      for (const s of [-1, 1]) assert.ok(pose.armBlend[s] < 1e-9, `${name} arm ${s} at ${p}`);
    }
    for (let p = 0; p <= 1; p += 0.05) {
      const pose = idlePose(name, p);
      assert.ok(Math.abs(pose.headTilt) <= 0.45 && Math.abs(pose.headTurn) <= 0.7 && pose.hop >= 0 && pose.hop <= 0.25, name);
      assert.ok(Math.abs(pose.spin) <= 2 * Math.PI + 1e-9, name);
    }
  }
  assert.ok(Math.abs(idlePose('twirl', 0.999).spin) > 6, 'a twirl turns all the way round');
  assert.ok(idlePose('wave', 0.5).armBlend[1] > 0.9, 'waving raises one arm');
  assert.ok(idlePose('hop', 0.25).hop > 0.1, 'hops leave the ground');
});

test('the hero shrinks on tall phone screens so the view stays open', () => {
  assert.equal(heroScaleFor(16 / 9), 1.3);
  assert.equal(heroScaleFor(1.2), 1.3);
  assert.ok(Math.abs(heroScaleFor(390 / 844) - 0.78) < 1e-9);
  const mid = heroScaleFor(0.9);
  assert.ok(mid > 0.78 && mid < 1.3);
});
