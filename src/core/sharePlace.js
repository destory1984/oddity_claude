// A place to send to a friend (the user, 2026-10-19: "게임 상에서 내 위치를 다른 플레이어에게
// 공유할 수 있는 기능 만들자"): where she stands and the way she looks, as one line for a
// link's address. There is no server: the place goes in the link itself, and the game
// opened by it starts there. Nothing else goes in it.
//
// The line is a spot of core/startSpots.js (toSpot / fromSpot): the body measured from,
// then `at` (km, toward the Sun, up, aside), `ahead` and `above`, all joined by "_":
//   moon_26.3_1833.2_150.4_0.168_-0.2_0.965_0.034_0.98_0.197
// Only letters, digits, ".", "-" and "_", so it needs no escaping in an address.

const SEP = '_';
// No place of the game is farther than this from the body it is measured from (km).
const FAR_KM = 1e10;

const short = (n, digits) => String(Number(n.toFixed(digits)));

// The sky she saw it under (the user, the same day: "그런데 사람마다 천체 위치가 다를 수
// 있잖아"): the worlds stand where the layout, the day the game was opened and the game
// clock put them, and those differ from one player to another. So the link carries them
// too, "t" or "d" (the travel layout, today's sky), the opening time in ms and the game
// clock in seconds: d.1797600000000.3190.5. The game opened by it lays the sky out so.
export function encodeSky({ layout, openedAt, simTime }) {
  return [layout === 'today' ? 'd' : 't', Math.round(openedAt), short(simTime, 1)].join('.');
}

// { layout, openedAt, simTime }, or null when the line is not one.
export function decodeSky(line) {
  if (typeof line !== 'string' || line.length > 60) return null;
  const match = line.match(/^([td])\.(\d{1,15})\.(\d{1,12}(?:\.\d)?)$/);
  if (!match) return null;
  const simTime = Number(match[3]);
  if (!Number.isFinite(simTime)) return null;
  return { layout: match[1] === 'd' ? 'today' : 'tour', openedAt: Number(match[2]), simTime };
}

export function encodeSpot({ body, at, ahead, above }) {
  return [body, ...at.map((n) => short(n, 1)), ...ahead.map((n) => short(n, 3)), ...above.map((n) => short(n, 3))].join(SEP);
}

// The spot in a line, or null when it is not one: a body not in `bodyIds`, a number
// missing or not a number, a place too far, a way of looking that is no way.
export function decodeSpot(line, bodyIds) {
  if (typeof line !== 'string' || line.length > 200) return null;
  const parts = line.split(SEP);
  if (parts.length !== 10 || !bodyIds.includes(parts[0])) return null;
  const numbers = parts.slice(1).map(Number);
  if (numbers.some((n) => !Number.isFinite(n)) || parts.slice(1).some((p) => p.trim() === '')) return null;
  const at = numbers.slice(0, 3);
  const unit = (v) => {
    const length = Math.hypot(...v);
    return length > 1e-6 ? v.map((n) => n / length) : null;
  };
  const ahead = unit(numbers.slice(3, 6));
  const above = unit(numbers.slice(6, 9));
  if (!ahead || !above || Math.hypot(...at) > FAR_KM) return null;
  // (The top of the view must not lie along the way she looks.)
  if (Math.abs(ahead.reduce((sum, n, i) => sum + n * above[i], 0)) > 0.99) return null;
  return { body: parts[0], at, ahead, above };
}
