# Oddity A 단계(토대 정리와 공개 준비) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Codex 시제품(지구·달·태양 비행)을 Vite 프로젝트로 옮기고, 천체 표 기반 계산 모듈과 시험을 갖춘 뒤 GitHub Pages로 배포할 수 있게 만든다.

**Architecture:** `src/core/` 는 Babylon을 모르는 순수 계산 모듈(천체 표, 비행 규칙, 한 프레임 진행 `step`)이며 전부 Vitest로 검사한다. `src/render/` 는 Babylon.js로 천체와 캐릭터를 그리고, `src/ui/` 는 DOM 입력과 HUD를 맡는다. `src/main.js` 가 셋을 잇는다.

**Tech Stack:** Vite 8, Vitest 5, `@babylonjs/core` 9, GitHub Actions + GitHub Pages. Node 22 이상.

**Spec:** `docs/superpowers/specs/2026-09-30-foundation-design.md`

## 시제품 위치

시제품 폴더는 개인 경로라 저장소에 적지 않는다. 이 문서에서는 `$PROTO` 로 부른다. 실행하는 사람은 저장소 관리자에게 경로를 받아 셸 변수로 둔다.

```bash
export PROTO="<시제품 solar-cape 폴더의 절대 경로>"
```

`$PROTO` 의 git 저장소는 다른 계정 소유라 git 명령은 쓰지 않는다. 파일 읽기와 복사만 한다.

## Global Constraints

- 모든 천체의 반지름은 실제 값, 장면 1단위 = 1,000km.
- 압축 중심 거리 = 두 반지름 합 + (원래 중심 거리 − 두 반지름 합) / 100.
- 속도 구역: 표면까지 0 → 500km는 0.1c, 500 → 50,000km는 1c, 50,000km 초과는 100c. c = 299,792.458km/s.
- 최대 가속 강도에서 현재 구역 최고 속도까지 3초. 입력을 놓으면 그때 속도에서 1초 동안 선형 감속해 정지.
- 알림 문구(원 기획서 6.3, 7장 그대로):
  - `근처에 별이 없어서, 광속의 100배까지 속도를 올립니다.`
  - `별 근처에서는 안전을 위해서 속도를 광속으로 낮춥니다.`
  - `별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/10로 낮춥니다.`
  - `천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.`
- 시작: 지구 표면에서 9,129km, 지구→플레이어와 지구→태양 사이 90도.
- Vite `base` 는 `/oddity_claude/`.
- 커밋 작성자 주소는 `13573570+destory1984@users.noreply.github.com` 만. 개인 경로·지메일·비밀값을 저장소에 넣지 않는다.
- push와 외부 파일 내려받기는 사용자에게 먼저 묻는다.
- 코드는 풀어 쓴다(한 줄 몰아쓰기 금지). 저장소 문서는 쉬운 말 "~다" 체, 틸드(~) 금지, 범위와 변화는 → 로 쓴다.

## 설계서와 달라진 점 (실행 전 사용자에게 보고함)

1. **속도 구역 앞보기 방식.** 설계서 6장 1번은 "현재 위치와 이동 선분 중 더 엄격한 구역을 적용"이라 했다. 그런데 이 방식은 속도가 낮아진 다음 프레임에 선분이 짧아져 다시 100c 구역으로 판단하고, 100c ↔ 0.1c를 오가며 알림이 반복된다. 대신 **구역은 현재 위치로만 정하고, 한 프레임의 이동이 더 엄격한 구역의 경계(표면 + 50,000km 또는 + 500km)를 넘으면 그 경계에서 이동을 끊고 속도를 새 제한으로 즉시 낮춘다.** 원 기획서 6.1장의 목적(한 프레임에 안전 구역을 건너뛰지 않음)은 그대로 지킨다. 이에 따라 시제품의 `nearestSurfaceAlongPath` 는 없앤다.
2. **1c 구역으로 올라갈 때의 문구.** 0.1c 구역에서 벗어나 1c 구역으로 들어갈 때 "낮춥니다"는 사실과 반대다. 이 경우에만 `별 표면에서 멀어져서, 속도를 광속까지 올립니다.` 를 쓴다.

## Review Focus

1. 표면에 닿은 채로 안쪽을 향해 W를 계속 누를 때: 도착 알림이 매 프레임 새로 뜨지 않고, 위치가 떨리지 않아야 한다. → Task 4 시험 `resting on a surface`.
2. 구역 경계(표면 + 50,000km)에 정확히 서 있을 때: 부동소수 오차로 구역 알림이 매 프레임 바뀌지 않아야 한다. → Task 4 시험 `boundary rest`.
3. 1c로 천체를 향해 가다가 S를 누를 때: 감속 중에도 표면을 뚫지 않고, 멈춘 뒤 뒤로 간다. → Task 4 시험 `reverse near a body`.
4. 탭을 옮기거나 0.5초 넘게 프레임이 멈췄다가 돌아올 때: 순간이동 없이 일시 정지 상태여야 한다. → Task 8 브라우저 검사 5.
5. 속도 슬라이더나 도움말 창에 포커스가 있을 때 방향키·W가 먹히지 않거나, 창을 벗어난 뒤 키가 눌린 채로 남는 문제. → Task 8 브라우저 검사 6.

---

## 파일 구조

```text
package.json, vite.config.js, index.html, style.css
.github/workflows/pages.yml
public/assets/            earth-day.jpg, earth-night.jpg, earth-clouds.jpg
src/main.js
src/core/                 bodies.js flight.js game.js orientation.js controls.js pose.js
src/render/               world.js planets.js sun.js stars.js hero.js math.js
src/render/shaders/       body.vert planet.frag lunar.frag clouds.frag air.frag sun.frag cape.frag
src/ui/                   input.js hud.js photo.js toast.js messages.js
tests/                    bodies.test.js flight.test.js game.test.js orientation.test.js
                          controls.test.js pose.test.js messages.test.js
README.md, THIRD-PARTY.md
```

---

### Task 1: Vite·Vitest 골격과 순수 모듈 이전

**Files:**
- Create: `package.json`, `vite.config.js`, `src/core/orientation.js`, `src/core/controls.js`, `src/core/pose.js`
- Create: `tests/orientation.test.js`, `tests/controls.test.js`, `tests/pose.test.js`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `rotateLocal(q, yaw, pitch, roll=0) → q`, `forward(q) → [x,y,z]`, `lookAtDirection(d) → q`, `multiply(a,b) → q` (orientation.js). `controlIntent(keys:Set, stickActive, flyingButton, reversingButton=false) → {turnX, turnY, drive}`, `rangeKeepsKey(code) → boolean` (controls.js). `blendFlight`, `hoverFlightPose`, `armPose` (pose.js). 쿼터니언은 `[x, y, z, w]` 배열.

- [ ] **Step 1: 저장소 설정 확인**

```bash
git config user.email
```
Expected: `13573570+destory1984@users.noreply.github.com`. 다르면 멈추고 보고한다.

- [ ] **Step 2: package.json 작성**

```json
{
  "name": "oddity",
  "version": "0.2.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

- [ ] **Step 3: 의존성 설치**

```bash
npm install @babylonjs/core@^9.28.0
npm install -D vite@^8.3.1 vitest@^5.0.2
```
Expected: `package-lock.json` 생성, 오류 없음.

- [ ] **Step 4: vite.config.js 작성**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/oddity_claude/',
  test: {
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 5: 시제품 시험을 Vitest로 옮긴다**

`$PROTO/tests/orientation.test.mjs`, `controls.test.mjs`, `pose.test.mjs` 를 각각 `tests/orientation.test.js`, `tests/controls.test.js`, `tests/pose.test.js` 로 복사하고 다음만 바꾼다.

- 첫 두 줄 `import test from 'node:test'; import assert from 'node:assert/strict';` 를 아래로 바꾼다.

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
```
- import 경로 `'../src/orientation.js'` → `'../src/core/orientation.js'` (controls, pose도 같은 방식).
- 몰아 쓴 줄은 문장마다 줄을 나눈다. 검사 내용은 바꾸지 않는다.

- [ ] **Step 6: 시험이 실패하는지 확인**

Run: `npx vitest run`
Expected: FAIL — `Failed to load url ../src/core/orientation.js`.

- [ ] **Step 7: 순수 모듈을 옮긴다**

`$PROTO/src/orientation.js`, `controls.js`, `pose.js` 를 `src/core/` 로 복사하고 들여쓰기를 2칸으로 풀어 쓴다. 동작은 바꾸지 않는다. `pose.js` 의 elbow 주석 두 줄은 그대로 둔다.

- [ ] **Step 8: 시험 통과 확인**

Run: `npx vitest run`
Expected: 12 tests passed (orientation 4, controls 4, pose 4).

- [ ] **Step 9: .gitignore 보강**

기존 내용 끝에 아래 두 줄이 없으면 더한다.

```text
coverage/
*.local
```

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json vite.config.js .gitignore src/core tests
git commit -m "Set up Vite and Vitest; port orientation, controls and pose modules"
```

---

### Task 2: 천체 표 `core/bodies.js`

**Files:**
- Create: `src/core/bodies.js`
- Test: `tests/bodies.test.js`

**Interfaces:**
- Produces:
  - `DISTANCE_COMPRESSION = 100`, `KM_PER_UNIT = 1000`, `START_ALTITUDE_KM = 9129`
  - `BODY_DATA` — 원본 표. `BODIES` — 배치가 끝난 천체 배열, 각 원소 `{ id, name, nameEn, kind: 'star'|'planet'|'moon', radiusKm, parent: string|null, position: [x,y,z] }` (km, 태양 원점)
  - `compressedCenterDistance(originalKm, radiusA, radiusB) → number`
  - `placeBodies(data) → Body[]`
  - `bodyById(id, bodies = BODIES) → Body | undefined`
  - `START_POSITION → [x,y,z]`
  - `surfaceDistance(position, body) → number` (0 이상)
  - `nearestSurface(position, bodies = BODIES) → { body: Body|null, distance: number }` (빈 배열이면 `{ body: null, distance: Infinity }`)
  - `nearestLocalBody(position, bodies = BODIES) → { body, altitude, label }` (`kind` 가 planet 또는 moon 인 것 중 가장 가까운 것, label 은 `"<name> 상공"`)
  - `apparentAngularRadius(radius, distance) → radians`

- [ ] **Step 1: 실패하는 시험 작성**

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  BODIES, BODY_DATA, KM_PER_UNIT, START_POSITION, START_ALTITUDE_KM,
  compressedCenterDistance, placeBodies, bodyById, surfaceDistance,
  nearestSurface, nearestLocalBody, apparentAngularRadius,
} from '../src/core/bodies.js';

const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('the table holds the Sun, Earth and Moon at real radii', () => {
  assert.deepEqual(BODIES.map((b) => b.id), ['sun', 'earth', 'moon']);
  assert.equal(bodyById('sun').radiusKm / KM_PER_UNIT, 696.34);
  assert.equal(bodyById('earth').radiusKm, 6371);
  assert.equal(bodyById('moon').radiusKm, 1737.4);
  assert.deepEqual(bodyById('sun').position, [0, 0, 0]);
});

test('every child sits at the compressed distance from its parent', () => {
  for (const item of BODY_DATA.filter((d) => d.parent)) {
    const body = bodyById(item.id);
    const parent = bodyById(item.parent);
    const centerDistance = Math.hypot(...sub(body.position, parent.position));
    const radii = body.radiusKm + parent.radiusKm;
    assert.ok(centerDistance > radii);
    near(centerDistance - radii, (item.orbitKm - radii) / 100);
  }
  near(Math.hypot(...sub(bodyById('moon').position, bodyById('earth').position)), 11871.316);
});

test('compressedCenterDistance keeps radii and divides the gap by 100', () => {
  assert.equal(compressedCenterDistance(1100, 50, 50), 100 + 10);
});

test('placeBodies rejects a child listed before its parent', () => {
  assert.throws(() => placeBodies([
    { id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1, parent: 'earth', orbitKm: 10, direction: [1, 0, 0] },
  ]), /parent earth/);
});

test('the start is 9,129 km above Earth with the Sun at a right angle', () => {
  const earth = bodyById('earth');
  near(surfaceDistance(START_POSITION, earth), START_ALTITUDE_KM);
  const toPlayer = sub(START_POSITION, earth.position);
  const toSun = sub(bodyById('sun').position, earth.position);
  near(dot(toPlayer, toSun) / (Math.hypot(...toPlayer) * Math.hypot(...toSun)), 0, 1e-12);
});

test('nearestSurface picks the closest surface and handles an empty list', () => {
  const moon = bodyById('moon');
  const point = [moon.position[0] + moon.radiusKm + 200, moon.position[1], moon.position[2]];
  const result = nearestSurface(point);
  assert.equal(result.body.id, 'moon');
  near(result.distance, 200);
  assert.deepEqual(nearestSurface(point, []), { body: null, distance: Infinity });
});

test('altitude label follows the nearest planet or moon, never the Sun', () => {
  const start = nearestLocalBody(START_POSITION);
  assert.equal(start.body.id, 'earth');
  assert.equal(start.label, '지구 상공');
  near(start.altitude, 9129);

  const moon = bodyById('moon');
  const nearMoon = [moon.position[0], moon.position[1], moon.position[2] + 2000];
  const result = nearestLocalBody(nearMoon);
  assert.equal(result.label, '달 상공');
  near(result.altitude, 262.6);

  const sun = bodyById('sun');
  const nearSun = [sun.position[0], sun.position[1] + sun.radiusKm + 10, sun.position[2]];
  assert.notEqual(nearestLocalBody(nearSun).body.id, 'sun');
});

test('a body grows in view as the traveler approaches it', () => {
  const far = apparentAngularRadius(696340, 2e6);
  const half = apparentAngularRadius(696340, 1e6);
  assert.ok(half > far * 1.99);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/bodies.test.js`
Expected: FAIL — `Failed to load url ../src/core/bodies.js`.

- [ ] **Step 3: 구현**

지구 방향 `[-1, -0.12, 0]` 은 시제품의 "지구에서 본 태양 방향 `[1, 0.12, 0]`" 을 뒤집은 것이다. 달 방향 `[0.83, 0.22, -0.512]` 는 시제품 값이다. 시작 위치는 지구 중심에서 −z 쪽이므로 태양 방향(z 성분 0)과 90도가 된다.

```js
export const DISTANCE_COMPRESSION = 100;
export const KM_PER_UNIT = 1000;
export const START_ALTITUDE_KM = 9129;

const AU_KM = 149597870.7;

// Parents must be listed before their children.
export const BODY_DATA = [
  { id: 'sun', name: '태양', nameEn: 'Sun', kind: 'star', radiusKm: 696340, parent: null },
  {
    id: 'earth', name: '지구', nameEn: 'Earth', kind: 'planet', radiusKm: 6371,
    parent: 'sun', orbitKm: AU_KM, direction: [-1, -0.12, 0],
  },
  {
    id: 'moon', name: '달', nameEn: 'Moon', kind: 'moon', radiusKm: 1737.4,
    parent: 'earth', orbitKm: 384400, direction: [0.83, 0.22, -0.512],
  },
];

const sub = (a, b) => a.map((n, i) => n - b[i]);

function normalize(v) {
  const length = Math.hypot(...v);
  return v.map((n) => n / length);
}

export function compressedCenterDistance(originalKm, radiusA, radiusB) {
  const radii = radiusA + radiusB;
  return radii + (originalKm - radii) / DISTANCE_COMPRESSION;
}

export function placeBodies(data) {
  const placed = new Map();
  for (const item of data) {
    let position = [0, 0, 0];
    if (item.parent) {
      const parent = placed.get(item.parent);
      if (!parent) throw new Error(`parent ${item.parent} must come before ${item.id}`);
      const distance = compressedCenterDistance(item.orbitKm, parent.radiusKm, item.radiusKm);
      position = normalize(item.direction).map((n, i) => parent.position[i] + n * distance);
    }
    const { id, name, nameEn, kind, radiusKm, parent = null } = item;
    placed.set(id, Object.freeze({ id, name, nameEn, kind, radiusKm, parent, position: Object.freeze(position) }));
  }
  return Object.freeze([...placed.values()]);
}

export const BODIES = placeBodies(BODY_DATA);

export function bodyById(id, bodies = BODIES) {
  return bodies.find((body) => body.id === id);
}

export const START_POSITION = (() => {
  const earth = bodyById('earth');
  return [earth.position[0], earth.position[1], earth.position[2] - earth.radiusKm - START_ALTITUDE_KM];
})();

export function surfaceDistance(position, body) {
  return Math.max(0, Math.hypot(...sub(position, body.position)) - body.radiusKm);
}

export function nearestSurface(position, bodies = BODIES) {
  let best = { body: null, distance: Infinity };
  for (const body of bodies) {
    const distance = surfaceDistance(position, body);
    if (distance < best.distance) best = { body, distance };
  }
  return best;
}

export function nearestLocalBody(position, bodies = BODIES) {
  const local = bodies.filter((body) => body.kind === 'planet' || body.kind === 'moon');
  const { body, distance } = nearestSurface(position, local);
  return { body, altitude: distance, label: `${body.name} 상공` };
}

export function apparentAngularRadius(radius, distance) {
  return Math.asin(Math.min(1, radius / distance));
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/bodies.test.js`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/bodies.js tests/bodies.test.js
git commit -m "Add data-driven body table with compressed placement"
```

---

### Task 3: 비행 규칙 `core/flight.js`

**Files:**
- Create: `src/core/flight.js`
- Test: `tests/flight.test.js`

**Interfaces:**
- Consumes: 없음 (Body 형태 `{ id, radiusKm, position }` 만 가정).
- Produces:
  - `C = 299792.458`, `ZONES = { veryNear, near, far }` 각 `{ id, maxSpeed, label, margin }`. `margin` 은 그 구역의 바깥 경계까지의 표면 거리(veryNear 500, near 50000, far Infinity).
  - `speedZone(surfaceDistance) → Zone`
  - `stricterZoneBelow(zone) → Zone | null` (far → near, near → veryNear, veryNear → null)
  - `accelerateSpeed(current, strength, dt, maxSpeed) → number`
  - `brakeSpeed(current, rate, dt) → number`
  - `sweepSphere(start, direction, length, center, radius) → number | null` (direction 은 단위 벡터, 반환은 선분 위 거리 t)
  - `firstSphereHit(start, direction, length, bodies, margin = 0) → { body, t, position } | null` (각 천체의 반지름 + margin 구와 첫 교차)

- [ ] **Step 1: 실패하는 시험 작성**

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import {
  C, ZONES, speedZone, stricterZoneBelow, accelerateSpeed, brakeSpeed,
  sweepSphere, firstSphereHit,
} from '../src/core/flight.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test('zones switch exactly at 500 km and 50,000 km', () => {
  assert.equal(speedZone(0).id, 'veryNear');
  assert.equal(speedZone(500).id, 'veryNear');
  assert.equal(speedZone(500.001).id, 'near');
  assert.equal(speedZone(50000).id, 'near');
  assert.equal(speedZone(50000.001).id, 'far');
  assert.equal(speedZone(Infinity).id, 'far');
  assert.equal(ZONES.veryNear.maxSpeed, C * 0.1);
  assert.equal(ZONES.near.maxSpeed, C);
  assert.equal(ZONES.far.maxSpeed, C * 100);
  assert.deepEqual([ZONES.far.label, ZONES.near.label, ZONES.veryNear.label], ['100c', '1c', '0.1c']);
});

test('stricterZoneBelow walks toward the surface', () => {
  assert.equal(stricterZoneBelow(ZONES.far), ZONES.near);
  assert.equal(stricterZoneBelow(ZONES.near), ZONES.veryNear);
  assert.equal(stricterZoneBelow(ZONES.veryNear), null);
});

test('full acceleration reaches each zone limit in three seconds and never exceeds it', () => {
  for (const zone of Object.values(ZONES)) {
    assert.equal(accelerateSpeed(0, 1, 3, zone.maxSpeed), zone.maxSpeed);
    assert.ok(accelerateSpeed(0, 1, 2.9, zone.maxSpeed) < zone.maxSpeed);
    assert.equal(accelerateSpeed(zone.maxSpeed, 1, 3, zone.maxSpeed), zone.maxSpeed);
  }
});

test('braking at the release speed stops in one second at any frame rate', () => {
  assert.equal(brakeSpeed(C * 20, C * 20, 0.5), C * 10);
  assert.equal(brakeSpeed(C * 20, C * 20, 1), 0);
  let speed = C * 100;
  for (let i = 0; i < 60; i++) speed = brakeSpeed(speed, C * 100, 1 / 60);
  assert.ok(speed < 1e-6);
});

test('sweepSphere catches a full crossing in one step', () => {
  const t = sweepSphere([0, 0, -20000], [0, 0, 1], C, [0, 0, 0], 6371);
  near(t, 20000 - 6371);
});

test('sweepSphere ignores spheres behind, beside, or out of reach', () => {
  assert.equal(sweepSphere([0, 0, -20000], [0, 0, -1], C, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere([10000, 0, -20000], [0, 0, 1], C, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere([0, 0, -20000], [0, 0, 1], 100, [0, 0, 0], 6371), null);
});

test('sweepSphere lets a traveler on the surface leave but not sink', () => {
  const onSurface = [0, 0, -6371];
  assert.equal(sweepSphere(onSurface, [0, 0, -1], 1000, [0, 0, 0], 6371), null);
  assert.equal(sweepSphere(onSurface, [0, 0, 1], 1000, [0, 0, 0], 6371), 0);
});

test('firstSphereHit picks the first surface along a path crossing several bodies', () => {
  const bodies = [
    { id: 'far', radiusKm: 1000, position: [0, 0, 50000] },
    { id: 'close', radiusKm: 1000, position: [0, 0, 10000] },
  ];
  const hit = firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, bodies);
  assert.equal(hit.body.id, 'close');
  near(hit.t, 9000);
  near(hit.position[2], 9000);
});

test('firstSphereHit with a margin finds the zone shell', () => {
  const bodies = [{ id: 'b', radiusKm: 1000, position: [0, 0, 100000] }];
  const hit = firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, bodies, 50000);
  near(hit.t, 100000 - 51000);
  assert.equal(firstSphereHit([0, 0, 0], [0, 0, 1], 1e6, []), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/flight.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```js
export const C = 299792.458;

export const ZONES = Object.freeze({
  veryNear: Object.freeze({ id: 'veryNear', maxSpeed: C * 0.1, label: '0.1c', margin: 500 }),
  near: Object.freeze({ id: 'near', maxSpeed: C, label: '1c', margin: 50000 }),
  far: Object.freeze({ id: 'far', maxSpeed: C * 100, label: '100c', margin: Infinity }),
});

const ACCELERATION_SECONDS = 3;

export function speedZone(surfaceDistance) {
  if (surfaceDistance <= ZONES.veryNear.margin) return ZONES.veryNear;
  if (surfaceDistance <= ZONES.near.margin) return ZONES.near;
  return ZONES.far;
}

export function stricterZoneBelow(zone) {
  if (zone.id === 'far') return ZONES.near;
  if (zone.id === 'near') return ZONES.veryNear;
  return null;
}

export function accelerateSpeed(current, strength, dt, maxSpeed) {
  const clampedStrength = Math.max(0, Math.min(1, strength));
  const next = Math.max(0, current) + (maxSpeed / ACCELERATION_SECONDS) * clampedStrength * Math.max(0, dt);
  return Math.min(maxSpeed, next);
}

export function brakeSpeed(current, rate, dt) {
  const next = Math.max(0, current) - Math.max(0, rate) * Math.max(0, dt);
  return next < 0.01 ? 0 : next;
}

// Distance t along the unit direction where the segment first meets the sphere,
// or null. A traveler on (or numerically inside) the sphere moving inward hits at t = 0.
export function sweepSphere(start, direction, length, center, radius) {
  const relative = start.map((n, i) => n - center[i]);
  const b = relative.reduce((sum, n, i) => sum + n * direction[i], 0);
  if (b >= 0) return null;
  const q = relative.reduce((sum, n) => sum + n * n, 0) - radius * radius;
  if (q <= 0) return 0;
  const discriminant = b * b - q;
  if (discriminant < 0) return null;
  const t = -b - Math.sqrt(discriminant);
  return t <= length ? t : null;
}

export function firstSphereHit(start, direction, length, bodies, margin = 0) {
  let best = null;
  for (const body of bodies) {
    const t = sweepSphere(start, direction, length, body.position, body.radiusKm + margin);
    if (t !== null && (best === null || t < best.t)) best = { body, t };
  }
  if (!best) return null;
  return { ...best, position: start.map((n, i) => n + direction[i] * best.t) };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/flight.test.js`
Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add src/core/flight.js tests/flight.test.js
git commit -m "Add flight rules: speed zones, acceleration, braking, swept sphere hits"
```

---

### Task 4: 한 프레임 진행 `core/game.js`

**Files:**
- Create: `src/core/game.js`
- Test: `tests/game.test.js`

**Interfaces:**
- Consumes: `rotateLocal`, `forward` (Task 1), `BODIES`, `nearestSurface` (Task 2), `speedZone`, `stricterZoneBelow`, `accelerateSpeed`, `brakeSpeed`, `firstSphereHit`, `ZONES` (Task 3).
- Produces:
  - `TURN_RATE = 0.7`, `ROLL_RATE = 0.9` (rad/s)
  - `createState(position, orientation = [0,0,0,1], bodies = BODIES) → State`
  - State: `{ position, orientation, speed, motionSign: 1|-1, brakeRate, zoneId, restingOn: string|null }`
  - `stopNow(state) → State` (속도 0)
  - `step(state, input, dt, bodies = BODIES) → { state, events }`
  - input: `{ turnX, turnY, roll, drive: -1|0|1, throttle: 0..1 }` (모두 생략 가능, 기본 0, throttle 기본 1)
  - events: `{ type: 'zoneChanged', from, to }`, `{ type: 'surfaceReached', bodyId }`

**동작 규칙:**
1. `dt <= 0` 이면 상태를 그대로 돌려준다.
2. 방향 회전: `rotateLocal(orientation, turnX*TURN_RATE*dt, turnY*TURN_RATE*dt, roll*ROLL_RATE*dt)`.
3. 구역은 현재 위치의 가장 가까운 표면 거리로 정한다. 이전과 다르면 `zoneChanged`. 속도를 그 구역 최고 속도 이하로 자른다.
4. 가속·감속·반대 방향 처리는 시제품과 같다.
5. 이동 길이 `speed*dt` 가 0보다 크면: 더 엄격한 구역이 있으면 `firstSphereHit(..., margin = 현재 구역보다 한 단계 엄격한 구역의 margin)` 으로 경계 진입을 찾는다. 진입하면 경계 안쪽 0.001km 지점에서 이동을 끊고, 구역을 바꾸고(`zoneChanged`), 속도를 새 최고 속도 이하로 자른다. 경계 진입이 없으면 `firstSphereHit(..., 0)` 으로 표면 충돌을 본다. 충돌하면 그 점에서 속도 0, `restingOn` 을 그 천체로 두고, 이미 같은 천체에 머물던 중이 아니면 `surfaceReached` 를 낸다.
6. 이동이 표면 충돌 없이 끝나면 `restingOn = null`.

- [ ] **Step 1: 실패하는 시험 작성**

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createState, step, stopNow } from '../src/core/game.js';
import { C, ZONES, speedZone } from '../src/core/flight.js';
import { lookAtDirection } from '../src/core/orientation.js';
import { BODIES, START_POSITION, bodyById, nearestSurface } from '../src/core/bodies.js';

const DT = 1 / 60;
const ball = { id: 'ball', name: '공', kind: 'planet', radiusKm: 1000, position: [0, 0, 0] };
const facingBall = lookAtDirection([0, 0, 1]);
const awayFromBall = lookAtDirection([0, 0, -1]);

function run(state, input, steps, bodies) {
  const events = [];
  for (let i = 0; i < steps; i++) {
    const result = step(state, input, DT, bodies);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}

test('createState starts at rest in the zone of its position', () => {
  const state = createState(START_POSITION);
  assert.equal(state.speed, 0);
  assert.equal(state.zoneId, 'near');
  assert.equal(state.restingOn, null);
});

test('zero or negative dt changes nothing', () => {
  const state = createState(START_POSITION);
  assert.deepEqual(step(state, { drive: 1 }, 0).state, state);
  assert.deepEqual(step(state, { drive: 1 }, -1).state, state);
});

test('full throttle reaches 100c in three seconds in empty space', () => {
  const state = createState([0, 0, 0], [0, 0, 0, 1], []);
  const after = run(state, { drive: 1 }, 180, []).state;
  assert.ok(Math.abs(after.speed - C * 100) < 1e-3);
  assert.ok(run(state, { drive: 1 }, 170, []).state.speed < C * 100);
});

test('releasing input stops within one second from any speed', () => {
  for (const speed of [C * 0.1, C, C * 100]) {
    const state = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed };
    const after = run(state, { drive: 0 }, 61, []).state;
    assert.equal(after.speed, 0);
  }
});

test('stopNow halts at once', () => {
  const moving = { ...createState([0, 0, 0], [0, 0, 0, 1], []), speed: C, brakeRate: C };
  assert.equal(stopNow(moving).speed, 0);
  assert.equal(stopNow(moving).brakeRate, 0);
});

test('a 100c dive stops on the surface, never inside, announcing each zone once', () => {
  let state = { ...createState([0, 0, -1e7], facingBall, [ball]), speed: C * 100 };
  const events = [];
  for (let i = 0; i < 5000 && state.restingOn === null; i++) {
    const result = step(state, { drive: 1 }, DT, [ball]);
    state = result.state;
    events.push(...result.events);
    const distance = Math.hypot(...state.position);
    assert.ok(distance >= ball.radiusKm - 1e-6, 'went inside the body');
    const zone = speedZone(distance - ball.radiusKm);
    assert.ok(state.speed <= zone.maxSpeed + 1e-6, 'faster than the zone allows');
  }
  assert.equal(state.restingOn, 'ball');
  assert.equal(state.speed, 0);
  assert.deepEqual(events, [
    { type: 'zoneChanged', from: 'far', to: 'near' },
    { type: 'zoneChanged', from: 'near', to: 'veryNear' },
    { type: 'surfaceReached', bodyId: 'ball' },
  ]);
});

test('resting on a surface while pushing inward stays put without repeating the arrival', () => {
  let state = { ...createState([0, 0, -1000], facingBall, [ball]) };
  const { state: after, events } = run(state, { drive: 1 }, 120, [ball]);
  assert.deepEqual(events, [{ type: 'surfaceReached', bodyId: 'ball' }]);
  assert.ok(Math.abs(Math.hypot(...after.position) - 1000) < 1e-6);
});

test('idle on a surface produces no events', () => {
  const state = createState([0, 0, -1000], facingBall, [ball]);
  assert.deepEqual(run(state, {}, 120, [ball]).events, []);
});

test('a traveler on the surface can leave outward at once, announcing each zone once', () => {
  const state = createState([0, 0, -1000], awayFromBall, [ball]);
  const { state: after, events } = run(state, { drive: 1 }, 600, [ball]);
  assert.ok(Math.hypot(...after.position) > 1000 + 50000);
  assert.deepEqual(events, [
    { type: 'zoneChanged', from: 'veryNear', to: 'near' },
    { type: 'zoneChanged', from: 'near', to: 'far' },
  ]);
});

test('boundary rest: sitting exactly on the 50,000 km shell emits no events', () => {
  const state = createState([0, 0, -(1000 + 50000)], awayFromBall, [ball]);
  assert.deepEqual(run(state, {}, 120, [ball]).events, []);
});

test('reverse near a body: S while diving at 1c brakes, never enters, then backs away', () => {
  let state = { ...createState([0, 0, -(1000 + 40000)], facingBall, [ball]), speed: C };
  const { state: after } = run(state, { drive: -1 }, 180, [ball]);
  assert.ok(Math.hypot(...after.position) >= 1000 - 1e-6);
  assert.equal(after.motionSign, -1);
  assert.ok(after.speed > 0);
});

test('the real table: diving from the start at Earth lands on Earth', () => {
  let state = createState(START_POSITION);
  const { state: after, events } = run(state, { drive: 1 }, 600, BODIES);
  assert.equal(after.restingOn, 'earth');
  assert.ok(Math.abs(nearestSurface(after.position).distance) < 1e-6);
  assert.ok(events.some((e) => e.type === 'surfaceReached' && e.bodyId === 'earth'));
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/game.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```js
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/game.test.js`
Expected: 12 passed. 실패하면 시험을 고치지 말고 원인을 찾는다. 특히 `boundary rest` 와 `resting on a surface` 는 Review Focus 항목이다.

- [ ] **Step 5: 전체 시험**

Run: `npm test`
Expected: 41 passed (Task 1: 12, Task 2: 8, Task 3: 9, Task 4: 12).

- [ ] **Step 6: Commit**

```bash
git add src/core/game.js tests/game.test.js
git commit -m "Add pure frame step with zone shells and surface stops"
```

---

### Task 5: 알림 문구와 조사 `ui/messages.js`

**Files:**
- Create: `src/ui/messages.js`
- Test: `tests/messages.test.js`

**Interfaces:**
- Produces:
  - `objectParticle(word) → '을' | '를'` (받침 있으면 을)
  - `eventMessage(event) → string | null`

- [ ] **Step 1: 실패하는 시험 작성**

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { objectParticle, eventMessage } from '../src/ui/messages.js';

test('object particle follows the final consonant', () => {
  assert.equal(objectParticle('달'), '을');
  assert.equal(objectParticle('태양'), '을');
  assert.equal(objectParticle('지구'), '를');
  assert.equal(objectParticle('Moon'), '을');
});

test('zone messages match the spec wording', () => {
  const msg = (from, to) => eventMessage({ type: 'zoneChanged', from, to });
  assert.equal(msg('near', 'far'), '근처에 별이 없어서, 광속의 100배까지 속도를 올립니다.');
  assert.equal(msg('far', 'near'), '별 근처에서는 안전을 위해서 속도를 광속으로 낮춥니다.');
  assert.equal(msg('near', 'veryNear'), '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/10로 낮춥니다.');
  assert.equal(msg('veryNear', 'near'), '별 표면에서 멀어져서, 속도를 광속까지 올립니다.');
});

test('surface arrival message', () => {
  assert.equal(
    eventMessage({ type: 'surfaceReached', bodyId: 'earth' }),
    '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.',
  );
  assert.equal(eventMessage({ type: 'unknown' }), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run tests/messages.test.js`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

```js
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

export function objectParticle(word) {
  const code = word.charCodeAt(word.length - 1);
  if (code < HANGUL_START || code > HANGUL_END) return '을';
  return (code - HANGUL_START) % 28 === 0 ? '를' : '을';
}

export function eventMessage(event) {
  if (event.type === 'surfaceReached') {
    return '천체 표면에 도착했습니다. 내부로는 들어갈 수 없습니다.';
  }
  if (event.type !== 'zoneChanged') return null;
  if (event.to === 'far') return '근처에 별이 없어서, 광속의 100배까지 속도를 올립니다.';
  if (event.to === 'veryNear') return '별 표면에 아주 가까워서, 안전을 위해 속도를 광속의 1/10로 낮춥니다.';
  if (event.from === 'veryNear') return '별 표면에서 멀어져서, 속도를 광속까지 올립니다.';
  return '별 근처에서는 안전을 위해서 속도를 광속으로 낮춥니다.';
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run tests/messages.test.js`
Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/ui/messages.js tests/messages.test.js
git commit -m "Add zone and arrival messages with Korean object particle"
```

---

### Task 6: NASA 지구 텍스처와 출처 문서

**Files:**
- Create: `public/assets/earth-day.jpg`, `public/assets/earth-night.jpg`, `public/assets/earth-clouds.jpg`, `THIRD-PARTY.md`

- [ ] **Step 1: 후보 주소 확인 (내려받지 않음)**

아래 NASA Visible Earth 파일의 존재와 크기를 HEAD 요청으로만 확인한다.

```bash
for url in \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74117/world.200407.3x5400x2700.jpg" \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg" \
  "https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57747/cloud_combined_2048.jpg"; do
  curl -sIL "$url" | grep -iE "^(HTTP|content-length|content-type)"
done
```
Expected: 각각 `200`, `image/jpeg`. 404면 NASA Visible Earth 검색 페이지(`https://visibleearth.nasa.gov/`)에서 Blue Marble(2004년 7월, 5400px 안팎), Black Marble 2016(0.1도 해상도), 구름 합성 지도의 현재 주소를 찾는다.

- [ ] **Step 2: 사용자에게 허락 받기**

파일 이름, 주소, 크기를 표로 보이고 내려받아도 되는지 묻는다. 허락 없이 다음 단계로 가지 않는다.

- [ ] **Step 3: 내려받아 줄이기**

작업 폴더 밖(세션 임시 폴더)에 받은 뒤, 가로 4096px 이하 JPEG 품질 85로 줄여 `public/assets/` 에 둔다. Windows에서는 PowerShell의 `System.Drawing` 으로 줄인다(외부 도구 설치 없음).

```powershell
Add-Type -AssemblyName System.Drawing
function Resize-Jpeg($src, $dst, $maxWidth) {
  $img = [System.Drawing.Image]::FromFile($src)
  $w = [Math]::Min($maxWidth, $img.Width); $h = [int]($img.Height * $w / $img.Width)
  $bmp = New-Object System.Drawing.Bitmap $w, $h
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($img, 0, 0, $w, $h)
  $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
  $params = New-Object System.Drawing.Imaging.EncoderParameters 1
  $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 85L
  $bmp.Save($dst, $codec, $params); $g.Dispose(); $bmp.Dispose(); $img.Dispose()
}
```
각 파일에 `Resize-Jpeg <받은 파일> public/assets/earth-day.jpg 4096` 처럼 부른다. 구름 지도는 원본 폭(2048)을 그대로 둔다.

- [ ] **Step 4: THIRD-PARTY.md 작성**

```markdown
# 외부 자료 출처

| 파일 | 출처 | 조건 |
|---|---|---|
| `public/assets/earth-day.jpg` | NASA Visible Earth, Blue Marble (2004년 7월). <실제 주소> | 미국 정부 저작물, 저작권 없음 |
| `public/assets/earth-night.jpg` | NASA Visible Earth, Black Marble 2016. <실제 주소> | 미국 정부 저작물, 저작권 없음 |
| `public/assets/earth-clouds.jpg` | NASA Visible Earth, 구름 합성 지도. <실제 주소> | 미국 정부 저작물, 저작권 없음 |
| `@babylonjs/core` (npm) | https://github.com/BabylonJS/Babylon.js | Apache-2.0 |

NASA 이미지는 NASA가 제품을 보증한다는 뜻으로 쓰지 않는다. 캐릭터, 망토, 셰이더와 게임 코드는 이 저장소에서 직접 만든 것이다.
```
`<실제 주소>` 는 Step 1에서 확인한 주소로 바꿔 쓴다(내려받은 실제 주소).

- [ ] **Step 5: Commit**

```bash
git add public/assets THIRD-PARTY.md
git commit -m "Add NASA public-domain Earth textures and attribution"
```

---

### Task 7: 그리기 층 `src/render/`

**Files:**
- Create: `src/render/math.js`, `src/render/shaders/*.vert|*.frag`, `src/render/planets.js`, `src/render/sun.js`, `src/render/stars.js`, `src/render/hero.js`, `src/render/world.js`

**Interfaces:**
- Consumes: `BODIES`, `KM_PER_UNIT`, `apparentAngularRadius`, `bodyById` (Task 2), `multiply` (Task 1), `blendFlight`, `hoverFlightPose`, `armPose` (Task 1).
- Produces: `createWorld(canvas, bodies = BODIES) → Promise<World>`
  - `World.update({ position, orientation, dt, speed, photoOrientation, heroVisible, turn }) → View`
  - View: `{ directions: { [bodyId]: [x,y,z] 단위 벡터 }, distances: { [bodyId]: km 중심 거리 }, sunVisibility: 0..1, camera: { forward, right, up, fov } }` (모두 평범한 배열/숫자, Babylon 객체 아님)
  - `World.render()`, `World.resize()`, `World.setFov(radians)`, `World.fov()`, `World.engine`
  - 캐릭터 표시 여부는 `update` 의 `heroVisible` 로만 정한다.

시제품 `$PROTO/src/world.js` 한 파일(약 13KB)을 책임별로 나눈다. **셰이더와 캐릭터의 수치는 바꾸지 않는다.** 전역 `window.BABYLON` 대신 `@babylonjs/core` 에서 이름으로 가져온다.

- [ ] **Step 1: math.js**

Babylon 판본마다 `Scalar` 위치가 달라서 직접 둔다.

```js
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
```

- [ ] **Step 2: 셰이더 파일로 빼기**

시제품 `world.js` 의 GLSL 문자열을 그대로 파일로 옮기고, 읽기 좋게 문장마다 줄을 나눈다.

| 새 파일 | 시제품 위치 |
|---|---|
| `shaders/body.vert` | `const vertex=` 문자열 |
| `shaders/planet.frag` | `shader(scene,'planet', ...)` 두 번째 인자 |
| `shaders/lunar.frag` | `shader(scene,'lunar', ...)` |
| `shaders/clouds.frag` | `shader(scene,'cloudLayer', ...)` — **한 곳 변경:** NASA 구름 지도는 알파가 없으므로 `float a=texture2D(cloudMap,vUV).a;` 를 `float a=texture2D(cloudMap,vUV).r;` 로 바꾼다 |
| `shaders/air.frag` | `shader(scene,'air', ...)` |
| `shaders/sun.frag` | `shader(heroScene...` 아님, `shader(scene,'sunGlow', ...)` |
| `shaders/cape.frag` | `shader(heroScene,'capeCloth', ...)` |

- [ ] **Step 3: planets.js**

```js
import { MeshBuilder, ShaderMaterial, Effect, Texture, Constants } from '@babylonjs/core';
import vertex from './shaders/body.vert?raw';
import planetFrag from './shaders/planet.frag?raw';
import lunarFrag from './shaders/lunar.frag?raw';
import cloudsFrag from './shaders/clouds.frag?raw';
import airFrag from './shaders/air.frag?raw';
import { KM_PER_UNIT } from '../core/bodies.js';

const SIDEREAL_DAY_S = 86164;

export function shader(scene, name, fragment, uniforms = [], samplers = []) {
  Effect.ShadersStore[`${name}VertexShader`] = vertex;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
  return new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'normal', 'uv'],
    uniforms: ['world', 'worldViewProjection', ...uniforms],
    samplers,
  });
}

function texture(scene, file) {
  return new Texture(`${import.meta.env.BASE_URL}assets/${file}`, scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
}

// Returns one entry per rendered body: { body, meshes, spin(elapsed), setSun(dirArray) }.
export function createBodyMeshes(scene, bodies) {
  const made = [];
  for (const body of bodies) {
    if (body.id === 'earth') made.push(createEarth(scene, body));
    else if (body.id === 'moon') made.push(createMoon(scene, body));
  }
  return made;
}
```

`createEarth(scene, body)` 는 시제품의 earth, clouds, atmosphere 세 구체를 만든다. 지름은 시제품 값을 반지름에서 계산한다: 지구 `2 * body.radiusKm / KM_PER_UNIT`(= 12.742), 구름 `12.776`, 대기 `13.0` (구름과 대기는 지구 지름에 `12.776 / 12.742`, `13.0 / 12.742` 배를 곱한다). segments 112/96/112, 재질 설정, `alphaMode`(`Constants.ALPHA_COMBINE`, `Constants.ALPHA_ADD`), `disableDepthWrite`, `backFaceCulling=false` 는 시제품과 같다. 텍스처 파일명은 `earth-day.jpg`, `earth-night.jpg`, `earth-clouds.jpg`. `spin(elapsed)` 는 `earth.rotation.y = 1.35 + elapsed * 2π / SIDEREAL_DAY_S`, `clouds.rotation.y = earth.rotation.y + 0.008`. `setSun(dir)` 는 세 재질의 `sun` 유니폼을 갱신한다. `eye` 유니폼은 시제품처럼 원점(플레이어) 고정.

`createMoon(scene, body)` 는 지름 `2 * body.radiusKm / KM_PER_UNIT`, segments 48, `lunar` 셰이더. `spin` 은 아무것도 하지 않는다.

각 항목의 `meshes` 는 위치를 함께 옮길 메시 배열이다.

- [ ] **Step 4: sun.js**

```js
import { MeshBuilder, Mesh, Constants } from '@babylonjs/core';
import sunFrag from './shaders/sun.frag?raw';
import { shader } from './planets.js';
import { KM_PER_UNIT, apparentAngularRadius } from '../core/bodies.js';
import { clamp, smoothstep } from './math.js';

const DISC_FRACTION = 0.129; // disc edge in the billboard's UV radius (see sun.frag)

export function createSun(scene, sunBody) {
  const plane = MeshBuilder.CreatePlane('sun', { size: (2 * sunBody.radiusKm / KM_PER_UNIT) / DISC_FRACTION }, scene);
  plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const material = shader(scene, 'sunGlow', sunFrag, ['visibility']);
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.setFloat('visibility', 1);
  plane.material = material;
  return { mesh: plane, material };
}

// Smallest visibility over every body that could cover the Sun disc.
export function sunVisibility(sunDir, sunDistance, sunRadius, occluders) {
  const sunAngular = apparentAngularRadius(sunRadius, sunDistance);
  let visibility = 1;
  for (const { direction, distance, radius } of occluders) {
    if (distance >= sunDistance) continue;
    const angular = apparentAngularRadius(radius, distance);
    const cos = clamp(direction.reduce((s, n, i) => s + n * sunDir[i], 0), -1, 1);
    const separation = Math.acos(cos);
    visibility = Math.min(visibility, smoothstep(0, 1, (separation - angular + sunAngular) / (sunAngular * 2)));
  }
  return visibility;
}
```

- [ ] **Step 5: stars.js**

시제품의 별 배경(시드 78123, 점 1400개, 반지름 80000, 색 계산)을 그대로 옮긴다.

```js
import { PointsCloudSystem, Vector3, Color4 } from '@babylonjs/core';

export async function createStars(scene) {
  let seed = 78123;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const cloud = new PointsCloudSystem('stars', 1.5, scene);
  cloud.addPoints(1400, (p) => {
    const z = rand() * 2 - 1;
    const t = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    p.position = new Vector3(r * Math.cos(t), z, r * Math.sin(t)).scale(80000);
    const v = 0.25 + rand() * 0.5;
    p.color = new Color4(v * 0.87, v * 0.93, v, 1);
  });
  await cloud.buildMeshAsync();
  cloud.mesh.alwaysSelectAsActiveMesh = true;
  cloud.mesh.isPickable = false;
  return cloud.mesh;
}
```

- [ ] **Step 6: hero.js**

시제품 `world.js` 의 `// Separate meter-scale character pass` 줄부터 `capePaths`, 캐릭터 부분 `update` 로직(bank, bend, capeLag, flightBlend, 팔다리, 망토 갱신)까지를 옮긴다.

```js
export function createHero(engine, sunDirection) → {
  scene,            // heroScene (autoClear=false, autoClearDepthAndStencil=true)
  camera,           // heroCamera
  root,             // hero TransformNode
  update({ dt, speed, turn, fov, photoOrientation, visible }),
}
```
- `B.Scalar.Clamp` → `clamp` (math.js).
- `sunDirection` 은 `Vector3`. DirectionalLight 방향은 시제품처럼 `sunDirection.negate()`. 이 방향은 시작 시 한 번만 정한다(시제품과 같음).
- `update` 는 시제품 update 안의 캐릭터 관련 줄(bank → 망토 리본 갱신, `heroCamera.fov`, `heroCamera.rotationQuaternion`, `hero.setEnabled`)만 담는다.

- [ ] **Step 7: world.js**

```js
import { Engine, Scene, FreeCamera, Vector3, Color4, Quaternion } from '@babylonjs/core';
import { BODIES, KM_PER_UNIT } from '../core/bodies.js';
import { multiply } from '../core/orientation.js';
import { createBodyMeshes } from './planets.js';
import { createSun, sunVisibility } from './sun.js';
import { createStars } from './stars.js';
import { createHero } from './hero.js';

export async function createWorld(canvas, bodies = BODIES) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, powerPreference: 'high-performance' });
  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.6));
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.002, 0.004, 0.012, 1);
  const camera = new FreeCamera('pilot', Vector3.Zero(), scene);
  camera.minZ = 0.01;
  camera.maxZ = 400000; // same as the prototype; the Sun is about 2,192 units away at start
  camera.fov = Math.PI / 3;
  camera.inputs.clear();

  const sunBody = bodies.find((b) => b.kind === 'star');
  const rendered = createBodyMeshes(scene, bodies);
  const sun = createSun(scene, sunBody);
  await createStars(scene);

  const startSunDir = new Vector3(1, 0.12, 0).normalize();
  const hero = createHero(engine, startSunDir);

  function relative(body, position) {
    return body.position.map((n, i) => (n - position[i]) / KM_PER_UNIT);
  }

  let elapsed = 0;

  function update({ position, orientation, dt, speed, photoOrientation, heroVisible, turn }) {
    const directions = {};
    const distances = {};
    for (const body of bodies) {
      const rel = relative(body, position);
      const length = Math.hypot(...rel);
      directions[body.id] = rel.map((n) => n / length);
      distances[body.id] = length * KM_PER_UNIT;
    }
    const sunDir = directions[sunBody.id];

    elapsed += dt;
    for (const item of rendered) {
      const rel = relative(item.body, position);
      for (const mesh of item.meshes) mesh.position.set(rel[0], rel[1], rel[2]);
      item.spin(elapsed);
      item.setSun(sunDir);
    }
    const sunRel = relative(sunBody, position);
    sun.mesh.position.set(sunRel[0], sunRel[1], sunRel[2]);

    const occluders = bodies.filter((b) => b !== sunBody).map((b) => ({
      direction: directions[b.id], distance: distances[b.id], radius: b.radiusKm,
    }));
    const visibility = sunVisibility(sunDir, distances[sunBody.id], sunBody.radiusKm, occluders);
    sun.material.setFloat('visibility', visibility);

    const look = multiply(orientation, photoOrientation || [0, 0, 0, 1]);
    camera.rotationQuaternion = new Quaternion(...look);
    hero.update({ dt, speed, turn, fov: camera.fov, photoOrientation, visible: heroVisible });

    camera.computeWorldMatrix(true); // axes below must reflect this frame's rotation
    const axis = (v) => { const d = camera.getDirection(v); return [d.x, d.y, d.z]; };
    return {
      directions,
      distances,
      sunVisibility: visibility,
      camera: { forward: axis(Vector3.Forward()), right: axis(Vector3.Right()), up: axis(Vector3.Up()), fov: camera.fov },
    };
  }

  await scene.whenReadyAsync();

  return {
    engine,
    update,
    render() { scene.render(); hero.scene.render(); },
    resize() { engine.resize(); },
    setFov(radians) { camera.fov = radians; },
    fov() { return camera.fov; },
  };
}
```

태양 원점 표로 바꿔도 플레이어 기준 상대 좌표로 그리므로 태양까지 거리는 시제품과 같다. 그래서 `camera.maxZ` 는 시제품 값 400000을 그대로 쓴다.

`Vector3.Forward()` 는 Babylon 왼손 좌표계에서 `(0,0,1)` 이다. 시제품 `placeMarker` 가 `B.Axis.Z` 를 쓴 것과 같다.

- [ ] **Step 8: 빌드로 가져오기 오류 확인**

`index.html` 이 아직 없으므로 임시 확인만 한다.

Run: `npx vite build --emptyOutDir 2>&1 | tail -5`
Expected: `index.html` 이 없다는 오류가 나도 괜찮다. `src/render` 의 가져오기 오류(`does not provide an export named ...`)가 없어야 한다. 가져오기 오류가 나면 이름을 `@babylonjs/core` 문서에서 확인해 고친다. 실제 화면 확인은 Task 8에서 한다.

- [ ] **Step 9: Commit**

```bash
git add src/render
git commit -m "Split renderer into planets, sun, stars and hero modules driven by the body table"
```

---

### Task 8: 화면·입력·HUD와 게임 루프

**Files:**
- Create: `index.html`, `style.css`, `src/main.js`, `src/ui/input.js`, `src/ui/hud.js`, `src/ui/photo.js`, `src/ui/toast.js`

**Interfaces:**
- Consumes: 앞 Task 전부.
- Produces: 실행 가능한 게임. 확인용 읽기 전용 `window.oddity.getState()` → `{ position, speed, motionSign, zoneId, restingOn, paused, photo, throttle, fps }`.

- [ ] **Step 1: index.html**

`$PROTO/index.html` 을 옮기고 다음을 바꾼다.

- `<script src="assets/babylon.js"></script>` 와 기존 module script 줄을 지우고 `<script type="module" src="/src/main.js"></script>` 한 줄로 바꾼다.
- `#markers` 안의 세 표지를 지우고 빈 `<div id="markers"></div>` 로 둔다(표에서 만든다).
- `#targetPanel` 을 아래로 바꾼다.

```html
<aside id="targetPanel">
  <span>선택한 천체</span>
  <strong id="targetName">지구 <small>Earth</small></strong>
  <p id="targetDistance">—</p>
  <p id="surfaceInfo">실제 표면까지 접근 가능</p>
  <button id="faceTarget">지구 바라보기</button>
  <button id="inspectTarget">확대 관찰</button>
</aside>
```
- `#toast` 는 `<div id="toast" role="status" aria-live="polite"></div>`.
- `#speedLimit` 첫 문구는 `현재 제한 1c`.

- [ ] **Step 2: style.css**

`$PROTO/style.css` 를 그대로 복사한다. `#shieldInfo` 선택자가 있으면 `#surfaceInfo` 로 바꾼다. 표지는 `button.marker` 로 만들어지므로 `.marker` 규칙이 `div` 에만 걸려 있으면 `button` 에도 걸리게 고친다.

- [ ] **Step 3: toast.js**

```js
const VISIBLE_MS = 3500;

export function createToast(element) {
  let timer = null;
  return {
    show(text) {
      clearTimeout(timer);
      // Same text while visible: extend it without re-announcing to screen readers.
      if (!(element.classList.contains('on') && element.textContent === text)) {
        element.textContent = text;
        element.classList.add('on');
      }
      timer = setTimeout(() => element.classList.remove('on'), VISIBLE_MS);
    },
  };
}
```

- [ ] **Step 4: input.js**

시제품 `main.js` 의 입력 부분(키보드, 캔버스 드래그, 스틱, 전진·후진 버튼, 슬라이더)을 옮긴다.

```js
import { controlIntent, rangeKeepsKey } from '../core/controls.js';

const $ = (id) => document.getElementById(id);
const DRAG_RATE = 0.0035;

export function createInput({ canvas, onDrag, onBrake, onTogglePhoto, onEscape, onWheel, isBlocked }) {
  const held = new Set();
  let stick = [0, 0];
  let stickId = null;
  let flyingButton = false;
  let reversingButton = false;
  let drag = null;
  let throttle = 1;

  function clear() {
    held.clear();
    stick = [0, 0];
    stickId = null;
    flyingButton = false;
    reversingButton = false;
    drag = null;
    $('stickKnob').style.transform = '';
  }

  $('throttle').addEventListener('input', (e) => { throttle = Number(e.target.value) / 1000; });

  for (const [id, set] of [['flyButton', (v) => { flyingButton = v; }], ['reverseButton', (v) => { reversingButton = v; }]]) {
    const button = $(id);
    button.addEventListener('pointerdown', (e) => { set(true); button.setPointerCapture(e.pointerId); });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(ev, () => set(false));
  }

  document.addEventListener('keydown', (e) => {
    if (isBlocked()) return;
    const onRange = e.target.matches?.('input[type="range"]');
    if (onRange && rangeKeepsKey(e.code)) return;
    if (onRange && e.code.startsWith('Arrow')) e.target.blur();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Space' && !e.repeat) onBrake();
    else if (e.code === 'KeyP' && !e.repeat) onTogglePhoto();
    else if (e.code === 'Escape') onEscape();
    held.add(e.code);
  });
  document.addEventListener('keyup', (e) => held.delete(e.code));

  canvas.addEventListener('pointerdown', (e) => {
    canvas.focus();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
  });
  canvas.addEventListener('pointermove', (e) => {
    if (drag?.id !== e.pointerId) return;
    onDrag((e.clientX - drag.x) * DRAG_RATE, (e.clientY - drag.y) * DRAG_RATE);
    drag.x = e.clientX;
    drag.y = e.clientY;
  });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(ev, () => { drag = null; });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); onWheel(e.deltaY); }, { passive: false });

  const stickEl = $('stick');
  function moveStick(e) {
    const r = stickEl.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / (r.width * 0.35);
    const y = (e.clientY - r.top - r.height / 2) / (r.height * 0.35);
    const length = Math.max(1, Math.hypot(x, y));
    stick = [x / length, y / length];
    $('stickKnob').style.transform = `translate(${stick[0] * r.width * 0.3}px,${stick[1] * r.height * 0.3}px)`;
  }
  stickEl.addEventListener('pointerdown', (e) => {
    if (stickId !== null) return;
    stickId = e.pointerId;
    stickEl.setPointerCapture(e.pointerId);
    moveStick(e);
  });
  stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stickId) moveStick(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stickEl.addEventListener(ev, (e) => {
      if (e.pointerId !== stickId) return;
      stickId = null;
      stick = [0, 0];
      $('stickKnob').style.transform = '';
    });
  }

  return {
    clear,
    throttle: () => throttle,
    intent() {
      const c = controlIntent(held, stickId !== null, flyingButton, reversingButton);
      return {
        turnX: c.turnX + stick[0],
        turnY: c.turnY + stick[1],
        roll: (held.has('KeyE') ? 1 : 0) - (held.has('KeyQ') ? 1 : 0),
        drive: c.drive,
        throttle,
      };
    },
    driving() {
      return held.has('KeyW') || held.has('KeyS') || stickId !== null || flyingButton || reversingButton;
    },
  };
}
```

- [ ] **Step 5: hud.js**

```js
import { objectParticle } from './messages.js';

const $ = (id) => document.getElementById(id);
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const fmt = (n) => n.toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);

export function createHud(bodies, { onSelect, onFace, onInspect }) {
  const markers = new Map();
  for (const body of bodies) {
    const el = document.createElement('button');
    el.className = body.kind === 'star' ? 'marker sun' : 'marker';
    el.textContent = body.name;
    el.addEventListener('click', () => onSelect(body.id));
    $('markers').append(el);
    markers.set(body.id, el);
  }
  $('faceTarget').addEventListener('click', onFace);
  $('inspectTarget').addEventListener('click', onInspect);

  function placeMarker(el, direction, camera, label) {
    const x = dot(direction, camera.right);
    const y = dot(direction, camera.up);
    const z = dot(direction, camera.forward);
    const w = innerWidth;
    const h = innerHeight;
    const focal = h / (2 * Math.tan(camera.fov / 2));
    let px = (x / Math.max(0.001, z)) * focal;
    let py = (-y / Math.max(0.001, z)) * focal;
    const mx = Math.max(50, w / 2 - 70);
    const my = Math.max(35, h / 2 - 100);
    const outside = z <= 0 || Math.abs(px) > mx || Math.abs(py) > my;
    if (outside) {
      if (Math.abs(px) + Math.abs(py) < 0.01) px = mx;
      const scale = Math.max(Math.abs(px) / mx, Math.abs(py) / my);
      px /= scale;
      py /= scale;
    }
    el.style.left = `${w / 2 + px}px`;
    el.style.top = `${h / 2 + py}px`;
    el.classList.toggle('inView', !outside);
    const arrow = outside ? `${ARROWS[(Math.round(Math.atan2(py, px) / (Math.PI / 4)) + 8) % 8]} ` : '';
    el.textContent = arrow + label;
  }

  return {
    showSelection(body) {
      $('targetName').innerHTML = `${body.name} <small>${body.nameEn}</small>`;
      $('faceTarget').textContent = `${body.name} 바라보기`;
    },
    update({ view, local, selected, selectedDistance, speed, motionSign, zoneLabel, flightLabel, throttle, C }) {
      $('altitudeLabel').textContent = local.label;
      $('altitude').textContent = fmt(local.altitude);
      const backward = speed > 0.01 && motionSign < 0;
      $('speed').innerHTML = `${backward ? '후진 ' : ''}${fmt(speed)} <small>km/s</small>`;
      $('lightSpeed').textContent = `${backward ? '-' : ''}${(speed / C).toFixed(6)} c`;
      $('throttleValue').textContent = `${Math.round(throttle * 100)}%`;
      $('speedLimit').textContent = `현재 제한 ${zoneLabel}`;
      $('flightState').textContent = flightLabel;
      $('targetDistance').textContent = `${selected.name} 표면까지 ${fmt(selectedDistance)} km`;
      for (const body of bodies) {
        const hidden = body.kind === 'star' && view.sunVisibility < 0.01;
        placeMarker(markers.get(body.id), view.directions[body.id], view.camera, hidden ? `${body.name} · 가려짐` : body.name);
      }
    },
    faceToast(body) {
      return `${body.name}${objectParticle(body.name)} 바라봅니다. 위치와 속도는 유지됩니다.`;
    },
  };
}
```

- [ ] **Step 6: photo.js**

시제품 `togglePhoto`, 사진 저장(`$('capture').onclick`), 화각 슬라이더, 영웅 표시 체크를 옮긴다.

```js
import { rotateLocal } from '../core/orientation.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_FOV_DEG = 60;

export function createPhoto({ world, canvas, toast, setPaused, isPaused, clearInput }) {
  let active = false;
  let priorPause = false;
  let orientation = [0, 0, 0, 1];

  function setFovDeg(deg) {
    const clamped = Math.max(5, Math.min(95, deg));
    world.setFov((clamped * Math.PI) / 180);
    $('fov').value = clamped;
  }

  function toggle() {
    active = !active;
    clearInput();
    if (active) {
      priorPause = isPaused();
      setPaused(true);
      orientation = [0, 0, 0, 1];
      $('hud').hidden = true;
      $('photoTools').hidden = false;
    } else {
      setPaused(priorPause);
      $('hud').hidden = false;
      $('photoTools').hidden = true;
      setFovDeg(DEFAULT_FOV_DEG);
      $('showHero').checked = true;
    }
  }

  $('fov').addEventListener('input', (e) => setFovDeg(Number(e.target.value)));
  $('exitPhoto').addEventListener('click', toggle);
  $('capture').addEventListener('click', async () => {
    const button = $('capture');
    button.disabled = true;
    try {
      world.render();
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지 생성 실패'))), 'image/png');
      });
      const file = new File([blob], `oddity-${new Date().toISOString().replace(/[:.]/g, '-')}.png`, { type: 'image/png' });
      const touch = document.body.classList.contains('touch');
      if (touch && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Oddity' });
        } catch (e) {
          if (e.name !== 'AbortError') throw e;
        }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        toast.show('화면 표시 없는 우주 사진을 저장했습니다.');
      }
    } catch (e) {
      toast.show('사진을 저장하지 못했습니다. 다시 시도해 주세요.');
      console.error(e);
    } finally {
      button.disabled = false;
    }
  });

  return {
    toggle,
    active: () => active,
    orientation: () => (active ? orientation : null),
    heroVisible: () => !active || $('showHero').checked,
    rotate(dx, dy) { orientation = rotateLocal(orientation, dx, dy); },
    zoom(deltaY) { if (active) setFovDeg((world.fov() * 180) / Math.PI + deltaY * 0.03); },
    frame(deg) { if (!active) toggle(); $('showHero').checked = false; setFovDeg(deg); },
  };
}
```

- [ ] **Step 7: main.js**

```js
import { BODIES, START_POSITION, bodyById, surfaceDistance, nearestLocalBody } from './core/bodies.js';
import { C, ZONES } from './core/flight.js';
import { createState, step, stopNow, TURN_RATE } from './core/game.js';
import { rotateLocal, lookAtDirection } from './core/orientation.js';
import { createWorld } from './render/world.js';
import { createInput } from './ui/input.js';
import { createHud } from './ui/hud.js';
import { createPhoto } from './ui/photo.js';
import { createToast } from './ui/toast.js';
import { eventMessage } from './ui/messages.js';

const $ = (id) => document.getElementById(id);
const MAX_FRAME_GAP_S = 0.5;
const HUD_EVERY_N_FRAMES = 6;

let state = createState(START_POSITION);
let paused = false;
let selectedId = 'earth';
let dragTurn = [0, 0];

const toast = createToast($('toast'));
const canvas = $('space');

function setPaused(value) {
  paused = value;
  input?.clear();
  $('pauseButton').textContent = paused ? '비행 계속' : '일시 정지';
}

function brake() {
  input.clear();
  state = stopNow(state);
  toast.show('정지했습니다. 주변을 둘러보세요.');
}

let input;
let photo;
let world;

async function init() {
  try {
    world = await createWorld(canvas);
  } catch (e) {
    console.error(e);
    $('loadError').textContent = `${e.message} 최신 Chrome이나 Edge에서 하드웨어 가속을 켜고 다시 열어 주세요.`;
    return;
  }

  input = createInput({
    canvas,
    onDrag(dx, dy) {
      if (photo.active()) photo.rotate(dx, dy);
      else if (!paused) {
        state = { ...state, orientation: rotateLocal(state.orientation, dx, dy) };
        dragTurn[0] += dx;
        dragTurn[1] += dy;
      }
    },
    onBrake: brake,
    onTogglePhoto: () => photo.toggle(),
    onEscape: () => (photo.active() ? photo.toggle() : setPaused(!paused)),
    onWheel: (deltaY) => photo.zoom(deltaY),
    isBlocked: () => $('help').open,
  });
  photo = createPhoto({ world, canvas, toast, setPaused, isPaused: () => paused, clearInput: () => input.clear() });

  const hud = createHud(BODIES, {
    onSelect(id) {
      selectedId = id;
      hud.showSelection(bodyById(id));
    },
    onFace() {
      const body = bodyById(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      state = { ...state, orientation: lookAtDirection(direction) };
      toast.show(hud.faceToast(body));
    },
    onInspect() {
      const body = bodyById(selectedId);
      const direction = body.position.map((n, i) => n - state.position[i]);
      state = { ...state, orientation: lookAtDirection(direction) };
      const distance = Math.hypot(...direction);
      const diameterDeg = (2 * Math.asin(Math.min(1, body.radiusKm / distance)) * 180) / Math.PI;
      photo.frame(diameterDeg * 1.4);
    },
  });
  hud.showSelection(bodyById(selectedId));

  $('brake').addEventListener('click', brake);
  $('pauseButton').addEventListener('click', () => setPaused(!paused));
  $('photoButton').addEventListener('click', () => photo.toggle());
  $('helpButton').addEventListener('click', () => {
    const prior = paused;
    setPaused(true);
    $('help').showModal();
    $('help').addEventListener('close', () => setPaused(prior), { once: true });
  });
  $('closeHelp').addEventListener('click', () => $('help').close());
  window.addEventListener('blur', () => {
    input.clear();
    if (!photo.active()) setPaused(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) setPaused(true);
  });
  window.addEventListener('resize', () => world.resize());
  if (matchMedia('(pointer:coarse)').matches || navigator.maxTouchPoints > 0) document.body.classList.add('touch');

  $('loading').style.display = 'none';
  document.body.dataset.ready = 'true';
  toast.show('지구 근처에 도착했습니다. 드래그로 둘러보세요.');

  let previous = performance.now();
  let frame = 0;
  world.engine.runRenderLoop(() => {
    const now = performance.now();
    const elapsed = (now - previous) / 1000;
    previous = now;
    // A suspended tab must never fast-forward the journey.
    if (elapsed > MAX_FRAME_GAP_S) setPaused(true);
    const dt = paused ? 0 : elapsed;

    const intent = input.intent();
    const result = step(state, intent, dt);
    state = result.state;
    for (const event of result.events) {
      const text = eventMessage(event);
      if (text) toast.show(text);
    }

    const turn = dt > 0
      ? [dragTurn[0] / dt + intent.turnX * TURN_RATE, dragTurn[1] / dt + intent.turnY * TURN_RATE]
      : [0, 0];
    dragTurn = [0, 0];

    const view = world.update({
      position: state.position,
      orientation: state.orientation,
      dt,
      speed: state.speed,
      photoOrientation: photo.orientation(),
      heroVisible: photo.heroVisible(),
      turn,
    });
    world.render();

    if (frame++ % HUD_EVERY_N_FRAMES !== 0) return;
    const selected = bodyById(selectedId);
    const driving = input.driving();
    let flightLabel = '자유 비행';
    if (paused) flightLabel = '일시 정지';
    else if (state.restingOn) flightLabel = `${bodyById(state.restingOn).name} 표면`;
    else if (state.speed < 0.01) flightLabel = '정지 비행';
    else if (!driving) flightLabel = '서서히 감속 중';
    else if (state.motionSign < 0) flightLabel = '후진 비행';
    hud.update({
      view,
      local: nearestLocalBody(state.position),
      selected,
      selectedDistance: surfaceDistance(state.position, selected),
      speed: state.speed,
      motionSign: state.motionSign,
      zoneLabel: ZONES[state.zoneId].label,
      flightLabel,
      throttle: input.throttle(),
      C,
    });
  });

  // Read-only diagnostics for verification. No travel shortcuts.
  window.oddity = {
    getState: () => ({
      position: [...state.position],
      speed: state.speed,
      motionSign: state.motionSign,
      zoneId: state.zoneId,
      restingOn: state.restingOn,
      paused,
      photo: photo.active(),
      throttle: input.throttle(),
      fps: world.engine.getFps(),
    }),
  };
}

init();
```

`core/game.js` 는 `ZONES` 를 다시 내보내지만 여기서는 `flight.js` 에서 바로 가져온다.

- [ ] **Step 8: 시험과 개발 서버**

Run: `npm test`
Expected: 44 passed (Task 4까지 41 + Task 5의 3).

`.claude/launch.json` 에 dev 서버 설정을 두고 내장 브라우저로 띄운다.

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "oddity-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173, "url": "http://localhost:5173/oddity_claude/" }
  ]
}
```

- [ ] **Step 9: 브라우저 직접 검사**

1. 첫 화면: 지구의 낮과 밤이 절반씩 보이고 대기 가장자리가 빛난다. 시제품 첫 화면 스크린샷(`$PROTO/../solar-cape-preview.png`)과 나란히 본다. 구름이 하얗게 덮이지 않고 성기게 보여야 한다(NASA 구름 지도 `.r` 변경 확인).
2. 지구·달·태양 표지를 차례로 눌러 선택하고 "바라보기"를 누르면 그 천체가 화면 가운데에 온다. 알림 조사가 "지구를 / 달을 / 태양을" 로 맞다. "확대 관찰"은 사진 모드로 들어가 천체가 화면을 채운다.
3. W를 누른 채 지구로 가면 0.1c 알림 한 번, 표면 도착 알림 한 번. 계속 누르고 있어도 알림이 다시 뜨지 않는다. 방향을 돌려 W로 떠나면 1c, 100c 알림이 각각 한 번.
4. 사진 모드에서 저장한 PNG에 HUD가 없다.
5. 다른 탭으로 갔다가 돌아오면 일시 정지 상태이고 위치가 그대로다(`window.oddity.getState().position` 을 전후로 비교).
6. 속도 슬라이더를 클릭한 뒤 방향키와 W가 비행에 먹힌다. W를 누른 채 창 밖을 클릭했다 돌아오면 저절로 날아가지 않는다.
7. 375×812(mobile)와 데스크톱 폭에서 버튼이 겹치지 않고 가로 스크롤이 없다(`document.documentElement.scrollWidth === innerWidth`).
8. 콘솔 오류 0개.

문제가 나오면 고치고 시험을 다시 돌린다. 태양이 잘려 보이면 `world.js` 의 `camera.maxZ` 를 키운다.

- [ ] **Step 10: Commit**

```bash
git add index.html style.css src/main.js src/ui .claude/launch.json
git commit -m "Wire UI, HUD, photo mode and game loop to the new core"
```

---

### Task 9: README, 배포 작업, 공개 전 점검

**Files:**
- Create: `README.md`, `.github/workflows/pages.yml`

- [ ] **Step 1: 배포 작업 파일**

Actions 판본은 작성 시점 최신 주 판본을 확인해 쓴다(`actions/checkout`, `actions/setup-node`, `actions/upload-pages-artifact`, `actions/deploy-pages` 각 저장소의 Releases). 아래는 형태다.

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: 빌드 결과 확인**

```bash
npm run build
ls -la dist dist/assets
```
Expected: 오류 없음. `dist/assets` 의 js 파일 크기를 적어 둔다(보고용). 시제품 `babylon.js` 는 7,454,419바이트였다.

`.claude/launch.json` 에 preview 설정을 더해 띄운다.

```json
{ "name": "oddity-preview", "runtimeExecutable": "npm", "runtimeArgs": ["run", "preview"], "port": 4173, "url": "http://localhost:4173/oddity_claude/" }
```
Expected: 첫 화면이 dev와 같고, 텍스처 404가 없다(네트워크 요청 확인).

- [ ] **Step 3: README.md**

쉬운 말 "~다" 체, 틸드 없이 쓴다. 담을 것:
- 한 줄 소개: 실제 크기의 지구, 달, 태양 사이를 망토 두른 인물로 나는 브라우저 게임이다.
- 규칙 숫자: 천체 크기는 실제 반지름, 천체 사이 빈 거리는 1/100. 표면까지 500km 이내 0.1c, 50,000km 이내 1c, 그 밖 100c.
- 실행: Node 22 이상, `npm install`, `npm run dev`, 주소 `http://localhost:5173/oddity_claude/`.
- 시험: `npm test`.
- 조작표: 원 기획서 12장 표(PC)와 모바일 목록.
- 공개 주소: `https://destory1984.github.io/oddity_claude/` (저장소가 공개이고 Pages가 켜져 있을 때).
- 출처: `THIRD-PARTY.md` 참고.

- [ ] **Step 4: Commit**

```bash
git add README.md .github/workflows/pages.yml .claude/launch.json
git commit -m "Add README and GitHub Pages workflow"
```

- [ ] **Step 5: 올리기 전 점검**

```bash
git config user.email
git ls-files
git grep -nIiE "$(whoami)|gmail|[A-Za-z]:[\\/]Users[\\/]"
git grep -nIiE 'ghp_|github_pat_|api[_-]?key|secret|password|chat_id'
git log --format='%ae | %ce' | sort -u
git log -p | grep -iE "$(whoami)|gmail|ghp_|github_pat_"
```
Expected: 이메일은 noreply 하나뿐. 설계서의 점검 규칙 문장(`C:\Users\...`)을 뺀 다른 경로·지메일·비밀값 결과 없음. `package-lock.json` 에 개인 경로가 없는지도 위 grep으로 확인된다.

- [ ] **Step 6: 사용자에게 push 허락 받기**

점검 결과와 커밋 목록을 보이고 `git push origin main` 을 해도 되는지 묻는다. 허락 뒤에만 올린다.

- [ ] **Step 7: 올린 뒤 API 확인**

토큰을 화면에 찍지 않고 GitHub API로 커밋 주소를 확인한다.

```bash
tok=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
printf 'header = "Authorization: Bearer %s"\nheader = "Accept: application/vnd.github+json"\nurl = "https://api.github.com/repos/destory1984/oddity_claude/commits?sha=main&per_page=100"\nsilent\n' "$tok" \
  | curl -K - \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);const ok="13573570+destory1984@users.noreply.github.com";let bad=0;for(const c of a){const good=c.commit.author.email===ok&&c.commit.committer.email===ok;if(!good)bad++;console.log(c.sha.slice(0,7),good?"OK":"MISMATCH")}console.log("commits:",a.length,"mismatch:",bad)})'
unset tok
```
Expected: `mismatch: 0`.

- [ ] **Step 8: 사용자에게 남은 일 알리기**

저장소가 비공개인 동안 Pages 배포 단계가 실패하는 것은 정상이다. 공개 전환과 Settings → Pages → Source를 "GitHub Actions"로 두는 일은 사용자가 한다고 알린다.
