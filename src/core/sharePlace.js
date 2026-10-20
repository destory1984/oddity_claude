// A place to send to a friend (the user, 2026-10-19: "게임 상에서 내 위치를 다른 플레이어에게
// 공유할 수 있는 기능 만들자"): where she stands and the way she looks, and the sky she saw
// it under, as one short line for a link's address. There is no server: the place goes in
// the link itself, and the game opened by it starts there. Nothing else goes in it.
//
// The worlds stand where the layout, the moment the game was opened and the game clock
// put them, and those differ from one player to another ("그런데 사람마다 천체 위치가 다를
// 수 있잖아"), so the sky goes along with the place.
//
// One line, ?p=, parts joined by ".", numbers as whole numbers in base 36 with a "-" for
// those under zero (the first try, written out in decimals, filled two lines of a
// KakaoTalk bubble: "이렇게 나오는데?"):
//   body . at (3, km) . ahead (3) . above (3, both in thousandths) . t|d . opened (s) . clock (s)
//   earth.ec4.5lx.4.-pw.-a2.0.-a2.pw.0.t.u2h1e9.y3

// The game as published: a link sent from anywhere (a phone's app, the dev server) opens
// it, and its page gives KakaoTalk and the rest a picture card (index.html og:image).
export const SHARE_BASE = 'https://destory1984.github.io/oddity_claude/';

// The game's Android app, and an address that opens a link in it from Chrome (ui/openInApp.js):
// with no app, Chrome goes on to `fallback` instead.
export const APP_PACKAGE = 'io.github.destory1984.spaceoddity';
export function appIntent(link, fallback = link) {
  return `intent://${link.replace(/^https:\/\//, '')}#Intent;scheme=https;package=${APP_PACKAGE};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;
}

// KakaoTalk's own sharing, a picture card with a key and no address written out (the user,
// of the link in a bubble: "저런식으로 나오면, 사람들이 질겁해"). The JavaScript key of the
// app "Space Oddity" (ID 1613524) on developers.kakao.com is made to stand in a web page:
// it works only on the domains written down there (destory1984.github.io, localhost:4417).
// It is not the REST API or admin key, which must never be in the code. The SDK is fetched
// only when a player opens the share sheet.
export const KAKAO_JS_KEY = '893c2d83d29ad7790e8499d45d974ecb';
export const KAKAO_SDK = {
  src: 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js',
  integrity: 'sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy',
};

const SEP = '.';
// No place of the game is farther than this from the body it is measured from (km).
const FAR_KM = 1e10;

const b36 = (n) => Math.round(n).toString(36);
const from36 = (s) => {
  if (!/^-?[0-9a-z]{1,12}$/.test(s)) return NaN;
  return parseInt(s, 36);
};

// place: { spot: { body, at, ahead, above }, sky: { layout, openedAt (ms), simTime (s) } }.
export function encodePlace({ spot, sky }) {
  return [
    spot.body,
    ...spot.at.map(b36),
    ...spot.ahead.map((n) => b36(n * 1000)),
    ...spot.above.map((n) => b36(n * 1000)),
    sky.layout === 'today' ? 'd' : 't',
    b36(sky.openedAt / 1000),
    b36(sky.simTime),
  ].join(SEP);
}

// The place in a line, or null when it is not one: a body not in `bodyIds`, a number
// missing or not a number, a place too far, a way of looking that is no way.
export function decodePlace(line, bodyIds) {
  if (typeof line !== 'string' || line.length > 160) return null;
  const parts = line.split(SEP);
  if (parts.length !== 13 || !bodyIds.includes(parts[0]) || !['t', 'd'].includes(parts[10])) return null;
  const numbers = [...parts.slice(1, 10), ...parts.slice(11)].map(from36);
  if (numbers.some((n) => !Number.isFinite(n))) return null;
  const unit = (v) => {
    const length = Math.hypot(...v);
    return length > 1e-6 ? v.map((n) => n / length) : null;
  };
  const at = numbers.slice(0, 3);
  const ahead = unit(numbers.slice(3, 6));
  const above = unit(numbers.slice(6, 9));
  if (!ahead || !above || Math.hypot(...at) > FAR_KM) return null;
  // (The top of the view must not lie along the way she looks.)
  if (Math.abs(ahead.reduce((sum, n, i) => sum + n * above[i], 0)) > 0.99) return null;
  const [opened, clock] = numbers.slice(9);
  if (opened < 0 || clock < 0) return null;
  return {
    spot: { body: parts[0], at, ahead, above },
    sky: { layout: parts[10] === 'd' ? 'today' : 'tour', openedAt: opened * 1000, simTime: clock },
  };
}
