# 무전 친구 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 우주정거장, 땅 위 시설, 탐사선에서 들은 말이 단서로 쌓여 숨은 장소 다섯을 열고, 끝에 할머니의 쪽지가 오는 곁가지 이야기를 넣는다.

**Architecture:** 규칙과 내용은 `src/core/radioFriend.js` 한 파일에 표와 순수 함수로 둔다. `main.js` 는 그 함수에 묻기만 하고, 화면은 기존 쪽지 카드(`ui/noteCard.js`)와 새 그물 그림(`ui/radioWeb.js`)이 맡는다. 기록은 `progress.radio` 에 두며 261칸 셈에 들지 않는다.

**Tech Stack:** Babylon.js + Vite 웹 게임, 순수 자바스크립트(ES 모듈), vitest, `build/i18n.py`(번역 병합), `build/art-order.sh`(Codex 그림 주문).

**Spec:** `docs/superpowers/specs/2026-10-22-radio-friend-design.md`

## Global Constraints

- 커밋마다 `package.json` 의 version과 `package-lock.json` 3, 9행을 함께 올리고, 커밋 메시지는 `v0.4.NNN:` 으로 시작한다. 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 화면에 나오는 새 한국어 문장은 모두 `t(…)` 로 감싸고, en/ja/zh 번역을 같은 커밋에 `build/i18n.py --lang <l> todo` → 번호 파일 → `merge` 로 넣는다.
- 보이는 변화가 있는 커밋은 `src/core/changes.js` 맨 위에 한 줄(70자 이하)을 넣고 `node build/changes-doc.mjs` 를 돌린다. `docs/Space-Oddity-상세기획서.md` 에 날짜별 한 항목을 쓴다(사용자의 말을 인용).
- 인물은 모두 지어낸다. 실제 우주비행사·기술자의 이름이나 생김새를 쓰지 않는다. 사건(탐사선, 날짜, 장소)은 실제 것만 쓰고, 쓰기 전에 출처로 확인한다.
- 할머니의 얼굴과 목소리는 보이지 않는다. 할머니는 쪽지의 손글씨로만 나온다.
- 무전 이야기는 261칸 셈(`summarize`, `score`)에 들지 않는다.
- 새 id(만나는 이, 단서, 숨은 장소)는 천체, 탐사선, 이야기 장소, 볼거리의 id와 겹치지 않는다.
- 사진이나 그림 파일을 받기 전에 파일 이름과 크기를 말하고 사용자의 허락을 받는다. 그림은 WebP 품질 55 안팎, 사진은 JPEG 품질 62 안팎으로 작게 줄인다.
- 사용자가 개발 서버(4417)에서 놀고 있다. 여러 파일에 걸친 바뀜은 한꺼번에 저장하고, 살아 있는 `.js` 를 바꿀 때는 사본을 `node --check` 한 뒤 바꾼다.
- 대화는 고르는 선택지 없이 읽고 넘긴다. 저절로 튀어나오지 않고 "무전" 단추로만 연다.

## Review Focus

- 기록이 없는 옛 저장값(`radio` 칸 없음)이나 망가진 `radio` 값으로 게임을 열 때: 새 빈 기록으로 시작하고 수첩의 다른 칸은 그대로여야 한다. (Task 2 검사)
- 같은 만남을 두 번 누르거나(단추 연타) 카드가 열린 채 도킹이 풀릴 때: 단서가 두 번 쌓이거나 만남 수가 두 번 오르면 안 된다. (Task 1 `hear` 검사, Task 3 단추 처리)
- 숨은 장소가 열리기 전에 그 자리에 우연히 가도 기록되지 않아야 한다. (Task 4 검사)
- "기록 지우기" 뒤에 무전 탭과 단추가 처음 상태로 돌아가야 한다. (Task 2 검사)
- 호출 부호를 얻은 뒤 게임을 닫았다 다시 열면 할머니의 쪽지가 한 번만 와야 한다. (Task 7 검사)

---

### Task 1: 규칙 파일과 순수 함수

**Files:**
- Create: `src/core/radioFriend.js`
- Test: `tests/radioFriend.test.js`

**Interfaces:**
- Produces:
  - `SPEAKERS: Array<{ id, kind: 'person'|'log', at: { craft: string } | { site: string }, name: string, portrait: string|null, visits: Array<{ needs: string[], lines: string[], gives: string[] }> }>`
  - `CLUES: Array<{ id, text: string, from: string, points: string, at: [number, number] }>` (`points` 는 숨은 장소나 만나는 이의 id, `at` 은 그물 그림의 자리 0 → 1)
  - `HIDDEN: Array<{ id, name, nameEn, type: 'surface'|'near', body?, latDeg?, lonDeg?, target?, withinKm, needs: string[], text: string, at: [number, number] }>`
  - `createRadio(): { visits: {}, clues: [], found: [], callSign: false, noteAt: null, noteRead: false }`
  - `nextVisit(radio, speakerId): { index: number, lines: string[], gives: string[] } | null`
  - `hear(radio, speakerId): radio` (새 객체. 들을 것이 없으면 같은 객체를 돌려준다)
  - `openHidden(radio): string[]`
  - `foundHidden({ radio, position, restingOn, bodies, craft, sites }): string[]` (열린 것 가운데 지금 다다른 것)
  - `recordFound(radio, ids): radio`
  - `sanitizeRadio(raw): radio`
  - `speakerAt({ docked, visit }): string|null` (도킹한 탐사선 id 또는 머무는 이야기 장소 id로 만나는 이를 찾음)

- [ ] **Step 1: 실패하는 검사를 쓴다**

`tests/radioFriend.test.js` 에 다음 검사를 쓴다. 표가 아직 국제우주정거장 한 사람뿐이어도 통과해야 하는 구조 검사다.
- `createRadio()` 가 위 꼴과 같다.
- 국제우주정거장(`issCrew`): `nextVisit(createRadio(), 'issCrew').index === 0`, `hear` 뒤 `radio.visits.issCrew === 1`, 그 첫 만남의 `gives` 가 `radio.clues` 에 들어 있다.
- `hear` 를 같은 만남 조건에서 두 번 불러도 단서가 겹치지 않는다(`new Set(clues).size === clues.length`). 들을 것이 없으면 `hear(r, id) === r`.
- `needs` 를 못 채운 만남은 `nextVisit` 이 null.
- 모든 단서의 `from` 이 `SPEAKERS` 에 있고, 모든 만남의 `gives` 가 `CLUES` 에 있고, 모든 `needs` 가 어느 만남의 `gives` 에 있다.
- 도달 검사: 모든 만나는 이를 아무 차례로(무작위 섞기 200번) 만날 수 있을 때까지 만나면 `openHidden` 이 `HIDDEN` 전부가 된다.
- 모든 id가 `BODIES`, `CRAFT`, `STORIES`, `CURIOS` 의 id와 겹치지 않는다.
- `sanitizeRadio(null)`, `sanitizeRadio({ clues: ['없는id', 'issCrewSeen'] , visits: { issCrew: 99 } })` 가 모르는 id를 버리고 만남 수를 그 사람의 만남 수 이하로 자른다.

- [ ] **Step 2: 검사가 실패하는지 본다**

Run: `npx vitest run tests/radioFriend.test.js`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: `src/core/radioFriend.js` 를 만든다**

처음 표에는 국제우주정거장 한 사람(`issCrew`, `at: { craft: 'iss' }`, 첫 만남 하나, 단서 하나 `kiboLog`)만 넣고 `HIDDEN` 은 비워 둔다. 대사는 Task 3에서 쓰므로 여기서는 `t('…')` 한 줄씩 자리만 둔다. `foundHidden` 의 판정은 `core/stories.js` `completedStories` 의 `surface` / `near` 규칙과 같게 한다(`surface`: `restingOn === body` 이고 그 자리 `sites` 항목까지 `withinKm` 안, `near`: 표적의 겉에서 `withinKm` 안). `speakerAt` 은 `docked?.id` 를 먼저, 그다음 `visit?.id` 로 `at` 이 맞는 사람을 찾는다.

- [ ] **Step 4: 검사가 통과하는지 본다**

Run: `npx vitest run tests/radioFriend.test.js`
Expected: PASS

- [ ] **Step 5: 커밋한다** (화면 변화 없음: `changes.js` 줄은 넣지 않는다. 기획서 항목은 넣는다)

### Task 2: 기록 저장

**Files:**
- Modify: `src/core/progress.js` (`createProgress`, `sanitizeProgress`)
- Test: `tests/progress.test.js`

**Interfaces:**
- Consumes: `createRadio`, `sanitizeRadio` (Task 1)
- Produces: `progress.radio` (늘 있음)

- [ ] **Step 1: 실패하는 검사를 쓴다**
  - `createProgress().radio` 가 `createRadio()` 와 같다.
  - `sanitizeProgress(radio 칸이 없는 옛 저장값, …)` 의 `radio` 가 빈 기록이고 나머지 칸은 그대로다.
  - `sanitizeProgress({ ..., radio: 'junk' })` 도 빈 기록이 된다.
  - `summarize` 와 `score` 의 값이 `radio` 가 차 있어도 바뀌지 않는다.
- [ ] **Step 2: 실패를 본다** — `npx vitest run tests/progress.test.js`, Expected: FAIL
- [ ] **Step 3: 두 함수에 `radio` 를 더한다**
- [ ] **Step 4: 전체 검사** — `npx vitest run`, Expected: 모두 PASS (README의 검사 수 줄을 고친다)
- [ ] **Step 5: 커밋한다**

### Task 3: "무전" 단추와 대화 카드, 국제우주정거장 한 사람

**Files:**
- Modify: `src/core/radioFriend.js` (국제우주정거장 첫 만남의 대사, 단서 글)
- Modify: `src/ui/hud.js` (이름판 끝의 금빛 단추 `radioKey`, 기존 `momentKey` 와 같은 꼴, 그림은 무전기 안테나 선 그림 SVG)
- Modify: `src/main.js` (단추를 보일지 매 프레임 `speakerAt` + `nextVisit` 로 정함, 누르면 카드)
- Modify: `src/ui/noteCard.js` (필요하면: 종이 없는 쪽(`text` 없음)에서 얼굴 그림을 `assets/notebook/` 밖에서도 받게 `image` 에 경로를 받는 정도만)
- Modify: `src/i18n/en.json`, `ja.json`, `zh.json`
- Test: `tests/radioFriend.test.js`

**Interfaces:**
- Consumes: `speakerAt`, `nextVisit`, `hear` (Task 1)
- Produces: `talkNote(speaker, visit): note` — `noteCard.show` 에 넘길 쪽지 객체. `pages: [{ image: speaker.portrait, scene: '<이름>', say: null }, ...lines.map((line) => ({ scene: line }))]`, `title` 은 사람 이름, `button` 은 `t('무전을 끈다')`. 종이(`text`)는 없다.

- [ ] **Step 1: 실패하는 검사를 쓴다** — `talkNote` 가 만남의 줄 수 + 1 쪽을 만들고, 어떤 쪽에도 `text` 가 없다(할머니 손글씨 종이를 쓰지 않음).
- [ ] **Step 2: 실패를 본다**
- [ ] **Step 3: 대사를 쓴다** — 국제우주정거장 당번 우주비행사(지어낸 이름)의 첫 만남, 두세 마디. 기보 실험실에 남은 낡은 무전 일지를 처음 보여 주고, 단서 `kiboLog` 의 글은 "기보 실험실에 남은 무전 일지: 호출 부호의 앞 두 글자만 읽힌다" 꼴로 쓴다. 소라의 말은 넣지 않는다. 대사의 사실(기보가 일본 실험실이라는 것)을 확인한다.
- [ ] **Step 4: `talkNote` 와 단추를 만든다** — 단추는 `speakerAt` 이 사람을 찾고 `nextVisit` 이 null이 아닐 때만 보인다. 카드가 닫힐 때(`onClose`) `progress.radio = hear(...)`, 저장, 새 단서가 있으면 알림 `t('수첩의 무전 쪽에 적었습니다.')`. 카드가 열린 동안 단추를 다시 눌러도 아무것도 하지 않는다(`noteCard.isOpen()`).
- [ ] **Step 5: 검사와 번역** — `npx vitest run` PASS, en/ja/zh 병합
- [ ] **Step 6: 화면 확인** — Playwright 402 × 657, 소리 끔. `oddity.place` 로 국제우주정거장 곁에 두고 도킹, 단추가 보이는지, 누르면 카드가 쪽마다 넘어가는지, 닫으면 단추가 사라지는지 네 언어로 본다. 창은 하나만 쓰고 끝나면 닫는다.
- [ ] **Step 7: 커밋한다** (`changes.js` 줄: "국제우주정거장에 도킹하면 무전 단추로 승무원의 이야기를 들을 수 있습니다.")
- [ ] **Step 8: 사용자에게 보인다** — 사용자의 4417 화면으로 국제우주정거장에 데려가 보여 주고, 결이 맞는지 묻는다. 답을 듣기 전에는 Task 4로 가지 않는다.

### Task 4: 나머지 만나는 이 일곱, 단서, 숨은 장소 다섯

**Files:**
- Modify: `src/core/radioFriend.js` (표 전부)
- Modify: `src/main.js` (`sites` 에 열린 숨은 땅 위 장소를 더함, `foundHidden` → `recordFound` → 도착 카드)
- Modify: `src/i18n/*.json`, `THIRD-PARTY.md`(사진을 쓰면), `public/assets/stories/`(숨은 장소 카드 사진)
- Test: `tests/radioFriend.test.js`

**Interfaces:**
- Consumes: Task 1 함수 전부
- Produces: `hiddenSitesAt(radio, timeS, bodies): Array<{ id, name, nameEn, kind: 'site', parent, radiusKm: 0, landmark: false, position }>` — 열린 `surface` 숨은 장소만, `core/stories.js` `storySitesAt` 과 같은 꼴(`surfaceDirection`, `spinOf`).

- [ ] **Step 1: 사실을 확인한다** — 아래를 출처(JAXA, NASA, 위키백과 원문)로 확인해 기획서 항목에 출처와 함께 적는다: 하야부사2가 실은 이름(방식, 수), 류구에 표적 표지를 떨어뜨린 날, 귀환 캡슐이 우메라에 내린 날(2020-12-06)과 자리, 아카쓰키가 실은 글판(방식, 수), 금성 궤도에 다시 든 날(2015-12-07), 베피콜롬보에 일본이 맡은 궤도선(미오), 기보 실험실. 틀린 것이 있으면 설계의 대사를 고친다.
- [ ] **Step 2: 표를 채운다** — 설계 2절의 만나는 이 다섯과 탐사선 기록 셋, 단서 20개 안팎, 숨은 장소 다섯. 숨은 장소의 자리:
  - `ryuguMarker`: `type: 'near'`, `target: 'ryugu'`, `withinKm` 은 류구 반지름 근처(1km 안팎)
  - `woomera`: `type: 'surface'`, `body: 'earth'`, 귀환 캡슐이 내린 자리의 위도·경도(확인한 값), `withinKm: 40`
  - `akatsukiOrbit`: `type: 'near'`, `target: 'akatsuki'`, `withinKm: 50`
  - `shotaShore`: `type: 'surface'`, `body: 'earth'`, 규슈의 지어낸 마을이므로 실제 마을 이름을 쓰지 않고 바닷가의 한 자리만, `withinKm: 40`
  - `kiboWindow`: `type: 'near'`, `target: 'iss'`, `withinKm: 5`, `needs` 는 다른 넷을 찾은 것(`found`)으로 정한다 — 이 하나만 단서가 아니라 찾음으로 연다. `openHidden` 에 그 규칙을 넣는다.
  - 탐사선 기록 셋은 사람처럼 말하지 않고 기록장의 짧은 줄(날짜. 일. 표시.)로 쓴다.
- [ ] **Step 3: 실패하는 검사를 쓴다** — 열리기 전에는 그 자리에 있어도 `foundHidden` 이 비고, 열린 뒤에만 잡힌다. `hiddenSitesAt` 은 열린 `surface` 만 돌려준다. `kiboWindow` 는 나머지 넷을 찾기 전에는 열리지 않는다. Task 1의 도달 검사가 다섯 모두에 대해 통과한다.
- [ ] **Step 4: 실패를 본다** / **Step 5: 구현** / **Step 6: 통과를 본다** — `npx vitest run`
- [ ] **Step 7: 번역 병합, 화면 확인** — 땅 위 시설 셋은 이야기 장소에 내려가서, 탐사선 셋은 도킹해서 단추와 카드를 본다. 숨은 장소 하나를 열고 이름표가 생기는지, 다다르면 카드가 뜨는지 본다.
- [ ] **Step 8: 커밋한다**

### Task 5: 얼굴 그림

**Files:**
- Create: `public/assets/notebook/radio-iss.png` 외 넷, `radio-shota.png` (젊은 쇼타와 무전기)
- Modify: `src/core/radioFriend.js` (`portrait`)
- 주문 글: `assets/codex/radio/`

- [ ] **Step 1: 주문을 쓴다** — 소라 도트 그림(`public/assets/seora-sprites/idle-1.png`)을 참고 그림으로, 같은 결의 상반신 얼굴 여섯. 인물 설명은 설계 2절의 표대로, 실제 인물을 닮지 않게 한다.
- [ ] **Step 2: `build/art-order.sh` 로 두 벌씩 받는다**
- [ ] **Step 3: 한 장에 늘어놓아 사용자에게 보내고(SendUserFile) 고른 것을 받는다** — 답을 듣기 전에는 넣지 않는다.
- [ ] **Step 4: 고른 것을 넣고 화면에서 본다, 커밋한다** (그림은 권리 보유: `LICENSE` 의 권리 보유 목록과 README의 줄에 더한다)

### Task 6: 수첩의 "무전" 탭과 그물 그림

**Files:**
- Create: `src/ui/radioWeb.js`
- Create: `public/assets/ui/tab-radio.svg` (다른 탭 그림과 같은 선 굵기)
- Modify: `index.html` (탭 단추와 `section data-tab="radio"`), `src/ui/journal.js` (탭 등록, 열릴 때 그림), `style.css`
- Test: `tests/radioFriend.test.js` (그물의 점과 선을 만드는 순수 함수)

**Interfaces:**
- Consumes: `SPEAKERS`, `CLUES`, `HIDDEN`, `openHidden` (Task 1)
- Produces:
  - `radioWeb(radio): { nodes: Array<{ id, kind: 'speaker'|'clue'|'hidden', at: [x, y], known: boolean, open?: boolean }>, links: Array<[fromId, toId]> }` — `src/core/radioFriend.js` 에 둔다(순수).
  - `createRadioWeb(section, { onJump(id) })` — `src/ui/radioWeb.js`. `draw(radio)` 로 SVG를 다시 그린다.

- [ ] **Step 1: 실패하는 검사를 쓴다** — 빈 기록에서는 가운데 쇼타의 점만 `known`, 나머지는 `known: false`. 단서를 얻으면 그 단서와 그것을 준 이, 가리키는 곳의 점이 `known`. 선은 단서 → 가리키는 곳, 준 이 → 단서.
- [ ] **Step 2–4: 실패를 보고, `radioWeb` 를 만들고, 통과를 본다**
- [ ] **Step 5: 그림을 만든다** — SVG 하나에 점(알면 금빛, 모르면 희미한 고리), 선(알면 실선, 모르면 그리지 않음), 가운데 쇼타 그림. 글자는 점 옆에 쓰지 않고, 점을 누르면 그림 아래 칸에 그 말(`text`, 만나는 이의 이름)과 열린 숨은 장소면 "순간 이동" 단추.
- [ ] **Step 6: 탭이 여덟 개가 되어 402px에 들어가는지 잰다** — 넘치면 모든 탭에서 글자를 빼고 그림만(사용자에게 둘을 나란히 보여 고르게 한다).
- [ ] **Step 7: 네 언어로 402 × 657과 360 × 600에서 본다, 커밋한다**

### Task 7: 호출 부호와 할머니의 마지막 쪽지

**Files:**
- Modify: `src/core/radioFriend.js` (`FINAL_NOTE`, `noteDue`, 기보의 창에서 `callSign: true`)
- Modify: `src/main.js` (시작할 때와 매 프레임 `noteDue` 를 보고 `noteCard.show(FINAL_NOTE)`)
- Test: `tests/radioFriend.test.js`

**Interfaces:**
- Consumes: Task 1, 4
- Produces:
  - `FINAL_NOTE: { id: 'radioNote', title, scene, text, line, button }` — `core/story.js` 의 쪽지와 같은 꼴. `text` 는 할머니의 손글씨, 첫 줄 "어젯밤, 오십 년 만에 무전기를 켰단다."
  - `noteDue(radio, nowMs, freshStart: boolean): boolean` — `callSign` 이고 `!noteRead` 이며 (`freshStart` 또는 `nowMs - noteAt >= 600000`).
  - `readNote(radio): radio` (`noteRead: true`)

- [ ] **Step 1: 실패하는 검사를 쓴다** — 호출 부호 전에는 늘 false. 얻은 직후 false, 10분 뒤 true, `freshStart` 면 바로 true, 읽은 뒤에는 늘 false.
- [ ] **Step 2–4: 실패를 보고 구현하고 통과를 본다**
- [ ] **Step 5: 쪽지 글을 쓴다** — 할머니의 말투(`docs/스토리-할머니의-수첩.md` 4절)로 다섯 줄 안팎. 무전기를 켠 일과 들은 목소리를 직접 따오지 않고 할머니의 마음만 적는다. 소라의 `line` 은 반말 25자 이하.
- [ ] **Step 6: 번역, 화면 확인, 커밋한다**

### Task 8: 마무리 검토

- [ ] **Step 1:** `npx vitest run` 전부 PASS, README 검사 수, `docs/스토어-등록.md` 에 새 갈래 한 줄(사용자의 콘솔 글은 사용자가 고친다고 알린다).
- [ ] **Step 2:** 이 계획 전체에 코드 리뷰를 돌리고(`/code-review`), 나온 것을 고치거나 사용자에게 알린다.
- [ ] **Step 3:** 사용자의 4417 화면에서 처음부터 끝까지 한 번 따라가 보이고, 푸시할지 묻는다(한 시간 간격 규칙).
