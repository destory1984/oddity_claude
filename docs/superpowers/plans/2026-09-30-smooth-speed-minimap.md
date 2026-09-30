# Smooth Speed, Label Overlap, Minimap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three stepped speed zones with a speed limit proportional to the distance to the nearest surface, stop moon labels from covering planet labels, add a top-down solar-system minimap, shrink the action buttons and drop the distance and ETA lines.

**Architecture:** `core/flight.js` gets a pure `speedLimit(surfaceKm)`; `core/game.js` caps speed with it every frame and loses all zone code. Downstream zone events, messages and sounds are deleted. Label hiding is a pure function in `core/markers.js` used by `ui/hud.js`. The minimap is a pure projection in `core/minimap.js` plus a canvas-2D drawer in `ui/minimap.js`, drawn on the HUD tick.

**Tech Stack:** Vanilla JS modules, Babylon.js (untouched here), Vite, Vitest (`npm test`).

**Spec:** `docs/superpowers/specs/2026-09-30-smooth-speed-minimap-design.md`

## Global Constraints

- Speed limit = clamp(surface distance in km × 1 per second, 0.01c, 100c); C = 299792.458 km/s.
- Acceleration adds limit/3 per second times throttle; release stops within 1 s; the other direction stops first, then accelerates (unchanged).
- Discovery radius stays 50,000 km from a surface; ride-along radius stays 50,000 km.
- Limit label: under 1c two decimals (0.12c), 1c to under 10c one decimal (3.4c), 10c and up whole number (42c).
- Minimap: diameter 170 px, 120 px when the viewport is 800 px wide or less; north (+y) up, x right, z up on the map; radius scale sqrt(r / Neptune orbit).
- Moon label hidden when within 40 px (both x and y) of its planet's on-screen label, unless the moon is selected.
- Touch targets for the action buttons stay at least 44 px tall on touch devices.
- Code comments and commit messages in English; commits authored as `13573570+destory1984@users.noreply.github.com` (already configured).

## Review Focus

- Leaving a surface with W held: the speed must grow a little each frame, never by more than limit/180 at 60 fps. Pinned in Task 2.
- Diving at 100c toward a body: never inside it, never faster than the limit for the current distance, and the only event is `surfaceReached`. Pinned in Task 2.
- A traveler exactly at the Sun's centre direction (position straight above/below the Sun on the y axis): the minimap must not divide by zero. Pinned in Task 5 (`mapPoint` at r = 0).
- Looking straight up or down: the heading on the minimap has no horizontal component; draw a dot instead of an arrow. Pinned in Task 5 (`mapHeading` returns null).
- A selected moon whose label sits on its planet: the moon label must stay visible. Pinned in Task 4.

---

### Task 1: `speedLimit` in flight.js

**Files:**
- Modify: `src/core/flight.js:3-21`
- Test: `tests/flight.test.js:1-34`

**Interfaces:**
- Produces: `speedLimit(surfaceKm: number) => number` (km/s), constants `MIN_SPEED = C * 0.01`, `MAX_SPEED = C * 100`, `LIMIT_PER_SECOND = 1`. `accelerateSpeed`, `brakeSpeed`, `sweepSphere`, `firstSphereHit`, `C` unchanged. `ZONES`, `speedZone`, `stricterZoneBelow` are removed (Task 2 removes their users; keep them exported until Task 2 compiles, then delete in Task 2 Step 5).

- [ ] **Step 1: Replace the zone tests with limit tests**

In `tests/flight.test.js` replace the import and the first three tests (lines 1-34) with:

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  C, speedLimit, MIN_SPEED, MAX_SPEED, accelerateSpeed, brakeSpeed,
  sweepSphere, firstSphereHit,
} from '../src/core/flight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the limit is the surface distance per second, between 0.01c and 100c', () => {
  assert.equal(MIN_SPEED, C * 0.01);
  assert.equal(MAX_SPEED, C * 100);
  assert.equal(speedLimit(0), MIN_SPEED);
  assert.equal(speedLimit(1000), MIN_SPEED, 'close to a surface the floor applies');
  near(speedLimit(30000), 30000);
  near(speedLimit(3e6), 3e6);
  assert.equal(speedLimit(4e7), MAX_SPEED);
  assert.equal(speedLimit(Infinity), MAX_SPEED);
});

test('the limit never falls as the distance grows', () => {
  let previous = 0;
  for (let d = 0; d < 5e7; d = d * 1.5 + 100) {
    const limit = speedLimit(d);
    assert.ok(limit >= previous, `limit fell at ${d} km`);
    previous = limit;
  }
});

test('full acceleration reaches a fixed limit in three seconds and never exceeds it', () => {
  for (const limit of [MIN_SPEED, C * 0.1, MAX_SPEED]) {
    assert.equal(accelerateSpeed(0, 1, 3, limit), limit);
    assert.ok(accelerateSpeed(0, 1, 2.9, limit) < limit);
    assert.equal(accelerateSpeed(limit, 1, 3, limit), limit);
  }
});
```

Keep the remaining tests in the file (brake, sweepSphere, firstSphereHit) as they are. If a remaining test mentions `zone` only in its title (line 73, "firstSphereHit with a margin finds the zone shell"), rename the title to "firstSphereHit with a margin finds the shell".

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/flight.test.js`
Expected: FAIL, `speedLimit` / `MIN_SPEED` not exported.

- [ ] **Step 3: Add the limit to flight.js**

In `src/core/flight.js`, above `const ACCELERATION_SECONDS = 3;`, add (keep `ZONES`, `speedZone`, `stricterZoneBelow` for now):

```js
export const MIN_SPEED = C * 0.01;
export const MAX_SPEED = C * 100;
// The limit grows with the distance to the nearest surface: flying straight at a body
// at the limit, the surface is always at least one second away, so the traveler slows
// down smoothly on approach and speeds up smoothly on departure.
export const LIMIT_PER_SECOND = 1;

export function speedLimit(surfaceKm) {
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, surfaceKm * LIMIT_PER_SECOND));
}
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/flight.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/flight.js tests/flight.test.js
git commit -m "Add a speed limit proportional to the distance to the nearest surface"
```

---

### Task 2: game.js flies by the smooth limit

**Files:**
- Modify: `src/core/game.js` (imports, `createState`, `carryAlong`, `step`, last export line)
- Modify: `src/core/flight.js` (delete `ZONES`, `speedZone`, `stricterZoneBelow`)
- Modify: `src/core/progress.js:1-17`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `speedLimit`, `MIN_SPEED`, `MAX_SPEED` from Task 1.
- Produces: `step(state, input, dt, bodies)` returning `{ state, events }` where state has no `zoneId` and events are only `surfaceReached`. `CARRY_KM = 50000` exported from game.js. `DISCOVERY_KM = 50000` exported from progress.js. game.js no longer re-exports `ZONES`.

- [ ] **Step 1: Rewrite the zone-based game tests**

In `tests/game.test.js`:

Replace line 4 with:

```js
import { C, speedLimit, MAX_SPEED } from '../src/core/flight.js';
```

Replace the test `createState starts at rest in the zone of its position` with:

```js
test('createState starts at rest', () => {
  const state = createState(START_POSITION);
  assert.equal(state.speed, 0);
  assert.equal('zoneId' in state, false);
  assert.equal(state.restingOn, null);
});
```

Replace `a fast dive stops on the surface, never inside, announcing each zone once` with:

```js
test('a fast dive slows with the distance and stops on the surface, never inside', () => {
  let state = { ...createState([0, 0, -1e7], facingBall, [ball]), speed: MAX_SPEED };
  const events = [];
  for (let i = 0; i < 20000 && state.restingOn === null; i++) {
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const distance = Math.hypot(...state.position);
    assert.ok(distance >= ball.radiusKm - 1e-6, 'went inside the body');
    assert.ok(state.speed <= speedLimit(distance - ball.radiusKm) + 1e-6, 'faster than the limit');
  }
  assert.equal(state.restingOn, 'ball');
  assert.equal(state.speed, 0);
  assert.deepEqual(events, [{ type: 'surfaceReached', bodyId: 'ball' }]);
});
```

Replace `a traveler on the surface can leave outward at once, announcing each zone once` with:

```js
test('leaving a surface the speed grows a little every frame, never in a jump', () => {
  let state = createState([0, 0, -1000], awayFromBall, [ball]);
  const events = [];
  for (let i = 0; i < 60 * 20; i++) {
    const before = state;
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const limit = speedLimit(Math.hypot(...before.position) - ball.radiusKm);
    assert.ok(state.speed - before.speed <= limit / 3 * DT + 1e-6, `jumped at frame ${i}`);
  }
  assert.ok(Math.hypot(...state.position) > 1e6, 'got far away in 20 s');
  assert.deepEqual(events, []);
});
```

Delete the tests `boundary rest: sitting exactly on the 50,000 km shell emits no events` and `a move that ends just past a zone shell still lands inside it` (the shells no longer exist).

In `reverse near a body: ...` change the title to `reverse near a body: S while diving brakes, never enters, then backs away` and keep its body.

In `full throttle reaches 100c in three seconds in empty space`, `strafing right ...` and `forward plus sideways ...`, empty space has no bodies so the limit is `MAX_SPEED`; replace `C * 100` with `MAX_SPEED` in those three tests and rename `at the zone limit` to `at the limit`, `never exceeds the zone limit` to `never exceeds the limit`.

- [ ] **Step 2: Run the tests to see them fail**

Run: `npx vitest run tests/game.test.js`
Expected: FAIL (`zoneId` still present, zone events emitted, speed jumps).

- [ ] **Step 3: Rewrite game.js flight to use the limit**

In `src/core/game.js`:

Imports (lines 1-5):

```js
import { rotateLocal, forward, right } from './orientation.js';
import { BODIES, nearestSurface } from './bodies.js';
import { speedLimit, accelerateSpeed, brakeSpeed, firstSphereHit } from './flight.js';
```

Delete `const SHELL_INSET_KM = 0.001;` and its comment. Add below `const STOPPED = 0.01;`:

```js
// Within this distance of a surface the traveler rides along with that body.
export const CARRY_KM = 50000;
```

In `createState`, delete the line `zoneId: speedZone(nearestSurface(position, bodies).distance).id,` and drop the now-unused `bodies` parameter default only if nothing else uses it (keep the signature `createState(position, orientation = [0, 0, 0, 1])`; callers passing a third argument are harmless).

In `carryAlong`, replace `distance > ZONES.near.margin` with `distance > CARRY_KM`, and update its comment to `// Near a body (within CARRY_KM of its surface) the traveler moves with it, so a moon does not slide out from under a landing.`

In `step`, replace everything from `let zone = speedZone(...)` down to the closing of the `if (length > 0) { ... }` block with:

```js
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
    }
  }
```

Change the returned state to drop `zoneId`:

```js
  return {
    state: {
      position, orientation, speed, motionSign, brakeRate, sideSpeed, sideSign, sideBrakeRate, restingOn,
    },
    events,
  };
```

Delete the last line `export { ZONES };`.

- [ ] **Step 4: Discovery radius in progress.js**

In `src/core/progress.js` replace line 2 `import { ZONES } from './flight.js';` with nothing, and above `createProgress` add:

```js
// A body counts as discovered once the traveler comes this close to its surface.
export const DISCOVERY_KM = 50000;
```

Replace the comment `// Discovery happens on entering the near zone of a body (same edge as the 0.1c limit).` with `// Discovery happens within DISCOVERY_KM of a body's surface.` and `ZONES.near.margin` with `DISCOVERY_KM`.

- [ ] **Step 5: Delete the zones from flight.js**

In `src/core/flight.js` delete `ZONES`, `speedZone` and `stricterZoneBelow`. Run `grep -rn "ZONES\|speedZone\|stricterZoneBelow\|zoneId" src tests` — the only remaining hits must be in `src/main.js`, `src/core/eta.js` and `src/core/audio.js`/`src/ui/messages.js` (fixed in Tasks 3 and 4).

- [ ] **Step 6: Run the tests**

Run: `npx vitest run tests/game.test.js tests/flight.test.js tests/progress.test.js`
Expected: PASS. (`npm test` as a whole still fails on eta/audio/messages until Tasks 3-4.)

- [ ] **Step 7: Commit**

```bash
git add src/core/game.js src/core/flight.js src/core/progress.js tests/game.test.js
git commit -m "Fly by the distance-scaled limit instead of three speed zones"
```

---

### Task 3: Drop zone events; show the live limit; remove distance and ETA lines

**Files:**
- Modify: `src/core/audio.js`, `src/ui/messages.js`, `src/ui/sound.js:120-127`, `src/ui/toast.js:31-32`, `src/ui/hud.js:54-64`, `src/main.js`, `index.html:50-51,62,110`, `style.css` (`#targetRoute` rule)
- Delete: `src/core/eta.js`, `tests/eta.test.js`
- Test: `tests/audio.test.js`, `tests/messages.test.js`

**Interfaces:**
- Consumes: `speedLimit`, `C` (Task 1), `nearestSurface` from `core/bodies.js`.
- Produces: `limitText(ratioOfC: number) => string` in `ui/messages.js`; `hud.update({ view, local, selected, speed, motionSign, limitLabel, flightLabel, throttle, C })`.

- [ ] **Step 1: Tests for the new message and the removed ones**

`tests/audio.test.js`: delete the four `zoneChanged` lines in the first test.

`tests/messages.test.js`: change the import to `import { objectParticle, subjectParticle, eventMessage, limitText } from '../src/ui/messages.js';`, delete the tests `zone messages match the spec wording` and `route text says how long, or what is in the way`, and add:

```js
test('the live limit reads like 0.12c, 3.4c or 42c', () => {
  assert.equal(limitText(0.01), '0.01c');
  assert.equal(limitText(0.123), '0.12c');
  assert.equal(limitText(1), '1.0c');
  assert.equal(limitText(3.44), '3.4c');
  assert.equal(limitText(10), '10c');
  assert.equal(limitText(42.4), '42c');
  assert.equal(limitText(100), '100c');
});

test('speed zone events are gone', () => {
  assert.equal(eventMessage({ type: 'zoneChanged', from: 'near', to: 'far' }), null);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run tests/messages.test.js tests/audio.test.js`
Expected: FAIL (`limitText` missing, zone message still returned).

- [ ] **Step 3: messages.js and audio.js**

In `src/ui/messages.js` delete the `case 'zoneChanged':` block (5 lines) and the whole `routeText` function with its comment, and add at the end:

```js
// The live speed limit as a multiple of light speed.
export function limitText(ratio) {
  if (ratio < 1) return `${ratio.toFixed(2)}c`;
  if (ratio < 10) return `${ratio.toFixed(1)}c`;
  return `${Math.round(ratio)}c`;
}
```

In `src/core/audio.js` delete `const ZONE_RANK = ...;` and the `case 'zoneChanged':` block (2 lines).

In `src/ui/sound.js` delete the `zoneUp` and `zoneDown` cue entries (lines 120-127 area; delete both arrow functions completely).

In `src/ui/toast.js` change the comment `// so a fast trip does not replay every speed-zone change after arrival.` to `// so a burst of updates does not replay one by one.`

- [ ] **Step 4: Remove the ETA module**

```bash
git rm src/core/eta.js tests/eta.test.js
```

- [ ] **Step 5: index.html**

Delete `<p id="targetDistance">—</p>` and `<p id="targetRoute"></p>`. Change `<p id="speedLimit">현재 제한 0.1c</p>` to `<p id="speedLimit">현재 제한 0.01c</p>`. Change the help line to:

```html
      <dt>자동 속도</dt><dd>가까울수록 느리게, 멀수록 빠르게 (0.01c → 100c)</dd>
```

In `style.css` delete the `#targetRoute { color: #ffdfa6 !important; }` rule.

- [ ] **Step 6: hud.js**

Change the `update` signature and first lines to:

```js
    update({ view, local, selected, speed, motionSign, limitLabel, flightLabel, throttle, C }) {
```

Replace `$('speedLimit').textContent = \`현재 제한 ${zoneLabel}\`;` with `$('speedLimit').textContent = \`현재 제한 ${limitLabel}\`;` and delete the two lines that set `targetDistance` and `targetRoute`.

- [ ] **Step 7: main.js**

- Imports: `import { C, speedLimit } from './core/flight.js';`, add `nearestSurface` to the `./core/bodies.js` import and remove `surfaceDistance` if unused afterwards, `import { eventMessage, limitText } from './ui/messages.js';`, delete the `estimateTravelSeconds` import.
- Delete `const ROUTE_EVERY_MS = 1000;`, `let route = null;`, `let routeAt = 0;` and every `routeAt = 0;` line (in `onSelect` and `onGo`).
- In the render loop, change the toast line to `if (text) toast.show(text);` (no zone kind).
- Before `sound.engine(...)` add `const limit = speedLimit(nearestSurface(state.position, bodies).distance);` and pass `maxSpeed: limit` instead of `ZONES[state.zoneId].maxSpeed`.
- In the HUD block delete the `if (routeAt === 0 || ...) { ... }` block, and in `hud.update({...})` delete `route: ...` and `selectedDistance: ...`, replace `zoneLabel: ZONES[state.zoneId].label,` with `limitLabel: limitText(limit / C),`. `limit` is computed earlier in the same loop iteration, before the HUD early return.
- In `window.oddity.getState` replace `zoneId: state.zoneId,` with `limitC: speedLimit(nearestSurface(state.position, bodies).distance) / C,`.

- [ ] **Step 8: Run everything**

Run: `npm test` then `grep -rn "zone\|ZONES\|routeText\|estimateTravel\|targetDistance\|targetRoute" src index.html style.css`
Expected: all tests pass; grep prints nothing except unrelated words (none expected).

- [ ] **Step 9: Commit**

```bash
git add -A src tests index.html style.css
git commit -m "Show the live speed limit; drop zone alerts and the distance and ETA lines"
```

---

### Task 4: Moon labels no longer cover planet labels

**Files:**
- Modify: `src/core/markers.js`, `src/ui/hud.js:65-86`, `style.css` (after `.marker.inView:before`)
- Test: `tests/markers.test.js`

**Interfaces:**
- Produces: `crowdedMoons(spots: {id, parent: string|null, x, y, outside, selected}[], gap = 40) => Set<string>` of moon ids to hide. `parent` is the planet id for moons and `null` for everything else.

- [ ] **Step 1: Failing tests**

Append to `tests/markers.test.js` (and add `crowdedMoons` to its import):

```js
const saturn = { id: 'saturn', parent: null, x: 567, y: 212, outside: false, selected: false };
const titan = { id: 'titan', parent: 'saturn', x: 573, y: 210, outside: false, selected: false };

test('a moon label sitting on its planet label is hidden', () => {
  assert.deepEqual([...crowdedMoons([saturn, titan])], ['titan']);
});

test('a selected moon keeps its label even on top of its planet', () => {
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, selected: true }])], []);
});

test('a moon far enough from its planet on screen keeps its label', () => {
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, x: 567 + 41 }])], []);
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, y: 212 + 41 }])], []);
});

test('off-screen arrows are left to spreadArrows', () => {
  assert.deepEqual([...crowdedMoons([{ ...saturn, outside: true }, titan])], []);
  assert.deepEqual([...crowdedMoons([saturn, { ...titan, outside: true }])], []);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/markers.test.js`
Expected: FAIL, `crowdedMoons` not exported.

- [ ] **Step 3: Implement**

Append to `src/core/markers.js`:

```js
// From far away a moon sits almost on its planet, and the later label covered the
// planet's. Hide such moon labels unless the moon is the selected one.
export function crowdedMoons(spots, gap = 40) {
  const byId = new Map(spots.map((s) => [s.id, s]));
  const hidden = new Set();
  for (const moon of spots) {
    if (!moon.parent || moon.outside || moon.selected) continue;
    const planet = byId.get(moon.parent);
    if (!planet || planet.outside) continue;
    if (Math.abs(moon.x - planet.x) < gap && Math.abs(moon.y - planet.y) < gap) hidden.add(moon.id);
  }
  return hidden;
}
```

- [ ] **Step 4: Use it in hud.js**

Import `crowdedMoons` next to `keepMarker, spreadArrows`. Replace the label loop in `update` (from `const arrows = [];` through the `spreadArrows(...)` call) with:

```js
      const placed = bodies.map((body) => {
        const el = markers.get(body.id);
        const hidden = body.kind === 'star' && view.sunVisibility < 0.01;
        const spot = placeMarker(el, view.directions[body.id], view.camera, hidden ? `${body.name} · 가려짐` : body.name);
        const selectedHere = body.id === selected.id;
        const keep = keepMarker({
          outside: spot.outside,
          selected: selectedHere,
          nearest: body.id === local.body.id,
          surfaceKm: view.distances[body.id] - body.radiusKm,
        });
        return { body, el, spot, keep, selected: selectedHere };
      });
      const crowded = crowdedMoons(placed.map(({ body, spot, selected: sel }) => ({
        id: body.id, parent: body.kind === 'moon' ? body.parent : null, x: spot.x, y: spot.y, outside: spot.outside, selected: sel,
      })));
      const arrows = [];
      for (const { body, el, spot, keep, selected: sel } of placed) {
        el.hidden = !keep || crowded.has(body.id);
        el.classList.toggle('selected', sel);
        if (!el.hidden && spot.outside) arrows.push({ el, ...spot });
      }
      spreadArrows(arrows, 40, innerHeight).forEach((spot, i) => {
        arrows[i].el.style.top = `${spot.y}px`;
      });
```

- [ ] **Step 5: Selected label on top**

In `style.css` after the `.marker.inView:before { ... }` rule add:

```css
.marker.selected {
  z-index:2;
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/core/markers.js src/ui/hud.js style.css tests/markers.test.js
git commit -m "Hide moon labels that sit on their planet's label; keep the selected one on top"
```

---

### Task 5: Solar-system minimap

**Files:**
- Create: `src/core/minimap.js`, `src/ui/minimap.js`
- Modify: `index.html` (inside `#hud`, after the `.telemetry` section), `style.css`, `src/main.js`
- Test: `tests/minimap.test.js`

**Interfaces:**
- Consumes: `BODIES`, `bodyById` from `core/bodies.js`; `forward(orientation)` from `core/orientation.js`.
- Produces: `mapPoint(position, sunPosition, outerKm, radiusPx) => [x, y]`, `mapHeading(forwardVec) => [x, y] | null`, `pickNearest(point, dots, within = 12) => id | null` in `core/minimap.js`; `createMinimap(canvas, { onPick }) => { draw({ bodies, position, heading, selectedId }) }` in `ui/minimap.js`.

- [ ] **Step 1: Failing tests**

Create `tests/minimap.test.js`:

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mapPoint, mapHeading, pickNearest } from '../src/core/minimap.js';

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the Sun is the centre and the outer orbit touches the edge', () => {
  assert.deepEqual(mapPoint([0, 0, 0], [0, 0, 0], 100, 80), [0, 0]);
  const [x, y] = mapPoint([100, 0, 0], [0, 0, 0], 100, 80);
  near(x, 80);
  near(y, 0);
});

test('north (+z) is up on the map and height (y) is ignored', () => {
  const [x, y] = mapPoint([0, 999, 100], [0, 0, 0], 100, 80);
  near(x, 0);
  near(y, -80);
});

test('distances shrink by the square root so inner planets spread out', () => {
  const [x] = mapPoint([25, 0, 0], [0, 0, 0], 100, 80);
  near(x, 40);
});

test('beyond the outer orbit a point sticks to the edge', () => {
  const [x] = mapPoint([400, 0, 0], [0, 0, 0], 100, 80);
  near(x, 80);
});

test('positions are relative to the Sun', () => {
  const [x, y] = mapPoint([110, 5, 10], [10, 5, 10], 100, 80);
  near(x, 80);
  near(y, 0);
});

test('the heading is the forward vector laid flat, or null when looking straight up or down', () => {
  const [x, y] = mapHeading([0, 0, 1]);
  near(x, 0);
  near(y, -1);
  const [x2, y2] = mapHeading([3, 5, 0]);
  near(x2, 1);
  near(y2, 0);
  assert.equal(mapHeading([0, 1, 0]), null);
  assert.equal(mapHeading([1e-9, -1, 0]), null);
});

test('a tap picks the nearest dot within reach', () => {
  const dots = [{ id: 'mars', x: 30, y: 0 }, { id: 'earth', x: 22, y: 0 }];
  assert.equal(pickNearest([24, 1], dots), 'earth');
  assert.equal(pickNearest([29, -2], dots), 'mars');
  assert.equal(pickNearest([80, 80], dots), null);
});
```

- [ ] **Step 2: Run to see it fail**

Run: `npx vitest run tests/minimap.test.js`
Expected: FAIL, module not found.

- [ ] **Step 3: Pure projection**

Create `src/core/minimap.js`:

```js
// Top-down solar-system map, seen from north (+y): x to the right, z up the map.
// Distances from the Sun shrink by their square root so the inner planets do not
// huddle in the middle next to Neptune's far orbit.

export function mapPoint(position, sunPosition, outerKm, radiusPx) {
  const dx = position[0] - sunPosition[0];
  const dz = position[2] - sunPosition[2];
  const r = Math.hypot(dx, dz);
  if (r === 0) return [0, 0];
  const scaled = radiusPx * Math.sqrt(Math.min(r, outerKm) / outerKm);
  return [(dx / r) * scaled, (-dz / r) * scaled];
}

// Unit 2D direction on the map, or null when the flight heading is nearly vertical.
export function mapHeading(forward) {
  const length = Math.hypot(forward[0], forward[2]);
  if (length < 1e-6) return null;
  return [forward[0] / length, -forward[2] / length];
}

export function pickNearest([px, py], dots, within = 12) {
  let best = null;
  let bestDistance = within;
  for (const dot of dots) {
    const d = Math.hypot(dot.x - px, dot.y - py);
    if (d <= bestDistance) {
      best = dot.id;
      bestDistance = d;
    }
  }
  return best;
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run tests/minimap.test.js`
Expected: PASS.

- [ ] **Step 5: Canvas drawer**

Create `src/ui/minimap.js`:

```js
import { mapPoint, mapHeading, pickNearest } from '../core/minimap.js';

const COLORS = {
  sun: '#ffd27a',
  mercury: '#b9b1a8',
  venus: '#e8cf9a',
  earth: '#6fb6ff',
  mars: '#e0835a',
  jupiter: '#d9b48c',
  saturn: '#e8d49a',
  uranus: '#9fe3ea',
  neptune: '#6f8dff',
};
const EDGE_PX = 8;

// Round map in the HUD: the Sun, the eight planets and their orbits, and the
// traveler with an arrow for the flight heading. Tapping a planet selects it.
export function createMinimap(canvas, { onPick }) {
  const ctx = canvas.getContext('2d');
  let dots = [];

  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const id = pickNearest([e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2], dots);
    if (id) onPick(id);
  });

  function draw({ bodies, position, heading, selectedId }) {
    const size = canvas.clientWidth;
    if (!size) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(size * dpr)) {
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, size / 2 * dpr, size / 2 * dpr);
    ctx.clearRect(-size / 2, -size / 2, size, size);

    const radius = size / 2 - EDGE_PX;
    const sun = bodies.find((b) => b.kind === 'star');
    const planets = bodies.filter((b) => b.kind === 'planet');
    const dist = (b) => Math.hypot(b.position[0] - sun.position[0], b.position[2] - sun.position[2]);
    const outerKm = Math.max(...planets.map(dist));
    const at = (p) => mapPoint(p, sun.position, outerKm, radius);

    ctx.fillStyle = 'rgba(7, 21, 34, 0.55)';
    ctx.strokeStyle = 'rgba(174, 205, 231, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(174, 205, 231, 0.16)';
    for (const planet of planets) {
      ctx.beginPath();
      ctx.arc(0, 0, radius * Math.sqrt(dist(planet) / outerKm), 0, Math.PI * 2);
      ctx.stroke();
    }

    const selected = bodies.find((b) => b.id === selectedId);
    const ringed = selected?.kind === 'moon' ? selected.parent : selectedId;
    dots = [];
    for (const body of [sun, ...planets]) {
      const [x, y] = at(body.position);
      ctx.fillStyle = COLORS[body.id] ?? '#cfe3f3';
      ctx.beginPath();
      ctx.arc(x, y, body.kind === 'star' ? 4 : 2.6, 0, Math.PI * 2);
      ctx.fill();
      if (body.id === ringed) {
        ctx.strokeStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (body.kind === 'planet') dots.push({ id: body.id, x, y });
    }

    const [px, py] = at(position);
    const dir = mapHeading(heading);
    ctx.fillStyle = '#9fffe7';
    ctx.beginPath();
    if (dir) {
      const [hx, hy] = dir;
      ctx.moveTo(px + hx * 7, py + hy * 7);
      ctx.lineTo(px - hx * 4 - hy * 4, py - hy * 4 + hx * 4);
      ctx.lineTo(px - hx * 4 + hy * 4, py - hy * 4 - hx * 4);
      ctx.closePath();
    } else {
      ctx.arc(px, py, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }

  return { draw };
}
```

- [ ] **Step 6: Place it in the page**

In `index.html`, right after the closing `</section>` of `<section class="telemetry">`, add:

```html
    <canvas id="minimap" aria-label="태양계 지도. 행성을 누르면 선택합니다."></canvas>
```

In `style.css` append:

```css
#minimap {
  position:absolute;
  top:250px;
  left:36px;
  width:170px;
  height:170px;
  pointer-events:auto;
  cursor:pointer;
}

@media(max-width:800px) {
  #minimap {
    left:20px;
    top:180px;
    width:120px;
    height:120px;
  }
}

@media(max-height:500px) {
  #minimap {
    top:150px;
    width:100px;
    height:100px;
  }
}
```

- [ ] **Step 7: Wire it in main.js**

- Imports: `import { createMinimap } from './ui/minimap.js';` and add `forward` to the `./core/orientation.js` import.
- Replace the hud `onSelect(id) { ... }` body with a call to a new shared function defined just above `createHud`:

```js
  function selectBody(id) {
    selectedId = id;
    hud.showSelection(bodyById(id));
  }
```

  and `onSelect: selectBody,` inside `createHud(...)`. (`hud` is a `const` declared by that same statement; `selectBody` only runs on clicks after it exists.)
- After `hud.showSelection(bodyById(selectedId));` add:

```js
  const minimap = createMinimap($('minimap'), { onPick: selectBody });
```

- In the HUD block, right after `hud.update({...});`, add:

```js
    minimap.draw({ bodies, position: state.position, heading: forward(state.orientation), selectedId });
```

- [ ] **Step 8: Run tests and build**

Run: `npm test` then `npm run build`
Expected: all pass; build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/core/minimap.js src/ui/minimap.js tests/minimap.test.js index.html style.css src/main.js
git commit -m "Add a top-down solar-system minimap that selects planets on tap"
```

---

### Task 6: Smaller action buttons

**Files:**
- Modify: `style.css` (append)

- [ ] **Step 1: Shrink the three buttons**

Append to `style.css`:

```css
/* The flight buttons were as tall as the speed readout; about 70% of that is enough. */
#reverseButton,#flyButton,#brake {
  min-height:30px;
  padding:6px 11px;
  font-size:12px;
}

#reverseButton kbd,#flyButton kbd,#brake kbd {
  margin-left:8px;
}

body.touch #reverseButton,body.touch #flyButton,body.touch #brake {
  min-height:44px;
}
```

- [ ] **Step 2: Check the layout at 1280x800 and 375x812**

Open the dev server in Chrome at both sizes. Expected: the three buttons are visibly smaller, stay on one line each, do not overlap the throttle slider, and on 375 px the brake/fly/reverse buttons keep their positions from the existing 480 px rules.

- [ ] **Step 3: Commit**

```bash
git add style.css
git commit -m "Shrink the reverse, forward and stop buttons"
```

---

### Task 7: Documents

**Files:**
- Modify: `docs/Space-Oddity-상세기획서.md` (6.1, 12.1, 13 test list, and every "구역" line), `README.md:35-37,92`

- [ ] **Step 1: Design doc 6.1**

Replace the section `### 6.1 자동 속도 구역` (heading through the four alert lines) with:

```markdown
### 6.1 자동 속도

제한 속도는 가장 가까운 천체 표면까지 거리(km)에 1/초를 곱한 값이다. 최저 0.01c(초속 약 3,000km), 최고 100c.

| 표면까지 거리 | 제한 속도 |
|---|---:|
| 3,000km 안 | 0.01c |
| 30,000km | 0.1c |
| 300만km | 10c |
| 3,000만km 밖 | 100c |

- 제한 속도로 곧장 다가가도 표면까지 적어도 1초가 걸린다. 그래서 다가갈수록 저절로 느려지고 멀어질수록 서서히 빨라진다.
- 매 프레임 속도를 그 자리의 제한 이하로 자른다. 예전에는 표면에서 50,000km를 벗어나면 제한이 0.1c에서 100c로 1,000배 뛰어 조종이 어려웠다.
- 화면 아래 "현재 제한"에 그 순간 제한을 보인다(0.12c, 3.4c, 42c).
- 지구에서 토성까지 곧장 가면 약 20 → 30초 걸린다.
```

In 6.2, change "3초 만에 구역 최고 속도에 닿는다" to "제한이 그대로라면 3초 만에 제한 속도에 닿는다(1초마다 그 순간 제한의 1/3씩)" and "구역 최고 속도를 넘지 않게" to "제한 속도를 넘지 않게".

- [ ] **Step 2: Design doc 12.1 and other mentions**

- 12.1 오른쪽: `선택한 천체, 바라보기, 확대 관찰`.
- 12.1 가운데: append `멀리서 위성 이름표가 모행성 이름표와 40px 안에 겹치면 위성 이름표를 숨긴다(선택한 위성은 제외). 선택한 천체 이름표가 맨 위에 온다.`
- 12.1 왼쪽: append `, 그 아래 태양계 미니맵(북쪽에서 내려다본 원형 지도: 태양, 행성 8개와 궤도, 내 위치와 방향. 거리는 제곱근으로 줄임. 행성을 누르면 선택. 지름 170px, 폭 800px 이하에서 120px)`.
- 12.1 아래: `속도(km/s와 c 배수), 현재 제한, 가속 강도 슬라이더, 작은 후진·전진·정지 버튼`.
- Search the doc for `구역`, `zoneChanged`, `도착 예상`, `곧장 가면`, `eta.js`, `zoneUp` and rewrite or delete each hit to match the new rules (sound table: delete the "구역 변경" row; module table: `flight.js` → `제한 속도(거리 비례), 가속·감속, 구와 선분의 첫 교차`; `game.js` row: drop `구역 경계 끊기`; main-loop list item 5: `현재 위치의 제한 속도를 구해 속도를 그 이하로 자른다.`; add `src/core/minimap.js`, `src/ui/minimap.js` rows).

- [ ] **Step 3: README**

Replace the three-row speed table (lines 35-37 and its header) with the four-row table from Step 1, and in line 92 replace `속도 구역` with `제한 속도`, delete `도착 시간 예측, `, and add `미니맵 좌표, 이름표 겹침, ` after `화면 구도 판정, `.

- [ ] **Step 4: Check and commit**

Run: `grep -n "구역\|곧장 가면\|도착 예상\|eta" docs/Space-Oddity-상세기획서.md README.md`
Expected: no hits that describe the old behavior.

```bash
git add docs/Space-Oddity-상세기획서.md README.md
git commit -m "Document the smooth speed limit, minimap and label rule"
```

---

### Task 8: Verify in the browser

- [ ] **Step 1:** `npm test` and `npm run build` pass.
- [ ] **Step 2:** In Chrome (Playwright), load the dev server at 1280x800, select 토성 with its label, press "토성 바라보기", hold W. Every second log `window.oddity.getState()` (`speed`, `limitC`, `restingOn`) and whether the 토성 label is visible (`!hidden`, not covered: its bounding box is not overlapped by a later visible marker). Expected: speed never rises more than limit/3 per second; the 토성 label stays visible; report the time to reach Saturn or what stopped the trip (the straight path can cross the Sun).
- [ ] **Step 3:** Screenshot the minimap at 1280x800 and at 375x812; click a planet dot and confirm the right panel shows that planet.
- [ ] **Step 4:** Update the project memory file with the new state (commits, nothing pushed).
