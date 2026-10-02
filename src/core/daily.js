import { BODIES, surfaceDistance } from './bodies.js';
import { STORIES } from './stories.js';
import { CRAFT } from './craft.js';
import { DISCOVERY_KM } from './progress.js';
import { DOCK_RANGE_KM } from './dock.js';

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
  [1, 25, 2004, 'opportunity'], [2, 3, 1966, 'luna9'], [2, 5, 1971, 'apollo14'], [2, 18, 2021, 'perseverance'],
  [3, 1, 1982, 'venera13'], [3, 14, 1986, 'giotto'], [4, 8, 2008, 'yiSoyeon'], [4, 21, 1972, 'apollo16'],
  [4, 30, 2015, 'messenger'], [5, 25, 2008, 'phoenix'], [6, 21, 2022, 'naro'], [7, 4, 1997, 'pathfinder'],
  [7, 14, 2015, 'newHorizons'], [7, 20, 1969, 'apollo11'], [7, 30, 1971, 'apollo15'], [8, 6, 2012, 'curiosity'],
  [8, 23, 2023, 'chandrayaan3'], [8, 25, 1989, 'voyager2Neptune'], [9, 3, 1976, 'viking2'], [9, 14, 1959, 'luna2'],
  [9, 15, 2017, 'cassini'], [10, 4, 1957, 'sputnik'], [11, 12, 2014, 'rosetta'], [11, 17, 1970, 'lunokhod1'],
  [11, 19, 1969, 'apollo12'], [12, 11, 1972, 'apollo17'], [12, 14, 2013, 'change3'], [12, 15, 1970, 'venera7'],
  [12, 24, 2024, 'parkerPerihelion'],
];
export const ANNIVERSARY_COUNT = ANNIVERSARIES.length;

// Bodies she may be sent to photograph: a moon of another planet is rated as its planet.
const PHOTO_BODIES = BODIES.filter((b) => b.kind !== 'star' && (b.kind !== 'moon' || b.id === 'moon')).map((b) => b.id);
const NEAR_CRAFT = ['iss', 'hubble'];

const dayNumber = (day) => {
  const [y, m, d] = day.split('-').map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
};
const pick = (list, n) => list[((n % list.length) + list.length) % list.length];
const nameOf = (id) => (BODIES.find((b) => b.id === id) ?? CRAFT.find((c) => c.id === id) ?? STORIES.find((s) => s.id === id)).name;

// The request for a day ('YYYY-MM-DD'). Except on an anniversary it sends her somewhere
// she has already been (a body found, a craft met), so that it takes a few minutes;
// a new log gets the Moon and the craft near Earth.
// Returns { kind, id, year?, text } with text in grandmother's words.
export function dailyRequest(day, progress) {
  const [, month, date] = day.split('-').map(Number);
  const event = ANNIVERSARIES.find(([m, d]) => m === month && d === date);
  if (event) {
    const [, , year, id] = event;
    return { kind: 'day', id, year, text: `${year}년 오늘이 그날이란다. ${nameOf(id)}에 다녀와 다오.` };
  }
  const n = dayNumber(day);
  const found = progress.discovered.filter((id) => id !== 'earth' && id !== 'sun');
  const kind = pick(['visit', 'photo', 'craft'], n);
  if (kind === 'visit') {
    const id = pick(found.length ? found : ['moon'], Math.floor(n / 3));
    return { kind, id, text: `오늘은 ${nameOf(id)}에 들러 다오. 잘 있는지 궁금하구나.` };
  }
  if (kind === 'photo') {
    const seen = found.filter((id) => PHOTO_BODIES.includes(id));
    const id = pick(seen.length ? seen : ['moon'], Math.floor(n / 3));
    return { kind, id, text: `오늘은 ${nameOf(id)} 사진을 한 장 찍어 다오. 벽에 붙여 두마.` };
  }
  const met = (progress.craft ?? []).filter((id) => CRAFT.some((c) => c.id === id));
  const id = pick(met.length ? met : NEAR_CRAFT, Math.floor(n / 3));
  return { kind, id, text: `${nameOf(id)} 곁에 가서 안부 좀 전해 다오.` };
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

// The days an errand was done: { days: ['YYYY-MM-DD', ...] }, oldest first.
export function createDaily() {
  return { days: [] };
}

export function sanitizeDaily(raw) {
  const days = Array.isArray(raw?.days) ? raw.days.filter((d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
  return { days: [...new Set(days)].sort().slice(-400) };
}

export function recordDay(daily, day) {
  return daily.days.includes(day) ? daily : { days: [...daily.days, day].sort() };
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
