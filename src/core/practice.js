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
export const RING_KM = 6000;
export const FAR_KM = 80000;
// Left this far behind, the ring is put before her again: nobody is lost in here.
const LOST_KM = FAR_KM * 1.8;
// Looking at the ring: within this of the middle of the view (the ring itself is 4.3
// degrees from its middle to its rim at that distance).
const FACING = (5 * Math.PI) / 180;
// A near miss counts: passing within this of the ring's middle and going away again.
// (Aimed 5 degrees off she passes 7,000 km from it; at first only the ring's own 6,000
// counted, and the first flight went past and took 26 s.)
const NEAR_KM = RING_KM * 2.5;
// Counted as flying, as stopped (km/s), and as having slid (km).
const FLYING = 2000;
const STOPPED = 1;
const SLID_KM = 12000;
// The jump (the user, 2026-10-10: "워프 연습 추가"): a ring far too far to fly to in a
// moment, reached as a far body is in the game: its name tag turns her to it, and pressed
// again while she looks at it, jumps her to this far before it (main.js makes the jump).
export const JUMP_TO_KM = FAR_KM * 0.9;
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
  // A little to the right, in view: a slide brings it before her.
  slide: [0.9, 0.2, 0.06],
  // Before her and a little up, its horn in plain view.
  roll: [1, 0, 0.16],
  // Behind her and to one side.
  find: [-0.9, -0.4, 0.15],
  // Sixty flights off, to one side and up.
  warp: [55, 20, 10],
};
// The last lesson's three, each from where the one before left her.
const FREE_AT = [[0.3, 0.9, 0.2], [-0.8, -0.5, -0.2], [0.2, -0.6, 0.75]];

function ringFrom(pose, [ahead, side, up]) {
  return add(add(add(pose.position, pose.forward, ahead * FAR_KM), pose.right, side * FAR_KM), pose.up, up * FAR_KM);
}

// pose: { position, forward, right, up } (km and unit vectors).
// (In updatePractice also: speed, sliding, and twist: how far she rolled this frame.)
export function createPractice(pose) {
  return {
    step: 'look', ring: ringFrom(pose, RING_AT.look), flew: false, slid: 0, lined: false, rolled: 0, jumped: false, left: FREE_RINGS, last: [...pose.position], far: Infinity, events: [],
  };
}

function begin(step, pose, left = FREE_RINGS) {
  const at = step === 'free' ? FREE_AT[FREE_RINGS - left] : RING_AT[step];
  return { step, flew: false, slid: 0, lined: false, rolled: 0, jumped: false, left, ...(at ? { ring: ringFrom(pose, at), far: Infinity } : {}) };
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
  const reached = far <= RING_KM || (far <= NEAR_KM && far > practice.far);
  next.far = far;
  const moved = length(sub(pose.position, practice.last));
  if (pose.speed >= FLYING) next.flew = true;
  if (pose.sliding) next.slid += moved;
  next.rolled += Math.abs(pose.twist ?? 0);

  const done = () => {
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
    } else if (next.lined ? ahead < -NEAR_KM : ahead < FAR_KM * 0.35) next = { ...next, ...begin('slide', pose) };
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
  // Flown far past it: the ring comes round before her again. (Not the far ring of the
  // jump, until she has jumped to it.)
  if (next.step !== null && !(next.step === 'warp' && !next.jumped) && length(sub(next.ring, pose.position)) > LOST_KM) {
    next = { ...next, ring: ringFrom(pose, [1, 0, 0]), far: Infinity };
  }
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
  fly: (left, moving) => (moving ? t('전진 버튼을 누르고 있으면 속도가 점점 빨라집니다') : t('전진 버튼을 꾹 누르면 고리로 날아갑니다')),
  stop: () => t('날다가 정지 버튼으로 멈춰 보세요'),
  slide: (left, moving, aimed, jumped, lined) => (lined ? t('정면에 왔어요. 전진 버튼으로 고리를 지나가세요') : t('화살표 버튼을 눌러 고리가 정면에 오게 하세요')),
  roll: () => t('두 손가락으로 화면을 돌려 고리의 뿔을 위로 세우세요'),
  find: () => t('고리가 등 뒤에 있어요. 이름표를 누르고 날아가세요'),
  warp: (left, moving, aimed, jumped) => (jumped ? t('도착했습니다. 전진 버튼으로 고리를 지나가세요') : aimed ? t('바라본 채 이름표를 한 번 더 누르면 순간 이동합니다') : t('아주 먼 고리입니다. 이름표를 눌러 바라보세요')),
  free: (left) => t`혼자서 해 보세요. 남은 고리 ${left}개`,
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

// What the line at the top says, and which key is to be pressed now (it blinks).
// aimed: she is looking at the ring. moving: she is under way.
export function practiceGoal(practice, aimed = false, moving = false) {
  if (practice.step === null) return null;
  return {
    count: `${PRACTICE_STEPS.indexOf(practice.step) + 1}/${PRACTICE_STEPS.length}`,
    // There is a lesson before this one to go back to.
    back: PRACTICE_STEPS.indexOf(practice.step) > 0,
    text: TEXT[practice.step](practice.left, moving, aimed, practice.jumped, practice.lined),
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
