import { TIME_SCALE } from './bodies.js';

// One game clock for everyone (the user, 2026-10-19: "모든 사람이 언제나 같은 행성 위치를
// 갖는다.. 가능?", "핸드폰 시간을 가지고 수학적으로 가능하게 할 수 있어? timestamp", "4. 해"):
// the game's time is the real time since a fixed moment, run fifty times as fast, so two
// players with the same layout see the worlds in the same places at the same moment.
// (It was a clock started at nought each time the game was opened.) A phone's clock is
// set by its network, to within a second or so: some fifty seconds of game time.

// The travel layout counts from here.
export const TOUR_EPOCH_MS = Date.UTC(2026, 9, 1);
const DAY_MS = 86400000;
// Korea's midnight, the same for everyone wherever they are.
const KST_MS = 9 * 3600000;

// The moment the clock counts from: today's midnight in Korea for today's sky (its worlds
// stand where they really were then), the fixed one for the travel layout.
export function skyAnchor(layout, nowMs) {
  if (layout !== 'today') return TOUR_EPOCH_MS;
  return Math.floor((nowMs + KST_MS) / DAY_MS) * DAY_MS - KST_MS;
}

// The game's time (s) at nowMs, counted from anchorMs.
export function clockTime(anchorMs, nowMs) {
  return (Math.max(0, nowMs - anchorMs) / 1000) * TIME_SCALE;
}
