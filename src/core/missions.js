import { BODIES } from './bodies.js';
import { frameBodies } from './framing.js';
import { sunVisibility } from './occlusion.js';
import { forward } from './orientation.js';
import { fromEquatorial } from './sky.js';

const DEG = Math.PI / 180;
const GALACTIC_CENTRE = fromEquatorial(17.761, -29.0);
const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const PLANETS_SEEN = (s) => s.frames.filter((f) => f.body.kind === 'planet' && f.visible && !f.hidden).length;

// Photo missions, judged from the camera at the moment a photo is saved.
// Each check receives a shot: { frame(id), seen(id), distanceToSurface(id), heroVisible, frames, sunShown,
// has(id), forward }. Spacecraft are in the frames only when the caller passes them; has(id) says so.
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
  // ---- after famous photographs ----
  {
    id: 'familyPortrait',
    name: '태양계 가족사진',
    hint: '해왕성 궤도보다 먼 곳에서 행성 여섯 개 이상을 한 화면에 (보이저 1호, 1990년)',
    check: (s) => s.frame('sun').distance > gap(s.frame('neptune').body.position, s.frame('sun').body.position) && PLANETS_SEEN(s) >= 6,
  },
  {
    id: 'blueMarble',
    name: '푸른 구슬',
    hint: '태양을 등지고, 환한 지구가 화면 높이의 80% 이상을 채우게 (아폴로 17호, 1972년)',
    check: (s) => {
      const earth = s.frame('earth');
      if (!s.seen('earth') || earth.fill < 0.8) return false;
      // The lit side faces the camera: the Sun, seen from Earth, is within 35 degrees of the camera.
      const toSun = s.frame('sun').body.position.map((n, i) => n - earth.body.position[i]);
      const cos = -earth.direction.reduce((sum, n, i) => sum + n * toSun[i], 0) / Math.hypot(...toSun);
      return cos > Math.cos(35 * DEG);
    },
  },
  {
    id: 'saturnShadow',
    name: '토성의 그늘에서',
    hint: '토성 뒤에 숨어 태양이 가려진 채, 토성이 화면 높이의 30% 이상 (카시니, 2006년)',
    check: (s) => s.sunShown < 0.1 && s.seen('saturn') && s.frame('saturn').fill >= 0.3
      && s.frame('sun').distance > gap(s.frame('saturn').body.position, s.frame('sun').body.position),
  },
  {
    id: 'galileo',
    name: '갈릴레이의 발견',
    hint: '목성과 큰 위성 넷(이오, 유로파, 가니메데, 칼리스토)을 한 화면에 (갈릴레이, 1610년)',
    check: (s) => ['jupiter', 'io', 'europa', 'ganymede', 'callisto'].every((id) => s.seen(id)),
  },
  {
    id: 'marsMoons',
    name: '화성의 두 달',
    hint: '화성 표면 20,000km 안에서 포보스와 데이모스를 한 화면에',
    check: (s) => s.distanceToSurface('mars') <= 20000 && s.seen('phobos') && s.seen('deimos'),
  },
  {
    id: 'earthAndMoon',
    name: '지구와 달',
    hint: '멀리서 지구와 달을 한 화면에, 지구의 겉보기 지름이 0.1 → 1.5도 (보이저 1호, 1977년)',
    check: (s) => s.seen('earth') && s.seen('moon')
      && s.frame('earth').angularDiameter >= 0.1 * DEG && s.frame('earth').angularDiameter <= 1.5 * DEG,
  },
  {
    id: 'hubbleEarth',
    name: '허블과 지구',
    hint: '허블 우주망원경 3,000km 안에서 허블과 지구를 한 화면에',
    check: (s) => s.has('hubble') && s.frame('hubble').distance <= 3000 && s.seen('hubble') && s.seen('earth'),
  },
  {
    id: 'goldenRecord',
    name: '골든 레코드',
    hint: '보이저 1호나 2호 5,000km 안에서 보이저와 태양을 한 화면에',
    check: (s) => s.frame('sun').visible
      && ['voyager1', 'voyager2'].some((id) => s.has(id) && s.frame(id).distance <= 5000 && s.seen(id)),
  },
  {
    id: 'milkyWayHeart',
    name: '은하수 한가운데',
    hint: '궁수자리 쪽 은하 중심을 화면 가운데 10도 안에',
    check: (s) => s.forward.reduce((sum, n, i) => sum + n * GALACTIC_CENTRE[i], 0) > Math.cos(10 * DEG),
  },
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
  // The Sun just coming out from behind a body's edge, its light spreading and drawn
  // out into rays (bloom, glare, diffraction spikes): what an eclipse shows at its
  // start and end. Added at the end of the list, by the user's order of 2026-10-04.
  {
    id: 'diamondRing',
    name: '다이아몬드 반지',
    hint: '행성이나 위성의 가장자리로 태양이 막 나올 때 찍기 (태양이 10% 넘고 40%보다 적게 보여야 한다)',
    check: (s) => s.frame('sun').visible && s.sunShown > 0.1 && s.sunShown < 0.4,
  },
];

export function completedMissions({ position, orientation, fovY, aspect, heroVisible, bodies = BODIES, craft = [] }) {
  const frames = frameBodies({ position, orientation, fovY, aspect, bodies: [...bodies, ...craft] });
  const byId = new Map(frames.map((f) => [f.body.id, f]));
  const sun = frames.find((f) => f.body.kind === 'star');
  const shot = {
    frames,
    heroVisible,
    forward: forward(orientation),
    has: (id) => byId.has(id),
    frame: (id) => byId.get(id),
    seen: (id) => byId.get(id).visible && !byId.get(id).hidden,
    distanceToSurface: (id) => Math.max(0, byId.get(id).distance - byId.get(id).body.radiusKm),
    sunShown: sunVisibility(
      sun.direction,
      sun.distance,
      sun.body.radiusKm,
      // (Bodies of another star, core/exo.js, do not count as hiding the Sun.)
      frames.filter((f) => f !== sun && !f.body.exo).map((f) => ({ direction: f.direction, distance: f.distance, radius: f.body.radiusKm })),
    ),
  };
  return MISSIONS.filter((m) => m.check(shot)).map((m) => m.id);
}
