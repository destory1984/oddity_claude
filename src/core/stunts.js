// Stunt flights (docs/재미-기획서.md 3.6): for those who want a try at flying well.
// Nothing is lost by failing, they are not journal slots, and the best of each is kept
// in the browser. One is under way at a time; a jump (teleport) starts it over.
import { surfaceDistance } from './bodies.js';

export const MOON_SKIM_KM = 100;
export const MOON_SKIM_MIN_S = 10;
export const EARTH_LAP_KM = 1000;
export const COMET_KM = 500;
export const COMET_S = 30;

// better: which way a record is beaten. 'none': done is done.
export const STUNTS = [
  { id: 'moonRun', name: '달까지 달리기', todo: '지구 표면에서 떠나 달 표면에 닿기. 걸린 시간을 잰다', better: 'less', line: '달까지 금방이네!' },
  { id: 'moonSkim', name: '달 스치기', todo: '달 표면 100km 안을 닿지 않고 10초 넘게 날기. 버틴 시간을 잰다', better: 'more', line: '아슬아슬했어!' },
  { id: 'earthLap', name: '지구 한 바퀴', todo: '지구 표면 1,000km 안에서 한 바퀴 돌기. 걸린 시간을 잰다', better: 'less', line: '지구 한 바퀴 돌았다!' },
  { id: 'cometChase', name: '혜성 따라잡기', todo: '핼리 혜성 500km 안에서 내려앉지 않고 30초 붙어 있기', better: 'none', line: '혜성 꼬리 잡았다!' },
];

export function stuntById(id) {
  return STUNTS.find((s) => s.id === id) ?? null;
}

// A stunt just taken up: waiting for its starting condition.
export function startStunt(id) {
  return stuntById(id) ? { id, going: false, seconds: 0, angle: 0, from: null } : null;
}

const WAIT = (run) => ({ ...run, going: false, seconds: 0, angle: 0, from: null });
const sub = (a, b) => a.map((n, i) => n - b[i]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};

// One frame of the stunt under way. sample: { position, restingOn (a body's id or null),
// bodies, jumped (a teleport happened) }; dt: play seconds. Returns { run, done } where
// done is null or the value reached (seconds), and run is then back to waiting.
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

  if (run.id === 'moonSkim' || run.id === 'cometChase') {
    const skim = run.id === 'moonSkim';
    const target = body(skim ? 'moon' : 'halley');
    const near = surfaceDistance(position, target) <= (skim ? MOON_SKIM_KM : COMET_KM) && restingOn !== target.id;
    if (near) {
      const seconds = run.seconds + dt;
      if (!skim && seconds >= COMET_S) return { run: WAIT(run), done: COMET_S };
      return { run: { ...run, going: true, seconds }, done: null };
    }
    // Out of the band, or touched down: a skim long enough counts, the rest starts over.
    return { run: WAIT(run), done: skim && run.going && run.seconds >= MOON_SKIM_MIN_S ? run.seconds : null };
  }

  if (run.id === 'earthLap') {
    const earth = body('earth');
    const inBand = surfaceDistance(position, earth) <= EARTH_LAP_KM && restingOn !== 'earth';
    if (!inBand) return { run: WAIT(run), done: null };
    const out = unit(sub(position, earth.position));
    if (!run.going) return { run: { ...run, going: true, seconds: 0, angle: 0, from: { out, axis: null } }, done: null };
    // The way round is fixed by the first stretch flown; turning back unwinds the angle.
    const turn = cross(run.from.out, out);
    const axis = run.from.axis ?? (Math.hypot(...turn) > 1e-9 ? unit(turn) : null);
    const step = axis ? Math.atan2(dot(axis, turn), dot(run.from.out, out)) : 0;
    const angle = run.angle + step;
    const seconds = run.seconds + dt;
    if (Math.abs(angle) >= 2 * Math.PI - 1e-6) return { run: WAIT(run), done: seconds };
    return { run: { ...run, seconds, angle, from: { out, axis } }, done: null };
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
  if (run.id === 'moonSkim') return run.going ? `${stunt.name} ${s}초` : `${stunt.name}: 달 표면 100km 안으로`;
  if (run.id === 'earthLap') return run.going ? `${stunt.name} ${Math.floor((Math.abs(run.angle) / (2 * Math.PI)) * 100)}% · ${s}초` : `${stunt.name}: 지구 표면 1,000km 안으로`;
  return run.going ? `${stunt.name} ${s}/${COMET_S}초` : `${stunt.name}: 핼리 혜성 500km 안으로`;
}

// Records: { stunt id: best seconds }. Returns the records after a result and whether it
// was a new best (the first result always is).
export function recordStunt(records, id, value) {
  const stunt = stuntById(id);
  const had = records[id];
  const best = had === undefined
    || (stunt.better === 'less' && value < had)
    || (stunt.better === 'more' && value > had);
  return { records: best ? { ...records, [id]: value } : records, best };
}

// Stored data may be old, edited or broken: keep only known stunts with sane numbers.
export function sanitizeStunts(raw) {
  if (!raw || typeof raw !== 'object') return {};
  return Object.fromEntries(STUNTS.flatMap((s) => (Number.isFinite(raw[s.id]) && raw[s.id] > 0 && raw[s.id] < 1e6 ? [[s.id, raw[s.id]]] : [])));
}

// A record as the journal shows it.
export function recordText(id, records) {
  const value = records[id];
  if (value === undefined) return '아직 기록 없음';
  return stuntById(id).better === 'none' ? '해냈음' : `기록 ${value.toFixed(1)}초`;
}
