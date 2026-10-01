# 새 천체(세레스, 명왕성과 카론, 핼리 혜성, 소행성대) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 천체 넷(세레스, 명왕성, 카론, 핼리 혜성)과 풍경인 소행성대를 넣어 수첩을 75 → 85칸으로 늘린다.

**Architecture:** 계산은 `src/core/`의 순수 함수(케플러 풀이, 혜성 활동도, 소행성대 바위 자리)에 두고 Vitest로 검사한다. 그리기는 `src/render/`에 혜성과 소행성대 파일을 새로 두고 `world.js`의 `update`에서 부른다. 새 천체는 `BODY_DATA`에 줄만 더하면 발견·착지·이름표·수첩이 따라온다.

**Tech Stack:** Vite 8, `@babylonjs/core` 9(`src/render/babylon.js`의 깊은 경로만), Vitest 5, GLSL 셰이더(`?raw` 가져오기).

**Spec:** `docs/superpowers/specs/2026-10-01-new-bodies-design.md`

## Global Constraints

- 장면 1단위 = 1,000km(`KM_PER_UNIT`). 좌표는 km 배정도 수. 그릴 때 여행자가 원점(부동 원점).
- 태양 기준 거리는 압축 비율 100, 위성은 10(`compressedCenterDistance`). 어떤 두 천체도 겹치면 안 된다.
- `src/core/`는 Babylon을 가져오지 않는다.
- 새 지도 세 장은 2048×1024 JPEG, 합쳐 2MB 이하.
- 사실 문장은 60자 이하, 마침표로 끝난다. 문서에는 틸드를 쓰지 않고 범위는 → 로 적는다.
- 비밀값, 이메일, 개인 경로를 코드와 문서에 넣지 않는다. 커밋 작성자는 noreply 주소다.
- 푸시는 사용자가 말할 때만 한다. 내려받은 원본 파일은 스크래치패드에 두고 저장소에 넣지 않는다.
- 파이썬으로 파일을 고칠 때는 `newline=''`로 열고, 긴 스크립트는 스크래치패드 파일로 써서 돌린다.

## Review Focus

1. 2시간 넘게 켜 둔 게임(게임 시각 60일 이후): 핼리가 근일점을 지난 뒤에도 태양이나 수성·금성과 겹치지 않고 꼬리가 태양 반대쪽을 향해야 한다. → Task 2의 여러 시각 겹침 검사.
2. 핼리 표면(반지름 5.5km)에 착지한 채 오래 서 있기: 초속 수백 km로 움직이는 핵을 `carryAlong`이 따라가야 한다. → Task 2의 따라가기 검사.
3. 예전 75칸 기록을 가진 사람: 기록이 깨지지 않고 85칸 중 75칸으로 읽혀야 한다. → Task 4의 저장 기록 검사.
4. 소행성대 가장자리와 음수 좌표: 칸 해시가 음수 칸에서도 고르게 나와야 하고, 띠 경계에서 바위가 띠 밖으로 나가면 안 된다. → Task 3의 음수 좌표·경계 검사.
5. 지도 파일이 없을 때(내려받기 실패): 게임이 멈추지 않고 그 천체를 바위 셰이더로 그려야 한다. → Task 5에서 `LOOKS`를 받은 파일에 맞춰 쓰고 브라우저에서 콘솔 오류 0개를 확인.

---

### Task 1: 케플러 풀이 (`src/core/kepler.js`)

**Files:**
- Create: `src/core/kepler.js`
- Test: `tests/kepler.test.js`

**Interfaces:**
- Produces: `eccentricAnomaly(meanAnomaly: number, e: number): number`, `ellipsePoint({ semiMajorKm, eccentricity, periodS, perihelionAtS }, timeS): { x, y, r }` (km, 초점 원점, +x 근일점, 근일점 뒤 y > 0).

- [ ] **Step 1: 실패하는 검사 쓰기**

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { eccentricAnomaly, ellipsePoint } from '../src/core/kepler.js';

const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const HALLEY = { semiMajorKm: 17.834 * 149597870.7, eccentricity: 0.96714, periodS: 27510 * 86400, perihelionAtS: 60 * 86400 };

test('a circle needs no solving', () => {
  for (const m of [-3, -1, 0, 0.5, 2.5]) near(eccentricAnomaly(m, 0), m, 1e-9);
});

test('the answer satisfies M = E - e sin E, even at e = 0.967', () => {
  for (const m of [-3.1, -1, -0.01, 0, 0.0003, 0.2, 3.1]) {
    const E = eccentricAnomaly(m, 0.96714);
    near(E - 0.96714 * Math.sin(E), m, 1e-9);
  }
});

test('any mean anomaly is wrapped into one turn', () => {
  near(eccentricAnomaly(0.4 + 4 * Math.PI, 0.5), eccentricAnomaly(0.4, 0.5), 1e-9);
});

test('perihelion, aphelion and one full period', () => {
  const { semiMajorKm: a, eccentricity: e, periodS, perihelionAtS } = HALLEY;
  const peri = ellipsePoint(HALLEY, perihelionAtS);
  near(peri.r, a * (1 - e), 1);
  near(peri.x, a * (1 - e), 1);
  near(peri.y, 0, 1);
  near(ellipsePoint(HALLEY, perihelionAtS + periodS / 2).r, a * (1 + e), 1);
  const again = ellipsePoint(HALLEY, perihelionAtS + periodS + 5e5);
  const once = ellipsePoint(HALLEY, perihelionAtS + 5e5);
  near(again.x, once.x, 1);
  near(again.y, once.y, 1);
});

test('after perihelion y is positive, before it negative, and r matches x and y', () => {
  const after = ellipsePoint(HALLEY, HALLEY.perihelionAtS + 86400 * 20);
  const before = ellipsePoint(HALLEY, 0);
  assert.ok(after.y > 0 && before.y < 0);
  near(Math.hypot(before.x, before.y), before.r, 1);
  // 60 days before perihelion Halley is about 1.32 AU from the Sun.
  near(before.r / 149597870.7, 1.324, 0.01);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run tests/kepler.test.js` → 모듈 없음으로 실패.

- [ ] **Step 3: 구현**

```js
// Elliptical orbits (Halley's Comet). Circular orbits stay in bodies.js.

// Solves Kepler's equation M = E - e sin E. The left side grows steadily with E, so
// halving the interval always works, even for a comet's e of 0.967 where Newton's
// method can overshoot near perihelion.
export function eccentricAnomaly(meanAnomaly, e) {
  const turn = 2 * Math.PI;
  const m = meanAnomaly - turn * Math.round(meanAnomaly / turn);
  let lo = -Math.PI;
  let hi = Math.PI;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (mid - e * Math.sin(mid) < m) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// Position in the orbit's own plane, in km: the Sun at the origin, +x toward
// perihelion, y positive after perihelion. r is the distance from the Sun.
export function ellipsePoint({ semiMajorKm, eccentricity, periodS, perihelionAtS }, timeS) {
  const E = eccentricAnomaly((2 * Math.PI * (timeS - perihelionAtS)) / periodS, eccentricity);
  return {
    x: semiMajorKm * (Math.cos(E) - eccentricity),
    y: semiMajorKm * Math.sqrt(1 - eccentricity * eccentricity) * Math.sin(E),
    r: semiMajorKm * (1 - eccentricity * Math.cos(E)),
  };
}
```

- [ ] **Step 4: 통과 확인** — `npx vitest run tests/kepler.test.js` → 5개 통과.
- [ ] **Step 5: 커밋** — `git add src/core/kepler.js tests/kepler.test.js && git commit -m "Add a Kepler solver for elliptical orbits"`

---

### Task 2: 새 천체 넷을 천체 표에 넣기

**Files:**
- Modify: `src/core/bodies.js` (`BODY_DATA` 끝, `placeBodies`)
- Modify: `src/core/facts.js`
- Modify: `tests/bodies.test.js`, `tests/orbits.test.js`
- Test: `tests/newBodies.test.js`

**Interfaces:**
- Consumes: `ellipsePoint` (Task 1).
- Produces: `BODIES`에 `ceres`(kind `dwarf`), `pluto`(`dwarf`), `charon`(`moon`, parent `pluto`), `halley`(`comet`). 놓인 천체 객체에 `sunKm`(압축 전 실제 태양 거리, 타원 궤도 천체만; 나머지는 없음)이 더해진다. `AU_KM`을 내보낸다.

- [ ] **Step 1: 실패하는 검사 쓰기** (`tests/newBodies.test.js`)

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BODIES, BODY_DATA, AU_KM, bodiesAt, bodyById, nearestLocalBody } from '../src/core/bodies.js';
import { carryAlong, createState } from '../src/core/game.js';

const DAY = 86400;
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dist = (a, b) => Math.hypot(...sub(a, b));
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const at = (t, id) => bodyById(id, bodiesAt(t));

test('four new bodies with real radii and kinds: 33 in all', () => {
  assert.equal(BODIES.length, 33);
  assert.deepEqual(BODIES.slice(-4).map((b) => [b.id, b.kind, b.radiusKm, b.parent]), [
    ['ceres', 'dwarf', 469.7, 'sun'],
    ['pluto', 'dwarf', 1188.3, 'sun'],
    ['charon', 'moon', 606, 'pluto'],
    ['halley', 'comet', 5.5, 'sun'],
  ]);
});

test('Ceres sits between Mars and Jupiter, Pluto beyond Neptune', () => {
  const out = (id) => Math.hypot(...bodyById(id).position);
  assert.ok(out('mars') < out('ceres') && out('ceres') < out('jupiter'));
  assert.ok(out('pluto') > out('neptune'));
});

test('Charon is squeezed 1/10 toward Pluto: 3,574 km centre to centre', () => {
  near(dist(bodyById('charon').position, bodyById('pluto').position), 1188.3 + 606 + (19591 - 1794.3) / 10, 0.01);
});

test('Halley starts about 1.32 AU out and reaches 0.586 AU sixty days later', () => {
  near(at(0, 'halley').sunKm / AU_KM, 1.324, 0.01);
  const peri = at(60 * DAY, 'halley');
  near(peri.sunKm / AU_KM, 0.586, 0.001);
  // Squeezed like every distance from the Sun: the radii plus 1/100 of the gap.
  const radii = 696340 + 5.5;
  near(Math.hypot(...peri.position), radii + (peri.sunKm - radii) / 100, 1);
});

test('Halley goes round the other way from the planets', () => {
  // The y part of position x velocity: its sign is the direction of travel seen from north.
  const swirl = (id) => {
    const a = at(59 * DAY, id).position;
    const b = at(61 * DAY, id).position;
    return a[2] * (b[0] - a[0]) - a[0] * (b[2] - a[2]);
  };
  assert.ok(swirl('halley') * swirl('earth') < 0);
});

test('nothing overlaps at the start, at perihelion, or months later', () => {
  for (const t of [0, 30 * DAY, 60 * DAY, 61 * DAY, 90 * DAY, 200 * DAY, 3000 * DAY]) {
    const bodies = bodiesAt(t);
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const gap = dist(bodies[i].position, bodies[j].position) - bodies[i].radiusKm - bodies[j].radiusKm;
        assert.ok(gap > 0, `${bodies[i].id} and ${bodies[j].id} overlap at day ${t / DAY}`);
      }
    }
  }
});

test('a traveler standing on Halley is carried along with it', () => {
  const before = bodiesAt(50 * DAY);
  const after = bodiesAt(50 * DAY + 720 / 60);
  const comet = bodyById('halley', before);
  const state = createState([comet.position[0], comet.position[1] + comet.radiusKm, comet.position[2]]);
  const moved = carryAlong(state, before, after);
  near(dist(moved.position, bodyById('halley', after).position), comet.radiusKm, 1e-6);
});

test('the altitude label names dwarf planets and the comet', () => {
  const pluto = bodyById('pluto');
  assert.equal(nearestLocalBody([pluto.position[0], pluto.position[1] + 5000, pluto.position[2]]).label, '명왕성 상공');
  const halley = bodyById('halley');
  assert.equal(nearestLocalBody([halley.position[0], halley.position[1] + 100, halley.position[2]]).label, '핼리 혜성 상공');
});

test('only bodies on an ellipse carry their real distance from the Sun', () => {
  assert.equal(bodyById('earth').sunKm, undefined);
  assert.ok(BODY_DATA.find((d) => d.id === 'halley').ellipse);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run tests/newBodies.test.js` → 33개가 아니라서 실패.

- [ ] **Step 3: 구현** (`src/core/bodies.js`)

`const AU_KM`을 `export const AU_KM`으로 바꾸고, 파일 맨 위에 `import { ellipsePoint } from './kepler.js';`를 넣는다. `BODY_DATA`의 트리톤 뒤에 더한다.

```js
  // Dwarf planets, on flat circles like the planets (Pluto's real orbit is tilted 17
  // degrees and stretched; that is left out).
  {
    id: 'ceres', name: '세레스', nameEn: 'Ceres', kind: 'dwarf', radiusKm: 469.7,
    parent: 'sun', orbitKm: 2.7692 * AU_KM, periodS: 1680 * DAY_S, direction: [0.5, 0.05, 0.87],
  },
  {
    id: 'pluto', name: '명왕성', nameEn: 'Pluto', kind: 'dwarf', radiusKm: 1188.3,
    parent: 'sun', orbitKm: 39.482 * AU_KM, periodS: 90560 * DAY_S, direction: [-0.71, 0.1, -0.7],
  },
  {
    id: 'charon', name: '카론', nameEn: 'Charon', kind: 'moon', radiusKm: 606,
    parent: 'pluto', orbitKm: 19591, periodS: 6.387 * DAY_S, direction: [0.8, 0.1, 0.6],
  },
  // Halley's Comet on its real ellipse (0.586 to 35.1 AU, backwards, tilted 18 degrees).
  // The real comet is near aphelion now, with no tail for decades; the game clock starts
  // 60 days before perihelion instead, so the tail grows while you watch.
  {
    id: 'halley', name: '핼리 혜성', nameEn: "Halley's Comet", kind: 'comet', radiusKm: 5.5, parent: 'sun',
    ellipse: {
      semiMajorKm: 17.834 * AU_KM, eccentricity: 0.96714, periodS: 27510 * DAY_S,
      perihelionAtS: 60 * DAY_S, perihelionDirection: [0.2, 0, -0.98], tiltRad: 0.31, retrograde: true,
    },
  },
```

`placeBodies`의 `if (item.parent) { ... }` 안을 타원과 원으로 나눈다.

```js
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// Where a body on an ellipse is: its direction from the Sun and its real distance.
function onEllipse(ellipse, timeS) {
  const { x, y, r } = ellipsePoint(ellipse, timeS);
  const toPerihelion = normalize(ellipse.perihelionDirection);
  // The planets go from +x toward +z; flat is that way, then the plane is tipped up.
  const flat = normalize(cross(toPerihelion, [0, 1, 0]));
  const along = flat.map((n, i) => n * Math.cos(ellipse.tiltRad) + [0, 1, 0][i] * Math.sin(ellipse.tiltRad));
  const side = ellipse.retrograde ? -y : y;
  return { direction: normalize(toPerihelion.map((n, i) => n * x + along[i] * side)), sunKm: r };
}
```

```js
    let sunKm;
    if (item.parent) {
      const parent = placed.get(item.parent);
      if (!parent) throw new Error(`parent ${item.parent} must come before ${item.id}`);
      const factor = parent.kind === 'star' ? DISTANCE_COMPRESSION : SATELLITE_COMPRESSION;
      let direction;
      let realKm = item.orbitKm;
      if (item.ellipse) {
        ({ direction, sunKm } = onEllipse(item.ellipse, timeS));
        realKm = sunKm;
      } else {
        // Negative: counterclockwise seen from +y (north) in Babylon's left-handed frame.
        const angle = item.periodS ? ((item.retrograde ? 2 : -2) * Math.PI * timeS) / item.periodS : 0;
        direction = normalize(turnAboutY(item.direction, angle));
      }
      const distance = compressedCenterDistance(realKm, item.edgeKm ?? parent.radiusKm, item.radiusKm, factor);
      position = direction.map((n, i) => parent.position[i] + n * distance);
    }
    const { id, name, nameEn, kind, radiusKm, parent = null } = item;
    const body = { id, name, nameEn, kind, radiusKm, parent, position: Object.freeze(position) };
    if (sunKm !== undefined) body.sunKm = sunKm;
    placed.set(id, Object.freeze(body));
```

`flat`의 방향이 맞는지는 "Halley goes round the other way" 검사가 잡는다. 실패하면 `cross`의 인자 순서를 바꾼다.

- [ ] **Step 4: 사실 문장 넷** (`src/core/facts.js` 끝)

```js
  ceres: '소행성대 전체 질량의 약 3분의 1을 혼자 차지합니다.',
  pluto: '하트 모양의 스푸트니크 평원은 질소 얼음으로 덮여 있습니다.',
  charon: '지름이 명왕성의 절반이라, 둘은 서로의 둘레를 도는 이중 천체입니다.',
  halley: '약 75년마다 돌아오며, 다음 근일점은 2061년 7월입니다.',
```

- [ ] **Step 5: 기존 검사 고치기**
  - `tests/bodies.test.js` 첫 검사: 제목을 `'the table holds the Sun, eight planets, twenty-one moons, two dwarf planets and a comet at real radii'`로, id 목록 끝에 `'ceres', 'pluto', 'charon', 'halley'`를 더한다.
  - `tests/bodies.test.js` "planets sit at 1/100": `BODY_DATA.filter((d) => d.parent && !d.ellipse)`.
  - `tests/orbits.test.js` "every orbiting body has a real orbital period": `assert.ok((d.periodS ?? d.ellipse?.periodS) > 0, d.id)`.
  - `tests/orbits.test.js` "orbits keep their distance from the parent"와 그 밖에 `BODY_DATA.filter((x) => x.parent)`를 도는 검사: `&& !x.ellipse`를 더한다.

- [ ] **Step 6: 통과 확인** — `npx vitest run` → 모두 통과(임무 수 검사는 아직 17이라 그대로 통과).
- [ ] **Step 7: 커밋** — `git commit -am "Add Ceres, Pluto, Charon and Halley's Comet to the table of bodies"` (새 파일은 `git add`).

---

### Task 3: 혜성 활동도와 소행성대 계산

**Files:**
- Create: `src/core/comet.js`, `src/core/belt.js`
- Test: `tests/comet.test.js`, `tests/belt.test.js`

**Interfaces:**
- Consumes: `AU_KM`, `DISTANCE_COMPRESSION` (`bodies.js`).
- Produces:
  - `cometActivity(rAu): number` (0 → 1), `tailLengthKm(rAu): number`, `COMA_KM = 3000`.
  - `BELT = { innerKm, outerKm, halfHeightKm, cellKm }` (압축 뒤 km), `inBelt(position, sunPosition): boolean`, `rocksNear(position, sunPosition): Array<{ position: [x,y,z], radiusKm, seed }>`, `beltPoints(count): Array<[x,y,z]>` (태양 기준 km, 고정 씨앗).

- [ ] **Step 1: 실패하는 검사 쓰기**

`tests/comet.test.js`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { cometActivity, tailLengthKm } from '../src/core/comet.js';

test('a comet is fully awake at perihelion and asleep beyond 5 AU', () => {
  assert.equal(cometActivity(0.586), 1);
  assert.equal(cometActivity(0.3), 1);
  assert.equal(cometActivity(5.01), 0);
  assert.equal(cometActivity(35), 0);
});

test('the nearer the Sun, the more active', () => {
  assert.ok(cometActivity(1) > cometActivity(1.32) && cometActivity(1.32) > cometActivity(3));
});

test('the tail is 500,000 km at perihelion and about 150,000 km at the start', () => {
  assert.equal(tailLengthKm(0.586), 500000);
  assert.ok(Math.abs(tailLengthKm(1.324) - 147000) < 3000);
  assert.equal(tailLengthKm(10), 0);
});
```

`tests/belt.test.js`

```js
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { BELT, inBelt, rocksNear, beltPoints } from '../src/core/belt.js';

const SUN = [0, 0, 0];
const mid = (BELT.innerKm + BELT.outerKm) / 2;

test('the belt spans 2.2 to 3.2 AU after the 1/100 squeeze', () => {
  assert.ok(Math.abs(BELT.innerKm - 2.2 * 149597870.7 / 100) < 1);
  assert.ok(Math.abs(BELT.outerKm - 3.2 * 149597870.7 / 100) < 1);
});

test('inside and outside the belt', () => {
  assert.equal(inBelt([mid, 0, 0], SUN), true);
  assert.equal(inBelt([0, 0, -mid], SUN), true);
  assert.equal(inBelt([BELT.innerKm - 1000, 0, 0], SUN), false);
  assert.equal(inBelt([BELT.outerKm + 1000, 0, 0], SUN), false);
  assert.equal(inBelt([mid, BELT.halfHeightKm + 1, 0], SUN), false);
  assert.equal(inBelt([mid + 5e6, 0, 0], [5e6, 0, 0]), true);
});

test('the same spot always has the same rocks', () => {
  const a = rocksNear([mid, 100, 3000], SUN);
  const b = rocksNear([mid + 10, 100, 3000], SUN);
  assert.deepEqual(a, b);
  assert.ok(a.length > 0 && a.length <= 27);
});

test('rocks are 20 to 120 km across and lie in the belt, on both sides of the Sun', () => {
  for (const x of [mid, -mid]) {
    const rocks = rocksNear([x, 0, 0], SUN);
    assert.ok(rocks.length > 0, `none at ${x}`);
    for (const rock of rocks) {
      assert.ok(rock.radiusKm >= 10 && rock.radiusKm <= 60);
      assert.equal(inBelt(rock.position, SUN), true);
    }
  }
});

test('no rocks outside the belt, and none past its edge when standing at the edge', () => {
  assert.deepEqual(rocksNear([BELT.outerKm + 200000, 0, 0], SUN), []);
  for (const rock of rocksNear([BELT.outerKm - 100, 0, 0], SUN)) assert.equal(inBelt(rock.position, SUN), true);
});

test('about four cells in ten hold a rock', () => {
  let rocks = 0;
  for (let i = 0; i < 40; i++) rocks += rocksNear([mid + i * 3 * BELT.cellKm, 0, 0], SUN).length;
  assert.ok(rocks > 40 * 27 * 0.3 && rocks < 40 * 27 * 0.5, `${rocks}`);
});

test('the far band: fixed points all inside the belt', () => {
  const points = beltPoints(3000);
  assert.equal(points.length, 3000);
  assert.deepEqual(points[7], beltPoints(3000)[7]);
  for (const p of points) assert.equal(inBelt(p, SUN), true);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run tests/comet.test.js tests/belt.test.js`.

- [ ] **Step 3: 구현**

`src/core/comet.js`

```js
// How lively a comet is at a given real distance from the Sun (AU, before the
// distance squeeze): 1 at Halley's perihelion, fading to nothing by 5 AU.
const PERIHELION_AU = 0.586;
const ASLEEP_AU = 5;
export const TAIL_MAX_KM = 500000;
// Radius of the glow round the nucleus at full activity.
export const COMA_KM = 3000;

export function cometActivity(rAu) {
  if (rAu > ASLEEP_AU) return 0;
  return Math.min(1, (PERIHELION_AU / rAu) ** 1.5);
}

export function tailLengthKm(rAu) {
  return TAIL_MAX_KM * cometActivity(rAu);
}
```

`src/core/belt.js`

```js
import { AU_KM, DISTANCE_COMPRESSION } from './bodies.js';

// The asteroid belt: scenery, not bodies. Nothing here is landed on, logged or hit.
// Distances are game km (after the 1/100 squeeze), measured from the Sun's centre.
export const BELT = {
  innerKm: (2.2 * AU_KM) / DISTANCE_COMPRESSION,
  outerKm: (3.2 * AU_KM) / DISTANCE_COMPRESSION,
  halfHeightKm: 20000,
  // Space is cut into cubes this wide; each may hold one rock.
  cellKm: 20000,
};
const ROCK_SHARE = 0.4;

export function inBelt(position, sunPosition) {
  const dx = position[0] - sunPosition[0];
  const dy = position[1] - sunPosition[1];
  const dz = position[2] - sunPosition[2];
  const r = Math.hypot(dx, dz);
  return r >= BELT.innerKm && r <= BELT.outerKm && Math.abs(dy) <= BELT.halfHeightKm;
}

// Three steady numbers in 0..1 for a cell, the same every time (negative cells too).
function cellNumbers(i, j, k) {
  let h = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ Math.imul(k, 83492791)) >>> 0;
  const next = () => {
    h = (Math.imul(h ^ (h >>> 15), 2246822519) + 3266489917) >>> 0;
    return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
  };
  return [next(), next(), next(), next(), next()];
}

// The rocks in the 27 cells round the traveler. Real asteroids are far smaller and a
// million km apart; these are enlarged and crowded so there is something to see.
export function rocksNear(position, sunPosition) {
  const { cellKm } = BELT;
  const base = position.map((n, a) => Math.floor((n - sunPosition[a]) / cellKm));
  const rocks = [];
  for (let i = base[0] - 1; i <= base[0] + 1; i++) {
    for (let j = base[1] - 1; j <= base[1] + 1; j++) {
      for (let k = base[2] - 1; k <= base[2] + 1; k++) {
        const [has, x, y, z, size] = cellNumbers(i, j, k);
        if (has >= ROCK_SHARE) continue;
        const at = [
          sunPosition[0] + (i + x) * cellKm, sunPosition[1] + (j + y) * cellKm, sunPosition[2] + (k + z) * cellKm,
        ];
        if (!inBelt(at, sunPosition)) continue;
        rocks.push({ position: at, radiusKm: 10 + size * 50, seed: Math.floor(has * 1e6) });
      }
    }
  }
  return rocks;
}

// Fixed points for the faint band seen from afar, relative to the Sun.
export function beltPoints(count) {
  let seed = 41233;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const points = [];
  for (let n = 0; n < count; n++) {
    const angle = rand() * Math.PI * 2;
    const r = BELT.innerKm + rand() * (BELT.outerKm - BELT.innerKm);
    points.push([r * Math.cos(angle), (rand() * 2 - 1) * BELT.halfHeightKm, r * Math.sin(angle)]);
  }
  return points;
}
```

- [ ] **Step 4: 통과 확인** — 두 파일 모두 통과. "about four cells in ten"이 범위를 벗어나면 해시가 고르지 않은 것이니 `cellNumbers`의 섞기를 고친다(검사 범위를 넓히지 않는다).
- [ ] **Step 5: 커밋** — `git add src/core/comet.js src/core/belt.js tests/comet.test.js tests/belt.test.js && git commit -m "Add comet activity and the asteroid belt's rock layout"`

---

### Task 4: 사진 임무 둘과 수첩 합계

**Files:**
- Modify: `src/core/missions.js` (`MISSIONS` 끝)
- Modify: `tests/missions.test.js`, `tests/progress.test.js`

**Interfaces:**
- Consumes: `BODIES`의 `pluto`, `charon`, `halley`.
- Produces: 임무 id `plutoCharon`, `cometTail`. `MISSIONS.length === 19`.

- [ ] **Step 1: 실패하는 검사 쓰기**

`tests/missions.test.js`: "there are seventeen missions" 검사의 17 두 곳을 19로, 제목을 nineteen으로. 파일 끝에 더한다.

```js
test('Pluto and Charon: both in frame from within 50,000 km of Pluto', () => {
  const pluto = bodyById('pluto');
  const charon = bodyById('charon');
  // Stand off to the side so the two sit next to each other.
  const side = unit([charon.position[2] - pluto.position[2], 0, pluto.position[0] - charon.position[0]]);
  const spot = add(pluto.position, scale(side, 20000));
  const middle = scale(add(pluto.position, charon.position), 0.5);
  assert.ok(shoot(spot, middle).includes('plutoCharon'));
  const far = add(pluto.position, scale(side, 200000));
  assert.ok(!shoot(far, middle).includes('plutoCharon'));
  // Close, but looking away.
  assert.ok(!shoot(spot, sub(scale(spot, 2), middle)).includes('plutoCharon'));
});

test('the comet tail: Halley and the Sun together from within 5,000 km', () => {
  const halley = bodyById('halley');
  const away = unit(sub(halley.position, bodyById('sun').position));
  const behind = add(halley.position, scale(away, 2000));
  assert.ok(shoot(behind, 'sun').includes('cometTail'));
  assert.ok(!shoot(add(halley.position, scale(away, 20000)), 'sun').includes('cometTail'));
  assert.ok(!shoot(behind, add(behind, away)).includes('cometTail'));
});
```

`tests/progress.test.js` 끝에 더한다.

```js
test('a log saved when there were 75 slots still reads, as 75 of 85', () => {
  const old = {
    discovered: BODIES.slice(0, 29).map((b) => b.id),
    landed: BODIES.slice(0, 29).map((b) => b.id),
    photos: MISSIONS.slice(0, 17).map((m) => m.id),
  };
  const read = sanitizeProgress(JSON.parse(JSON.stringify(old)), BODIES, MISSIONS);
  const summary = summarize(read, BODIES, MISSIONS);
  assert.deepEqual(score(summary), { done: 75, total: 85 });
  assert.equal(isComplete(summary), false);
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run tests/missions.test.js tests/progress.test.js`.

- [ ] **Step 3: 구현** (`MISSIONS`의 `milkyWayHeart` 뒤)

```js
  {
    id: 'plutoCharon',
    name: '명왕성과 카론',
    hint: '명왕성 표면 50,000km 안에서 명왕성과 카론을 한 화면에 (뉴허라이즌스, 2015년)',
    check: (s) => s.distanceToSurface('pluto') <= 50000 && s.seen('pluto') && s.seen('charon'),
  },
  {
    id: 'cometTail',
    name: '혜성의 꼬리',
    hint: '핼리 혜성 5,000km 안에서 혜성과 태양을 한 화면에 (지오토, 1986년)',
    check: (s) => s.distanceToSurface('halley') <= 5000 && s.seen('halley') && s.frame('sun').visible,
  },
```

- [ ] **Step 4: 통과 확인** — `npx vitest run` 전체 통과.
- [ ] **Step 5: 커밋** — `git commit -am "Add two photo missions: Pluto with Charon, and the comet's tail"`

---

### Task 5: 지도 세 장과 겉모습

**Files:**
- Create: `public/assets/planets/ceres.jpg`, `pluto.jpg`, `charon.jpg` (받은 것만)
- Modify: `src/render/planets.js` (`LOOKS`)
- Modify: `THIRD-PARTY.md`

**Interfaces:**
- Consumes: `BODIES`의 새 id.
- Produces: `LOOKS.ceres`, `LOOKS.pluto`, `LOOKS.charon`, `LOOKS.halley`. `createBodyMeshes`가 넷을 그린다.

- [ ] **Step 1: 내려받기** (원본은 스크래치패드에 둔다)

차례로 시도하고, 받은 주소를 `THIRD-PARTY.md`에 적는다.

| 천체 | 1순위 | 2순위 |
|---|---|---|
| 세레스 | NASA 포토저널 Dawn 전체 지도(`assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/...`에서 PIA 번호를 찾는다) | USGS `planetarymaps.usgs.gov/mosaic/` 의 Ceres Dawn FC 전체 지도 |
| 명왕성 | NASA 포토저널 New Horizons 전체 컬러 지도 | USGS Pluto New Horizons LORRI/MVIC 전체 지도 |
| 카론 | NASA 포토저널 New Horizons 카론 전체 지도 | USGS Charon New Horizons 전체 지도 |

정확한 파일 주소는 실행할 때 찾아 확인한다(추측한 주소를 적어 두지 않는다). 받은 파일은 사용자 승인을 이미 받은 세 장이며, 다른 파일은 받지 않는다.

- [ ] **Step 2: 2048×1024 JPEG로 줄이기** (Pillow)

```python
from PIL import Image
Image.MAX_IMAGE_PIXELS = None
def shrink(src, dst, fill=None):
    im = Image.open(src).convert('RGB').resize((2048, 1024), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=88, optimize=True)
```

- 지도가 0 → 360도 경도인지 -180 → 180인지에 따라 이음매 위치가 다르다. 어느 쪽이든 구에 감기므로 그대로 쓴다.
- 찍지 못한 남쪽(명왕성, 카론)이 검게 비어 있으면 트리톤처럼 둘레 평균색으로 채운다: 밝기 8 미만 픽셀을 지도 전체의 밝은 픽셀 평균색으로 바꾼다.
- 세 장 합계가 2MB를 넘으면 quality를 80으로 낮춘다. `ls -l`로 크기를 적어 둔다.

- [ ] **Step 3: `LOOKS`에 더하기**

```js
  ceres: {
    shader: 'textured', map: 'ceres.jpg', saturation: 0.3, tint: [1, 1, 1], base: [0.35, 0.34, 0.33],
    mapWeight: 1, haze: 0, detail: 0.12, dayS: 9.074 * 3600,
  },
  // Pluto turns backwards once in 6.387 days, the same time Charon takes to circle it,
  // so each keeps one face toward the other.
  pluto: {
    shader: 'textured', map: 'pluto.jpg', saturation: 0.9, tint: [1, 0.97, 0.92], base: [0.7, 0.6, 0.5],
    mapWeight: 1, haze: 0.15, detail: 0.08, dayS: -6.387 * 86400,
  },
  charon: {
    shader: 'textured', map: 'charon.jpg', saturation: 0.5, tint: [1, 1, 1], base: [0.55, 0.53, 0.52],
    mapWeight: 1, haze: 0, detail: 0.1, dayS: 6.387 * 86400,
  },
  // The nucleus reflects 4% of sunlight: nearly black.
  halley: { shader: 'rocky', colorA: [0.05, 0.05, 0.05], colorB: [0.16, 0.15, 0.14], cap: 0, haze: 0, contrast: 0.6, craters: 0.5, dayS: 2.2 * 86400 },
```

받지 못한 지도는 그 줄을 `rocky`로 바꾼다(예: 세레스 `colorA: [0.2, 0.2, 0.2], colorB: [0.4, 0.39, 0.38], craters: 0.9, contrast: 0.4`).

- [ ] **Step 4: `THIRD-PARTY.md` 표에 세 줄 더하기** — 실제 받은 주소와 PIA 번호, "NASA 자료, 저작권 없음" 또는 "미국 정부 저작물, 저작권 없음".
- [ ] **Step 5: 확인** — `npx vitest run`(precache 검사 포함) 통과, `npm run build` 성공.
- [ ] **Step 6: 커밋** — `git add public/assets/planets src/render/planets.js THIRD-PARTY.md && git commit -m "Draw Ceres, Pluto and Charon from NASA maps, and Halley's dark nucleus"`

---

### Task 6: 혜성의 코마와 꼬리 그리기

**Files:**
- Create: `src/render/comet.js`, `src/render/shaders/glow.vert`, `src/render/shaders/coma.frag`, `src/render/shaders/tail.frag`
- Modify: `src/render/world.js`

**Interfaces:**
- Consumes: `cometActivity`, `tailLengthKm`, `COMA_KM` (Task 3), `AU_KM`, `KM_PER_UNIT`, 놓인 천체의 `sunKm` (Task 2).
- Produces: `createComet(scene): { update(body, travelerKm, sunPositionKm) }`. `body`는 이번 프레임의 핼리.

- [ ] **Step 1: 셰이더**

`glow.vert` (uv를 그대로 넘긴다; `body.vert`는 u를 뒤집으므로 따로 쓴다)

```glsl
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform mat4 worldViewProjection;
varying vec2 vUV;
void main(){
  vUV=uv;
  gl_Position=worldViewProjection*vec4(position,1.);
}
```

`coma.frag`

```glsl
precision highp float;
varying vec2 vUV;
uniform float strength;
void main(){
  float d = length(vUV - .5) * 2.;
  float glow = pow(max(0., 1. - d), 2.5);
  gl_FragColor = vec4(vec3(.75, .9, 1.) * glow * strength, 1.);
}
```

`tail.frag` (v=0이 핵, v=1이 꼬리 끝)

```glsl
precision highp float;
varying vec2 vUV;
uniform float strength;
void main(){
  float along = vUV.y;
  float width = mix(.06, 1., along);
  float across = abs(vUV.x - .5) * 2. / width;
  float body = exp(-across * across * 3.) * pow(1. - along, 1.6);
  gl_FragColor = vec4(vec3(.62, .82, 1.) * body * strength, 1.);
}
```

- [ ] **Step 2: `src/render/comet.js`**

```js
import {
  CreatePlane, Mesh, ShaderMaterial, Effect, Vector3, Constants, TransformNode,
} from './babylon.js';
import glowVert from './shaders/glow.vert?raw';
import comaFrag from './shaders/coma.frag?raw';
import tailFrag from './shaders/tail.frag?raw';
import { AU_KM, KM_PER_UNIT } from '../core/bodies.js';
import { cometActivity, tailLengthKm, COMA_KM } from '../core/comet.js';

// Tail width at its far end, as a share of its length.
const TAIL_SPREAD = 0.22;

function glowMaterial(scene, name, fragment) {
  Effect.ShadersStore[`${name}VertexShader`] = glowVert;
  Effect.ShadersStore[`${name}FragmentShader`] = fragment;
  const material = new ShaderMaterial(name, scene, { vertex: name, fragment: name }, {
    attributes: ['position', 'uv'], uniforms: ['worldViewProjection', 'strength'],
  });
  material.alphaMode = Constants.ALPHA_ADD;
  material.needAlphaBlending = () => true;
  material.disableDepthWrite = true;
  material.backFaceCulling = false;
  return material;
}

// The glow round a comet's nucleus and the tail blown straight away from the Sun.
// Both fade with distance from the Sun (core/comet.js) and vanish past 5 AU.
export function createComet(scene) {
  const comaMaterial = glowMaterial(scene, 'coma', comaFrag);
  const coma = CreatePlane('coma', { size: 1 }, scene);
  coma.billboardMode = Mesh.BILLBOARDMODE_ALL;
  coma.material = comaMaterial;
  coma.isPickable = false;

  // Two planes crossed along the tail's axis so it shows from every side. Each plane
  // spans x -0.5..0.5 and y 0..1 (pivot at the nucleus end), with +y pointing away from the Sun.
  const tailMaterial = glowMaterial(scene, 'tail', tailFrag);
  const tail = new TransformNode('tail', scene);
  for (const turn of [0, Math.PI / 2]) {
    const plane = CreatePlane(`tail${turn}`, { size: 1, sideOrientation: Mesh.DOUBLESIDE }, scene);
    plane.bakeTransformIntoVertices(plane.computeWorldMatrix(true).clone().setTranslation(new Vector3(0, 0.5, 0)));
    plane.rotation.y = turn;
    plane.parent = tail;
    plane.material = tailMaterial;
    plane.isPickable = false;
  }

  function update(body, travelerKm, sunPositionKm) {
    const activity = cometActivity(body.sunKm / AU_KM);
    const on = activity > 0;
    coma.setEnabled(on);
    tail.setEnabled(on);
    if (!on) return;
    const rel = body.position.map((n, i) => (n - travelerKm[i]) / KM_PER_UNIT);
    const comaSize = (2 * COMA_KM * (0.4 + 0.6 * activity)) / KM_PER_UNIT;
    coma.position.set(rel[0], rel[1], rel[2]);
    coma.scaling.setAll(comaSize);
    comaMaterial.setFloat('strength', 0.5 + 0.5 * activity);

    const length = tailLengthKm(body.sunKm / AU_KM) / KM_PER_UNIT;
    const away = new Vector3(...body.position.map((n, i) => n - sunPositionKm[i])).normalize();
    tail.position.set(rel[0], rel[1], rel[2]);
    tail.scaling.set(length * TAIL_SPREAD, length, length * TAIL_SPREAD);
    // Turn the node's +y onto the direction away from the Sun.
    const up = Vector3.Up();
    const axis = Vector3.Cross(up, away);
    const angle = Math.acos(Math.max(-1, Math.min(1, Vector3.Dot(up, away))));
    tail.rotationQuaternion = axis.lengthSquared() < 1e-12
      ? Quaternion.Identity()
      : Quaternion.RotationAxis(axis.normalize(), angle);
    tailMaterial.setFloat('strength', 0.35 + 0.45 * activity);
  }

  return { update };
}
```

`Quaternion`도 `./babylon.js`에서 가져온다. `away`가 정확히 -y이면 `axis`가 0이 되어 꼬리가 뒤집히지 않지만, 핼리 궤도는 18도 기울기라 그 방향이 나오지 않는다.

- [ ] **Step 3: `world.js`에 붙이기**

`import { createComet } from './comet.js';`, `createCraft` 줄 뒤에 `const comet = createComet(scene);`. `update` 안 `craftMeshes.update(...)` 뒤에 넣는다.

```js
    const halley = now.find((b) => b.kind === 'comet');
    if (halley) comet.update(halley, position, sunNow.position);
```

- [ ] **Step 4: 브라우저 확인** — 저장소 루트에 임시 `preview-comet.html`을 만든다. `createWorld`를 가져와 `bodiesAt(t)`의 핼리에서 태양 반대쪽 옆 30만km에 카메라를 놓고 핼리를 바라보게 한 뒤, t = 0, 60일, 300일 세 장을 찍는다(`world.update`에 `craft: craftAt(t, bodies)`를 넘기고, 첫 장 전에 1초 기다린다).
  - 기대: 0일과 60일에 꼬리가 태양 반대쪽으로 뻗고 60일이 더 길다. 300일(약 4AU)에는 짧고 흐리다. 콘솔 오류 0개.
  - 확인 뒤 `preview-comet.html`을 지운다.
- [ ] **Step 5: 커밋** — `git add src/render/comet.js src/render/shaders/glow.vert src/render/shaders/coma.frag src/render/shaders/tail.frag src/render/world.js && git commit -m "Give Halley's Comet a glowing coma and a tail that points away from the Sun"`

---

### Task 7: 소행성대 그리기와 들어설 때 알림

**Files:**
- Create: `src/render/belt.js`
- Modify: `src/render/world.js`, `src/main.js`, `src/ui/messages.js`
- Test: `tests/messages.test.js`

**Interfaces:**
- Consumes: `beltPoints`, `rocksNear`, `inBelt` (Task 3), `shader` (`planets.js`), `rocky.frag`.
- Produces: `createBelt(scene): { update(travelerKm, sunPositionKm, sunDirection) }`. `world.update`의 반환값에 `inBelt: boolean`. `eventMessage({ type: 'beltEntered' })`.

- [ ] **Step 1: 알림 문구 검사** (`tests/messages.test.js` 끝)

```js
test('entering the asteroid belt says how empty the real one is', () => {
  assert.equal(
    eventMessage({ type: 'beltEntered' }),
    '소행성대에 들어섰습니다.\n실제로는 소행성 사이가 평균 100만km쯤 떨어져 있습니다.',
  );
});
```

- [ ] **Step 2: 구현** (`src/ui/messages.js`의 `switch`)

```js
    case 'beltEntered':
      return '소행성대에 들어섰습니다.\n실제로는 소행성 사이가 평균 100만km쯤 떨어져 있습니다.';
```

- [ ] **Step 3: `src/render/belt.js`**

```js
import { PointsCloudSystem, Vector3, Color3, Color4, CreateIcoSphere } from './babylon.js';
import rockyFrag from './shaders/rocky.frag?raw';
import { shader } from './planets.js';
import { KM_PER_UNIT } from '../core/bodies.js';
import { beltPoints, rocksNear } from '../core/belt.js';

const BAND_POINTS = 3000;
const MAX_ROCKS = 27;

// The asteroid belt: a faint band of points seen from afar, and a few lumpy rocks
// round the traveler inside it (core/belt.js decides where they are).
export async function createBelt(scene) {
  const points = beltPoints(BAND_POINTS);
  const band = new PointsCloudSystem('beltBand', 1.2, scene);
  let n = 0;
  band.addPoints(points.length, (p) => {
    const [x, y, z] = points[n++];
    p.position = new Vector3(x / KM_PER_UNIT, y / KM_PER_UNIT, z / KM_PER_UNIT);
    const v = 0.16 + ((n * 37) % 100) / 500;
    p.color = new Color4(v, v * 0.95, v * 0.88, 1);
  });
  await band.buildMeshAsync();
  band.mesh.alwaysSelectAsActiveMesh = true;
  band.mesh.isPickable = false;

  const material = shader(scene, 'beltRock', rockyFrag, ['sun', 'colorA', 'colorB', 'cap', 'haze', 'contrast', 'craters']);
  material.setColor3('colorA', new Color3(0.16, 0.15, 0.14));
  material.setColor3('colorB', new Color3(0.4, 0.37, 0.34));
  material.setFloat('cap', 0);
  material.setFloat('haze', 0);
  material.setFloat('contrast', 0.7);
  material.setFloat('craters', 0.8);
  const rocks = [];
  for (let i = 0; i < MAX_ROCKS; i++) {
    const rock = CreateIcoSphere(`beltRock${i}`, { radius: 1, subdivisions: 2, flat: true }, scene);
    rock.material = material;
    rock.isPickable = false;
    rock.setEnabled(false);
    rocks.push(rock);
  }

  // sunDirection: unit vector from the traveler toward the Sun (the rocks are close
  // together, so one light direction serves them all).
  function update(travelerKm, sunPositionKm, sunDirection) {
    band.mesh.position.set(
      (sunPositionKm[0] - travelerKm[0]) / KM_PER_UNIT,
      (sunPositionKm[1] - travelerKm[1]) / KM_PER_UNIT,
      (sunPositionKm[2] - travelerKm[2]) / KM_PER_UNIT,
    );
    const near = rocksNear(travelerKm, sunPositionKm);
    material.setVector3('sun', new Vector3(...sunDirection));
    rocks.forEach((rock, i) => {
      const data = near[i];
      rock.setEnabled(Boolean(data));
      if (!data) return;
      rock.position.set(...data.position.map((v, a) => (v - travelerKm[a]) / KM_PER_UNIT));
      // Lumpy, not round: squash each one its own way.
      const r = data.radiusKm / KM_PER_UNIT;
      rock.scaling.set(r, r * (0.55 + (data.seed % 40) / 100), r * (0.7 + (data.seed % 23) / 100));
      rock.rotation.set(data.seed % 6, (data.seed >> 3) % 6, (data.seed >> 6) % 6);
    });
  }

  return { update };
}
```

- [ ] **Step 4: `world.js`에 붙이기**

`import { createBelt } from './belt.js';`, `import { inBelt } from '../core/belt.js';`. `await createStars(scene);` 뒤에 `const belt = await createBelt(scene);`. `update` 안 혜성 줄 뒤에 넣는다.

```js
    belt.update(position, sunNow.position, directions[sunNow.id]);
```

반환 객체에 `inBelt: inBelt(traveler, sunNow.position),`를 더한다.

- [ ] **Step 5: `main.js`에서 알림** — `let simTime = 0;` 근처에 `let beltSeen = false;`. `if (view.ringCrossed) ...` 줄 뒤에 넣는다.

```js
    if (view.inBelt && !beltSeen) {
      beltSeen = true;
      toast.show(eventMessage({ type: 'beltEntered' }));
    }
```

- [ ] **Step 6: 브라우저 확인** — 임시 `preview-belt.html`로 두 장을 찍는다.
  - 태양 위쪽(+y) 1,000만km에서 태양을 내려다봄: 태양 둘레에 흐린 고리 띠가 보인다.
  - 띠 한가운데(태양에서 약 400만km, y=0)에 서서 둘러봄: 바위가 몇 개 보이고 해 쪽 면이 밝다.
  - 콘솔 오류 0개. 확인 뒤 파일을 지운다.
- [ ] **Step 7: 통과 확인과 커밋** — `npx vitest run` 통과. `git add src/render/belt.js src/render/world.js src/main.js src/ui/messages.js tests/messages.test.js && git commit -m "Show the asteroid belt: a faint band from afar, rocks up close, a note on entering"`

---

### Task 8: 미니맵, 도움말, 문서

**Files:**
- Modify: `src/ui/minimap.js`, `index.html`(도움말 문장), `docs/Space-Oddity-상세기획서.md`, `README.md`
- Modify: 작업 기억 파일(저장소 밖)

**Interfaces:**
- Consumes: `BELT` (Task 3), 새 천체의 kind.

- [ ] **Step 1: 미니맵** (`src/ui/minimap.js`)

`COLORS`에 `ceres: '#b5aea6', pluto: '#d9bfa5', halley: '#bfe6ff'`를 더한다. `import { BELT } from '../core/belt.js';`. `draw` 안을 고친다.

```js
    const planets = bodies.filter((b) => b.kind === 'planet' || b.kind === 'dwarf');
    const comets = bodies.filter((b) => b.kind === 'comet');
```

궤도 원을 그린 뒤 소행성대 점선을 그린다.

```js
    // The asteroid belt: one dotted ring down its middle.
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, radius * Math.sqrt((BELT.innerKm + BELT.outerKm) / 2 / outerKm), 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
```

점 그리기 반복을 `for (const body of [sun, ...planets, ...comets])`로, 반지름을 `body.kind === 'star' ? 4 : body.kind === 'planet' ? 2.6 : 2`로, 선택 등록을 `if (body.kind !== 'star') dots.push(...)`로 바꾼다. 파일 머리 주석의 "the eight planets"를 "the planets, dwarf planets and the comet"으로 고친다.

- [ ] **Step 2: 도움말** (`index.html`) — "태양, 여덟 행성, 달과 큰 위성 다섯의 실제 표면"을 "태양, 여덟 행성, 위성 21개, 왜행성 둘, 핼리 혜성의 실제 표면"으로 바꾼다.

- [ ] **Step 3: 브라우저 확인** — `oddity-dev` 미리보기에서 미니맵에 명왕성(테두리), 세레스, 핼리 점과 점선 고리가 보이는지, 375px 폭에서 깨지지 않는지, 수첩 버튼이 "수첩 n/85"인지, 콘솔 오류 0개인지 본다.

- [ ] **Step 4: 기획서와 README** — 설계서 F장의 목록대로 고친다.
  - 기획서 5.1: 표에 네 줄, "모두 33개다(태양, 행성 8, 위성 21, 왜행성 2, 혜성 1)". 5.3: 핼리의 타원 궤도와 근일점 60일 전 시작. 10: 세레스·명왕성·카론 지도 줄, 핼리 줄, 소행성대 줄. 11.2: 임무 두 줄. 11.3: 33줄, 19줄, 85칸. 12.1: 미니맵 문장. 15: `kepler.js`, `comet.js`, `belt.js`, `render/comet.js`, `render/belt.js`. 19.1: 검사 수(실제 `npx vitest run` 숫자)와 항목. 20: 천체 줄. 21: "소행성대"를 지운다. 4장의 "75칸"도 85칸으로.
  - README: 천체 수, 임무 표 두 줄, "발견 33, 착지 33, 사진 임무 19. 모두 85칸", 시험 수.
  - 숫자는 추측하지 않고 `grep -n "29\|75\|17개\|17줄" README.md docs/Space-Oddity-상세기획서.md`로 남은 곳을 찾아 고친다.

- [ ] **Step 5: 마지막 확인** — `npx vitest run` 전체 통과, `npm run build` 성공, `git status`에 임시 미리보기 파일과 원본 지도가 없다.
- [ ] **Step 6: 커밋** — `git commit -am "Show the new bodies on the minimap and bring the docs up to date"`
- [ ] **Step 7: 기억 파일 고치기** — "나"가 끝났고 다음은 "다"(실제 사건)라는 것, 지도 세 장의 실제 크기.
