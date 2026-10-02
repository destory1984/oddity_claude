import { BODIES, surfaceDistance } from './bodies.js';
import { STORIES } from './stories.js';
import { CRAFT } from './craft.js';
import { DISCOVERY_KM } from './progress.js';
import { DOCK_RANGE_KM } from './dock.js';

// The nine tours (docs/스토리-할머니의-수첩.md §6): the routes grandmother wrote at the
// back of her journal, "가 보고 싶은 길". A tour is three to six stops gone round in
// order. A stop is a story place ({ story }), a body ({ body }: come within discovery
// range) or a craft ({ craft }: come within docking range).
//   memo: grandmother's hand, why she wanted this route.
//   line: what Seora says at the stop (반말, 25 characters at most).
// The film behind the ninth tour is never named; only the real places on its road are used.
export const TOURS = [
  {
    id: 'firstSteps',
    name: '첫 발자국',
    memo: '달에 처음 닿은 것들. 사람보다 기계가 먼저 갔다. 차례대로 가 보고 싶다.',
    stops: [
      { story: 'luna2', line: '달에 처음 닿은 건 이거래.' },
      { story: 'luna9', line: '부서지지 않고 내린 첫 번째야.' },
      { story: 'apollo11', line: '발자국 아직 있어! 바람이 없어서래.' },
      { story: 'lunokhod1', line: '달에서 굴러다닌 첫 자동차야.' },
    ],
  },
  {
    id: 'apollo',
    name: '아폴로의 여섯 자리',
    memo: '1969년부터 1972년까지 여섯 번. 텔레비전과 신문으로만 따라갔다.',
    stops: [
      { story: 'apollo11', line: '여기가 첫 번째. 고요의 바다야.' },
      { story: 'apollo12', line: '옛 탐사선 바로 옆에 내렸대.' },
      { story: 'apollo14', line: '여기서 골프를 쳤대. 진짜야!' },
      { story: 'apollo15', line: '달 자동차를 처음 탔대.' },
      { story: 'apollo16', line: '여긴 달의 높은 땅이래.' },
      { story: 'apollo17', line: '마지막으로 사람이 온 곳이야.' },
    ],
  },
  {
    id: 'grandTour',
    name: '보이저의 그랜드 투어',
    memo: '1977년에 떠난 보이저 2호가 지나간 길. 네 행성을 다 본 건 그것 하나뿐.',
    stops: [
      { body: 'jupiter', line: '첫 번째 정거장, 목성이야.' },
      { body: 'saturn', line: '1981년에 여길 지나갔대.' },
      { story: 'voyager2Uranus', line: '천왕성에 온 건 하나뿐이래.' },
      { story: 'voyager2Neptune', line: '해왕성까지 12년 걸렸대.' },
      { story: 'voyager2Out', line: '따라잡았다! 같이 가자.' },
    ],
  },
  {
    id: 'water',
    name: '물을 찾아서',
    memo: '물이 있는 곳에 생명이 있을지도 모른다고 읽었다. 얼음과 바다를 찾아가는 길.',
    stops: [
      { story: 'shackleton', line: '여긴 해가 안 들어. 얼음이 있대.' },
      { story: 'korolev', line: '분화구에 얼음이 가득해!' },
      { story: 'phoenix', line: '흙을 팠더니 얼음이 나왔대.' },
      { story: 'conamara', line: '이 얼음 밑이 다 바다래.' },
      { story: 'tigerStripes', line: '물이 우주로 뿜어져 나와!' },
    ],
  },
  {
    id: 'rovers',
    name: '붉은 행성의 차들',
    memo: '화성을 굴러다닌 차들. 신문에 날 때마다 오려 두었다. 안부를 전해 다오.',
    stops: [
      { story: 'pathfinder', line: '첫 화성 자동차는 전자레인지만 해.' },
      { story: 'spirit', line: '여기서 6년 넘게 일했대.' },
      { story: 'opportunity', line: '90일 하러 와서 14년 일했대.' },
      { story: 'curiosity', line: '자동차만 한 게 아직도 일해.' },
      { story: 'perseverance', line: '헬리콥터도 데려왔대!' },
      { story: 'zhurong', line: '중국에서 온 친구야. 안녕.' },
    ],
  },
  {
    id: 'marsSights',
    name: '화성 관광',
    memo: '망원경으로는 붉은 점일 뿐이었다. 그 점 위에 산과 계곡이 있다니.',
    stops: [
      { story: 'olympus', line: '에베레스트의 두 배 반이래!' },
      { story: 'tharsis', line: '화산 셋이 한 줄로 서 있어.' },
      { story: 'marineris', line: '계곡 길이가 4,000km래.' },
      { story: 'cydonia', line: '얼굴 같다더니 그냥 언덕이네.' },
      { story: 'northCap', line: '여긴 얼음 모자야. 미끄러워!' },
    ],
  },
  {
    id: 'korea',
    name: '한국의 우주',
    memo: '우리나라도 우주로 갔다. 2022년, 신문 1면을 오려 붙인 해.',
    stops: [
      { story: 'dokdo', line: '여기서 출발! 독도야.' },
      { story: 'naro', line: '누리호가 여기서 떠났대.' },
      { craft: 'danuri', line: '다누리가 달을 돌고 있어.' },
      { story: 'shackleton', line: '다누리가 여길 찍었대.' },
    ],
  },
  {
    id: 'comets',
    name: '혜성 사냥꾼',
    memo: '1986년 핼리는 희미했고 1997년 헤일-밥은 평생 가장 밝았다. 가까이서 보고 싶었다.',
    stops: [
      { story: 'giotto', line: '할머니, 핼리 엄청 가까워!' },
      { story: 'rosetta', line: '오리 모양 혜성에 내렸대.' },
      { body: 'haleBopp', line: '할머니가 저녁마다 본 혜성!' },
    ],
  },
  {
    id: 'marsFilm',
    name: '와디럼에서 스키아파렐리까지',
    memo: '2015년 극장에서 본 화성 영화. 그 길의 땅은 다 진짜 있는 곳이라고 했다.',
    stops: [
      { story: 'wadiRum', line: '지구인데 화성 같아. 신기해.' },
      { story: 'acidalia', line: '여기서 영화 찍었지? 그치?' },
      { story: 'pathfinder', line: '진짜 탐사선은 여기 있어.' },
      { story: 'schiaparelli', line: '다 왔다! 엄청 큰 구덩이야.' },
    ],
  },
];

export function tourById(id) {
  return TOURS.find((t) => t.id === id) ?? null;
}

const storyOf = (stop) => STORIES.find((s) => s.id === stop.story);

export function stopName(stop) {
  if (stop.story) return storyOf(stop).name;
  return (BODIES.find((b) => b.id === stop.body) ?? CRAFT.find((c) => c.id === stop.craft)).name;
}

// The id of what to point at and jump near for a stop: the place itself when it is on
// a surface, else the body or craft its story is told at.
export function stopTarget(stop) {
  if (stop.body || stop.craft) return stop.body ?? stop.craft;
  const story = storyOf(stop);
  return story.type === 'surface' ? story.id : story.target ?? story.body;
}

// The tour under way and the stop she is heading for: { tour, stop, step } or null.
export function currentStop(progress) {
  const tour = progress.tour ? tourById(progress.tour.id) : null;
  if (!tour) return null;
  return { tour, stop: tour.stops[progress.tour.step], step: progress.tour.step };
}

export function startTour(progress, id) {
  return tourById(id) ? { ...progress, tour: { id, step: 0 } } : progress;
}

export function quitTour(progress) {
  return progress.tour ? { ...progress, tour: null } : progress;
}

// Whether she is at the stop right now. storiesNow: the story places she is at
// (core/stories.js completedStories); bodies, craft: this frame's positions.
export function stopReached(stop, { storiesNow, position, bodies, craft }) {
  if (stop.story) return storiesNow.includes(stop.story);
  if (stop.body) return surfaceDistance(position, bodies.find((b) => b.id === stop.body)) <= DISCOVERY_KM;
  const target = craft.find((c) => c.id === stop.craft);
  return Math.hypot(...target.position.map((n, i) => n - position[i])) <= DOCK_RANGE_KM;
}

// The current stop was reached: on to the next, or the tour is done (kept in
// progress.tours, once). Returns { progress, finished }.
export function advanceTour(progress) {
  const now = currentStop(progress);
  if (!now) return { progress, finished: false };
  if (now.step + 1 < now.tour.stops.length) {
    return { progress: { ...progress, tour: { id: now.tour.id, step: now.step + 1 } }, finished: false };
  }
  const done = progress.tours ?? [];
  return {
    progress: { ...progress, tour: null, tours: done.includes(now.tour.id) ? done : [...done, now.tour.id] },
    finished: true,
  };
}

export function allToursDone(progress) {
  return TOURS.every((t) => (progress.tours ?? []).includes(t.id));
}
