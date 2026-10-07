import { t } from './i18n.js';
import { MOON_SCENES, APOLLO11, PLACE_STAGES } from './moonScenes.js';
import { LANDMARK_SCENES } from './landmarkScenes.js';
import { CRAFT_SCENES } from './craftScenes.js';
import { LANDER_STAGES, LANDER_REPLAYS } from './landerScenes.js';
// "그날로": at a story place, the day it is known for is played again in the close
// view. The model that stands there comes down as it did, and a few lines tell what
// happened, each at its moment: Apollo 11's landing and first steps, Huygens's on Titan, Viking 1's and Curiosity's on Mars, and (not at a
// place but on a body) Cassini's plunge into Saturn. Three came down bouncing: Luna 9 and
// Pathfinder inside air bags, and Philae on its comet, which could not hold on.
// seconds: how long the scene lasts. downAt: when it touches the ground.
// fromKm: how high the model starts (it is drawn 6 km wide, so this is in drawn km).
export const REPLAYS = {
  // Apollo 11 is a stage of pieces now (core/moonScenes.js APOLLO11): it lands, the two
  // climb down, the flag goes up and they hop about.
  apollo11: APOLLO11,
  // It came down under a parachute, with no engine (render/siteModels.js shows which).
  huygens: {
    name: t('하위헌스의 착륙'),
    day: t('2005년 1월 14일'),
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    // What it says as it touches (render/siteModels.js SITE_SAYS): from, to.
    say: [17.5, 22.5],
    // Titan has air: the wind past its parachute, all the way down.
    sounds: [[0, 'chute']],
    lines: [
      { at: 0, text: t('2005년 1월 14일. 카시니에서 떨어져 나온 하위헌스가 낙하산을 펴고 타이탄의 주황빛 안개 속으로 내려옵니다.') },
      { at: 6, text: t('2시간 30분 동안 내려오며 강줄기와 바닷가처럼 보이는 땅을 찍어 보냈습니다.') },
      { at: 12, text: t('바닥은 영하 179도. 물이 언 얼음 자갈이 널린, 젖은 모래 같은 땅이었습니다.') },
      { at: 17, text: t('사람이 만든 것이 가장 먼 곳에 내려앉은 순간입니다. 그 뒤로도 한 시간 넘게 신호를 보냈습니다.') },
    ],
  },
  viking1: {
    name: t('바이킹 1호의 착륙'),
    day: t('1976년 7월 20일'),
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    // It greets the planet once it is down (render/siteModels.js SITE_SAYS): from, to.
    say: [17.4, 22.6],
    sounds: [[13.3, 'landingBurn']],
    lines: [
      { at: 0, text: t('1976년 7월 20일. 바이킹 1호 착륙선이 궤도선에서 떨어져 나와 크리세 평원으로 내려옵니다.') },
      { at: 6, text: t('낙하산을 버린 뒤 엔진 셋으로 속도를 줄입니다. 땅을 덜 건드리려고 불꽃을 넓게 퍼뜨린 엔진입니다.') },
      { at: 12, text: t('마침 아폴로 11호가 달에 내린 지 꼭 7년이 되는 날이었습니다.') },
      { at: 17, text: t('내린 지 25초 뒤 첫 사진을 찍기 시작했습니다. 제 발판과 화성의 자갈이 찍혔습니다.') },
    ],
  },
  // It was let down on cords from a stage that hovered on its rockets.
  curiosity: {
    name: t('큐리오시티의 착륙'),
    day: t('2012년 8월 6일'),
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    // It thanks the stage as that flies off: from, to.
    say: [17.8, 22.8],
    // The cords are cut and the stage flies off.
    sounds: [[13.3, 'landingBurn'], [17.2, 'clunk'], [17.5, 'ascent']],
    lines: [
      { at: 0, text: t('2012년 8월 6일. 무게 899kg의 큐리오시티는 에어백으로 받기에는 너무 무거웠습니다.') },
      { at: 6, text: t('그래서 로켓을 뿜는 하강단이 공중에 멈춰 서고, 줄로 차를 매달아 천천히 내립니다.') },
      { at: 12, text: t('대기권에 들어서 땅에 닿기까지 7분. 신호가 늦어 지구에서는 지켜볼 수밖에 없었습니다.') },
      { at: 17, text: t('바퀴가 닿자 줄을 끊고 하강단은 멀리 날아가 떨어졌습니다. 게일 분화구에 내린 순간입니다.') },
    ],
  },
  // Not a place but a body: resting anywhere on Saturn's cloud tops (the story 'cassini';
  // the id differs because 'cassini' is also the craft that still flies in the game).
  // It does not come down to stand: it comes in from the side (acrossKm away, drawn km),
  // glows, and at downAt is gone.
  cassiniPlunge: {
    name: t('카시니의 마지막 돌입'),
    day: t('2017년 9월 15일'),
    on: 'saturn',
    // Saturn's word once it is gone (render/siteModels.js SITE_SAYS): from, to.
    say: [15.5, 20.5],
    streak: true,
    seconds: 22,
    downAt: 15,
    // Seen from 480 km: the eye is never drawn lower than 0.2% of a body's radius
    // (core/eye.js), which on Saturn is 116 km, so a view from 48 km would look over it.
    viewKm: 480,
    fromKm: 70,
    toKm: 20,
    acrossKm: 130,
    // It begins to glow a third of the way in and is gone at downAt.
    sounds: [[5, 'burnUp']],
    lines: [
      { at: 0, text: t('2017년 9월 15일. 13년 동안 토성을 돈 카시니가 연료를 거의 다 쓰고 토성으로 뛰어듭니다.') },
      { at: 5, text: t('엔셀라두스와 타이탄의 바다를 지구의 미생물로 더럽히지 않으려고 고른 끝이었습니다.') },
      { at: 10, text: t('시속 11만km. 안테나를 지구로 돌린 채 추진기를 끝까지 뿜으며 대기 자료를 보냅니다.') },
      { at: 15, text: t('신호가 끊겼습니다. 마지막 전파는 83분 뒤 지구에 닿았고, 카시니는 토성의 일부가 되었습니다.') },
    ],
  },
  // The three that bounced. fall: seconds until it first touches. hops: each bounce, by
  // the moment it ends and how high it goes (drawn km). It comes in from acrossKm to the
  // side and is at the place when it stops (downAt): `rollFrom` says whether that way is
  // covered over the whole scene ('start': a ball thrown in at a slant) or only from the
  // first touch ('touch': it came straight down and bounced away). turns: how many times
  // a ball goes round on the way. bagSeconds: how long its air bags take to go down once
  // it has stopped. openAt: when it has opened and stands as it stands there now.
  //
  // Luna 9, 1966: the first thing to land whole on the Moon. The ball was thrown clear
  // just above the ground, bounced in its air bags, and opened four petals.
  luna9: {
    name: t('루나 9호의 착륙'),
    day: t('1966년 2월 3일'),
    seconds: 24,
    downAt: 13,
    fromKm: 10,
    fall: 6,
    hops: [{ until: 9, peakKm: 5 }, { until: 11.4, peakKm: 2.4 }, { until: 13, peakKm: 0.9 }],
    acrossKm: 8,
    rollFrom: 'start',
    turns: 3,
    bagSeconds: 2,
    openAt: 17,
    // It speaks while it bounces (render/siteModels.js SITE_SAYS): from, to.
    say: [6.2, 12.8],
    // Each touch before the last (that one is the thump of landing).
    sounds: [[6, 'bounce'], [9, 'bounce'], [11.4, 'bounce']],
    lines: [
      { at: 0, text: t('1966년 2월 3일. 소련의 루나 9호가 폭풍의 대양으로 내려옵니다. 달에 온전히 내린 기계는 아직 없었습니다.') },
      { at: 5, text: t('땅에 닿기 직전 공 모양 캡슐을 내던집니다. 공기 주머니에 싸인 99kg짜리 캡슐이 튀고 구릅니다.') },
      { at: 13, text: t('멈추자 공기 주머니가 떨어져 나가고, 꽃잎 넷이 열려 몸을 바로 세웁니다. 안테나도 펴집니다.') },
      { at: 18, text: t('달은 먼지 늪이 아니었습니다. 단단한 땅에서 찍은 첫 사진이 지구로 왔습니다.') },
    ],
  },
  // Mars Pathfinder, 1997: under a parachute, then inside air bags, bouncing at least
  // fifteen times (six are shown) and rolling a kilometre.
  pathfinder: {
    name: t('패스파인더의 착륙'),
    day: t('1997년 7월 4일'),
    seconds: 26,
    downAt: 16,
    fromKm: 10,
    fall: 5,
    hops: [{ until: 8, peakKm: 6 }, { until: 10.4, peakKm: 4 }, { until: 12.3, peakKm: 2.6 }, { until: 13.8, peakKm: 1.6 }, { until: 15, peakKm: 0.9 }, { until: 16, peakKm: 0.4 }],
    acrossKm: 10,
    rollFrom: 'start',
    turns: 5,
    bagSeconds: 2.5,
    sounds: [[0, 'chuteShort'], [5, 'bounce'], [8, 'bounce'], [10.4, 'bounce'], [12.3, 'bounce'], [13.8, 'bounce'], [15, 'bounce']],
    lines: [
      { at: 0, text: t('1997년 7월 4일. 패스파인더가 낙하산에 매달려 아레스 계곡으로 내려옵니다. 화성에 21년 만에 내리는 탐사선입니다.') },
      { at: 5, text: t('공기 주머니에 싸인 채 시속 50km쯤으로 떨어져, 건물 5층 높이로 튀어 오릅니다.') },
      { at: 11, text: t('적어도 열다섯 번을 튀고 굴러, 처음 닿은 곳에서 1km쯤 떨어진 데서 멈췄습니다.') },
      { at: 17, text: t('공기 주머니를 빼고 꽃잎 셋을 엽니다. 둘째 날, 전자레인지만 한 로버 소저너가 화성 땅으로 내려갑니다.') },
    ],
  },
  // Philae on comet 67P, 2014: resting anywhere on the comet (the story 'rosetta' is told
  // by passing near it). Its harpoons did not fire, so it bounced: once for an hour and
  // fifty minutes, once for seven, and came to rest leaning in a cliff's shadow. The
  // comet is 4 km across, so the model is drawn small (sizeKm) and seen from close by.
  philaeLanding: {
    name: t('필레의 착륙'),
    day: t('2014년 11월 12일'),
    on: 'churyumov',
    // The comet is 4 km across: the scene is offered from beside it too, within this many
    // of its radii of its middle (a jump to it ends five radii off; the user, 2026-10-07,
    // arrived so and found no button: "여긴 애니 보는 버튼이 없네").
    besideRadii: 6,
    seconds: 26,
    downAt: 19,
    viewKm: 4.2,
    sizeKm: 0.34,
    fromKm: 1.2,
    fall: 7,
    hops: [{ until: 16.5, peakKm: 0.7 }, { until: 19, peakKm: 0.12 }],
    acrossKm: 0.6,
    rollFrom: 'touch',
    tiltRad: 1.05,
    // As it bounces off and floats up, and again as it comes down the second time and
    // tips over (render/siteModels.js SITE_SAYS, SECOND_SAYS): from, to.
    say: [7.2, 10.4],
    say2: [16.6, 21.2],
    sounds: [[7, 'bounce'], [16.5, 'bounce']],
    lines: [
      { at: 0, text: t('2014년 11월 12일. 로제타에서 떨어져 나온 필레가 일곱 시간에 걸쳐 혜성으로 내려옵니다.') },
      { at: 7, text: t('닿았지만 붙잡지 못했습니다. 몸을 땅에 박을 작살 둘이 쏘아지지 않았습니다.') },
      { at: 11, text: t('중력이 지구의 10만분의 1쯤이라, 1km 높이까지 튀어 올라 1시간 50분을 떠 있었습니다.') },
      { at: 19, text: t('두 번을 튄 끝에 절벽 그늘에 비스듬히 멈췄습니다. 햇빛이 모자라 57시간쯤 뒤 전지가 다해 잠들었습니다.') },
    ],
  },
  // Pad 39A again, fifty-one years on (the story 'lc39a' tells of Apollo 11 leaving from
  // it): SpaceX's Falcon 9 with Crew Dragon, Demo-2. This one goes UP. Measures are in
  // the model's own units (it is drawn 6 km to a unit): the rocket lights at igniteAt,
  // leaves at liftAt, and at partAt, partUnits up, the first stage lets go. The second
  // goes on, up and out of the view; the first falls back, burns again and stands on a
  // ship shipUnits to the side at downAt. (The real ship waited 500 km out to sea, and
  // the first stage came down nine minutes after it left: drawn near and soon.)
  lc39a: {
    name: t('크루 드래건의 발사'),
    day: t('2020년 5월 30일'),
    seconds: 30,
    downAt: 24,
    fromKm: 0,
    viewKm: 70,
    launch: { igniteAt: 2, liftAt: 3, partAt: 12, partUnits: 1.6, shipUnits: 1.7 },
    // The commander's words just before it lifts (render/siteModels.js SITE_SAYS): from, to.
    say: [0.5, 4.2],
    // The first stage's goodbye as it parts (render/siteModels.js BOOSTER_SAYS): from, to.
    sayBooster: [15, 19.6],
    // What is heard and when (ui/sound.js cues): the engines light, the stages part,
    // the first stage lights again (when its `burn` begins, 0.7 of its way down) and
    // it stands on the ship.
    sounds: [[2, 'liftoff'], [12, 'staging'], [20.4, 'landingBurn'], [24, 'stood']],
    lines: [
      { at: 0, text: t('2020년 5월 30일. 39A 발사대에서 팰컨 9이 크루 드래건을 싣고 떠납니다. 헐리와 벵컨이 탔습니다.') },
      { at: 6, text: t('미국 땅에서 사람이 궤도로 오르는 것은 9년 만이고, 민간 회사의 우주선으로는 처음입니다.') },
      { at: 12, text: t('2분 30초 뒤 1단이 떨어집니다. 2단은 드래건을 밀고 궤도로 가고, 1단은 되돌아옵니다.') },
      { at: 18, text: t('1단이 엔진을 다시 켜 속도를 줄이고 다리 넷을 폅니다. 대서양에 띄운 배로 내려갑니다.') },
      { at: 24, text: t('1단이 배 위에 섰습니다. 드래건은 19시간 뒤 국제우주정거장에 닿았습니다.') },
    ],
  },
  // Venus, twice: the first landing on another planet, and the one that lasted longest.
  venera7: {
    name: t('베네라 7호의 착륙'),
    day: t('1970년 12월 15일'),
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    // It feels the heat on the way down: from, to.
    say: [8.8, 13.6],
    sounds: [[0, 'chute']],
    lines: [
      { at: 0, text: t('1970년 12월 15일. 소련의 베네라 7호가 금성의 두꺼운 구름을 뚫고 낙하산으로 내려옵니다.') },
      { at: 6, text: t('기압은 지구의 90배, 온도는 475도입니다. 앞서 온 탐사선들은 바닥에 닿기 전에 찌그러졌습니다.') },
      { at: 12, text: t('낙하산이 찢어져 마지막 29분은 떨어지다시피 했습니다. 초속 17m로 부딪혀 옆으로 쓰러집니다.') },
      { at: 17, text: t('그래도 23분 동안 약한 신호를 보냈습니다. 다른 행성의 땅에서 온 첫 소식입니다.') },
    ],
  },
  venera13: {
    name: t('베네라 13호의 착륙'),
    day: t('1982년 3월 1일'),
    seconds: 24,
    downAt: 17,
    fromKm: 14,
    // Once it is down it listens: from, to.
    say: [17.8, 22.8],
    sounds: [[0, 'chute']],
    lines: [
      { at: 0, text: t('1982년 3월 1일. 베네라 13호가 금성으로 내려옵니다. 공기가 워낙 짙어 낙하산은 중간에 버립니다.') },
      { at: 6, text: t('몸에 두른 둥근 판이 공기를 받아 속도를 줄입니다. 물속에 가라앉듯 천천히 내려갑니다.') },
      { at: 12, text: t('32분을 버티게 만든 기계입니다. 내리자마자 카메라 덮개를 떼고, 드릴로 땅을 팝니다.') },
      { at: 17, text: t('457도, 89기압에서 127분을 버텼습니다. 금성 땅의 첫 컬러 사진과 바람 소리를 보냈습니다.') },
    ],
  },
  // Stages that are not on the Moon: Pluto's heart, Nuri leaving Naro.
  ...PLACE_STAGES,
  // The landmarks: a picture taken, a look through a telescope, or what made the place.
  ...LANDMARK_SCENES,
  // Eight on the Moon, each a stage of pieces (core/moonScenes.js).
  ...MOON_SCENES,
  // Twenty-one more landings, on the Moon and Mars (core/landerScenes.js).
  ...LANDER_STAGES,
  ...LANDER_REPLAYS,
  // At a craft, while docked with it: its parts unfold (core/craftScenes.js).
  ...CRAFT_SCENES,
};

// The scene played by resting on this body, if there is one.
export function replayOn(bodyId) {
  return Object.keys(REPLAYS).find((id) => REPLAYS[id].on === bodyId) ?? null;
}

// The body whose scene is offered from beside it (`besideRadii`) to one at `position`,
// or null. bodies: [{ id, position, radiusKm }].
export function replayBeside(position, bodies) {
  for (const scene of Object.values(REPLAYS)) {
    if (!scene.besideRadii) continue;
    const body = bodies.find((b) => b.id === scene.on);
    if (body && Math.hypot(...position.map((n, i) => n - body.position[i])) <= scene.besideRadii * body.radiusKm) return body.id;
  }
  return null;
}

export function replayFor(id) {
  return REPLAYS[id] ?? null;
}

// The sounds of a scene that fall due between `before` (not counted) and `after`
// seconds in: the names of ui/sound.js cues, in order.
export function replaySounds(id, before, after) {
  return (REPLAYS[id]?.sounds ?? []).filter(([at]) => at > before && at <= after).map(([, name]) => name);
}

// The scene t seconds in: how high the model is (it slows as it nears the ground),
// whether its engine burns, which line is told, and whether the scene is over.
// How large a scene's bubble is at a moment (0 → 1): it swells in and shrinks away over
// 0.4 s between the two moments of the scene's `say`.
function saySize(scene, t, span = scene.say) {
  if (!span) return 0;
  const part = (n) => Math.max(0, Math.min(1, n));
  return part((t - span[0]) / 0.4) * part((span[1] - t) / 0.4);
}

export function replayFrame(id, t) {
  const scene = REPLAYS[id];
  if (!scene) return null;
  const u = Math.max(0, Math.min(1, t / scene.downAt));
  let line = 0;
  scene.lines.forEach((l, i) => { if (t >= l.at) line = i; });
  if (scene.hops) return { ...hopFrame(scene, t), line, text: scene.lines[line].text, done: t >= scene.seconds };
  if (scene.launch) return { ...launchFrame(scene, t), line, text: scene.lines[line].text, done: t >= scene.seconds };
  // A craft unfolding: how far each of its parts has come. Nothing comes down.
  if (scene.unfold) {
    return {
      unfold: scene.unfold(t),
      liftKm: 0, acrossKm: 0, glow: 0, slope: 0, gone: false, flame: false, down: false,
      after: Math.max(0, t - scene.downAt),
      line,
      text: scene.lines[line].text,
      done: t >= scene.seconds,
    };
  }
  // A stage: its pieces stand where the scene says. Nothing of the plain kind comes
  // down, and what is heard is in the scene's own list (replaySounds), so `down` stays
  // false: the thump of a landing is not played a second time.
  if (scene.stage) {
    return {
      stage: scene.stage(t),
      // (A stage on a planet of gas is seen from far off and drawn large: sizeKm.)
      sizeKm: scene.sizeKm ?? null,
      liftKm: 0, acrossKm: 0, glow: 0, slope: 0, gone: false, flame: false, down: false,
      after: Math.max(0, t - scene.downAt),
      line,
      text: scene.lines[line].text,
      done: t >= scene.seconds,
    };
  }
  return {
    liftKm: scene.streak ? scene.fromKm + (scene.toKm - scene.fromKm) * u : scene.fromKm * (1 - u) ** 2,
    // A streak: how far to the side it still is, how hot it glows (from a third of the
    // way in), and whether it has burnt away.
    acrossKm: scene.streak ? scene.acrossKm * (1 - u) : 0,
    glow: scene.streak ? Math.max(0, Math.min(1, (u - 0.33) / 0.4)) : 0,
    // How steeply it comes down: km lost for each km it comes nearer.
    slope: scene.streak ? (scene.fromKm - scene.toKm) / scene.acrossKm : 0,
    gone: Boolean(scene.streak) && t >= scene.downAt,
    flame: !scene.streak && t < scene.downAt,
    down: t >= scene.downAt,
    say: saySize(scene, t),
    // Seconds since it came down (what let it down may then leave).
    after: Math.max(0, t - scene.downAt),
    line,
    text: scene.lines[line].text,
    done: t >= scene.seconds,
  };
}

// A launch, t seconds in, in the model's units. Until they part the two stages rise as
// one, faster and faster. Then `upper` (the second stage and the capsule) goes on up,
// leaning over downrange, and is gone from the view; `booster` coasts a little higher,
// drifts over to the ship, falls, lights its engines again (burn) and puts out its legs
// to stand on the deck. x: to the side; y: up; lean: radians from upright.
function launchFrame(scene, t) {
  const { igniteAt, liftAt, partAt, partUnits, shipUnits } = scene.launch;
  const clamp = (n) => Math.max(0, Math.min(1, n));
  const down = t >= scene.downAt;
  const rise = partUnits * clamp((t - liftAt) / (partAt - liftAt)) ** 2;
  // How fast it rises as they part (units a second).
  const speed = (2 * partUnits) / (partAt - liftAt);
  let upper = { x: 0, y: rise, lean: 0, burn: t >= igniteAt, gone: false };
  let booster = { x: 0, y: rise, lean: 0, burn: t >= igniteAt, legs: false };
  if (t >= partAt) {
    const since = t - partAt;
    upper = { x: 0.05 * since * since, y: partUnits + speed * since + 0.06 * since * since, lean: Math.min(0.9, 0.09 * since), burn: since > 0.6, gone: since > 7 };
    const p = clamp(since / (scene.downAt - partAt));
    const over = p * p * (3 - 2 * p);
    booster = {
      x: shipUnits * over,
      // It ends on the deck with no speed left.
      y: (1 - p) ** 2 * (partUnits + 6.5 * p),
      lean: -0.45 * Math.sin(Math.PI * p) * (1 - p),
      burn: p > 0.7 && !down,
      legs: p > 0.75,
    };
  }
  return {
    launch: { upper, booster },
    liftKm: 0, acrossKm: 0, glow: 0, slope: 0, gone: false, flame: false,
    say: saySize(scene, t),
    sayBooster: saySize(scene, t, scene.sayBooster),
    down,
    after: Math.max(0, t - scene.downAt),
  };
}

// One that bounced, t seconds in: how high it is (falling, then each hop a parabola),
// how far to the side it still is, how far a ball has turned (radians; it stops the
// right way up), how full its air bags are (1 → 0 once it has stopped), how far it leans
// (Philae, as its last hop ends), and whether it has opened.
function hopFrame(scene, t) {
  const clamp = (n) => Math.max(0, Math.min(1, n));
  let liftKm = 0;
  if (t < scene.fall) liftKm = scene.fromKm * (1 - t / scene.fall) ** 1.4;
  else {
    let start = scene.fall;
    for (const hop of scene.hops) {
      if (t < hop.until) {
        const x = (t - start) / (hop.until - start);
        liftKm = hop.peakKm * 4 * x * (1 - x);
        break;
      }
      start = hop.until;
    }
  }
  const way = scene.rollFrom === 'touch' ? clamp((t - scene.fall) / (scene.downAt - scene.fall)) : clamp(t / scene.downAt);
  const lastHop = scene.hops.length > 1 ? scene.hops[scene.hops.length - 2].until : scene.fall;
  const settling = clamp((t - lastHop) / (scene.downAt - lastHop));
  const down = t >= scene.downAt;
  return {
    liftKm,
    acrossKm: scene.acrossKm * (1 - way),
    // Faster at first, stopping as it stops: whole turns, so it ends as it began.
    turn: (scene.turns ?? 0) * 2 * Math.PI * (1 - (1 - way) ** 2),
    tilt: (scene.tiltRad ?? 0) * settling * settling * (3 - 2 * settling),
    bag: scene.bagSeconds ? (down ? clamp(1 - (t - scene.downAt) / scene.bagSeconds) : 1) : 0,
    open: scene.openAt !== undefined && t >= scene.openAt,
    // How large its bubble is (0 → 1): it swells in and shrinks away over 0.4 s.
    say: saySize(scene, t),
    say2: saySize(scene, t, scene.say2),
    sizeKm: scene.sizeKm ?? null,
    glow: 0,
    slope: 0,
    gone: false,
    flame: false,
    down,
    after: Math.max(0, t - scene.downAt),
  };
}
