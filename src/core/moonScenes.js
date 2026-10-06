import { t } from './i18n.js';
// Eight more days played again, all on the Moon (the user, 2026-10-06, of the launch at
// pad 39A: "달에도 저런 발사 이벤트를 넣을만한 곳이 많을 것 같은데", "발사 또는 착륙",
// "모두 다 넣자"). Two go up, three come down and something rolls out or falls over,
// one only hits.
//
// Each is a `stage`: a few pieces, and for every moment where each piece stands. A
// piece's place is in the model's own units (a lander is about one unit across, the
// ground is y = 0): x to the side, y up, lean in radians about the axis toward the eye
// (negative: its top goes toward +x), turn in radians about its upright (Apollo 11's two
// on the ladder), scale (1 if not given), shown (true if not given)
// and burn (its flame shows). render/siteModels.js builds the pieces under the same
// names (SITE_REPLAY_BUILD) and render/craft.js puts them where this says.
// downAt is the scene's own moment (it leaves, it lands, it hits); sounds: what is
// heard and when (ui/sound.js cues).

const clamp = (n) => Math.max(0, Math.min(1, n));
// 0 → 1 between two moments, gently at both ends.
const ease = (t, from, to) => {
  const u = clamp((t - from) / (to - from));
  return u * u * (3 - 2 * u);
};
// A lander coming down from `high` to the ground by `downAt`, slower and slower.
const comeDown = (t, downAt, high) => high * (1 - clamp(t / downAt)) ** 2;

// A small rover that rides on a lander's deck, rolls down its ramp and drives off:
// on the deck until `rollAt`, at the ramp's foot `ramp` seconds later, then `drive`
// seconds along the ground to x = `to`. liftY: how high the lander is (it rides down).
// The ramp runs from (0.2, 0.4) to (0.62, 0.02) on every lander that has one.
function rollOut(t, { rollAt, ramp, drive, to, liftY = 0, scale }) {
  const slope = Math.atan2(0.38, 0.42);
  if (t < rollAt) return { x: 0.2 * ease(t, rollAt - 1.2, rollAt), y: 0.41 + liftY, lean: 0, scale };
  if (t < rollAt + ramp) {
    const u = (t - rollAt) / ramp;
    // Nose down as it takes the ramp, level again as it leaves it.
    const tip = Math.min(1, u / 0.15, (1 - u) / 0.15);
    return { x: 0.2 + 0.46 * u, y: 0.41 * (1 - u), lean: -slope * tip, scale };
  }
  return { x: 0.66 + (to - 0.66) * ease(t, rollAt + ramp, rollAt + ramp + drive), y: 0, lean: 0, scale };
}

// One hop of a walker on the Moon: `high` at the top, down again every `period` seconds.
const hop = (s, period, high) => {
  const u = (s / period) % 1;
  return high * 4 * u * (1 - u);
};
// Down the ladder on the front leg (its top at the porch, x 0.25, y 0.41; its foot on the
// ground at x 0.5) between two moments, a rung at a time.
function downLadder(t, from, to) {
  const u = clamp((t - from) / (to - from));
  const rung = Math.min(9, Math.floor(u * 9));
  const v = (rung + ease(u * 9 - rung, 0.2, 0.8)) / 9;
  return { x: 0.25 + 0.25 * v, y: 0.41 * (1 - v), z: 0 };
}

// A bubble that is up between two moments at (x, y), a little toward the watcher: it
// swells in and shrinks away over 0.4 s. `full`: its size when up (larger in a scene seen
// from farther off).
const said = (t, from, to, x, y, full = 0.6) => {
  const size = ease(t, from, from + 0.4) * (1 - ease(t, to - 0.4, to));
  return { x, y, z: -0.25, scale: Math.max(0.01, full * size), shown: size > 0.01 };
};

// Apollo 11, the longest of them (the user, 2026-10-06: "착륙 -> 우주인이 사다리 타고
// 나와서 -> 그 위대한 문장 말하고, 국기 꽂고 -> 통통통 뛰어다니는 것까지 해줘"): Eagle
// comes down, Armstrong climbs down the ladder and says his sentence, Aldrin follows, the
// flag goes up where it stands now, and the two hop about. (Six and a half hours passed
// between the landing and the first step: told, and drawn as seconds.)
export const APOLLO11 = {
  name: t('이글의 착륙'),
  day: t('1969년 7월 20일'),
  seconds: 58,
  downAt: 17,
  viewKm: 42,
  sounds: [[13.3, 'landingBurn'], [17, 'landed'], [30, 'stood'], [42, 'stood'], [44, 'hops']],
  lines: [
    { at: 0, text: t('1969년 7월 20일. 암스트롱과 올드린이 탄 착륙선 이글이 고요의 바다로 내려옵니다.') },
    { at: 5, text: t('컴퓨터가 고른 자리는 바위가 널린 분화구였습니다. 암스트롱이 손으로 몰아 그 너머로 넘어갑니다.') },
    { at: 11, text: t('"60초." 연료가 얼마 남지 않았다고 지상에서 알립니다. 엔진 바람에 먼지가 사방으로 날립니다.') },
    { at: 17, text: t('"휴스턴, 여기는 고요의 기지. 이글은 착륙했다." 한국 시간으로 7월 21일 새벽 5시 17분이었습니다.') },
    { at: 23, text: t('여섯 시간 반 뒤, 암스트롱이 문을 열고 나와 사다리 아홉 칸을 천천히 내려옵니다.') },
    { at: 30, text: t('"이것은 한 사람에게는 작은 한 걸음이지만, 인류에게는 위대한 도약이다." 6억 명이 지켜봤습니다.') },
    { at: 37, text: t('19분 뒤 올드린도 내려옵니다. 둘은 성조기를 세웁니다. 바람이 없어 깃발 위쪽에 가로대를 넣었습니다.') },
    { at: 44, text: t('달의 중력은 지구의 6분의 1입니다. 둘은 캥거루처럼 통통 뛰는 것이 가장 편하다는 것을 알아냅니다.') },
    { at: 51, text: t('2시간 31분 동안 돌과 흙 21.5kg을 모으고 돌아갔습니다. 발자국은 지금도 그대로 남아 있습니다.') },
  ],
  // Where each piece is, about the lander's own place (x = 0).
  places(t) {
    // The hopping about: twelve seconds from 44, each ending on the ground.
    const s = Math.min(Math.max(t, 44), 56) - 44;
    const p = s / 12;
    const turn = 2 * Math.PI * p;
    let neil;
    if (t < 37) neil = { x: 0.5, y: 0, z: 0 };
    // Over to where the flag will stand, in short steps.
    else if (t < 40) neil = { x: 0.5, y: hop(t - 37, 0.6, 0.04), z: 0.3 * ease(t, 37, 40) };
    // Round in a ring and back to the flag.
    else neil = { x: 1.1 - 0.6 * Math.cos(turn), y: hop(s, 0.8, 0.14), z: 0.3 - 0.5 * Math.sin(turn) };
    let buzz;
    if (t < 42.5) buzz = { x: 0.5 + 0.28 * ease(t, 40, 42.5), y: hop(t - 40, 0.5, 0.04), z: 0.3 * ease(t, 40, 42.5) };
    // Out along the ground and back, swinging to either side.
    else buzz = { x: 0.78 + 0.75 * Math.sin(Math.PI * p), y: hop(s, 0.75, 0.12), z: 0.3 + 0.4 * Math.sin(turn) };
    const pieces = {
      // It flies on over the crater the computer had chosen, then straight down.
      lander: { x: -1.0 * (1 - ease(t, 4, 14)), y: comeDown(t, 17, 2), burn: t < 17 },
      // Each came down backwards, facing the lander with both hands on the ladder (the
      // user: "내 기억으로는 내려올 떄에 손으로 사다리를 잡고, 반대로 내려왔는데"):
      // a piece of its own with the arms up (turn: radians about the upright; half a
      // turn faces it to the lander), and on the ground he turns round to face out.
      // Drawn half as large again as they were, to be seen at all.
      neilLadder: { ...downLadder(t, 23.5, 29.5), turn: Math.PI, scale: 1.5, shown: t >= 23.5 && t < 29.5 },
      neil: { ...neil, turn: Math.PI * (1 - ease(t, 29.5, 30.5)), scale: 1.5, shown: t >= 29.5 },
      buzzLadder: { ...downLadder(t, 36, 40), turn: Math.PI, scale: 1.5, shown: t >= 36 && t < 40 },
      buzz: { ...buzz, turn: Math.PI * (1 - ease(t, 40, 41)), scale: 1.5, shown: t >= 40 },
      // It goes up where it stands in the place as it is now (render/siteModels.js apollo).
      flag: { x: 0.62, y: 0, z: 0.3, scale: Math.max(0.02, ease(t, 40.5, 42)), shown: t >= 40.5 },
      // What is said, in bubbles (the user, 2026-10-06, of five lines offered: "1, \"이것은
      // 한 사람에게는 작은 한 걸음이지만\", 4,6"; the last taken as the fifth): Eagle as it
      // lands, Armstrong at the foot of the ladder, Aldrin when he is down, and Aldrin
      // again as they hop (that one goes along with him).
      // (A phone's view ends 1.3 units to the right of the lander: none goes past 1.25.)
      sayLanded: said(t, 17.3, 22.5, 0.48, 1.12),
      sayStep: said(t, 30.2, 36, 0.86, 0.66),
      sayDesolation: said(t, 40.6, 44, 0.95, 0.7),
      sayHops: said(t, 46, 52.5, Math.min(0.95, buzz.x + 0.34), 0.74),
    };
    return pieces;
  },
  // The whole of it stands a little to the left, so that what is said to the right of
  // the two is not cut off on a narrow phone (the user, 2026-10-06: "말풍선이 잘리네.
  // 착륙선을 조금만 왼쪽으로"): over as the lander comes in, and back in the last
  // seconds, to where the place's own lander stands.
  stage(t) {
    const aside = -0.32 * ease(t, 0, 4) * (1 - ease(t, 55, 58));
    return Object.fromEntries(Object.entries(APOLLO11.places(t)).map(([name, piece]) => [name, { ...piece, x: (piece.x ?? 0) + aside }]));
  },
};

export const MOON_SCENES = {
  // Apollo 17's ascent stage leaves the Moon, seen as the rover's camera saw it (the
  // camera was worked from Houston by Ed Fendell, who had to send each command two
  // seconds early). The last people on the Moon so far.
  apollo17: {
    name: t('아폴로 17호의 이륙'),
    day: t('1972년 12월 14일'),
    seconds: 24,
    downAt: 6,
    viewKm: 62,
    sounds: [[6, 'ascent']],
    lines: [
      { at: 0, text: t('1972년 12월 14일. 서넌과 슈미트가 사흘을 머문 타우루스-리트로 계곡을 떠날 채비를 합니다.') },
      { at: 6, text: t('상승단이 하강단을 발사대 삼아 솟구칩니다. 금박 조각이 사방으로 흩어집니다.') },
      { at: 12, text: t('이 장면은 두고 온 월면차의 카메라가 찍었습니다. 지구에서 2초 앞을 내다보고 고개를 들게 했습니다.') },
      { at: 18, text: t('그 뒤로 달에 간 사람은 없습니다. 하강단과 월면차와 깃발은 지금도 그 자리에 있습니다.') },
    ],
    stage(t) {
      const s = Math.max(0, t - 6);
      const over = Math.max(0, s - 1.2);
      const y = 0.2 * s * s;
      return {
        descent: { x: 0, y: 0 },
        rover: { x: -1.5, y: 0 },
        ascent: { x: 0.05 * over * over, y, lean: -Math.min(0.7, 0.13 * over), burn: t >= 6, shown: y < 7 },
        // The foil thrown off as it goes: a ring of scraps that spreads and falls.
        scraps: { x: 0, y: 0.42 + 0.5 * s - 0.35 * s * s, scale: 0.2 + 1.5 * s, shown: t >= 6 && s < 1.6 },
        // Its goodbye to the rabbit in the Moon as it leaves (the user's own line,
        // 2026-10-06: "이번에는 \"토끼야. 빠이~\""): gone before the cabin climbs into it.
        say: said(t, 3.8, 7.3, 0.55, 1.3, 1.1),
      };
    },
  },
  // Luna 16: the first robot to bring back another world's ground. It landed where a
  // rocket going straight up would fall to Earth with no steering on the way.
  luna16: {
    name: t('루나 16호의 귀환'),
    day: t('1970년 9월 21일'),
    seconds: 24,
    downAt: 7,
    viewKm: 62,
    sounds: [[7, 'ascent']],
    lines: [
      { at: 0, text: t('1970년 9월 20일 밤, 루나 16호가 풍요의 바다에 내렸습니다. 속 빈 드릴로 35cm를 파 들어갑니다.') },
      { at: 7, text: t('이튿날, 흙 101g을 담은 공 모양 캡슐을 실은 로켓이 착륙선을 딛고 곧장 위로 떠납니다.') },
      { at: 13, text: t('똑바로 올라가기만 하면 지구에 닿는 자리를 골라 내렸습니다. 가는 길에 방향을 고치지 않았습니다.') },
      { at: 19, text: t('사흘 뒤 캡슐이 카자흐스탄에 떨어졌습니다. 로봇이 다른 천체의 흙을 가져온 첫 일입니다.') },
    ],
    stage(t) {
      const s = Math.max(0, t - 7);
      const y = 0.26 * s * s;
      return {
        lander: { x: 0, y: 0 },
        rocket: { x: 0, y, burn: t >= 7, shown: y < 7 },
        // The lander that is left, once the rocket is well up (the user, 2026-10-06, of
        // five lines offered: "4").
        say: said(t, 9.4, 13.8, 0.65, 1.15, 1.1),
      };
    },
  },
  // Lunokhod 1, the first wheels on another world, comes down Luna 17's ramp.
  lunokhod1: {
    name: t('루노호트 1호가 내려서다'),
    day: t('1970년 11월 17일'),
    seconds: 26,
    downAt: 8,
    viewKm: 56,
    sounds: [[4.3, 'landingBurn'], [8, 'landed'], [11, 'roll'], [16, 'roll']],
    lines: [
      { at: 0, text: t('1970년 11월 17일. 루나 17호가 비의 바다로 내려옵니다. 등에 여덟 바퀴 달린 차를 업고 있습니다.') },
      { at: 8, text: t('내려앉자 경사로가 펴지고, 무게 756kg의 루노호트 1호가 천천히 굴러 내려옵니다.') },
      { at: 14, text: t('지구 밖의 천체를 달린 첫 차입니다. 소련의 다섯 사람이 화면을 보며 지구에서 몰았습니다.') },
      { at: 20, text: t('낮에는 뚜껑의 태양 전지로 달리고 밤에는 뚜껑을 닫고 견뎠습니다. 열 달 동안 10.5km를 갔습니다.') },
    ],
    stage(t) {
      const y = comeDown(t, 8, 2.4);
      return {
        lander: { x: 0, y, burn: t < 8 },
        rover: rollOut(t, { rollAt: 12, ramp: 3.5, drive: 8, to: 1.9, liftY: y, scale: 0.5 }),
      };
    },
  },
  // SLIM, the "Moon Sniper": one of its two main engines lost its nozzle 50 m up; it
  // threw out its two small robots and came to rest on its nose, 55 m from its mark.
  slim: {
    name: t('슬림의 착륙'),
    day: t('2024년 1월 20일'),
    seconds: 24,
    downAt: 12,
    viewKm: 52,
    sounds: [[2, 'landingBurn'], [6, 'clunk'], [10.4, 'toss'], [12, 'landed']],
    lines: [
      { at: 0, text: t('2024년 1월 20일. 일본의 슬림이 시올리 분화구 곁, 목표에서 100m 안을 노리고 내려옵니다.') },
      { at: 6, text: t('높이 50m에서 주 엔진 둘 가운데 하나의 노즐이 떨어져 나갑니다. 몸이 옆으로 밀립니다.') },
      { at: 12, text: t('닿기 직전 작은 로봇 둘을 내던지고, 슬림은 목표에서 55m 떨어진 곳에 코를 박고 섰습니다.') },
      { at: 18, text: t('공처럼 생긴 로봇 소라큐가 그 모습을 찍었습니다. 태양 전지가 서쪽을 봐서 9일 뒤에야 깨어났습니다.') },
    ],
    stage(t) {
      // Its middle (the piece turns about it): down to a hover, pushed aside, then over.
      const fall = ease(t, 10.8, 12);
      const x = -0.9 + 0.3 * clamp(t / 6) + 0.6 * ease(t, 6, 12);
      const y = t < 6 ? 2.6 - 1.7 * (1 - (1 - t / 6) ** 2) : 0.9 - 0.42 * ease(t, 6, 10.8) - 0.28 * fall;
      const lean = 0.45 * ease(t, 6, 10.8) + 2.45 * fall;
      // The nozzle falls from where it broke off.
      const drop = Math.max(0, t - 6);
      // The two robots are thrown out to either side and bounce to a stop.
      const thrown = (way) => {
        const u = clamp((t - 10.4) / 1.5);
        return { x: -0.24 + way * 0.75 * u, y: 0.45 * (1 - u) + 0.04 * u + 0.6 * u * (1 - u), shown: t >= 10.4 };
      };
      return {
        slim: { x, y, lean, burn: t < 11.2 },
        nozzle: { x: -0.6 - 0.1 * drop, y: Math.max(0.03, 0.72 - 0.9 * drop * drop), lean: 2 * drop, shown: t >= 6 },
        lev1: thrown(1),
        lev2: thrown(-1),
      };
    },
  },
  // Odysseus: it came in sliding sideways, broke a leg and came to rest leaning over.
  odysseus: {
    name: t('오디세우스의 착륙'),
    day: t('2024년 2월 22일'),
    seconds: 24,
    downAt: 11,
    viewKm: 54,
    sounds: [[7.3, 'landingBurn'], [11, 'landed'], [11.6, 'topple']],
    lines: [
      { at: 0, text: t('2024년 2월 22일. 미국 회사의 오디세우스가 달 남극에서 300km 떨어진 말라퍼트 A로 내려옵니다.') },
      { at: 6, text: t('거리를 재는 레이저가 꺼진 채였습니다. 실험 삼아 실은 NASA 장비를 급히 이어 붙여 내려옵니다.') },
      { at: 11, text: t('옆으로 미끄러지며 닿아 다리 하나가 부러졌고, 몸이 크게 기운 채 멈췄습니다. 그래도 신호는 왔습니다.') },
      { at: 17, text: t('미국으로서는 아폴로 17호 뒤 51년 만이고, 민간 회사로는 처음 달에 내렸습니다. 엿새를 일했습니다.') },
    ],
    stage(t) {
      return {
        lander: { x: -1.2 * (1 - clamp(t / 11)) - 0.12 * (1 - ease(t, 11, 12.2)), y: comeDown(t, 11, 2.6), lean: -0.55 * ease(t, 11.4, 14), burn: t < 11 },
      };
    },
  },
  // Chandrayaan-3: Vikram lands near the south pole and Pragyan rolls out.
  chandrayaan3: {
    name: t('찬드라얀 3호의 착륙'),
    day: t('2023년 8월 23일'),
    seconds: 26,
    downAt: 9,
    viewKm: 56,
    sounds: [[5.3, 'landingBurn'], [9, 'landed'], [15, 'roll'], [19, 'roll']],
    lines: [
      { at: 0, text: t('2023년 8월 23일. 인도의 착륙선 비크람이 달 남극 가까이, 남위 69도의 땅으로 내려옵니다.') },
      { at: 9, text: t('내려앉았습니다. 인도는 달에 내린 네 번째 나라가 되었고, 남극 가까이에 내린 것은 처음입니다.') },
      { at: 15, text: t('몇 시간 뒤 경사로가 펴지고, 여섯 바퀴 달린 26kg짜리 탐사차 프라그얀이 굴러 내려옵니다.') },
      { at: 21, text: t('둘은 달의 낮 하루, 지구 날로 두 주를 일했습니다. 남극 가까운 흙에서 황을 찾아냈습니다.') },
    ],
    stage(t) {
      return {
        lander: { x: 0, y: comeDown(t, 9, 2.5), burn: t < 9 },
        rover: { ...rollOut(t, { rollAt: 15.5, ramp: 3, drive: 5.5, to: 1.7, scale: 0.42 }), shown: t >= 14 },
      };
    },
  },
  // Luna 2: the first thing people made to reach another world. It had no engine to
  // slow it and hit at 3.3 km/s.
  luna2: {
    name: t('루나 2호의 충돌'),
    day: t('1959년 9월 14일'),
    seconds: 22,
    downAt: 9,
    viewKm: 60,
    sounds: [[9, 'impact']],
    lines: [
      { at: 0, text: t('1959년 9월 14일. 소련의 루나 2호가 달로 떨어집니다. 속도를 줄일 엔진은 없습니다.') },
      { at: 5, text: t('무게 390kg의 쇠공이 초속 3.3km로 다가옵니다. 소총 총알의 세 배쯤 되는 빠르기입니다.') },
      { at: 9, text: t('비의 바다 동쪽에 부딪혔습니다. 사람이 만든 물건이 처음으로 다른 천체에 닿은 순간입니다.') },
      { at: 15, text: t('속에는 소련 문장을 새긴 오각형 쇳조각을 엮은 공이 있었습니다. 부딪히며 흩어지게 만든 것입니다.') },
    ],
    stage(t) {
      const u = clamp(t / 9);
      const s = t - 9;
      // The flash swells in a quarter of a second and dies away in a second and a half.
      const flash = s < 0 ? 0 : s < 0.25 ? (s / 0.25) * 2 : 2 * Math.max(0, 1 - (s - 0.25) / 1.4);
      return {
        probe: { x: -6.3 * (1 - u), y: 0.1 + 5.4 * (1 - u), shown: t < 9 },
        flash: { x: 0, y: 0.15, scale: Math.max(0.01, flash), shown: flash > 0 },
        wreck: { x: 0, y: 0, shown: t >= 9 },
        // What it threw out: a ring of dust that spreads and thins.
        scraps: { x: 0, y: 0.05 + 0.5 * Math.max(0, s) - 0.16 * s * s, scale: 0.3 + 1.6 * Math.max(0, s), shown: s >= 0 && s < 3 },
        // What is left of it speaks once the flash is gone (the user, 2026-10-06, of five
        // lines offered: "4").
        say: said(t, 10.4, 15, 0.5, 0.78, 1.1),
      };
    },
  },
  // Apollo 12 comes down beside Surveyor 3, which had stood there for thirty-one months.
  apollo12: {
    name: t('아폴로 12호의 착륙'),
    day: t('1969년 11월 19일'),
    seconds: 26,
    downAt: 14,
    viewKm: 56,
    sounds: [[10.3, 'landingBurn'], [14, 'landed']],
    lines: [
      { at: 0, text: t('1969년 11월 19일. 콘래드와 빈이 탄 착륙선 인트레피드가 폭풍의 대양으로 내려옵니다.') },
      { at: 7, text: t('노린 자리는 2년 반 전에 내린 무인 탐사선 서베이어 3호의 곁입니다. 바늘구멍 같은 과녁입니다.') },
      { at: 14, text: t('160m 곁에 내렸습니다. 닷새 전 떠날 때는 로켓이 벼락을 두 번 맞고도 무사했습니다.') },
      { at: 20, text: t('둘은 걸어가 서베이어의 카메라를 떼어 지구로 가져왔습니다. 달에서 31달을 견딘 부품이었습니다.') },
    ],
    stage(t) {
      return {
        surveyor: { x: 1.2, y: 0 },
        lander: { x: -1.0 * (1 - ease(t, 0, 14)), y: comeDown(t, 14, 2.6), burn: t < 14 },
        // Conrad's own first words on the Moon, said here as Intrepid sets down (the user,
        // 2026-10-06, of five lines offered: "3"). He was the shortest of the astronauts.
        say: said(t, 14.6, 20.4, 0.55, 1.3, 1.1),
      };
    },
  },
};

// Two more stages that are not on the Moon (the user, 2026-10-06: "톰보 지역도 애니메이션
// 이벤트 넣어줘.. 탐사선이 사진 찍고, 앗. 하트네 하는 말풍선 넣어주고", "나로우주센터도
// 애니 이벤트 넣고").
export const PLACE_STAGES = {
  // New Horizons goes by over Pluto's heart: it crosses the sky, a flash as it takes its
  // picture, the picture comes up (Pluto with its heart) and it says what it sees.
  tombaughRegio: {
    name: t('명왕성의 하트를 찍다'),
    day: t('2015년 7월 14일'),
    seconds: 34,
    downAt: 12,
    viewKm: 56,
    sounds: [[12, 'shutter'], [13.5, 'discovered']],
    lines: [
      { at: 0, text: t('2015년 7월 14일. 9년 반 동안 48억km를 날아온 뉴허라이즌스가 명왕성 곁을 스쳐 갑니다.') },
      { at: 6, text: t('초속 14km, 높이 12,500km. 멈출 연료는 없습니다. 지나가는 몇 시간 안에 다 찍어야 합니다.') },
      { at: 12, text: t('찰칵. 사진 속 명왕성에는 너비 1,600km의 하얀 하트가 있었습니다. 질소 얼음이 덮인 벌판입니다.') },
      { at: 20, text: t('명왕성을 찾은 클라이드 톰보의 이름을 붙였습니다. 탐사선에는 그의 유골 한 줌이 실려 있습니다.') },
      { at: 27, text: t('찍은 것을 지구로 다 보내는 데 열여섯 달이 걸렸습니다. 뉴허라이즌스는 지금도 멀어지고 있습니다.') },
    ],
    stage(t) {
      const x = -2.4 + 4.8 * clamp(t / 27);
      const s = t - 12;
      const flash = s < 0 ? 0 : s < 0.12 ? s / 0.12 : Math.max(0, 1 - (s - 0.12) / 0.5);
      return {
        probe: { x, y: 1.1, scale: 0.75, shown: t < 27 },
        flash: { x: x + 0.1, y: 1.05, scale: Math.max(0.01, 0.5 * flash), shown: flash > 0 },
        // The picture stays up to the end.
        photo: { x: -0.95, y: 0.55, scale: Math.max(0.01, ease(t, 12.3, 13.3)), shown: t >= 12.3 },
        // What it says goes along with it for six seconds.
        bubble: { x: x + 0.55, y: 1.6, scale: Math.max(0.01, ease(t, 13.5, 14) * (1 - ease(t, 19, 19.5))), shown: t >= 13.5 && t < 19.5 },
      };
    },
  },
  // Shoemaker-Levy 9 hits Jupiter (the user, 2026-10-06: "레비 9 충돌은 그날 애니 없어?").
  // Four of its twenty-one pieces are shown: each comes down the sky at a slant, a ball
  // of fire swells and rises where it goes in, and a dark bruise spreads on the cloud
  // tops and stays. Jupiter turns under the train of pieces, so the bruises stand in a
  // row. (The stage is drawn 50 km to a unit and seen from 480 km: on Jupiter the eye is
  // never lower than 140 km. The real fireballs rose 3,000 km and the bruises were as
  // wide as Earth: drawn as what fits the view.)
  // Not at the story place 'shoemakerLevy' itself: Jupiter's cloud tops turn once in ten
  // hours and a spot on them goes by at 600 km/s of the game's clock, so nobody can stand
  // beside it. Like Cassini's plunge on Saturn it is played by resting anywhere on
  // Jupiter's cloud tops (`on`), and so has an id of its own.
  levyImpact: {
    name: t('혜성이 목성에 부딪히다'),
    day: t('1994년 7월 16일'),
    on: 'jupiter',
    seconds: 34,
    downAt: 7,
    viewKm: 480,
    sizeKm: 50,
    sounds: [[7, 'impact'], [11, 'impact'], [15, 'impact'], [19, 'impact']],
    lines: [
      { at: 0, text: t('1994년 7월 16일. 두 해 전 목성에 붙잡혀 스물한 조각으로 부서진 혜성이 줄지어 떨어집니다.') },
      { at: 6, text: t('첫 조각이 초속 60km로 구름 속에 박힙니다. 불덩이가 구름 위 3,000km까지 솟습니다.') },
      { at: 11, text: t('가장 큰 조각은 18일에 떨어졌습니다. 터진 힘이 세상의 핵무기를 다 합친 것의 600배였습니다.') },
      { at: 18, text: t('엿새 동안 스물한 번. 부딪힌 자리마다 검은 멍이 들었고, 큰 것은 지구만 했습니다.') },
      { at: 26, text: t('멍은 작은 망원경으로도 보였고 몇 달 뒤에야 흐려졌습니다. 천체가 부딪히는 것을 사람이 처음 지켜봤습니다.') },
    ],
    stage(t) {
      // [when it hits, where, how big]
      const HITS = [[7, -0.9, 0.8], [11, -0.3, 1.3], [15, 0.3, 0.9], [19, 0.9, 1]];
      const FALL_S = 1.6;
      const pieces = {};
      let flash = { x: 0, y: 0, scale: 0.01, shown: false };
      HITS.forEach(([at, x, size], i) => {
        const u = clamp((t - (at - FALL_S)) / FALL_S);
        // It comes down from the left, its tail behind it.
        pieces[`piece${i}`] = { x: x - 1.6 * (1 - u), y: 2.6 * (1 - u), lean: Math.atan2(1.6, 2.6), scale: size, shown: t >= at - FALL_S && t < at };
        pieces[`bruise${i}`] = { x, y: 0.03, scale: Math.max(0.01, size * ease(t, at, at + 3)), shown: t >= at };
        const s = t - at;
        // The ball of fire swells in a sixth of a second, rises and fades in two.
        if (s >= 0 && s < 2.2) {
          const swell = s < 0.16 ? s / 0.16 : Math.max(0, 1 - (s - 0.16) / 2);
          flash = { x, y: 0.1 + 0.9 * Math.min(1, s / 2), scale: Math.max(0.01, 1.1 * size * swell), shown: swell > 0 };
        }
      });
      return { ...pieces, flash };
    },
  },
  // Dokdo's first lighthouse (the user, 2026-10-06: "독도는 애니 없어?", and of the days
  // offered: "등대에 불 켜진 날"). A boat brings the iron, a square tower of iron 10 m
  // tall goes up on a rock 5 m over the sea by the old pier on the north of the east
  // islet, and its light comes on and turns. Then the white lighthouse of 1998 on the
  // islet's top lights too, and the islets change from a drawing of them as they were
  // (nothing built on them) to the place's own drawing (each card two units wide, its
  // foot at y = 0; the east islet is the right one, its top at x 0.5, y 0.63).
  // The tower is drawn four times its size beside the islet, to be seen at all, and
  // the light goes round once in five seconds (the real one flashes once in ten).
  dokdo: {
    name: t('독도 등대의 첫 불빛'),
    day: t('1954년 8월 10일'),
    seconds: 32,
    downAt: 12,
    viewKm: 30,
    // (5 km to a unit put the tower and the boat off the right edge of a phone.)
    sizeKm: 4.2,
    sounds: [[5.5, 'clunk'], [12, 'stood'], [20, 'stood']],
    lines: [
      { at: 0, text: t('1954년 8월 10일. 동도 북쪽 옛 선착장 곁, 바다에서 5m 솟은 바위에 쇠기둥을 세웁니다.') },
      { at: 6, text: t('높이 10m의 네모난 철탑입니다. 지키는 사람 없이 혼자 켜지는 무인 등대였습니다.') },
      { at: 12, text: t('불이 켜졌습니다. 독도 등대의 첫 불빛이 동해를 지나는 배들에게 섬이 여기 있다고 알립니다.') },
      { at: 20, text: t('1998년 12월 10일, 동도 꼭대기에 높이 15m의 흰 등대가 새로 섰습니다. 이때부터 사람이 지킵니다.') },
      { at: 26, text: t('불빛은 10초에 한 번 깜빡이고 46km 밖까지 닿습니다. 등대원들이 번갈아 섬에 머뭅니다.') },
    ],
    stage(t) {
      // The tower's foot, and its lamp at the top of it (the drawing is 0.33 tall, the
      // lantern's glass 0.045 under its top).
      const TOWER = [0.72, 0.18, -0.04];
      const LAMP = 0.285;
      const TOP = [0.5, 0.64, -0.04];
      const sweep = (from) => (2 * Math.PI * Math.max(0, t - from)) / 5;
      // It comes on over a third of a second.
      const lit = (from) => Math.max(0.01, clamp((t - from) / 0.35));
      return {
        // The islets as they were, and from 1998 as they are now (the white lighthouse on
        // the east islet's top).
        isle1954: { x: 0, y: 0, shown: t < 20 },
        isle: { x: 0, y: 0, shown: t >= 20 },
        // In from the right, and it lies by the rock while the tower goes up.
        boat: { x: 0.9 + 0.9 * (1 - ease(t, 0, 5.5)), y: 0.1, z: -0.08 },
        tower: { x: TOWER[0], y: TOWER[1], z: TOWER[2], scale: Math.max(0.02, ease(t, 5.5, 11)), shown: t >= 5.5 },
        lamp: { x: TOWER[0], y: TOWER[1] + LAMP, z: TOWER[2] - 0.01, scale: 0.7 * lit(12), shown: t >= 12 },
        beam: { x: TOWER[0], y: TOWER[1] + LAMP, z: TOWER[2] - 0.01, turn: sweep(12), scale: lit(12), shown: t >= 12 },
        topLamp: { x: TOP[0], y: TOP[1], z: TOP[2], scale: 1.4 * lit(20), shown: t >= 20 },
        topBeam: { x: TOP[0], y: TOP[1], z: TOP[2], turn: Math.PI + sweep(20), scale: 1.5 * lit(20), shown: t >= 20 },
      };
    },
  },
  // Nuri's second flight from Naro, the first to reach orbit: three stages, each left
  // behind in turn, the fairing's two halves, and the satellite let go at the top.
  // The stack stands 0.16 to the side of the pad's middle, 0.2 up on its deck; each
  // piece has its foot at its own y = 0 (the first stage is 0.52 tall, the second 0.26,
  // the third 0.12). It rises faster and faster until the first stage is spent (11 s),
  // then goes on leaning over downrange. (The real times, 127 s to 875 s, are drawn as
  // eleven to twenty-seven seconds, and the heights, 59 to 700 km, as what fits the view.)
  naro: {
    name: t('누리호의 발사'),
    day: t('2022년 6월 21일'),
    seconds: 40,
    downAt: 27,
    viewKm: 70,
    sounds: [[2, 'liftoff'], [11, 'staging'], [15, 'toss'], [18, 'staging'], [27, 'toss'], [27.5, 'stood']],
    lines: [
      { at: 0, text: t('2022년 6월 21일 오후 4시. 나로우주센터에서 누리호가 두 번째로 떠납니다. 여덟 달 전 첫 발사는 마지막에 실패했습니다.') },
      { at: 6, text: t('75톤 엔진 넷이 200톤의 몸을 들어 올립니다. 엔진부터 발사대까지 모두 한국에서 만들었습니다.') },
      { at: 11, text: t('127초, 높이 59km에서 1단이 떨어집니다. 이어 위성을 감싼 덮개가 갈라지고 2단도 떨어집니다.') },
      { at: 19, text: t('3단의 7톤 엔진이 여덟 분 넘게 탑니다. 지난번에는 이 엔진이 46초 일찍 꺼졌습니다.') },
      { at: 27, text: t('875초, 높이 700km. 성능 검증 위성이 떨어져 나갑니다. 초속 7.5km, 목표한 그대로입니다.') },
      { at: 33, text: t('한국은 1톤 넘는 위성을 제 힘으로 올린 일곱 번째 나라가 됐습니다. 남극 세종기지가 첫 신호를 받았습니다.') },
    ],
    stage(t) {
      // Where the foot of the stack is, and how far it leans, s seconds after lift-off.
      const fly = (s) => {
        if (s <= 8) return { x: 0, y: 0.7 * (Math.max(0, s) / 8) ** 2, lean: 0 };
        const u = s - 8;
        return { x: 0.006 * u * u, y: 0.7 + 0.12 * u - 0.004 * u * u, lean: -Math.min(1.2, 0.08 * u) };
      };
      // A piece let go at `at` (seconds after lift-off) from `from`, `up` above the foot:
      // it coasts on a little, falls back and tumbles; gone when it is back at the ground.
      const dropped = (s, at, up) => {
        const from = fly(at);
        const u = s - at;
        const y = from.y + up + 0.12 * u - 0.05 * u * u;
        return { x: from.x - 0.03 * u, y: Math.max(0, y), lean: from.lean - 0.5 * u, shown: y > 0 };
      };
      const s = t - 3;
      const now = fly(s);
      const stack = (up) => ({ x: now.x - up * Math.sin(now.lean), y: now.y + up * Math.cos(now.lean), lean: now.lean });
      const first = s < 8 ? { ...stack(0), burn: t >= 2 } : dropped(s, 8, 0);
      const second = s < 15 ? { ...stack(0.52), burn: s >= 8.6 } : dropped(s, 15, 0.52);
      const third = { ...stack(0.78), burn: s >= 15.6 && s < 24 };
      // The halves fall away to either side from twelve seconds after lift-off.
      const half = (way) => {
        if (s < 12) return stack(0.9);
        const from = fly(12);
        const u = s - 12;
        const y = from.y + 0.9 + 0.1 * u - 0.05 * u * u;
        return { x: from.x + way * 0.12 * u, y: Math.max(0, y), lean: from.lean + way * 0.6 * u, shown: y > 0 };
      };
      // The satellite rides on the third stage and leaves it at 27 s of the scene.
      const top = stack(0.92);
      const free = Math.max(0, t - 27);
      return {
        pad: { x: 0, y: 0 },
        first: { ...first, x: 0.16 + first.x, y: 0.2 + first.y },
        second: { ...second, x: 0.16 + second.x, y: 0.2 + second.y },
        third: { ...third, x: 0.16 + third.x - 0.02 * free, y: 0.2 + third.y - 0.015 * free },
        fairingLeft: { ...half(-1), x: 0.16 + half(-1).x, y: 0.2 + half(-1).y },
        fairingRight: { ...half(1), x: 0.16 + half(1).x, y: 0.2 + half(1).y },
        satellite: { x: 0.16 + top.x + 0.05 * free, y: 0.2 + top.y + 0.02 * free, lean: top.lean, shown: s >= 12 },
      };
    },
  },
};
