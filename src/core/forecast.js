// Sky news: what is about to happen in the sky, told in the journal. The orbits are
// plain formulas, so what comes can be worked out ahead: which moon's shadow is
// crossing its planet now, and whose crosses next (core/shadows.js).
import { BODY_DATA, TIME_SCALE } from './bodies.js';
import { SHADOW_CASTERS, shadowEdge, shadowSpot } from './shadows.js';

// Only shadows wide enough to be seen from where a planet is looked at: this many km
// across the outer edge at least (Io, Europa, Ganymede, Callisto, Titan).
export const NEWS_MIN_KM = 1000;
// A moon's orbit is looked through in this many steps (Io: every 6 seconds of play).
const STEPS = 240;

export const NEWS_MOONS = Object.values(SHADOW_CASTERS).flat().filter((id) => shadowEdge(id).outerKm >= NEWS_MIN_KM);

const data = (id) => BODY_DATA.find((b) => b.id === id);

// The next crossings, soonest first (those under way come before any still to begin):
//   [{ moon, planet, inS, forS }]
// inS: seconds of game time until it begins (0: under way); forS: how long it is on
// the planet from then (or from now). bodiesAt: game time → bodies.
export function skyNews(bodiesAt, nowS, count = 2) {
  const news = [];
  for (const moon of NEWS_MOONS) {
    const { parent: planet, periodS } = data(moon);
    const stepS = periodS / STEPS;
    const on = (afterS) => {
      const bodies = bodiesAt(nowS + afterS);
      const sun = bodies.find((b) => b.kind === 'star');
      return Boolean(shadowSpot(bodies.find((b) => b.id === planet), bodies.find((b) => b.id === moon), sun.position));
    };
    let begin = 0;
    while (begin <= periodS && !on(begin)) begin += stepS;
    if (begin > periodS) continue;
    let end = begin + stepS;
    while (end - begin <= periodS && on(end)) end += stepS;
    news.push({ moon, planet, inS: begin, forS: end - begin });
  }
  return news.sort((a, b) => a.inS - b.inS).slice(0, count);
}

// Game seconds as minutes of play, never less than one.
export const playMinutes = (gameS) => Math.max(1, Math.round(gameS / TIME_SCALE / 60));

// One line for the journal.
export function newsLine({ moon, planet, inS, forS }) {
  const [moonName, planetName] = [data(moon).name, data(planet).name];
  if (inS === 0) return `지금 ${moonName}의 그림자가 ${planetName} 위를 지나가고 있습니다. ${playMinutes(forS)}분 더 보입니다.`;
  return `${playMinutes(inS)}분 뒤 ${moonName}의 그림자가 ${planetName} 위를 지나갑니다. ${playMinutes(forS)}분 동안 보입니다.`;
}
