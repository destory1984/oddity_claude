import { t } from './i18n.js';
// Days played again at a craft, not at a place: while she is docked with it, the same
// "그날로" button plays them (the user, 2026-10-06: "제임스웹은 렌즈 펼치고, 가림막
// 펼치는게, 빅이벤트 아니었나? 그것도 만들어줘", then of eight more: "다 넣어").
//
// Such a scene is an `unfold`: for every moment, how far each of the craft's moving
// parts has come, most of them 0 (as it began) → 1 (as it ended). render/craftUnfold.js
// builds the craft with those parts loose (CRAFT_UNFOLD) and render/craft.js shows that
// one in place of the craft while the scene runs.

const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (t, from, to) => {
  const u = clamp((t - from) / (to - from));
  return u * u * (3 - 2 * u);
};

export const CRAFT_SCENES = {
  // Webb left folded to fit inside its rocket and opened itself over two weeks on the
  // way to L2, in this order: the two pallets that carry the sunshield go down (28
  // December 2021), the tower lifts the telescope clear (29th), the two side booms pull
  // the shield out into a kite (31st), its five layers are drawn tight (3 and 4 January
  // 2022), the secondary mirror's three legs swing out (5th), and the two wings of the
  // main mirror latch (7th and 8th). Drawn as seconds.
  jwst: {
    name: t('웹이 펼쳐지다'),
    day: t('2022년 1월 8일'),
    seconds: 44,
    downAt: 37,
    sounds: [[7, 'roll'], [10.5, 'roll'], [14, 'roll'], [17.5, 'roll'], [21, 'roll'], [24.5, 'roll'], [28, 'roll'], [31, 'roll'], [34, 'clunk'], [34.1, 'roll'], [37, 'clunk'], [37.5, 'stood']],
    lines: [
      { at: 0, text: t('2021년 12월 25일, 웹은 로켓에 들어가도록 종이접기처럼 접힌 채 떠났습니다. 가는 길에 스스로 펼쳐야 합니다.') },
      { at: 7, text: t('사흘 뒤, 햇빛 가리개를 실은 앞뒤 받침대가 내려갑니다. 이어 망원경을 받친 탑이 1.2m 솟습니다.') },
      { at: 14, text: t('양옆으로 팔이 뻗어 나가며 가리개를 연 모양으로 펼칩니다. 테니스장만 한 넓이입니다.') },
      { at: 21, text: t('머리카락만큼 얇은 막 다섯 겹을 한 겹씩 팽팽하게 당깁니다. 겹과 겹 사이로 열이 빠져나갑니다.') },
      { at: 28, text: t('보조 거울을 받친 세 다리가 펴집니다. 이어 접혀 있던 주거울의 양 날개가 차례로 제자리에 잠깁니다.') },
      { at: 37, text: t('2022년 1월 8일, 다 펼쳤습니다. 하나만 어긋나도 끝인 곳이 344군데였지만 모두 제대로 움직였습니다.') },
    ],
    unfold(t) {
      return {
        pallets: ease(t, 7, 11.5),
        tower: ease(t, 11.5, 14),
        booms: ease(t, 14, 20.5),
        // The layers part one after another: 0 → 1 is all five.
        tension: ease(t, 21, 27.5),
        secondary: ease(t, 28, 31),
        wingLeft: ease(t, 31, 34),
        wingRight: ease(t, 34, 37),
      };
    },
  },
  // Voyager 1 turns its cameras back toward home one last time (the story 'paleBlueDot'
  // tells of the picture; this is the taking of it). looking: the cameras are at work;
  // sweep: how far they have turned across the planets; cards: how many of the six
  // pictures have come (Neptune, Uranus, Saturn, Jupiter, Earth, Venus); earth: Earth's
  // picture brought forward, 0 → 1.
  voyager1: {
    name: t('태양계 가족사진'),
    day: t('1990년 2월 14일'),
    seconds: 44,
    downAt: 31,
    sounds: [[9, 'shutter'], [11.2, 'shutter'], [13.4, 'shutter'], [15.6, 'shutter'], [17.8, 'shutter'], [20, 'shutter'], [30, 'stood']],
    lines: [
      { at: 0, text: t('1990년 2월 14일. 보이저 1호는 해에서 60억km, 해왕성 궤도 너머에 있습니다. 맡은 일은 다 끝났습니다.') },
      { at: 6, text: t('칼 세이건이 여러 해를 졸랐습니다. 마지막으로 뒤돌아 고향을 찍자고. 카메라가 해 쪽으로 돕니다.') },
      { at: 13, text: t('해왕성, 천왕성, 토성, 목성, 지구, 금성. 사진 60장에 행성 여섯이 담깁니다. 화성과 수성은 빠졌습니다.') },
      { at: 22, text: t('지구는 한 픽셀의 8분의 1쯤 되는 점입니다. 렌즈에 번진 햇살 줄기 속에 떠 있습니다.') },
      { at: 31, text: t('"저 점을 보라. 저기가 우리의 집이다." 세이건은 그 점을 창백한 푸른 점이라고 불렀습니다.') },
      { at: 38, text: t('34분 뒤 보이저의 카메라는 영영 꺼졌습니다. 보이저는 지금도 별 사이를 날고 있습니다.') },
    ],
    unfold(t) {
      return {
        looking: ease(t, 6, 8) * (1 - ease(t, 22, 23.5)),
        sweep: clamp((t - 8) / 13),
        cards: Math.max(0, Math.min(6, (t - 9) / 2.2)),
        earth: ease(t, 24, 30),
      };
    },
  },
  // Hubble's first servicing (Endeavour, December 1993). shuttle: it has come up under
  // the telescope; out: the two astronauts are out at work; fix: the corrective optics
  // have gone in; away: the shuttle has let go and backed off.
  hubble: {
    name: t('허블의 안경'),
    day: t('1993년 12월'),
    seconds: 48,
    downAt: 34,
    sounds: [[13, 'dock'], [21, 'roll'], [24.5, 'roll'], [28, 'clunk'], [34, 'undock'], [42, 'stood']],
    lines: [
      { at: 0, text: t('1990년에 올라간 허블은 눈이 나빴습니다. 거울 가장자리가 머리카락 굵기의 50분의 1만큼 더 깎였습니다.') },
      { at: 7, text: t('1993년 12월, 우주왕복선 엔데버가 쫓아 올라가 로봇 팔로 허블을 붙잡아 짐칸 위에 세웁니다.') },
      { at: 14, text: t('우주비행사들이 둘씩 번갈아 닷새 동안 다섯 번, 모두 35시간을 밖에서 일합니다.') },
      { at: 21, text: t('공중전화 부스만 한 보정 장치를 밀어 넣습니다. 동전만 한 거울들이 허블의 안경이 됩니다.') },
      { at: 29, text: t('태양 전지판과 자이로스코프도 새것으로 갈았습니다. 허블을 놓아주고 엔데버는 물러납니다.') },
      { at: 38, text: t('몇 주 뒤에 온 사진은 또렷했습니다. 허블은 그 뒤로 네 번 더 고쳐 가며 30년 넘게 일하고 있습니다.') },
    ],
    unfold(t) {
      return {
        shuttle: ease(t, 7, 13),
        out: ease(t, 14, 18) * (1 - ease(t, 30, 33)),
        fix: ease(t, 21, 28),
        away: ease(t, 34, 42),
      };
    },
  },
  // The station built piece by piece. built: how many of its eight groups have come
  // and joined (Zarya, Unity, Zvezda, Destiny with the middle of the truss, the truss
  // and wings to one side, then the other, the forward labs, the side rooms); the
  // part after the point is how far the next one has come.
  iss: {
    name: t('우주정거장을 짓다'),
    day: t('1998년 11월 20일'),
    seconds: 50,
    downAt: 42.4,
    sounds: [[8.8, 'clunk'], [13.6, 'clunk'], [18.4, 'clunk'], [23.2, 'clunk'], [28, 'clunk'], [32.8, 'clunk'], [37.6, 'clunk'], [42.4, 'clunk'], [43, 'stood']],
    lines: [
      { at: 0, text: t('1998년 11월 20일, 러시아의 자랴가 먼저 올라갑니다. 정거장의 첫 조각입니다.') },
      { at: 9, text: t('12월에 우주왕복선이 미국의 유니티를 싣고 와 붙입니다. 2000년 7월에는 즈베즈다가 와서 잠잘 방이 생깁니다.') },
      { at: 19, text: t('2000년 11월 2일 첫 세 사람이 들어왔습니다. 그날부터 정거장에 사람이 없던 날은 하루도 없습니다.') },
      { at: 24, text: t('등뼈 같은 트러스가 양옆으로 자라고 태양 전지 날개 여덟 장이 펴집니다. 다 펴면 축구장만 합니다.') },
      { at: 33, text: t('미국의 하모니, 유럽의 콜럼버스, 일본의 키보가 붙고, 지구를 내려다보는 창 큐폴라가 달립니다.') },
      { at: 43, text: t('2011년에 다 지었습니다. 13년 동안 40번 넘게 실어 날랐습니다. 무게 420톤, 너비 109m입니다.') },
    ],
    unfold(t) {
      return { built: Math.max(0, Math.min(8, (t - 4) / 4.8)) };
    },
  },
  // Sputnik 1 leaves its rocket. fairing: the nose cone has gone; sep: the rocket has
  // fallen behind; whips: the four antennas have sprung back; beeps: how many beeps
  // have gone out (each a shell of light swelling from the ball).
  sputnik: {
    name: t('스푸트니크의 첫 신호'),
    day: t('1957년 10월 4일'),
    seconds: 36,
    downAt: 13,
    sounds: [[6, 'clunk'], [8.5, 'toss'], [14, 'beeps']],
    lines: [
      { at: 0, text: t('1957년 10월 4일 밤. 소련의 R-7 로켓이 지름 58cm, 무게 83.6kg의 쇠공을 싣고 궤도에 오릅니다.') },
      { at: 6, text: t('덮개가 벗겨지고 로켓이 공을 밀어냅니다. 접혀 있던 안테나 넷이 뒤로 펴집니다.') },
      { at: 14, text: t('"삐, 삐, 삐." 사람이 만든 첫 달이 96분에 한 바퀴씩 지구를 돕니다. 누구나 라디오로 들을 수 있었습니다.') },
      { at: 22, text: t('전지는 21일 만에 다했고, 석 달 뒤 대기에 떨어져 탔습니다. 우주 시대는 이 소리로 시작됐습니다.') },
      { at: 30, text: t('놀란 미국은 이듬해 NASA를 만들었습니다. 12년 뒤에는 사람이 달에 섰습니다.') },
    ],
    unfold(t) {
      return {
        fairing: ease(t, 6, 8.5),
        sep: ease(t, 8.5, 12),
        whips: ease(t, 11.5, 13),
        beeps: Math.max(0, Math.min(t, 34) - 14) / 0.6,
      };
    },
  },
  // Parker Solar Probe goes into the corona for the first time. heat: how hot its
  // shield glows; flow: how far the corona's streamers have gone by (model units).
  parker: {
    name: t('태양을 만지다'),
    day: t('2021년 4월 28일'),
    seconds: 40,
    downAt: 14,
    sounds: [[8, 'chute'], [25, 'chuteShort']],
    lines: [
      { at: 0, text: t('2021년 4월 28일. 파커 태양 탐사선이 여덟 번째로 해에 다가갑니다. 해에서 1,300만km입니다.') },
      { at: 7, text: t('탄소 방패의 앞면은 1,400도까지 달아오릅니다. 두께 11cm 방패 뒤의 기계들은 30도쯤입니다.') },
      { at: 14, text: t('태양풍이 해에서 풀려나는 경계를 넘어 코로나로 들어섰습니다. 처음으로 별의 대기를 만졌습니다.') },
      { at: 22, text: t('다섯 시간 동안 그 안에 머물며 코로나의 물줄기 같은 결을 지나갔습니다. 태양 전지는 그늘로 접었습니다.') },
      { at: 31, text: t('2024년 12월에는 610만km까지 다가갔습니다. 초속 192km, 사람이 만든 것 가운데 가장 빠릅니다.') },
    ],
    unfold(t) {
      return {
        heat: (0.25 * ease(t, 0, 6) + 0.75 * ease(t, 6, 14)) * (1 - 0.8 * ease(t, 31, 38)),
        flow: Math.max(0, t - 6) * 0.9,
      };
    },
  },
  // Cassini lets Huygens go toward Titan. away: how far the probe has gone, 0 → 1,
  // slower and slower as it is seen to shrink; spin: how far it has turned (radians).
  cassini: {
    name: t('하위헌스를 떠나보내다'),
    day: t('2004년 12월 25일'),
    seconds: 34,
    downAt: 7,
    sounds: [[7, 'clunk'], [7.15, 'toss']],
    lines: [
      { at: 0, text: t('2004년 12월 25일. 토성에 온 지 반년, 카시니가 7년을 업고 온 하위헌스를 타이탄 쪽으로 겨눕니다.') },
      { at: 7, text: t('용수철 셋이 탐사선을 밀어냅니다. 1분에 일곱 바퀴씩 팽이처럼 돌며 초속 35cm로 멀어집니다.') },
      { at: 14, text: t('하위헌스에는 엔진이 없습니다. 도는 힘으로 자세를 지키며 20일을 날아갑니다. 깨어 있는 것은 시계뿐입니다.') },
      { at: 22, text: t('2005년 1월 14일 타이탄의 안개 속으로 들어갔습니다. 카시니가 위를 지나며 신호를 받아 지구로 보냈습니다.') },
    ],
    unfold(t) {
      return { away: 1 - (1 - clamp((t - 7) / 24)) ** 2, spin: Math.max(0, t - 7) * 2.5 };
    },
  },
  // The Roadster shown to the sky. open: the fairing's two halves have swung away;
  // gone: Earth has fallen behind.
  roadster: {
    name: t('스타맨의 출발'),
    day: t('2018년 2월 6일'),
    seconds: 38,
    downAt: 12,
    sounds: [[6, 'clunk'], [6.2, 'ascent']],
    lines: [
      { at: 0, text: t('2018년 2월 6일. 팰컨 헤비의 첫 시험 비행입니다. 시험 짐으로 콘크리트 덩이 대신 빨간 차를 실었습니다.') },
      { at: 6, text: t('덮개가 둘로 갈라져 떨어져 나갑니다. 운전석에는 우주복을 입힌 인형 스타맨이 앉아 있습니다.') },
      { at: 13, text: t('차에서는 데이비드 보위의 노래 스페이스 오디티가 흘렀습니다. 계기판에는 "당황하지 마시오"라고 적었습니다.') },
      { at: 21, text: t('지구를 등진 모습이 네 시간 동안 생중계됐습니다. 그 뒤 엔진을 한 번 더 켜 화성 궤도 너머로 떠났습니다.') },
      { at: 29, text: t('지금은 557일에 한 바퀴씩 해를 돕니다. 수천만 년 안에 지구나 금성에 떨어질 수 있다고 합니다.') },
    ],
    unfold(t) {
      return { open: ease(t, 6, 12), gone: ease(t, 12, 34) };
    },
  },
  // Juno's one chance to be caught by Jupiter. burn: its main engine is lit; spin: how
  // far it has turned (radians; it spins faster for the burn and slows after).
  juno: {
    name: t('주노의 목성 도착'),
    day: t('2016년 7월 4일'),
    seconds: 40,
    downAt: 30,
    sounds: [[9, 'burnLong'], [30, 'stood']],
    lines: [
      { at: 0, text: t('2016년 7월 4일. 5년 동안 28억km를 날아온 주노가 목성에 다가갑니다. 기회는 한 번뿐입니다.') },
      { at: 7, text: t('흔들리지 않으려고 도는 빠르기를 1분에 두 바퀴에서 다섯 바퀴로 올립니다. 그리고 엔진을 켭니다.') },
      { at: 14, text: t('35분 동안 엔진을 태워 초속 542m를 줄여야 목성에 붙잡힙니다. 지구에서는 48분 늦게 압니다.') },
      { at: 22, text: t('목성의 방사선은 기계를 금세 망가뜨립니다. 주노의 두뇌는 두께 1cm 티타늄 금고 안에 있습니다.') },
      { at: 30, text: t('엔진이 꺼졌습니다. 1초도 어긋나지 않았습니다. 햇빛으로 움직이는 탐사선이 가장 멀리 간 기록입니다.') },
    ],
    unfold(t) {
      return { burn: t >= 9 && t < 30 ? 1 : 0, spin: 1.2 * t + 1.8 * (Math.max(0, t - 8) - Math.max(0, t - 33)) };
    },
  },
};
