import { BODIES } from './bodies.js';
import { frameBodies } from './framing.js';
import { sunVisibility } from './occlusion.js';

const DEG = Math.PI / 180;

// Photo missions, judged from the camera at the moment a photo is saved.
// Each check receives a shot: { frame(id), seen(id), distanceToSurface(id), heroVisible, frames, sunShown }.
export const MISSIONS = [
  {
    id: 'paleBlueDot',
    name: '창백한 푸른 점',
    hint: '아주 멀리서 지구를 작은 점으로 담기 (겉보기 지름 0.1도 미만)',
    check: (s) => s.seen('earth') && s.frame('earth').angularDiameter < 0.1 * DEG,
  },
  {
    id: 'earthrise',
    name: '지구돋이',
    hint: '달 표면 5,000km 안에서 달과 지구를 한 화면에',
    check: (s) => s.distanceToSurface('moon') <= 5000 && s.seen('moon') && s.seen('earth'),
  },
  {
    id: 'eclipse',
    name: '개기일식',
    hint: '행성이나 위성의 밤쪽 가까이에서 태양 쪽을 보고 찍기 (태양이 90% 넘게 가려져야 한다)',
    check: (s) => s.frame('sun').visible && s.sunShown < 0.1,
  },
  {
    id: 'ringLord',
    name: '고리의 제왕',
    hint: '토성이 화면 높이의 40% 이상이 되게',
    check: (s) => s.seen('saturn') && s.frame('saturn').fill >= 0.4,
  },
  {
    id: 'greatRedSpot',
    name: '대적점',
    hint: '목성이 화면 높이의 90% 이상을 채우게',
    check: (s) => s.seen('jupiter') && s.frame('jupiter').fill >= 0.9,
  },
  {
    id: 'sunSkim',
    name: '태양 스치기',
    hint: '태양 표면 50,000km 안에서 한 장',
    check: (s) => s.distanceToSurface('sun') <= 50000,
  },
  {
    id: 'heroSelfie',
    name: '영웅 셀카',
    hint: '영웅을 보이게 두고, 행성이나 달이 화면 높이의 30% 이상',
    check: (s) => s.heroVisible && s.frames.some((f) => f.body.kind !== 'star' && f.visible && !f.hidden && f.fill >= 0.3),
  },
  {
    id: 'twoPlanets',
    name: '두 행성 한 컷',
    hint: '행성 둘을 한 화면에, 둘 다 화면 높이의 0.5% 이상 (확대하면 쉽다)',
    // 0.005 of the view height is about five pixels on a 1,000 pixel tall screen.
    check: (s) => s.frames.filter((f) => f.body.kind === 'planet' && f.visible && !f.hidden && f.fill >= 0.005).length >= 2,
  },
];

export function completedMissions({ position, orientation, fovY, aspect, heroVisible, bodies = BODIES }) {
  const frames = frameBodies({ position, orientation, fovY, aspect, bodies });
  const byId = new Map(frames.map((f) => [f.body.id, f]));
  const sun = frames.find((f) => f.body.kind === 'star');
  const shot = {
    frames,
    heroVisible,
    frame: (id) => byId.get(id),
    seen: (id) => byId.get(id).visible && !byId.get(id).hidden,
    distanceToSurface: (id) => Math.max(0, byId.get(id).distance - byId.get(id).body.radiusKm),
    sunShown: sunVisibility(
      sun.direction,
      sun.distance,
      sun.body.radiusKm,
      frames.filter((f) => f !== sun).map((f) => ({ direction: f.direction, distance: f.distance, radius: f.body.radiusKm })),
    ),
  };
  return MISSIONS.filter((m) => m.check(shot)).map((m) => m.id);
}
