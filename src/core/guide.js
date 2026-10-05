import { t } from './i18n.js';
// The newcomer's first goal: five steps from the opening view to an Earthrise photo
// taken from the Moon. Pure state; ui/guide.js draws it.

export const GUIDE_STEPS = ['look', 'face', 'fly', 'land', 'photo'];

const RAD = Math.PI / 180;
const LOOK_AROUND = 20 * RAD;
// Facing the Moon: within FACE to move on, and not sent back until past LOST.
const FACE = 10 * RAD;
const LOST = 30 * RAD;

function angleBetween(a, b) {
  const dot = a.reduce((s, n, i) => s + n * b[i], 0);
  return Math.acos(Math.max(-1, Math.min(1, dot / (Math.hypot(...a) * Math.hypot(...b)))));
}

// skipped: the player skipped or finished the guide on an earlier visit.
export function createGuide(progress, skipped) {
  const off = skipped || progress.landed.includes('moon');
  return { step: off ? null : 'look', turned: 0, heading: null, finished: false };
}

export function skipGuide(guide) {
  return { ...guide, step: null, finished: false };
}

// heading: the flight direction. toMoon: direction from the traveler to the Moon.
// finished is true only on the update that completes the last step.
export function updateGuide(guide, { heading, toMoon, progress }) {
  if (guide.step === null) return guide.finished ? { ...guide, finished: false } : guide;
  if (progress.photos.includes('earthrise')) return { ...guide, step: null, finished: true };

  const turned = guide.turned + (guide.heading ? angleBetween(guide.heading, heading) : 0);
  let { step } = guide;
  // The Moon may already be found when the game opens (today's sky can start beside
  // it), so finding it only ends the flight; looking and facing are still taught.
  const found = progress.discovered.includes('moon');
  if (progress.landed.includes('moon')) step = 'photo';
  else if (step === 'look') {
    if (turned >= LOOK_AROUND) step = 'face';
  } else if (step === 'face') {
    if (angleBetween(heading, toMoon) <= FACE) step = found ? 'land' : 'fly';
  } else if (step === 'fly') {
    if (found) step = 'land';
    else if (angleBetween(heading, toMoon) > LOST) step = 'face';
  }
  return { ...guide, step, turned, heading: [...heading] };
}

const TEXT = {
  look: () => t('화면을 드래그해 주변을 둘러보세요'),
  face: () => t('달 이름표를 누르고 "달 바라보기"를 누르세요'),
  fly: (touch) => (touch ? t('전진 버튼을 누르고 있으면 달로 날아갑니다') : t('W 키를 누르고 있으면 달로 날아갑니다')),
  land: () => t('그대로 달 표면까지 내려가 닿아 보세요'),
  photo: (touch) => t`${touch ? t('사진 모드 버튼을') : t('P 키를')} 누르고 달과 지구를 함께 찍으세요`,
};

export function guideGoal(guide, touch = false) {
  if (guide.step === null) return null;
  return {
    count: `${GUIDE_STEPS.indexOf(guide.step) + 1}/${GUIDE_STEPS.length}`,
    text: TEXT[guide.step](touch),
    targetId: guide.step === 'look' ? null : 'moon',
  };
}
