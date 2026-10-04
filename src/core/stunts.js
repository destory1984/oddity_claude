// Stunt flights (docs/재미-기획서.md 3.6): for those who want a try at flying well.
// Nothing is lost by failing, they are not journal slots, and the best of each is kept
// in the browser. One is under way at a time; a jump (teleport) starts it over.
import { surfaceDistance } from './bodies.js';
import { CASSINI_GAP } from './rings.js';

// There is no gravity here and she can hang still anywhere, so staying somewhere is no
// feat: each stunt is about covering ground.
export const MOON_SKIM_KM = 100;
export const MOON_SKIM_MIN_KM = 1000;
export const EARTH_LAP_KM = 1000;
// The lap's way round is settled this far (radians) from where it began.
const LAP_AXIS_AFTER = 0.15;
// And its clock starts this far from there (about 35 km over the ground).
const LAP_STARTS_AT = 0.005;

// better: which way a record is beaten. unit: what the value is counted in.
export const STUNTS = [
  { id: 'moonRun', name: '달까지 달리기', todo: '지구 표면에서 떠나 달 표면에 닿기. 걸린 시간을 잰다', better: 'less', unit: '초', line: '달까지 금방이네!' },
  { id: 'moonSkim', name: '달 스치기', todo: '달 표면 100km 안을 닿지도 벗어나지도 않고 1,000km 넘게 날기. 날아간 거리를 잰다', better: 'more', unit: 'km', line: '아슬아슬했어!' },
  { id: 'earthLap', name: '지구 한 바퀴', todo: '지구 표면 1,000km 안에서 한 바퀴 돌기. 걸린 시간을 잰다', better: 'less', unit: '초', line: '지구 한 바퀴 돌았다!' },
  { id: 'ringGap', name: '고리 틈 지나기', todo: '토성 고리의 검은 틈(카시니 간극, 폭 4,700km)으로 고리를 건너기. 지나는 빠르기를 잰다', better: 'more', unit: 'km/s', line: '고리 사이로 쏙 지나왔어!' },
];

// The rubber stamp a stunt leaves in the journal once it has a record (drawn to order,
// 2026-10-04): public/assets/notebook/stamp-<name>.png.
const STUNT_STAMPS = { moonRun: 'moon-run', moonSkim: 'moon-skim', earthLap: 'earth-lap', ringGap: 'ring-gap' };
export const stuntStampFile = (id) => `notebook/stamp-${STUNT_STAMPS[id]}.png`;

export function stuntById(id) {
  return STUNTS.find((s) => s.id === id) ?? null;
}

// A stunt just taken up: waiting for its starting condition.
export function startStunt(id) {
  return stuntById(id) ? { id, going: false, seconds: 0, angle: 0, km: 0, from: null } : null;
}

const WAIT = (run) => ({ ...run, going: false, seconds: 0, angle: 0, km: 0, from: null });
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};

// One frame of the stunt under way. sample: { position, restingOn (a body's id or null),
// bodies, jumped (a teleport happened), ring ({ body, t } when a ring plane was crossed,
// t along the rings from 0 to 1), speedKmS }; dt: play seconds. Returns { run, done } where
// done is null or the value reached (seconds, or km for the skim), and run is then back
// to waiting.
export function stepStunt(run, sample, dt) {
  const { position, restingOn, bodies, jumped } = sample;
  if (jumped) return { run: WAIT(run), done: null };
  const body = (id) => bodies.find((b) => b.id === id);

  if (run.id === 'moonRun') {
    // Ready on Earth's ground; the clock starts on leaving it and stops on the Moon.
    if (!run.going) return { run: run.from === 'earth' && restingOn !== 'earth' ? { ...run, going: true, seconds: dt } : { ...run, from: restingOn === 'earth' ? 'earth' : null }, done: null };
    if (restingOn === 'moon') return { run: WAIT(run), done: run.seconds };
    if (restingOn === 'earth') return { run: { ...WAIT(run), from: 'earth' }, done: null };
    return { run: { ...run, seconds: run.seconds + dt }, done: null };
  }

  if (run.id === 'moonSkim') {
    const moon = body('moon');
    const inBand = surfaceDistance(position, moon) <= MOON_SKIM_KM && restingOn !== 'moon';
    // Out of the band, or touched down: a skim long enough counts, the rest starts over.
    if (!inBand) return { run: WAIT(run), done: run.going && run.km >= MOON_SKIM_MIN_KM ? run.km : null };
    // The ground covered is measured beside the Moon, which is itself moving.
    const beside = sub(position, moon.position);
    const km = run.going ? run.km + Math.hypot(...sub(beside, run.from)) : 0;
    return { run: { ...run, going: true, seconds: run.seconds + dt, km, from: beside }, done: null };
  }

  if (run.id === 'ringGap') {
    const hit = sample.ring?.body === 'saturn' ? sample.ring : null;
    if (hit && hit.t >= CASSINI_GAP[0] && hit.t < CASSINI_GAP[1]) return { run: WAIT(run), done: sample.speedKmS };
    // Through the ice instead: said on the goal line, and she may come round again.
    return { run: hit ? { ...run, from: 'ice' } : run, done: null };
  }

  if (run.id === 'earthLap') {
    const earth = body('earth');
    const inBand = surfaceDistance(position, earth) <= EARTH_LAP_KM && restingOn !== 'earth';
    if (!inBand) return { run: WAIT(run), done: null };
    const out = unit(sub(position, earth.position));
    if (!run.going) return { run: { ...run, going: true, seconds: 0, angle: 0, from: { out, axis: null, start: out } }, done: null };
    const seconds = run.seconds + dt;
    // The way round is fixed once she is a fair arc from where she began (her first few
    // km may be a drift some other way); until then the angle is simply how far that is.
    if (!run.from.axis) {
      const off = cross(run.from.start, out);
      const far = Math.atan2(Math.hypot(...off), dot(run.from.start, out));
      const axis = far >= LAP_AXIS_AFTER ? unit(off) : null;
      // Hanging in the band getting ready is not on the clock: it starts as she sets off.
      return { run: { ...run, seconds: far < LAP_STARTS_AT ? 0 : seconds, angle: far, from: { ...run.from, out, axis } }, done: null };
    }
    // After that each step is counted round that way; turning back unwinds the angle.
    const { axis } = run.from;
    const angle = run.angle + Math.atan2(dot(axis, cross(run.from.out, out)), dot(run.from.out, out));
    if (Math.abs(angle) >= 2 * Math.PI - 1e-6) return { run: WAIT(run), done: seconds };
    return { run: { ...run, seconds, angle, from: { ...run.from, out } }, done: null };
  }
  return { run, done: null };
}

// What the goal line says while a stunt is on.
export function stuntStatus(run) {
  const stunt = stuntById(run.id);
  const s = Math.floor(run.seconds);
  if (run.id === 'moonRun') {
    if (run.going) return `${stunt.name} ${s}초`;
    return run.from === 'earth' ? `${stunt.name}: 준비됐습니다. 떠나면 시계가 갑니다` : `${stunt.name}: 지구 표면에 내려서면 준비됩니다`;
  }
  if (run.id === 'ringGap') return run.from === 'ice' ? `${stunt.name}: 얼음을 지났습니다. 밝은 고리 사이의 검은 틈으로` : `${stunt.name}: 토성 고리의 검은 틈으로`;
  if (run.id === 'moonSkim') return run.going ? `${stunt.name} ${Math.floor(run.km).toLocaleString('ko-KR')}km` : `${stunt.name}: 달 표면 100km 안으로`;
  return run.going ? `${stunt.name} ${Math.floor((Math.abs(run.angle) / (2 * Math.PI)) * 100)}% · ${s}초` : `${stunt.name}: 지구 표면 1,000km 안으로`;
}

// Records: { stunt id: best value }. Returns the records after a result and whether it
// was a new best (the first result always is).
export function recordStunt(records, id, value) {
  const stunt = stuntById(id);
  const had = records[id];
  const best = had === undefined || (stunt.better === 'less' ? value < had : value > had);
  return { records: best ? { ...records, [id]: value } : records, best };
}

// Stored data may be old, edited or broken: keep only known stunts with sane numbers.
export function sanitizeStunts(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(STUNTS.flatMap((s) => (Number.isFinite(raw[s.id]) && raw[s.id] > 0 && raw[s.id] < 1e12 ? [[s.id, raw[s.id]]] : [])));
}

// A record as the journal shows it.
export function recordText(id, records) {
  return records[id] === undefined ? '아직 기록 없음' : `기록 ${valueText(id, records[id])}`;
}

// A value with its unit: '8.3초', '2,140km', '12,000km/s'.
export function valueText(id, value) {
  const { unit } = stuntById(id);
  if (unit === 'km/s') return `초속 ${Math.round(value).toLocaleString('ko-KR')}km`;
  return unit === 'km' ? `${Math.round(value).toLocaleString('ko-KR')}km` : `${value.toFixed(1)}초`;
}
