import { test } from 'vitest';
import assert from 'node:assert/strict';
import { armPose, hoverFlightPose, blendFlight, lookBack } from '../src/core/pose.js';

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
