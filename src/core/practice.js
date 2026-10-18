import { t } from './i18n.js';
// Flight practice: eight short lessons in an empty place with nothing but the stars and
// one glowing ring to go to (the user, 2026-10-10, of people playing for the first
// time: "비행이 어렵데, 비행을 도와줄 수 있는 훈련하는 화면을 만들고"; what they found
// hard was the controls themselves and getting to where they meant to go). Pure state;
// ui/practice.js and main.js draw it and fly it by the game's own rules of flight.

export const PRACTICE_STEPS = ['look', 'fly', 'stop', 'slide', 'roll', 'find', 'warp', 'free'];

// The ring: how big it is and how far off a new one is put. Near a ring the speed is
// held down as near a spacecraft (core/game.js slow points), so these distances are
// each a few seconds of flight.
// (6,000 km until the user, 2026-10-15: "고리 크기를 더 작게".)
export const RING_KM = 4000;
export const FAR_KM = 80000;
// The most speed allowed in here, km/s (the user, 2026-10-10: "테스트 비행에서는
// 속도제한 걸자"): what the ring allows one flight off. Without it the limit grew with
// the distance from the ring, and the far ring of the jump could be flown to in seconds.
// (Half a flight a second, 40,000 km/s, until the user, 2026-10-15, with the smaller
// rings: "연습장소에서는 최고 속도 제한": now a ring one flight off is eight seconds away.)
export const TOP_SPEED = 10000;
// Gone this far from the ring, in any lesson, she is put back where that try began (the
// user, 2026-10-15: "고리에서 너무 멀어지면, 다시 시작점으로 이동"). It was 1.8 flights
// off, and only the ring was put before her again, without a word. (Not the jump's far
// ring before the jump.)
const LOST_KM = FAR_KM * 1.3;
// Looking at the ring: within this of the middle of the view (the ring itself is 2.9
// degrees from its middle to its rim at that distance).
const FACING = (5 * Math.PI) / 180;
// Only through the ring counts (a near miss counted too, within this of its middle, until
// the user, 2026-10-15: "그냥 통과해버렸는데도 잘 했다고 하네"). Passing within this of it
// and going away again is a miss: she is put back where that try began.
const NEAR_KM = 15000;
// Counted as flying, as stopped (km/s), and as having slid (km).
const FLYING = 2000;
const STOPPED = 1;
// (Only to tell a slide from none: the ring begins 12 degrees off and the view does not
// turn in that lesson, so nothing but a slide brings it before her. It was 12,000 km,
// counted only while a key was held: short presses let her coast through the middle
// uncounted, the ring went over to her other side and the lit arrow changed sides, again
// and again. The user, 2026-10-10: "4번이 너무 애매한데? 조금만 눌러도 오른쪽 왼쪽
// 깜박이가 왔다갔다 해".)
const SLID_KM = 3000;
// The jump (the user, 2026-10-10: "워프 연습 추가"): a ring far too far to fly to in a
// moment, reached as a far body is in the game: its name tag turns her to it, and pressed
// again while she looks at it, jumps her to this far before it (main.js makes the jump).
// (72,000 km, nine tenths of the other rings' distance, till the user, 2026-10-18: "워프를
// 하고나서 거리가 꽤 먼데". Now a quarter of it: a few seconds' flight, and still more
// than NEAR_KM, so that going past it counts as a miss only once she has come near.)
export const JUMP_TO_KM = 20000;
// Rolling (two fingers turned on the view, or Q and E): she is tipped over by this much
// as the lesson begins (main.js does it), and is to stand the ring's horn up again: up
// within ROLL_UP of the top of the screen, having turned at least ROLLED herself.
export const ROLL_START = 0.9;
const ROLL_UP = (8 * Math.PI) / 180;
const ROLLED = 0.3;
// The rings of the last lesson.
export const FREE_RINGS = 3;

const add = (a, b, k = 1) => a.map((n, i) => n + b[i] * k);
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a.reduce((s, n, i) => s + n * b[i], 0);
const length = (a) => Math.hypot(...a);

function angleBetween(a, b) {
  return Math.acos(Math.max(-1, Math.min(1, dot(a, b) / (length(a) * length(b)))));
}

// Where a lesson's ring is put, from where she is and how she faces as it begins:
// [ahead, to her right, up] in parts of FAR_KM.
const RING_AT = {
  // Off to the right and a little up: in view on an upright phone (whose view is 19
  // degrees from its middle to its side; at 35 degrees, as it was at first, there was
  // no ring to be seen), but not in the middle of it.
  look: [0.975, 0.2, 0.1],
  // (Flying goes to the ring she has just found.)
  fly: null,
  stop: [1.3, 0, 0],
  // A little to the right, in view: a slide brings it before her. (Hardly above her: the
  // arrows lit are left and right only, and at 0.06 its height alone took 3.8 of the 5
  // degrees that count as before her.)
  slide: [0.9, 0.2, 0.02],
  // Before her and a little up, its horn in plain view.
  roll: [1, 0, 0.16],
  // Behind her and to one side.
  find: [-0.9, -0.4, 0.15],
  // Sixty flights off, to one side and up.
  warp: [55, 20, 10],
};
// Each lesson is done three times over before the next (the user, 2026-10-15: "1단계를
// 몇 번 더", then "단계별 학습을 3회씩"); the last, three rings of its own, once.
export const REPEATS = 3;
// The first lesson's second and third rings, each from where she looks once she has the
// one before in the middle: now to the left and a little low, now high, in view on an
// upright phone.
const LOOK_AT = [[0.96, -0.25, -0.12], [0.95, 0.08, 0.3]];
// The last lesson's three, each from where the one before left her.
const FREE_AT = [[0.3, 0.9, 0.2], [-0.8, -0.5, -0.2], [0.2, -0.6, 0.75]];

// Where a try began, to be put back to: { position, forward, up }.
const spot = (pose) => ({ position: [...pose.position], forward: [...pose.forward], up: [...pose.up] });

// The lessons in which the ring is to be flown through (the jump's, once jumped; the
// slide's, once lined up or as it is lined up).
const throughRing = (practice) => ['fly', 'slide', 'find', 'free'].includes(practice.step) || (practice.step === 'warp' && practice.jumped);

function ringFrom(pose, [ahead, side, up]) {
  return add(add(add(pose.position, pose.forward, ahead * FAR_KM), pose.right, side * FAR_KM), pose.up, up * FAR_KM);
}

// pose: { position, forward, right, up } (km and unit vectors).
// (In updatePractice also: speed, sliding, and twist: how far she rolled this frame.)
// repeats: how many times each lesson is done (tests walk the lessons once).
export function createPractice(pose, repeats = REPEATS) {
  return {
    step: 'look', round: 1, repeats, start: spot(pose), ring: ringFrom(pose, RING_AT.look), flew: false, slid: 0, lined: false, rolled: 0, jumped: false, left: FREE_RINGS, last: [...pose.position], far: Infinity, events: [],
  };
}

function begin(step, pose, left = FREE_RINGS, round = 1) {
  // (Again: the first lesson's ring elsewhere in view; flying, a ring straight ahead.)
  const again = step === 'look' ? LOOK_AT[round - 2] : step === 'fly' ? [1, 0, 0.1] : RING_AT[step];
  const at = step === 'free' ? FREE_AT[FREE_RINGS - left] : round > 1 ? again : RING_AT[step];
  return { step, round, start: spot(pose), flew: false, slid: 0, lined: false, rolled: 0, jumped: false, left, ...(at ? { ring: ringFrom(pose, at), far: Infinity } : {}) };
}

// Put back where the try began (main.js moves her there): the slide not yet lined up
// again. kind: 'missed' (went past the ring) or 'strayed' (went off far, or close without
// lining it up first).
function backToStart(practice, kind) {
  practice.events.push(kind);
  return { ...practice, far: Infinity, slid: 0, lined: false, last: [...practice.start.position] };
}

// One frame. pose as above, with speed (km/s) and sliding (a slide key is held).
// events: 'ring' (a ring was reached), 'part' (the first half of a lesson was done),
// 'step' (a lesson was done), 'finished'.
// step is null once all six are done.
export function updatePractice(practice, pose) {
  if (practice.step === null) return practice.events.length ? { ...practice, events: [] } : practice;
  const events = [];
  let next = { ...practice, events, last: [...pose.position] };
  const toRing = sub(next.ring, pose.position);
  const far = length(toRing);
  // Through it, or close by it and now going away.
  const reached = far <= RING_KM;
  // Past it close by without going through, or flown far off: a miss.
  const missed = !reached && throughRing(practice) && practice.far <= NEAR_KM && far > practice.far;
  const strayed = !reached && !(practice.step === 'warp' && !practice.jumped) && far > LOST_KM;
  next.far = far;
  const moved = length(sub(pose.position, practice.last));
  if (pose.speed >= FLYING) next.flew = true;
  if (pose.sliding) next.slid += moved;
  next.rolled += Math.abs(pose.twist ?? 0);

  const done = () => {
    // Not the last time of this lesson: the same again, from where she is now.
    if (next.step !== 'free' && next.round < next.repeats) {
      events.push('round');
      next = { ...next, ...begin(next.step, pose, FREE_RINGS, next.round + 1) };
      return;
    }
    events.push('step');
    const following = PRACTICE_STEPS[PRACTICE_STEPS.indexOf(next.step) + 1];
    next = { ...next, ...begin(following, pose) };
  };

  if (next.step === 'look') {
    if (angleBetween(pose.forward, toRing) <= FACING) done();
  } else if (next.step === 'fly') {
    if (reached) {
      events.push('ring');
      done();
    }
  } else if (next.step === 'stop') {
    // Stopped after having flown; the ring is only somewhere to fly toward.
    if (next.flew && pose.speed < STOPPED) done();
    else if (reached) next = { ...next, ring: ringFrom(pose, RING_AT.stop), far: Infinity };
  } else if (next.step === 'slide') {
    // Two parts: slide until the ring is before her, then fly through it (it ended at
    // the first until the user, 2026-10-10: "정면으로 가서 -> 고리 통과하는게 목적 아님?").
    const ahead = dot(toRing, pose.forward);
    if (next.lined && reached) {
      events.push('ring');
      done();
    } else if (!next.lined && next.slid >= SLID_KM && angleBetween(pose.forward, toRing) <= FACING) {
      next.lined = true;
      events.push('part');
    // Flown up to the ring without having lined it up, or past it, she could never bring
    // it before her by sliding (and the view does not turn in this lesson): the ring is
    // put out again from where she is now, and the lesson begins again. (The user,
    // 2026-10-10: "4에서 고리 지나치니까 깰 수가 없게 되었는데?")
    } else if (!next.lined && ahead < FAR_KM * 0.35) next = backToStart(next, 'strayed');
  } else if (next.step === 'roll') {
    if (next.rolled >= ROLLED && Math.abs(tiltOf(pose)) <= ROLL_UP) done();
  } else if (next.step === 'find' || next.step === 'warp') {
    if (reached) {
      events.push('ring');
      done();
    }
  } else if (next.step === 'free' && reached) {
    events.push('ring');
    if (next.left <= 1) {
      events.push('step', 'finished');
      next = { ...next, step: null, left: 0 };
    } else next = { ...next, ...begin('free', pose, next.left - 1) };
  }
  // A miss in a lesson of flying through: back where the try began, the ring where it was.
  if (next.step !== null && !events.length && (missed || strayed) && (strayed || throughRing(next))) next = backToStart(next, missed ? 'missed' : 'strayed');
  return next;
}

// (Said for the keys on the screen only: the game is played on phones. The user,
// 2026-10-10: "키보드 연습 말고, 스마트폰으로 연습하는 것만 해줘. 이거 PC로 하는 사람은
// 나 밖에 없거임". The keyboard flies her in here all the same.)
const TEXT = {
  // (Short: the line holds two rows of a phone's width, and a longer one was cut off.)
  look: () => t('화면을 드래그해 고리를 가운데로 가져오세요'),
  // (Once she is under way the line tells what holding the key does. The user,
  // 2026-10-10: "앞으로 버튼을 누르면 속도가 점점 빨라집니다.,라는 멘트도 추가".)
  // (The ring off the middle of her view: forward alone goes past it, and the line said
  // nothing of turning. The user, 2026-10-15: "방향을 틀어야한다는 얘기도 적어줘".)
  fly: (left, moving, aimed) => (!aimed ? t('화면을 드래그해 방향을 틀어 고리를 정면에 두세요') : moving ? t('전진 버튼을 누르고 있으면 속도가 점점 빨라집니다') : t('전진 버튼을 꾹 누르면 고리로 날아갑니다')),
  stop: () => t('날다가 정지 버튼으로 멈춰 보세요'),
  slide: (left, moving, aimed, jumped, lined) => (lined ? t('정면에 왔어요. 전진 버튼으로 고리를 지나가세요') : t('화살표 버튼을 눌러 고리가 정면에 오게 하세요')),
  roll: () => t('두 손가락으로 화면을 돌려 고리의 뿔을 위로 세우세요'),
  find: () => t('고리가 등 뒤에 있어요. 이름표를 누르고 날아가세요'),
  warp: (left, moving, aimed, jumped) => (jumped ? t('도착했습니다. 전진 버튼으로 고리를 지나가세요') : aimed ? t('바라본 채 이름표를 한 번 더 누르면 순간 이동합니다') : t('아주 먼 고리입니다. 이름표를 눌러 바라보세요')),
  free: (left) => t`혼자서 해 보세요. 남은 고리 ${left}개`,
};

// Why a lesson is learnt, in full, for the two that teach finding the way: shown on a
// sheet that waits for its OK before the lesson goes on (the user, 2026-10-18, asking
// what lessons 6 and 7 are for: "연습화면에 넣어", "자세히 넣어", "확인을 눌러야 다음
// 화면으로 넘어갈 수 있게 해줘").
const WHY = {
  find: () => t('실제 우주에서는 가고 싶은 행성이나 탐사선이 화면 밖에 있을 때가 많아요. 그런 곳은 화면 가장자리에 화살표가 붙은 이름표(예: ↓ 태양)로만 보여요.\n이름표를 한 번 누르면 소라가 저절로 그쪽으로 돌아서요. 화면을 이리저리 끌며 찾지 않아도 돼요. 돌아선 다음에는 전진 버튼으로 날아가면 됩니다.\n이번 고리는 등 뒤에 있어요. 고리의 이름표를 누르고 날아가 보세요.'),
  warp: () => t('태양계는 아주 넓어요. 빛도 지구에서 해왕성까지 4시간 넘게 걸려요. 전진 버튼만으로는 다른 행성까지 한참 걸립니다.\n그럴 때 쓰는 것이 순간 이동이에요. 가 본 적 있는 행성이나 탐사선이라면 아무리 멀어도 한 번에 갈 수 있어요. 이름표를 한 번 누르면 그쪽을 바라보고, 바라본 채 한 번 더 누르면 하얀 빛과 함께 그 곁으로 건너가요.\n이번 고리는 아주 멀리 있어요. 이름표를 두 번 눌러 건너가 보세요.'),
};

// Each lesson's name, shown as it begins (ui/practice.js).
const NAMES = {
  look: () => t('둘러보기'),
  // ("날아가기" until the user, 2026-10-15: "날아서 고리 통과하기.. 아님?")
  fly: () => t('날아서 고리 통과하기'),
  stop: () => t('멈추기'),
  slide: () => t('옆으로 움직이기'),
  roll: () => t('기울기 바로 하기'),
  find: () => t('등 뒤의 고리 찾기'),
  warp: () => t('순간 이동'),
  free: () => t('혼자서 해 보기'),
};

// The lesson before this one, begun again from where she is (the user, 2026-10-10:
// "이전 비행 연습으로 가는 버튼 추가"). The first lesson has none before it.
export function previousLesson(practice, pose) {
  const at = PRACTICE_STEPS.indexOf(practice.step);
  if (at <= 0) return practice;
  const step = PRACTICE_STEPS[at - 1];
  // (Flying goes to the ring that is there; with none placed for it, to one put ahead.)
  return { ...practice, ...begin(step, pose), ...(step === 'fly' ? { ring: ringFrom(pose, [1, 0, 0.1]), far: Infinity } : {}), last: [...pose.position], events: [] };
}

// The lesson after this one, begun from where she is (the user, 2026-10-18: "다음연습
// 버튼도 넣어줘"). The last lesson has none after it.
export function nextLesson(practice, pose) {
  const at = PRACTICE_STEPS.indexOf(practice.step);
  if (at < 0 || at >= PRACTICE_STEPS.length - 1) return practice;
  return { ...practice, ...begin(PRACTICE_STEPS[at + 1], pose), last: [...pose.position], events: [] };
}

// What the line at the top says, and which key is to be pressed now (it blinks).
// aimed: she is looking at the ring. moving: she is under way.
export function practiceGoal(practice, aimed = false, moving = false) {
  if (practice.step === null) return null;
  return {
    // (Which time of the lesson this is, after it as dots filled in: "2/8 ●○○". As
    // "2/8 · 1/3" it was not read: the user, 2026-10-15, "1단계 2/8 - 1/3은 뭐야?")
    count: `${PRACTICE_STEPS.indexOf(practice.step) + 1}/${PRACTICE_STEPS.length}${practice.step !== 'free' && practice.repeats > 1 ? ` ${'●'.repeat(practice.round)}${'○'.repeat(practice.repeats - practice.round)}` : ''}`,
    // There is a lesson before this one to go back to.
    back: PRACTICE_STEPS.indexOf(practice.step) > 0,
    // There is a lesson after this one to go on to.
    next: PRACTICE_STEPS.indexOf(practice.step) < PRACTICE_STEPS.length - 1,
    text: TEXT[practice.step](practice.left, moving, aimed, practice.jumped, practice.lined),
    name: NAMES[practice.step](),
    // Why it is learnt (a sheet before it begins), or null.
    why: WHY[practice.step]?.() ?? null,
    // Stopping: the forward key until she has flown, then the stop key. Finding: the
    // name tag until she faces the ring, then the forward key.
    teach: {
      look: null, fly: 'fly', stop: practice.flew ? 'brake' : 'fly', slide: practice.lined ? 'fly' : 'slide', roll: null, find: aimed ? 'fly' : 'tag', warp: practice.jumped ? 'fly' : 'tag', free: null,
    }[practice.step],
    // The ring's name tag is shown where the real game would show one.
    tag: practice.step === 'find' || practice.step === 'warp' || practice.step === 'free',
  };
}

// How far the place's up leans from the top of her view (radians; to the right is
// positive): what the horn on the ring shows.
export function tiltOf(pose) {
  return Math.atan2(pose.right[1], pose.up[1]);
}

// She has jumped to the far ring: it is JUMP_TO_KM before her now.
export function jumped(practice) {
  return { ...practice, jumped: true, far: Infinity };
}

// Whether she is looking at the ring (as the first lesson asks).
export function aimedAt(practice, pose) {
  return angleBetween(pose.forward, sub(practice.ring, pose.position)) <= FACING;
}

// Which way the slide lesson's ring lies, for the key to light: 1 right, -1 left.
export function slideSide(practice, pose) {
  return dot(sub(practice.ring, pose.position), pose.right) >= 0 ? 1 : -1;
}

// Where the ring's name tag goes on a screen of width x height: over the ring when it
// is in view, else on the edge of the view on the side it lies, pointing there.
// camera: { forward, right, up, fov } (fov: the upright field of view, radians).
// margin: how far in from the edge the tag is kept (px). → { x, y, off, angle }
export function tagSpot(ring, position, camera, width, height, margin = 44) {
  const to = sub(ring, position);
  const x = dot(to, camera.right);
  const y = dot(to, camera.up);
  const z = dot(to, camera.forward);
  const half = Math.tan(camera.fov / 2);
  const scale = height / 2 / half;
  if (z > 0) {
    const sx = width / 2 + (x / z) * scale;
    const sy = height / 2 - (y / z) * scale;
    if (sx >= margin && sx <= width - margin && sy >= margin && sy <= height - margin) return { x: sx, y: sy, off: false, angle: 0 };
  }
  // Out of view: along the line from the middle of the screen toward it (straight
  // behind her, to the right).
  let dx = x;
  let dy = -y;
  if (Math.hypot(dx, dy) < 1e-9) dx = 1;
  const reach = Math.min((width / 2 - margin) / Math.abs(dx || 1e-9), (height / 2 - margin) / Math.abs(dy || 1e-9));
  return { x: width / 2 + dx * reach, y: height / 2 + dy * reach, off: true, angle: Math.atan2(dy, dx) };
}
