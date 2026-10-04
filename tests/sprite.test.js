import { test } from 'vitest';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import {
  SHEETS, FRAMES, SPRITE_FPS, SHEET_HOLD_S, REST_ACTIONS, FIRST_REST_S, REST_GAP_S, SLEEP_AFTER_S,
  createSpriteState, flightSheet, modeFor, stepSprite, spriteFrame, spriteFile, seeFor, SEE_S,
} from '../src/core/sprite.js';

// Run the sprite for `seconds` with the same input, returning every state on the way.
function run(state, input, seconds, dt = 1 / 60) {
  const seen = [];
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    state = stepSprite(state, input, dt);
    seen.push(state);
  }
  return { state, seen };
}
const sheetsOf = (seen) => [...new Set(seen.map((s) => s.sheet))];
const FLY = { speed: 500, drive: 1, turn: [0, 0] };
const STILL = { speed: 0 };
// In flight, showing her back, past the turn away from the camera.
const flying = () => run(createSpriteState(), FLY, 1.2).state;

test('44 sheets of four frames in use, and every drawing is in the assets folder', () => {
  assert.equal(SHEETS.length, 52);
  assert.equal(new Set(SHEETS).size, 52);
  assert.equal(FRAMES, 4);
  for (const sheet of SHEETS) {
    for (let frame = 0; frame < FRAMES; frame++) {
      assert.ok(existsSync(`public/assets/${spriteFile(sheet, frame)}`), spriteFile(sheet, frame));
    }
  }
  assert.equal(spriteFile('idle', 0), 'seora-sprites/idle-1.png');
  for (const f of ['portrait.png', 'loading-1.png', 'loading-4.png']) assert.ok(existsSync(`public/assets/seora-sprites/${f}`), f);
});

test('the camera is behind her: flying ahead shows her back straight on, reversing shows her front', () => {
  assert.equal(flightSheet({ drive: 1 }), 'away');
  assert.equal(flightSheet({ drive: 0 }), 'away');
  assert.equal(flightSheet({ drive: -1 }), 'forward');
});

test('a turn banks her, still seen from behind; sliding sideways shows her side', () => {
  assert.equal(flightSheet({ drive: 1, turn: [0.6, 0] }), 'back-right');
  assert.equal(flightSheet({ drive: 1, turn: [-0.6, 0] }), 'back-left');
  assert.equal(flightSheet({ drive: 1, turn: [0, 0.6] }), 'back-down');
  assert.equal(flightSheet({ drive: 1, turn: [0, -0.6] }), 'back-up');
  assert.equal(flightSheet({ drive: 0, strafe: 1 }), 'right');
  assert.equal(flightSheet({ drive: 0, strafe: -1 }), 'left');
  // The stronger of the two wins; a slight turn is plain flight.
  assert.equal(flightSheet({ drive: 1, turn: [0.5, 0.9] }), 'back-down');
  assert.equal(flightSheet({ drive: 1, turn: [0.2, 0.2] }), 'away');
  // A turn sheet stays while the turn only eases, and leaves when it is nearly over.
  assert.equal(flightSheet({ drive: 1, turn: [0.15, 0] }, 'back-right'), 'back-right');
  assert.equal(flightSheet({ drive: 1, turn: [0.15, 0] }, 'away'), 'away');
  assert.equal(flightSheet({ drive: 1, turn: [0.05, 0] }, 'back-right'), 'away');
});

test('carried somewhere other than where she faces, she leans or turns that way', () => {
  assert.equal(flightSheet({ heading: [0.05, 0.05, 0.99] }), 'away');
  assert.equal(flightSheet({ heading: [-0.3, 0, 0.95] }), 'away-left');
  assert.equal(flightSheet({ heading: [0.3, 0, 0.95] }), 'away-right');
  assert.equal(flightSheet({ heading: [-0.8, 0, 0.6] }), 'left');
  assert.equal(flightSheet({ heading: [0.8, 0, 0.6] }), 'right');
  assert.equal(flightSheet({ heading: [0, 0.9, 0.44] }), 'back-up');
  assert.equal(flightSheet({ heading: [0, -0.9, 0.44] }), 'back-down');
  assert.equal(flightSheet({ heading: [0.1, 0.1, -0.98] }), 'forward');
  // The heading outranks a turn of the view.
  assert.equal(flightSheet({ drive: 1, turn: [2, 0], heading: [-0.8, 0, 0.6] }), 'left');
});

test('what she is doing, most pressing first', () => {
  assert.equal(modeFor({ speed: 0 }), 'hover');
  assert.equal(modeFor({ speed: 300 }), 'fly');
  assert.equal(modeFor({ speed: 0, resting: true }), 'ground');
  assert.equal(modeFor({ speed: 900, boost: true }), 'sling');
  assert.equal(modeFor({ speed: 72, held: true }), 'hover');
  assert.equal(modeFor({ speed: 72, docking: true, held: false }), 'reach');
  assert.equal(modeFor({ speed: 0, photo: true, resting: true }), 'photo');
  assert.equal(modeFor({ speed: 0, cheer: true, photo: true }), 'cheer');
  assert.equal(modeFor({ speed: 500, warp: { phase: 'out', t: 1 }, cheer: true }), 'warp');
});

test('setting off she turns away from the camera over 0.8 s, then flies at ten frames a second', () => {
  assert.equal(SPRITE_FPS.brake, 5);
  const { seen } = run(createSpriteState(), FLY, 1.2);
  const turn = seen.filter((s) => s.sheet === 'brake');
  assert.ok(turn.every((s) => s.reverse));
  assert.deepEqual([...new Set(turn.map(spriteFrame))], [3, 2, 1, 0]);
  assert.ok(Math.abs(turn.length / 60 - 0.8) < 0.05, `${turn.length / 60}`);
  assert.deepEqual(sheetsOf(seen), ['brake', 'away']);
  const flight = run(flying(), FLY, 0.4, 0.01).seen;
  assert.deepEqual([...new Set(flight.map(spriteFrame))].sort(), [0, 1, 2, 3]);
});

test('stopping she turns back to face the camera over 0.8 s, then hovers', () => {
  const { seen, state } = run(flying(), STILL, 1.0);
  const turn = seen.filter((s) => s.sheet === 'brake');
  assert.ok(turn.every((s) => !s.reverse));
  assert.deepEqual([...new Set(turn.map(spriteFrame))], [0, 1, 2, 3]);
  assert.ok(Math.abs(turn.length / 60 - 0.8) < 0.05);
  assert.equal(state.sheet, 'idle');
  // Stopping half-way through the turn away turns her back from where she had got to.
  let half = run(createSpriteState(), FLY, 0.25, 0.01).state;
  assert.equal(spriteFrame(half), 2);
  half = stepSprite(half, STILL, 0.01);
  assert.equal(half.sheet, 'brake');
  assert.ok(!half.reverse);
  assert.equal(spriteFrame(half), 2);
});

test('a mouse drag arrives in bursts, and the drawing does not flicker with it', () => {
  assert.equal(SHEET_HOLD_S, 0.3);
  let state = flying();
  const changes = [];
  for (let i = 0; i < 180; i++) {
    const before = state.sheet;
    state = stepSprite(state, { speed: 800, drive: 1, turn: [i % 2 ? -1.6 : 0, 0] }, 1 / 60);
    if (state.sheet !== before) changes.push(state.sheet);
  }
  // Three seconds of dragging left with W held: she banks left once and stays there.
  assert.deepEqual(changes, ['back-left']);
  const back = [];
  for (let i = 0; i < 120; i++) {
    const before = state.sheet;
    state = stepSprite(state, { speed: 800, drive: 1, turn: [0, 0] }, 1 / 60);
    if (state.sheet !== before) back.push([state.sheet, i]);
  }
  assert.equal(back.length, 1);
  assert.equal(back[0][0], 'away');
  assert.ok(back[0][1] > 6);
});

test('hovering is mostly stillness with a blink, and a rest action now and then', () => {
  assert.equal(FIRST_REST_S, 3);
  assert.deepEqual(REST_GAP_S, [8, 15]);
  assert.equal(REST_ACTIONS.length, 17);
  const { seen } = run(createSpriteState(), STILL, 55, 1 / 30);
  const idle = seen.filter((s) => s.sheet === 'idle');
  assert.ok(idle.length / seen.length > 0.75, `${idle.length / seen.length}`);
  // Hovering shows only eyes open and a short blink.
  assert.deepEqual([...new Set(idle.map(spriteFrame))].sort(), [0, 1]);
  assert.ok(idle.filter((s) => s.frame === 1).length / idle.length < 0.06);
  // The first action comes at three seconds, the rest 8 to 15 seconds apart.
  const starts = [];
  seen.forEach((s, i) => {
    if (s.sheet.startsWith('rest-') && seen[i - 1].sheet === 'idle') starts.push(i / 30);
  });
  assert.ok(Math.abs(starts[0] - 3) < 0.1, `${starts[0]}`);
  assert.ok(starts.length >= 4 && starts.length <= 7, `${starts.length}`);
  for (let i = 1; i < starts.length; i++) {
    const gap = starts[i] - starts[i - 1];
    assert.ok(gap >= 8 && gap <= 18.1, `${gap}`);
  }
  // Not the same action every time, and each runs all four drawings.
  const actions = sheetsOf(seen.filter((s) => s.sheet.startsWith('rest-')));
  assert.ok(actions.length >= 3, `${actions}`);
  for (const name of actions) {
    assert.deepEqual([...new Set(seen.filter((s) => s.sheet === name).map(spriteFrame))].sort(), [0, 1, 2, 3], name);
  }
  // The same again from a fresh start: the order is fixed, not random.
  assert.deepEqual(run(createSpriteState(), STILL, 55, 1 / 30).seen.map((s) => s.sheet), seen.map((s) => s.sheet));
});

test('after a minute of stillness she dozes off, and wakes when she flies', () => {
  assert.equal(SLEEP_AFTER_S, 60);
  let { state } = run(createSpriteState(), STILL, 62, 1 / 30);
  assert.equal(state.sheet, 'rest-sleep');
  state = run(state, STILL, 20, 1 / 30).state;
  assert.equal(state.sheet, 'rest-sleep');
  state = run(state, FLY, 1.2).state;
  assert.equal(state.sheet, 'away');
  // Stopping again starts the minute afresh.
  state = run(state, STILL, 2).state;
  assert.equal(state.sheet, 'idle');
});

test('too bright near the Sun she shields her eyes; in the dark and cold she shivers', () => {
  // Not all the time: it comes as every other rest action, two seconds long.
  const bright = run(createSpriteState(), { speed: 0, bright: true }, 55).seen;
  const cold = run(createSpriteState(), { speed: 0, cold: true }, 55).seen;
  assert.equal(bright[60].sheet, 'idle');
  assert.equal(cold[60].sheet, 'idle');
  assert.ok(sheetsOf(bright).includes('hurt-bright') && !sheetsOf(bright).includes('cold'));
  assert.ok(sheetsOf(cold).includes('cold'));
  assert.ok(sheetsOf(cold).some((s) => s.startsWith('rest-')), 'she still does her other rest actions');
  const shivering = cold.filter((s) => s.sheet === 'cold').length / 60;
  assert.ok(shivering >= 1.9 && shivering < 55 / 3, `${shivering} s of 55 shivering`);
  // Each shiver runs its two seconds and ends hovering.
  const first = cold.findIndex((s) => s.sheet === 'cold');
  assert.equal(cold[first + 60].sheet, 'cold');
  assert.equal(cold[first + 125].sheet, 'idle');
  // In the heat she fans herself the same way; the glare comes before the heat, the heat before the cold.
  const hot = run(createSpriteState(), { speed: 0, hot: true }, 55).seen;
  assert.ok(sheetsOf(hot).includes('hot') && sheetsOf(hot).some((s) => s.startsWith('rest-')));
  const fanning = hot.findIndex((s) => s.sheet === 'hot');
  assert.equal(hot[fanning + 60].sheet, 'hot');
  assert.equal(hot[fanning + 125].sheet, 'idle');
  assert.ok(!sheetsOf(run(createSpriteState(), { speed: 0, hot: true, bright: true }, 55).seen).includes('hot'));
  assert.ok(!sheetsOf(run(createSpriteState(), { speed: 0, hot: true, cold: true }, 55).seen).includes('cold'));
  // Where it is neither, never.
  assert.ok(!sheetsOf(run(createSpriteState(), STILL, 55).seen).some((s) => s === 'cold' || s === 'hot' || s === 'hurt-bright'));
});

test('docking: her arm goes out as she glides in; once docked she turns round and is at rest', () => {
  const glide = { speed: 80, drive: 1, docking: true, heading: [0.1, 0, 0.99] };
  const { seen, state } = run(flying(), glide, 3, 1 / 30);
  assert.deepEqual(sheetsOf(seen), ['dock-reach']);
  // The arm goes out over two seconds and stays out.
  assert.deepEqual([...new Set(seen.map(spriteFrame))], [0, 1, 2, 3]);
  assert.equal(spriteFrame(state), 3);
  // A craft well off to the left: her left side, not an arm reaching ahead.
  assert.equal(run(flying(), { ...glide, heading: [-0.8, 0, 0.6] }, 0.5).state.sheet, 'left');
  // Latched: she turns to face the camera and hovers, whatever speed the craft carries her at.
  const held = run(state, { speed: 72, drive: 1, held: true }, 2, 1 / 30);
  assert.deepEqual(sheetsOf(held.seen), ['brake', 'idle']);
  let wavering = held.state;
  for (let i = 0; i < 30; i++) {
    wavering = stepSprite(wavering, { speed: i % 2 ? 0.2 : 140, drive: 1, held: true }, 1 / 30);
    assert.equal(wavering.sheet, 'idle');
  }
  // Letting go and flying off: she turns away, then flies.
  assert.deepEqual(sheetsOf(run(held.state, FLY, 1.2).seen), ['brake', 'away']);
});

test('landing plays once, then she stands; taking off she turns away and flies', () => {
  const { seen, state } = run(flying(), { speed: 0, resting: true }, 2, 1 / 60);
  assert.deepEqual(sheetsOf(seen), ['land-touch', 'stand']);
  assert.ok(Math.abs(seen.filter((s) => s.sheet === 'land-touch').length / 60 - 0.5) < 0.05);
  assert.deepEqual(sheetsOf(run(state, FLY, 1.2).seen), ['brake', 'away']);
});

test('a slingshot stretches her out; a jump shrinks her to a star and back', () => {
  assert.deepEqual(sheetsOf(run(flying(), { speed: 9000, boost: true }, 1).seen), ['sling']);
  const out = [0, 0.7, 1.4, 2.1, 2.69].map((t) => stepSprite(flying(), { speed: 0, warp: { phase: 'out', t } }, 0.016));
  assert.ok(out.every((s) => s.sheet === 'warp-out'));
  assert.deepEqual(out.map(spriteFrame), [0, 1, 2, 3, 3]);
  const back = [0, 0.7, 1.4, 2.0, 2.59].map((t) => stepSprite(flying(), { speed: 0, warp: { phase: 'in', t } }, 0.016));
  assert.ok(back.every((s) => s.sheet === 'warp-in'));
  assert.deepEqual(back.map(spriteFrame), [0, 1, 2, 3, 3]);
  // After the jump she is simply hovering: no turn-round.
  assert.equal(stepSprite(back[4], STILL, 0.016).sheet, 'idle');
});

test('going down to a place she descends feet first, touches down, then stands; called off, she turns round and hovers', () => {
  assert.equal(modeFor({ speed: 300, landing: true }), 'descend');
  assert.equal(modeFor({ speed: 300, landing: true, docking: true }), 'reach');
  const down = run(createSpriteState(), { speed: 300, landing: true }, 2);
  assert.deepEqual(sheetsOf(down.seen), ['land-descend']);
  assert.deepEqual([...new Set(down.seen.map(spriteFrame))].sort(), [0, 1, 2, 3]);
  const landed = run(down.state, { speed: 0, resting: true }, 2);
  assert.deepEqual(sheetsOf(landed.seen), ['land-touch', 'stand']);
  const off = run(down.state, STILL, 2);
  assert.deepEqual(sheetsOf(off.seen).slice(0, 2), ['brake', 'idle']);
});

test('in the heat she fans herself and wipes her brow by turns, two seconds each', () => {
  const { seen } = run(createSpriteState(), { speed: 0, hot: true }, 120);
  const heat = seen.filter((s) => s.sheet === 'hot' || s.sheet === 'hot-wipe');
  const turns = heat.map((s) => s.sheet).filter((sheet, i, all) => sheet !== all[i - 1]);
  assert.ok(turns.length >= 3, String(turns));
  assert.deepEqual(turns.slice(0, 3), ['hot', 'hot-wipe', 'hot']);
  assert.deepEqual([...new Set(heat.filter((s) => s.sheet === 'hot-wipe').map(spriteFrame))].sort(), [0, 1, 2, 3]);
});

test('photo mode holds the V pose, every time; a full journal sets her cheering', () => {
  let state = stepSprite(createSpriteState(), { speed: 0, photo: true }, 0);
  assert.equal(state.sheet, 'photo-v2');
  assert.equal(spriteFrame(state), 3);
  // No time passes in photo mode: the pose does not change.
  assert.deepEqual(stepSprite(state, { speed: 0, photo: true }, 0), state);
  state = stepSprite(state, STILL, 0.016);
  state = stepSprite(state, { speed: 0, photo: true }, 0);
  assert.equal(state.sheet, 'photo-v2');
  const cheer = run(createSpriteState(), { speed: 0, cheer: true }, 1);
  assert.deepEqual(sheetsOf(cheer.seen), ['cheer-big']);
  assert.deepEqual([...new Set(cheer.seen.map(spriteFrame))].sort(), [0, 1, 2, 3]);
});

test('reading a note runs once and holds; sitting loops; getting up she just stands', () => {
  const ground = { speed: 0, resting: true };
  const stood = run(createSpriteState(), ground, 2).state;
  assert.equal(stood.sheet, 'stand');
  const read = run(stood, { ...ground, read: true }, 2).seen;
  assert.deepEqual(sheetsOf(read), ['read']);
  assert.deepEqual([...new Set(read.map(spriteFrame))], [0, 1, 2, 3]);
  assert.equal(spriteFrame(read[read.length - 1]), 3);
  const sat = run(stood, { ...ground, sit: true }, 3).seen;
  assert.deepEqual(sheetsOf(sat), ['sit']);
  // Four drawings a second, round and round: frame 0 comes back.
  assert.equal(spriteFrame(sat[Math.round(1.1 * 60)]), 0);
  // No second touchdown on getting up.
  const up = run(sat[sat.length - 1], ground, 1).seen;
  assert.deepEqual(sheetsOf(up), ['stand']);
  // Reading comes before sitting; a jump or photo mode before both.
  assert.equal(modeFor({ read: true, sit: true }), 'read');
  assert.equal(modeFor({ sit: true, photo: true }), 'photo');
  assert.equal(modeFor({ sit: true, docking: true }), 'sit');
});

test('hovering, she points at a sight just told of and is drawn speaking while her bubble is up', () => {
  const still = { speed: 0 };
  let { state } = run(createSpriteState(), still, 1);
  assert.equal(state.sheet, 'idle');
  const seeing = run(state, { ...still, see: 'point' }, 1).seen;
  assert.ok(seeing.every((s) => s.sheet === 'see-point'));
  assert.deepEqual([...new Set(seeing.map((s) => s.frame))], [0, 1, 2, 3]);
  state = run(seeing[seeing.length - 1], still, 0.1).state;
  assert.equal(state.sheet, 'idle');
  // Speaking gives way to a sight.
  assert.equal(run(state, { ...still, talk: true }, 0.5).state.sheet, 'talk');
  assert.equal(run(state, { ...still, talk: true, see: 'up' }, 0.5).state.sheet, 'see-up');
  // In flight she keeps flying: the gesture is for when she faces the camera.
  assert.ok(!run(createSpriteState(), { speed: 500, drive: 1, see: 'wow' }, 2).state.sheet.startsWith('see-'));
  // What she does for which sight.
  assert.equal(seeFor('aurora:earth'), 'up');
  assert.equal(seeFor('lightning:venus'), 'wow');
  assert.equal(seeFor('hexagon:saturn'), 'point');
  assert.ok(SEE_S >= 2);
});
