import { BODIES, surfaceDistance } from './bodies.js';
import { STORIES } from './stories.js';
import { CRAFT } from './craft.js';
import { DISCOVERY_KM } from './progress.js';
import { DOCK_RANGE_KM } from './dock.js';
import { t } from './i18n.js';

// Today's request (docs/재미-기획서.md 3.3): one small errand a day, on a slip of paper
// grandmother tucked into the journal. The date is the seed, so everyone gets the same
// kind of errand on the same day. Nothing is lost by not doing it.
//   day: on the anniversary of a real event, go to its place
//   visit: come within discovery range of a body
//   craft: come within docking range of a craft
//   photo: save a photo whose subject is the body (core/postcard.js ratePhoto)

// [month, day, year, story id or craft id]: the dates are those in the story texts.
const ANNIVERSARIES = [
  [1, 3, 2019, 'change4'], [1, 4, 2004, 'spirit'], [1, 14, 2005, 'huygens'], [1, 24, 1986, 'voyager2Uranus'],
  [1, 25, 2004, 'opportunity'], [2, 3, 1966, 'luna9'], [2, 5, 1971, 'apollo14'], [2, 18, 2021, 'perseverance'], [2, 18, 1930, 'lowell'],
  [3, 1, 1982, 'venera13'], [3, 6, 1979, 'valhalla'], [3, 13, 2013, 'alma'], [3, 14, 1986, 'giotto'], [4, 8, 2008, 'yiSoyeon'], [4, 12, 1961, 'baikonur'],
  [4, 21, 1972, 'apollo16'],
  [4, 30, 2015, 'messenger'], [5, 25, 2008, 'phoenix'], [6, 3, 1948, 'palomar'], [6, 11, 1985, 'vega'], [6, 21, 2022, 'naro'], [6, 23, 2025, 'rubin'], [6, 27, 1996, 'galileoRegio'], [7, 4, 1997, 'pathfinder'], [7, 10, 2017, 'greatRedSpot'], [7, 13, 2018, 'meerkat'],
  [7, 14, 2015, 'newHorizons'], [7, 21, 1969, 'apollo11'], [7, 30, 1971, 'apollo15'], [8, 6, 2012, 'curiosity'],
  [8, 23, 2023, 'chandrayaan3'], [8, 25, 1989, 'voyager2Neptune'], [9, 3, 1976, 'viking2'], [9, 7, 2023, 'tanegashima'], [9, 14, 1959, 'luna2'],
  [9, 15, 2017, 'cassini'], [9, 25, 2016, 'fast'], [10, 4, 1957, 'sputnik'], [10, 7, 1959, 'luna3'], [10, 10, 1980, 'vla'], [10, 22, 1975, 'venera9'], [11, 10, 2005, 'salt'], [11, 12, 2014, 'rosetta'], [11, 16, 1974, 'arecibo'], [11, 17, 1970, 'lunokhod1'],
  [11, 19, 1969, 'apollo12'], [11, 24, 2020, 'wenchang'], [12, 7, 1995, 'galileoProbe'], [12, 11, 1972, 'apollo17'], [12, 14, 2013, 'change3'], [12, 15, 1970, 'venera7'],
  [12, 24, 2024, 'parkerPerihelion'],
];
export const ANNIVERSARY_COUNT = ANNIVERSARIES.length;

// Bodies she may be sent to photograph: a moon of another planet is rated as its planet.
const PHOTO_BODIES = BODIES.filter((b) => b.kind !== 'star' && (b.kind !== 'moon' || b.id === 'moon')).map((b) => b.id);
// Every world and craft is asked for once, those nearest home first (the user,
// 2026-10-22, of errands that sent her to Venus again and again: "수첩은 한 장소에 한
// 번만 가게 해.. 반복하게 하지말구"; they had taken turns among the places found, by date).
const NEAR_BODIES = ['moon', 'venus', 'mars', 'mercury', 'jupiter', 'saturn', 'ceres', 'vesta', 'uranus', 'neptune', 'pluto'];
const NEAR_CRAFT = ['iss', 'hubble', 'tiangong', 'jwst', 'lro', 'danuri', 'mro', 'juno', 'soho', 'tess'];
// Of the moons only these (the user, the same day: "수첩에서 가야할 곳이 너무 많은데,
// 토성 1개, 목성은 2개의 위성만 가자. 나머지는 모두 최대 1개씩"): Titan; Io and Europa;
// one each elsewhere, the best known.
const ERRAND_MOONS = ['moon', 'phobos', 'io', 'europa', 'titan', 'miranda', 'triton', 'charon', 'dimorphos', 'menoetius'];
const ERRAND_BODIES = [...new Set([...NEAR_BODIES, ...BODIES.filter((b) => b.kind !== 'star' && !b.exo && b.id !== 'earth' && (b.kind !== 'moon' || ERRAND_MOONS.includes(b.id))).map((b) => b.id)])];
const ERRAND_CRAFT = [...new Set([...NEAR_CRAFT, ...CRAFT.map((c) => c.id)])];
// Two worlds, then a craft, while both last; a world's turn is a visit and a photo by
// turns (another planet's moon, which a photo would rate as the planet, a visit always).
const ERRANDS = (() => {
  const out = [];
  let b = 0;
  let c = 0;
  while (b < ERRAND_BODIES.length || c < ERRAND_CRAFT.length) {
    for (let k = 0; k < 2 && b < ERRAND_BODIES.length; k += 1, b += 1) {
      const id = ERRAND_BODIES[b];
      out.push({ kind: b % 2 && PHOTO_BODIES.includes(id) ? 'photo' : 'visit', id });
    }
    if (c < ERRAND_CRAFT.length) out.push({ kind: 'craft', id: ERRAND_CRAFT[c++] });
  }
  return out;
})();

const dayNumber = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
const nameOf = (id) => (BODIES.find((b) => b.id === id) ?? CRAFT.find((c) => c.id === id) ?? STORIES.find((s) => s.id === id)).name;
// The name with where it is, for a player who does not know (the user, 2026-10-19:
// "이아페투스? 사람들이 이아페투스가 어디에 있는지 모르잖아"): another planet's moon by its
// planet, a craft by the world it goes round, a story place by its world.
export function whereOf(id) {
  const body = BODIES.find((b) => b.id === id);
  if (body) return body.kind === 'moon' && body.parent !== 'earth' ? t`${nameOf(body.parent)}의 위성 ${body.name}` : body.name;
  const craft = CRAFT.find((c) => c.id === id);
  if (craft) return craft.parent && craft.parent !== 'sun' && BODIES.some((b) => b.id === craft.parent) ? t`${nameOf(craft.parent)} 궤도의 ${craft.name}` : craft.name;
  const story = STORIES.find((s) => s.id === id);
  return story.body && BODIES.some((b) => b.id === story.body) ? t`${nameOf(story.body)}의 ${story.name}` : story.name;
}
// The day `k` days after `day` ('YYYY-MM-DD'): the errands after today's are those of
// the days to come (the "다음 미션" key).
export function dayAfter(day, k) {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + k)).toISOString().slice(0, 10);
}

// The errands as of a day ('YYYY-MM-DD'), in order: the anniversary of a real event on
// its day, then every world and craft (ERRANDS), each left out once done (daily.places).
// None left: an empty list. Each is { kind, id, year?, text }, text in grandmother's words.
export function errandList(day, daily) {
  const done = new Set(daily?.places ?? []);
  const [, month, date] = day.split('-').map(Number);
  // Two events on one day (18 February: Perseverance, Lowell) take turns by year.
  const events = ANNIVERSARIES.filter(([m, d]) => m === month && d === date);
  const event = events[Number(day.slice(0, 4)) % events.length];
  const out = [];
  if (event && !done.has(event[3])) {
    const [, , year, id] = event;
    out.push({ kind: 'day', id, year, text: t`${year}년 오늘이 그날이란다. ${whereOf(id)}에 다녀와 다오.` });
  }
  for (const { kind, id } of ERRANDS) {
    if (done.has(id) || out.some((r) => r.id === id)) continue;
    if (kind === 'visit') out.push({ kind, id, text: t`오늘은 ${whereOf(id)}에 들러 다오. 잘 있는지 궁금하구나.` });
    else if (kind === 'photo') out.push({ kind, id, text: t`오늘은 ${whereOf(id)} 사진을 한 장 찍어 다오. 벽에 붙여 두마.` });
    else out.push({ kind, id, text: t`${whereOf(id)} 곁에 가서 안부 좀 전해 다오.` });
  }
  return out;
}

// How many of grandmother's errands are done, of all: { done, total } (the journal's
// "기록": the places of ERRANDS in daily.places; an anniversary's own place is not one).
export function errandTally(daily) {
  const done = new Set(daily?.places ?? []);
  return { done: ERRANDS.filter((e) => done.has(e.id)).length, total: ERRANDS.length };
}

// The first errand of a day, or null when every place has been done.
export function dailyRequest(day, daily) {
  return errandList(day, daily)[0] ?? null;
}

// What to point at for a request: the place itself on a surface, else the body or craft.
export function requestTarget(request) {
  const story = request.kind === 'day' ? STORIES.find((s) => s.id === request.id) : null;
  if (!story) return request.id;
  return story.type === 'surface' ? story.id : story.target ?? story.body;
}

// Whether the errand is done right now. storiesNow: the story places she is at;
// photoSubject: the subject of a photo saved this frame, or null.
export function requestMet(request, { storiesNow, position, bodies, craft, photoSubject = null }) {
  if (request.kind === 'photo') return photoSubject === request.id;
  if (request.kind === 'visit') return surfaceDistance(position, bodies.find((b) => b.id === request.id)) <= DISCOVERY_KM;
  if (request.kind === 'day' && STORIES.some((s) => s.id === request.id)) return storiesNow.includes(request.id);
  const target = craft.find((c) => c.id === request.id);
  return Boolean(target) && Math.hypot(...target.position.map((n, i) => n - position[i])) <= DOCK_RANGE_KM;
}

// The days an errand was done, oldest first, and the places done (each asked for once):
// { days: ['YYYY-MM-DD', ...], places: [id, ...] }.
// placeDays: the day each errand's place was done ({ id: 'YYYY-MM-DD' }), kept since
// 2026-10-23 for the journal's "마친 부탁"; those done before have none.
export function createDaily() {
  return { days: [], places: [], placeDays: {} };
}

const KNOWN = new Set([...ERRANDS.map((e) => e.id), ...ANNIVERSARIES.map(([, , , id]) => id)]);
export function sanitizeDaily(raw) {
  const days = Array.isArray(raw?.days) ? raw.days.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
  const places = Array.isArray(raw?.places) ? raw.places.filter((id) => KNOWN.has(id)) : [];
  const placeDays = Object.fromEntries(Object.entries(raw?.placeDays ?? {})
    .filter(([id, day]) => KNOWN.has(id) && typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)));
  return { days: [...new Set(days)].sort().slice(-400), places: [...new Set(places)], placeDays };
}

export function recordDay(daily, day) {
  return daily.days.includes(day) ? daily : { ...daily, days: [...daily.days, day].sort() };
}

export function recordPlace(daily, id, day = null) {
  const places = daily.places ?? [];
  if (places.includes(id)) return daily;
  return { ...daily, places: [...places, id], placeDays: { ...(daily.placeDays ?? {}), ...(day ? { [id]: day } : {}) } };
}

// The errands done, the latest first: [{ id, day }] (day null when not kept).
export function errandsDone(daily) {
  return [...(daily?.places ?? [])].reverse().map((id) => ({ id, day: daily.placeDays?.[id] ?? null }));
}

// How many days in a row up to today (or up to yesterday, when today's is not done
// yet). A missed day takes no star away; only this count starts again.
export function streak(daily, today) {
  const done = new Set(daily.days.map(dayNumber));
  let n = dayNumber(today);
  if (!done.has(n)) n -= 1;
  let count = 0;
  while (done.has(n)) {
    count += 1;
    n -= 1;
  }
  return count;
}

// Whether each of the last seven days was done, today last.
export function lastWeek(daily, today) {
  const done = new Set(daily.days.map(dayNumber));
  const n = dayNumber(today);
  return [6, 5, 4, 3, 2, 1, 0].map((back) => done.has(n - back));
}
