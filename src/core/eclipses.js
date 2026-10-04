// Real eclipses. In the week of one (the day itself and three days either side) the game
// says so, shows where on Earth to go, and plays the eclipse for whoever stands there.
// Dates, kinds, the place of greatest eclipse and its length are the real ones
// (Wikipedia's lists of 21st-century eclipses, read 2026-10-04).
//
// The show is staged. Distances in this game are squeezed (the Sun is a hundred times
// nearer than its size allows), so from Earth the Sun is 18 degrees in radius and the
// Moon, in its orbit, only 2: it cannot cover the Sun, nor can Earth's shadow reach it.
// While an eclipse is watched the Moon is brought to where it must be to do so.
import { surfaceDirection } from './surface.js';

const DAY_MS = 86400000;
export const ECLIPSE_DAYS = 3;

// solar: latDeg, lonDeg (east) of greatest eclipse. long: how long it lasts there.
export const ECLIPSES = [
  { id: 's20270206', kind: 'solar', type: 'annular', day: '2027-02-06', latDeg: -31.3, lonDeg: -48.5, where: '브라질 남쪽 대서양', long: '7분 51초' },
  { id: 's20270802', kind: 'solar', type: 'total', day: '2027-08-02', latDeg: 25.5, lonDeg: 33.2, where: '이집트 룩소르 근처', long: '6분 23초' },
  { id: 's20280126', kind: 'solar', type: 'annular', day: '2028-01-26', latDeg: 3.0, lonDeg: -51.5, where: '브라질 북쪽 아마존 하구', long: '10분 27초' },
  { id: 's20280722', kind: 'solar', type: 'total', day: '2028-07-22', latDeg: -15.6, lonDeg: 126.7, where: '오스트레일리아 북서쪽', long: '5분 10초' },
  { id: 'l20281231', kind: 'lunar', type: 'total', day: '2028-12-31', where: '지구의 밤 쪽', long: '71분' },
  { id: 'l20290626', kind: 'lunar', type: 'total', day: '2029-06-26', where: '지구의 밤 쪽', long: '102분' },
  { id: 'l20291220', kind: 'lunar', type: 'total', day: '2029-12-20', where: '지구의 밤 쪽', long: null },
  { id: 's20300601', kind: 'solar', type: 'annular', day: '2030-06-01', latDeg: 56.5, lonDeg: 80.1, where: '러시아 시베리아 서쪽', long: '5분 21초' },
  { id: 's20301125', kind: 'solar', type: 'total', day: '2030-11-25', latDeg: -43.6, lonDeg: 71.2, where: '인도양 남쪽', long: '3분 44초' },
];

export function eclipseTitle(event) {
  if (event.kind === 'lunar') return '개기월식';
  return event.type === 'total' ? '개기일식' : '금환일식';
}

export function eclipseDayText(event) {
  const [y, m, d] = event.day.split('-').map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

// Whole days from the local day of `date` to the event's day (negative: it has passed).
export function daysUntil(event, date) {
  const [y, m, d] = event.day.split('-').map(Number);
  const then = Date.UTC(y, m - 1, d);
  const now = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((then - now) / DAY_MS);
}

// The eclipse of this week, or null.
export function eclipseNow(date) {
  return ECLIPSES.find((e) => Math.abs(daysUntil(e, date)) <= ECLIPSE_DAYS) ?? null;
}

// The next one still to come (this week's counts), or null after the last.
export function nextEclipse(date) {
  return ECLIPSES.find((e) => daysUntil(e, date) >= -ECLIPSE_DAYS) ?? null;
}

// One line for the journal's sky news.
export function eclipseNews(date) {
  const event = nextEclipse(date);
  if (!event) return null;
  const days = daysUntil(event, date);
  const what = `${eclipseDayText(event)} ${eclipseTitle(event)}`;
  if (Math.abs(days) > ECLIPSE_DAYS) return `다음 ${event.kind === 'solar' ? '일식' : '월식'}: ${what}(${event.where}). ${days}일 남았습니다.`;
  const when = days === 0 ? '오늘입니다' : days > 0 ? `${days}일 뒤입니다` : `${-days}일 전이었습니다`;
  return `${what}: ${when}. 이번 주 내내 ${event.where}에서 볼 수 있습니다.`;
}

const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((n) => n / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Where on Earth to stand: the real place of greatest eclipse for the Sun's, and for the
// Moon's the middle of the night side (the Moon is seen from the whole of it).
// spinRad: how far Earth has turned (core/surface.js spinAngle).
export function eclipseSpot(event, earth, sun, spinRad) {
  const up = event.kind === 'solar'
    ? surfaceDirection(event.latDeg, event.lonDeg, spinRad)
    : unit(earth.position.map((n, i) => n - sun.position[i]));
  return { up, position: earth.position.map((n, i) => n + up[i] * earth.radiusKm) };
}

// How high the Sun stands over a spot: the sine of its height (1 overhead, 0 on the horizon).
export function sunHeight(spot, sun) {
  return dot(spot.up, unit(sun.position.map((n, i) => n - spot.position[i])));
}

// Near enough to the spot to watch from, and the Sun 15 degrees up for a solar one.
export const WATCH_WITHIN_KM = 800;
export const SUN_UP = Math.sin((15 * Math.PI) / 180);

export function canWatch(event, spot, sun, position) {
  if (Math.hypot(...position.map((n, i) => n - spot.position[i])) > WATCH_WITHIN_KM) return 'far';
  if (event.kind === 'solar' && sunHeight(spot, sun) < SUN_UP) return 'night';
  return 'yes';
}

// The show, t seconds in. Solar: `offset` is how far the Moon's middle is from the Sun's,
// in Sun radii (it comes in from one side, covers it, goes out the other), `size` the
// Moon's width against the Sun's (a little over 1: total; under 1: a ring is left).
// Lunar: `shade` is how far Earth's shadow has come over the Moon (0 none, 1 all).
const SOLAR = { inS: 9, holdS: 6, outS: 9, afterS: 2, from: 2.15 };
const LUNAR = { inS: 9, holdS: 7, outS: 8, afterS: 2 };

function linesFor(event) {
  const what = eclipseTitle(event);
  if (event.kind === 'lunar') {
    return [
      { at: 0, text: `${eclipseDayText(event)}의 ${what}. 지구의 그림자가 보름달 한쪽부터 덮어 옵니다.` },
      { at: 9, text: `달이 사라지지 않고 붉어집니다. 지구 둘레의 모든 해돋이와 해넘이 빛이 대기에서 꺾여 달에 닿기 때문입니다.${event.long ? ` 실제로는 ${event.long} 동안 이어집니다.` : ''}` },
      { at: 16, text: '그림자가 물러나고 달이 다시 밝아집니다.' },
    ];
  }
  if (event.type === 'total') {
    return [
      { at: 0, text: `${eclipseDayText(event)}의 ${what}. 달이 해의 한쪽부터 가려 들어옵니다.` },
      { at: 9, text: `해가 다 가려지고 평소에는 보이지 않던 코로나가 드러납니다. 실제로는 이곳에서 ${event.long} 동안 이어집니다.` },
      { at: 15, text: '달 가장자리로 첫 빛이 새어 나옵니다. 다이아몬드 반지입니다.' },
    ];
  }
  return [
    { at: 0, text: `${eclipseDayText(event)}의 ${what}. 달이 해의 한쪽부터 가려 들어옵니다.` },
    { at: 9, text: `달이 지구에서 멀 때라 해를 다 가리지 못하고 가는 빛의 고리가 남습니다. 실제로는 이곳에서 ${event.long} 동안 이어집니다.` },
    { at: 15, text: '달이 비켜나고 해가 다시 둥글어집니다.' },
  ];
}

export function showSeconds(event) {
  const p = event.kind === 'solar' ? SOLAR : LUNAR;
  return p.inS + p.holdS + p.outS + p.afterS;
}

export function showFrame(event, t) {
  const lines = linesFor(event);
  let line = 0;
  lines.forEach((l, i) => { if (t >= l.at) line = i; });
  const p = event.kind === 'solar' ? SOLAR : LUNAR;
  const going = Math.max(0, Math.min(1, t / p.inS));
  const leaving = Math.max(0, Math.min(1, (t - p.inS - p.holdS) / p.outS));
  const base = { line, text: lines[line].text, done: t >= showSeconds(event) };
  if (event.kind === 'lunar') return { ...base, shade: going - leaving };
  return { ...base, offset: -SOLAR.from * (1 - going) + SOLAR.from * leaving, size: event.type === 'total' ? 1.04 : 0.94 };
}

// Where the Moon is put for the show, seen from `eye` on Earth. up: the way up there.
// Solar: on the line to the Sun (offset to one side by frame.offset Sun radii), as near
// as makes it frame.size times the Sun's width. Lunar: high in the night sky, at its
// usual distance.
export function stagedMoon(event, frame, eye, up, sun, moon, earth) {
  const toSun = sun.position.map((n, i) => n - eye[i]);
  const far = Math.hypot(...toSun);
  const ahead = toSun.map((n) => n / far);
  if (event.kind === 'lunar') {
    const way = unit(ahead.map((n, i) => -n * 0.8 + up[i] * 0.6));
    const km = Math.hypot(...moon.position.map((n, i) => n - earth.position[i]));
    return eye.map((n, i) => n + way[i] * km);
  }
  const sunRad = Math.asin(Math.min(1, sun.radiusKm / far));
  const km = moon.radiusKm / Math.sin(Math.min(1.5, frame.size * sunRad));
  // Sideways across the sky, level with the ground.
  const side = unit(cross(up, ahead));
  const turn = frame.offset * sunRad;
  const way = ahead.map((n, i) => n * Math.cos(turn) + side[i] * Math.sin(turn));
  return eye.map((n, i) => n + way[i] * km);
}

// Stored data may be old or edited: keep only what is known.
export function sanitizeEclipses(raw) {
  const known = new Set(ECLIPSES.map((e) => e.id));
  const seen = raw && Array.isArray(raw.seen) ? [...new Set(raw.seen.filter((id) => known.has(id)))] : [];
  return { seen };
}
