import { t } from './i18n.js';
// Eight more days played again, all on the Moon (the user, 2026-10-06, of the launch at
// pad 39A: "달에도 저런 발사 이벤트를 넣을만한 곳이 많을 것 같은데", "발사 또는 착륙",
// "모두 다 넣자"). Two go up, three come down and something rolls out or falls over,
// one only hits.
//
// Each is a `stage`: a few pieces, and for every moment where each piece stands. A
// piece's place is in the model's own units (a lander is about one unit across, the
// ground is y = 0): x to the side, y up, lean in radians about the axis toward the eye
// (negative: its top goes toward +x), scale (1 if not given), shown (true if not given)
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
      return { lander: { x: 0, y: 0 }, rocket: { x: 0, y, burn: t >= 7, shown: y < 7 } };
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
      { at: 15, text: t('몇 시간 뒤 경사로가 펴지고, 여섯 바퀴 달린 26kg짜리 탐사차 프라기안이 굴러 내려옵니다.') },
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
      const flash = s < 0 ? 0 : s < 0.25 ? (s / 0.25) * 2.8 : 2.8 * Math.max(0, 1 - (s - 0.25) / 1.4);
      return {
        probe: { x: -6.3 * (1 - u), y: 0.1 + 5.4 * (1 - u), shown: t < 9 },
        flash: { x: 0, y: 0.15, scale: Math.max(0.01, flash), shown: flash > 0 },
        wreck: { x: 0, y: 0, shown: t >= 9 },
        // What it threw out: a ring of dust that spreads and thins.
        scraps: { x: 0, y: 0.05 + 0.5 * Math.max(0, s) - 0.16 * s * s, scale: 0.3 + 1.6 * Math.max(0, s), shown: s >= 0 && s < 3 },
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
      };
    },
  },
};
