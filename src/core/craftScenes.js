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
  // picture brought forward, 0 → 1; sagan: Carl Sagan's photograph has come up beside it.
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
        // His photograph comes up as his words are told, and stays.
        sagan: ease(t, 31, 32.5),
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
        // Its bubble is up for the first seven seconds of them.
        say: ease(t, 14.3, 14.7) * (1 - ease(t, 21, 21.5)),
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
  // The thirteen craft that had no day yet (the user, 2026-10-06: "도킹할 수 있는 모든
  // 곳에는 애니 넣어"). Six meet a world that goes by behind them (pass: 0 → 1 across the
  // view), two look down and take one picture (looking: the camera is at work; snap: the
  // picture has come up), and the rest have values of their own.
  voyager2: {
    name: t('해왕성을 스치다'),
    day: t('1989년 8월 25일'),
    seconds: 36,
    downAt: 14,
    sounds: [[14, 'shutter'], [22, 'shutter'], [30, 'stood']],
    lines: [
      { at: 0, text: t('1989년 8월 25일. 떠난 지 12년, 보이저 2호가 해왕성에 다가갑니다. 이 행성에 온 탐사선은 지금까지 이것 하나뿐입니다.') },
      { at: 7, text: t('해에서 45억km. 햇빛이 지구의 900분의 1이라, 사진이 흐려지지 않게 몸을 돌려 가며 오래 찍습니다.') },
      { at: 14, text: t('구름 꼭대기 위 4,950km를 지나갑니다. 지구만 한 검은 폭풍과 시속 2,000km의 바람을 봤습니다.') },
      { at: 22, text: t('다섯 시간 뒤 위성 트리톤을 지납니다. 영하 235도의 얼음 땅에서 검은 연기가 8km 높이로 솟고 있었습니다.') },
      { at: 29, text: t('목성, 토성, 천왕성, 해왕성. 네 행성을 모두 들른 탐사선도 이것뿐입니다. 2018년에는 태양권 밖으로 나갔습니다.') },
    ],
    unfold(t) {
      return { pass: clamp((t - 2) / 32) };
    },
  },
  pioneer10: {
    name: t('목성을 처음 만나다'),
    day: t('1973년 12월 4일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [28, 'stood']],
    lines: [
      { at: 0, text: t('1973년 12월 4일. 파이어니어 10호가 목성에 다가갑니다. 화성 너머로 간 탐사선은 이것이 처음입니다.') },
      { at: 7, text: t('소행성대를 지나다 부서질 것이라고 걱정했습니다. 일곱 달 동안 지났지만 큰 탈은 없었습니다.') },
      { at: 14, text: t('구름 꼭대기에서 13만km를 지나갑니다. 방사선이 사람이 죽는 양의 수백 배라 기계 몇이 탈이 났습니다.') },
      { at: 21, text: t('목성 사진 500장쯤을 보냈습니다. 이 길이 열려 보이저가 뒤따를 수 있었습니다.') },
      { at: 28, text: t('몸에는 사람 둘과 지구의 자리를 새긴 금빛 판이 붙어 있습니다. 2003년 1월 마지막 신호가 왔습니다.') },
    ],
    unfold(t) {
      // say: its bubble ("목성아. 스마일~") is up, from a second and a half before the shutter.
      return { pass: clamp((t - 2) / 31), say: ease(t, 12.3, 12.7) * (1 - ease(t, 15.6, 16)) };
    },
  },
  pioneer11: {
    name: t('토성을 처음 만나다'),
    day: t('1979년 9월 1일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [28, 'stood']],
    lines: [
      { at: 0, text: t('1979년 9월 1일. 떠난 지 6년 반, 파이어니어 11호가 토성에 다가갑니다. 토성에 온 첫 탐사선입니다.') },
      { at: 7, text: t('오는 길에 목성의 중력을 빌려 방향을 틀고, 태양계를 가로질러 날아왔습니다.') },
      { at: 14, text: t('고리 바깥을 지나 구름 꼭대기 위 2만 1천km를 스칩니다. 고리 평면을 지날 때 모두 숨을 죽였습니다.') },
      { at: 21, text: t('새 고리 F를 찾았고, 모르고 있던 작은 위성 곁을 수천km 차이로 스쳐 지나갔습니다.') },
      { at: 28, text: t('뒤따르던 보이저 1호와 2호는 이 길이 안전한 것을 알고 왔습니다. 신호는 1995년 11월에 끊겼습니다.') },
    ],
    unfold(t) {
      // say: Saturn's bubble ("첫 손님이네요") is up, from a second and a half before the shutter.
      return { pass: clamp((t - 2) / 31), say: ease(t, 12.3, 12.7) * (1 - ease(t, 15.6, 16)) };
    },
  },
  newHorizons: {
    name: t('가장 먼 만남'),
    day: t('2019년 1월 1일'),
    seconds: 36,
    downAt: 14,
    sounds: [[14, 'shutter'], [29, 'stood']],
    lines: [
      { at: 0, text: t('2019년 1월 1일. 명왕성을 지난 지 3년 반, 뉴허라이즌스가 카이퍼 벨트의 작은 천체 아로코스에 다가갑니다.') },
      { at: 7, text: t('해에서 65억km. 사람이 만든 것이 찾아간 가장 먼 천체입니다. 신호가 지구에 닿는 데 여섯 시간이 걸립니다.') },
      { at: 14, text: t('3,500km 곁을 초속 14km로 지나갑니다. 길이 36km, 붉은 덩어리 둘이 붙은 눈사람 모양이었습니다.') },
      { at: 22, text: t('둘은 아주 천천히 다가와 살며시 붙었습니다. 45억 년 전 행성이 만들어지던 때의 모습 그대로입니다.') },
      { at: 29, text: t('아로코스는 포우하탄 말로 하늘이라는 뜻입니다. 뉴허라이즌스는 지금도 태양계 밖으로 날고 있습니다.') },
    ],
    unfold(t) {
      // say: its bubble ("눈사람이에요?") is up, from a second and a half before the shutter.
      return { pass: clamp((t - 2) / 32), say: ease(t, 12.3, 12.7) * (1 - ease(t, 15.6, 16)) };
    },
  },
  europaClipper: {
    name: t('화성의 힘을 빌리다'),
    day: t('2025년 3월 1일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [28, 'stood']],
    lines: [
      { at: 0, text: t('2024년 10월 14일 유로파 클리퍼가 떠났습니다. 날개를 펴면 30m가 넘는, NASA가 행성으로 보낸 가장 큰 탐사선입니다.') },
      { at: 7, text: t('목성까지 곧장 갈 힘은 없습니다. 먼저 화성 곁을 지나며 그 중력으로 길을 바꿉니다.') },
      { at: 14, text: t('2025년 3월 1일, 화성 위 884km를 지나갑니다. 지나는 김에 열화상 카메라와 레이더를 시험했습니다.') },
      { at: 21, text: t('2026년 12월에는 지구 곁을 지나며 속도를 얻습니다. 29억km를 날아 2030년 4월 목성에 닿습니다.') },
      { at: 28, text: t('목성의 달 유로파를 49번 스쳐 지나며 얼음 밑 바다를 살핍니다. 지구의 바다를 다 합친 것의 두 배쯤 되는 물입니다.') },
    ],
    unfold(t) {
      // say: its bubble ("화성아. 구멍 났어?") is up, from a second and a half before the shutter.
      return { pass: clamp((t - 2) / 31), say: ease(t, 12.3, 12.7) * (1 - ease(t, 15.6, 16)) };
    },
  },
  lucy: {
    name: t('소행성에 달이 있었다'),
    day: t('2023년 11월 1일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [15.5, 'discovered'], [21, 'shutter']],
    lines: [
      { at: 0, text: t('2023년 11월 1일. 목성 트로이 소행성으로 가던 루시가 연습 삼아 작은 소행성 딘키네시 곁을 지납니다.') },
      { at: 7, text: t('초속 4.5km, 430km 거리. 카메라 받침대가 소행성을 놓치지 않고 따라 도는지 시험하는 날입니다.') },
      { at: 14, text: t('너비 790m인 소행성 뒤에서 작은 달이 나타났습니다. 아무도 모르던 달입니다.') },
      { at: 21, text: t('더 지나가서 보니 그 달은 덩어리 둘이 붙은 것이었습니다. 이런 달은 처음 봤습니다. 이름은 셀람입니다.') },
      { at: 28, text: t('루시는 12년 동안 소행성 열한 곳을 찾아갑니다. 이름은 320만 년 전 사람 화석 루시에서 왔습니다.') },
    ],
    unfold(t) {
      // say: its bubble ("누구냐. 넌") is up, between the two shutters.
      return { pass: clamp((t - 2) / 31), moon: ease(t, 14, 19), pair: ease(t, 21, 25), say: ease(t, 16.2, 16.6) * (1 - ease(t, 20, 20.4)) };
    },
  },
  mro: {
    name: t('낙하산을 찍다'),
    day: t('2012년 8월 6일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [15.2, 'discovered']],
    lines: [
      { at: 0, text: t('2012년 8월 6일. 화성 정찰 궤도선이 화성을 돕니다. 오늘은 땅이 아니라 하늘을 찍어야 합니다.') },
      { at: 7, text: t('큐리오시티가 대기로 뛰어들었습니다. 낙하산에 매달려 있는 시간은 2분도 안 됩니다.') },
      { at: 14, text: t('찰칵. 340km 떨어진 곳에서 낙하산과 그 아래 매달린 탐사차를 찍었습니다. 낙하산 지름은 16m입니다.') },
      { at: 21, text: t('2008년 피닉스가 내려올 때도 이렇게 찍었습니다. 다른 행성에 내리는 모습을 찍은 것은 그때가 처음입니다.') },
      { at: 28, text: t('2006년 3월에 도착해 지금껏 화성을 돕니다. 카메라는 300km 높이에서 책상만 한 것을 알아봅니다.') },
    ],
    unfold(t) {
      return { looking: t >= 7 && t < 20 ? 1 : 0, snap: ease(t, 14.2, 15.2) };
    },
  },
  lro: {
    name: t('달에 남은 발자국'),
    day: t('2009년 7월 17일'),
    seconds: 35,
    downAt: 14,
    sounds: [[14, 'shutter'], [15.2, 'discovered']],
    lines: [
      { at: 0, text: t('2009년 6월 18일 떠난 달 정찰 궤도선이 나흘 반 만에 달에 닿았습니다. 달의 가장 자세한 지도를 만들러 왔습니다.') },
      { at: 7, text: t('7월, 카메라를 시험하며 아폴로가 내렸던 자리 위를 지납니다. 40년 만에 다시 보는 곳입니다.') },
      { at: 14, text: t('찰칵. 착륙선의 아랫단이 그대로 서 있고 긴 그림자가 졌습니다. 7월 17일에 사진을 내놓았습니다.') },
      { at: 21, text: t('나중에 더 낮게 날며 찍은 사진에는 우주인들이 걸어 다닌 발자국 길과 월면차 바퀴 자국까지 보입니다.') },
      { at: 28, text: t('달의 남극에서는 영하 238도인 그늘을 쟀습니다. 태양계에서 잰 가장 추운 곳에 듭니다.') },
    ],
    unfold(t) {
      return { looking: t >= 7 && t < 20 ? 1 : 0, snap: ease(t, 14.2, 15.2) };
    },
  },
  // burn: its engines are lit; flick: the time, for the flame's flicker.
  danuri: {
    name: t('다누리, 달에 닿다'),
    day: t('2022년 12월 17일'),
    seconds: 35,
    downAt: 21,
    sounds: [[14, 'burnLong'], [21, 'stood']],
    lines: [
      { at: 0, text: t('2022년 8월 5일 한국의 첫 달 탐사선 다누리가 떠났습니다. 연료를 아끼려고 넉 달 반을 돌아가는 길을 골랐습니다.') },
      { at: 7, text: t('해 쪽으로 155만km까지 나갔다가 돌아옵니다. 가는 길에 지구와 달을 한 장에 담은 사진도 찍었습니다.') },
      { at: 14, text: t('12월 17일 새벽, 엔진을 13분 동안 켜 속도를 줄입니다. 달의 중력에 붙잡혔습니다.') },
      { at: 21, text: t('다섯 번에 나눠 줄일 계획이었지만 세 번 만에 해냈습니다. 12월 27일 달 위 100km 궤도에 들어섰습니다.') },
      { at: 28, text: t('한국은 달에 탐사선을 보낸 일곱 번째 나라가 됐습니다. 싣고 간 카메라는 햇빛이 들지 않는 분화구 속을 찍습니다.') },
    ],
    unfold(t) {
      return { burn: t >= 14 && t < 21 ? 1 : 0, flick: t };
    },
  },
  // planet: where the planet is across the line from its star to the telescope (-1 → 1;
  // a crossing every five seconds from the eighth, three in all); dots: how many
  // measures have been drawn, one every half second (render/craftUnfold.js keplerTransit
  // puts the dips in the row of dots by the same count).
  kepler: {
    name: t('별빛이 깜빡이다'),
    day: t('2009년 3월 7일'),
    seconds: 38,
    downAt: 14,
    sounds: [[10.5, 'click'], [15.5, 'click'], [20.5, 'click'], [22, 'discovered']],
    lines: [
      { at: 0, text: t('2009년 3월 7일 케플러가 떠났습니다. 백조자리와 거문고자리 사이, 하늘 한 조각만 4년 동안 바라봅니다.') },
      { at: 7, text: t('별 15만 개의 밝기를 30분마다 잽니다. 행성이 별 앞을 지나면 별빛이 아주 조금 어두워집니다.') },
      { at: 14, text: t('지구만 한 행성이 해만 한 별을 가리면 빛은 만분의 1쯤 줄어듭니다. 세 번 되풀이되면 행성으로 칩니다.') },
      { at: 22, text: t('이렇게 행성 2,600개 넘게를 찾았습니다. 별에는 행성이 있는 것이 보통이라는 것을 알게 됐습니다.') },
      { at: 30, text: t('2013년 자세를 잡는 바퀴가 고장 났지만 햇빛의 미는 힘으로 균형을 잡아 더 일했습니다. 2018년 연료가 다해 잠들었습니다.') },
    ],
    unfold(t) {
      const s = t - 8;
      return {
        planet: s >= 0 && s < 15 ? ((s % 5) / 5) * 2 - 1 : 9,
        dots: Math.max(0, Math.min(30, Math.floor(s / 0.5))),
      };
    },
  },
  chandra: {
    name: t('엑스선의 첫 빛'),
    day: t('1999년 8월 19일'),
    seconds: 37,
    downAt: 21,
    sounds: [[14, 'clunk'], [21, 'shutter'], [22.4, 'discovered']],
    lines: [
      { at: 0, text: t('1999년 7월 23일 찬드라가 우주왕복선 컬럼비아에 실려 올라갑니다. 선장 아일린 콜린스는 왕복선을 지휘한 첫 여성입니다.') },
      { at: 7, text: t('왕복선이 올린 것 가운데 가장 무거운 짐이었습니다. 엑스선은 공기에 막혀 땅에 닿지 않아 우주에서 봐야 합니다.') },
      { at: 14, text: t('지구에서 달까지의 3분의 1 되는 곳까지 나가는 길쭉한 궤도를 돕니다. 8월 12일 덮개를 엽니다.') },
      { at: 21, text: t('8월 19일, 첫 사진입니다. 320년쯤 전에 터진 별의 잔해 카시오페이아 A, 그 한가운데에 아무도 못 본 점이 있었습니다.') },
      { at: 29, text: t('터지고 남은 중성자별이었습니다. 찬드라는 그 뒤로 블랙홀과 은하단을 25년 넘게 지켜보고 있습니다.') },
    ],
    unfold(t) {
      return { looking: t >= 14 && t < 29 ? 1 : 0, snap: ease(t, 21.2, 22.4) };
    },
  },
  // tiles: how many squares of sky have been taken (six in all).
  euclid: {
    name: t('어두운 우주의 지도'),
    day: t('2023년 7월 1일'),
    seconds: 38,
    downAt: 12,
    // A click for every square as it comes (the user, 2026-10-06: "조각이 나올 떄마다
    // 찰칵해줘", then "찰칵만 하고, 각각이 올라오는 시간을 좀 빨리해줘... 반복되니까 지루하네"):
    // then "5초에 다 올라오게 해줘", then "그림을 6개로 줄이는건?"): six in five seconds, one
    // every five sixths of a second, with no beeps before them. (There were fifteen, a
    // second and a half apart.)
    sounds: [...Array.from({ length: 6 }, (_, k) => [7 + (k * 5) / 6, 'snap']), [12, 'stood']],
    lines: [
      { at: 0, text: t('2023년 7월 1일 유럽의 유클리드가 떠났습니다. 한 달 뒤 지구에서 150만km 떨어진 제자리에 닿았습니다.') },
      { at: 7, text: t('지름 1.2m 거울로 하늘을 한 조각씩 찍어 이어 붙입니다. 한 번에 보름달 두 개 반 넓이가 담깁니다.') },
      { at: 14, text: t('6년 동안 하늘의 3분의 1, 은하 수십억 개를 담습니다. 100억 년 전의 은하까지 봅니다.') },
      { at: 22, text: t('은하의 모양이 조금씩 찌그러진 것을 재면, 보이지 않는 암흑 물질이 어디에 있는지 알 수 있습니다.') },
      { at: 30, text: t('우주의 95%는 암흑 물질과 암흑 에너지입니다. 그것이 무엇인지는 아직 아무도 모릅니다.') },
    ],
    unfold(t) {
      return { tiles: Math.max(0, Math.min(6, (t - 7) * 1.2)) };
    },
  },
  // built: how many of its four groups have come and joined (the core, the first crew's
  // ship, Wentian, Mengtian); the part after the point is how far the next one has come.
  tiangong: {
    name: t('하늘 궁전을 짓다'),
    day: t('2021년 4월 29일'),
    seconds: 40,
    downAt: 28,
    sounds: [[4, 'clunk'], [12, 'dock'], [20, 'clunk'], [28, 'clunk'], [28.6, 'stood']],
    lines: [
      { at: 0, text: t('2021년 4월 29일, 중국의 우주정거장 톈궁의 첫 조각 톈허가 올라갑니다. 길이 16.6m, 사람이 사는 방입니다.') },
      { at: 8, text: t('6월 17일 선저우 12호가 첫 세 사람을 태우고 와 붙습니다. 셋은 석 달을 머물렀습니다.') },
      { at: 16, text: t('2022년 7월 24일 실험실 원톈이 옵니다. 앞문에 붙은 뒤 옆문으로 옮겨 답니다.') },
      { at: 24, text: t('10월 31일 두 번째 실험실 멍톈이 올라갑니다. 11월 3일 옆문으로 옮겨 달자 T자 모양이 됐습니다. 첫 조각을 올린 지 1년 반 만입니다.') },
      { at: 32, text: t('무게는 국제우주정거장의 4분의 1쯤입니다. 세 사람이 여섯 달씩 번갈아 살고 있습니다.') },
    ],
    unfold(t) {
      return { built: [0, 8, 16, 24].reduce((sum, from) => sum + clamp((t - from) / 4), 0) };
    },
  },
};
