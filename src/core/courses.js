// 우주 관광 추천코스, in the journal's flight tab: a press jumps her to the start of a round
// and the orbit lock carries her round by itself, until a key is pressed (the user,
// 2026-11-02: "지금 내가 돌고 있는 비행 경로도 되게 좋거든.. 이런걸 얘기하는거야", "1번은 지금 내가
// 돌고 있는 궤도", "우주 관광 추천코스라는 이름으로 메뉴에 만들고"). The rest are what amateur
// astronomers' lists name most often (Sky at Night's hundred, Astronomy Trek's ten,
// Astronomy's and New Atlas's beginners' lists, counted 2026-11-02), those the game draws.
// M33 goes with M31, 15 degrees from it; the Crab and Ring nebulae are not in the game.
//
// body: what she goes round. lapS: a round in seconds. A round is kept in one of four ways:
//   sun: from and toward, in the directions of core/startSpots.js, measured to the Sun;
//   sky: a thing of the fixed sky stands overDeg above the plane of the round, so that it
//     keeps passing over the body; 'milkyWay': the plane is the galaxy's and the band runs
//     behind the body all the way round;
//   rings: inclined overDeg to the rings, starting roundDeg from the Sun's side.
//   rail: round a stretch of the aurora over the night side, which no lock can do: the
//     lock goes round a body, and the ring shows on the night side only (the user,
//     2026-11-02: "오로라만 집중적으로 보는 곳으로", "이건 맴돌기가 아니네..."). atKm: how high the
//     point she looks at stands, in the curtain (100 to 1,500 km up); highKm: how high she
//     flies; rangeKm: how far off she goes round it, through the curtain twice a lap;
//     startS: how far into a lap it starts, where the curtains stand thickest.
//   rail.oval: along the aurora's ring instead (ovalAt below): the course Drifting Over
//     the Aurora since 2026-11-25; the round above is no longer flown.
//   rail.orbit: a low round of the whole body, through midnight, dawn, noon and dusk,
//     looking ahead along the way at lookDeg under the level, so the horizon stands low in
//     the view and the Sun comes up over it (an orbital sunrise; the user, 2026-11-18:
//     "2", for a course of the dawn layers drawn in shaders/air.frag). highKm: how high.
//   rail.cupola: a round over both poles, looking out of a side window from inside the
//     station's cupola (main.js cupolaView draws the window and what floats in it).
// rollDeg: the view turned, for a band that lies across a tall screen.
import { orientationFrom, right, up } from './orientation.js';
import { GALACTIC_CENTRE, GALACTIC_POLE, GALAXIES, NEBULAE, fromEquatorial } from './sky.js';
import { outOf, sunFrame } from './startSpots.js';
import { t } from './i18n.js';

export const COURSES = [
  { id: 'auroraDrift', body: 'earth', lapS: 240, rail: { oval: { latDeg: 65.8, ringDeg: 67, highKm: 420, atKm: 200, aheadDeg: 35, fromDeg: -45, toDeg: 45 }, loops: true, startS: 0, fades: [239.2] }, name: t('오로라 유영'), todo: t('북극을 두른 오로라 고리를 따라 밤하늘을 날며, 강물처럼 길게 이어진 빛의 커튼을 봅니다.') },
  // At the height of the round the user flew; its plane leans to the line of day and night,
  // for the Sun in view puts out the rest (the user, 2026-11-02: "태양이 안 보였으면 좋겠어").
  { id: 'earthRound', body: 'earth', lapS: 120, radii: 4.31, name: t('지구 한 바퀴'), todo: t('두 분 동안 지구를 한 바퀴 비행합니다. 낮과 밤, 오로라가 차례로 지나갑니다.'),
    sun: { from: [0.5, 0, -0.87], toward: [0, 1, 0] } },
  // 360 s a lap: the layers last about eight seconds, the Sun about half a minute to come up.
  // In the station's cupola, round the Earth over both poles through day, dusk, night and
  // dawn, looking out of a side window square to the way she goes, so the Sun, which stays
  // in the plane of the round, never stands in the window. 1,000 km up, higher than the
  // station's 400 km, for more of the Earth in the window (the user, 2026-11-19: "조금 더
  // 고도를 높이면?"); 105 minutes a round as at that height, flown at twice the pace (the
  // user: "지구 이동 속도를 2배로"; main.js CUPOLA_PACE). overHorizonDeg: how far over the
  // horizon the middle of the view stands; leadS: when she passes over Seoul at night.
  { id: 'cupola', body: 'earth', lapS: 3150, rail: { cupola: true, cabin: 'assets/cupola/frame.webp', highKm: 1000, overHorizonDeg: 5, startS: 0, leadS: 700 }, name: t('큐폴라에서 본 지구'), todo: t('큐폴라는 국제우주정거장 아래쪽에 달린, 창 일곱 개짜리 둥근 전망대입니다. 그 창 안에서 지구를 내려다봅니다. 낮과 노을, 밤의 도시 불빛이 지나갑니다.') },
  // Apollo 11's way (the user, 2026-11-19: "그럼 아폴로 하자"): a parking orbit round the
  // Earth, the burn for the Moon, the three days' coast, into orbit round the Moon behind it,
  // and the earthrise. legs: when each part ends, in seconds.
  { id: 'apollo11', body: 'earth', lapS: 1100, rail: { apollo: true, dock: { from: 714, hold: [724, 729], holdKm: 45, top: 731, topKm: 40, topCabin: 'assets/tours/eagle-top.webp', hatchKm: [1.8, 0.6], capture: 741, latch: 748, pullS: 1.2, to: 752, farKm: 150, nearKm: 12, sizeKm: 9 }, undock: { from: 490, part: 491.5, to: 522.5, nearKm: 14, farKm: 150, sizeKm: 9 }, burns: [{ from: 130, to: 150, power: 0.85, buzz: true }, { from: 322, to: 340, power: 0.8, buzz: true }, { from: 509, to: 594.6, power: 0.45, landing: true }, { from: 700, to: 712, power: 0.6, buzz: true }, { from: 800, to: 820, power: 0.8, buzz: true }], landing: { dust: 560, contact: 594, touch: 594.6, lamp: [714, 1592, 902, 1700], gauge: [547.5, 1652.5, 87] }, cabin: 'assets/tours/apollo-cabin.webp', cabins: [{ at: 0, cabin: 'assets/tours/apollo-cabin.webp' }, { at: 490, cabin: 'assets/tours/eagle-cabin.webp', aim: [-0.12, -0.12] }, { at: 731, cabin: 'assets/tours/eagle-top.webp', tilt: -Math.PI / 2, aim: [-0.03, 0.11], captionY: 74 }, { at: 752, cabin: 'assets/tours/apollo-cabin.webp' }], glow: { from: 980, peak: 1005, to: 1035 }, shakes: [{ from: 19, peak: 23, to: 60, power: 0.65 }, { from: 49, peak: 50, to: 53, power: 0.65 }, { from: 71, peak: 72, to: 75, power: 0.65 }, { from: 491.5, peak: 491.6, to: 492.6 }, { from: 594.6, peak: 594.7, to: 596.2 }, { from: 741, peak: 741.1, to: 742.6 }, { from: 749.2, peak: 749.3, to: 751 }], still: [[-26, 100], [130, 150], [322, 342], [505, 750], [800, 820], [980, 1100]], fades: [99.2, 1099.2], loops: true, ascent: { liftoff: 20, insert: 92, insertKm: 185 }, sounds: [[20, 'liftoff'], [26, 'roll'], [50, 'staging'], [52, 'ascent'], [72, 'staging'], [491.5, 'parting'], [594, 'contact'], [594.6, 'touchdown'], [700, 'ascent'], [741, 'capture'], [748.95, 'latches'], [982, 'burnLong'], [1003, 'burnLong'], [1056, 'chute']], captions: [{ at: -25, text: t('1969년 7월 16일, 미국 플로리다의 케네디 우주센터. 왼쪽의 큰 건물에서 로켓을 세워서 조립합니다.') }, { at: -18, text: t('다 만든 로켓은 운반차에 실려 시속 1.6km로, 5.6km 떨어진 발사대까지 갑니다.') }, { at: -11, text: t('39A 발사대에 선 아폴로 11호의 새턴 5호. 높이 110m, 연료를 채우면 2,900톤입니다.') }, { at: 1, text: t('그날 아침, 세 사람은 새턴 5호 꼭대기의 사령선에 누워 있습니다.') }, { at: 11, text: t('발사 9초 전, 1단 엔진 다섯 개에 불이 붙습니다.') }, { at: 21, text: t('이륙! 높이 110m의 새턴 5호가 떠오릅니다. 발사탑을 벗어나자 관제가 휴스턴으로 넘어갑니다.') }, { at: 36, text: t('기체를 돌려 동쪽 바다 쪽으로 눕기 시작합니다. 곧 소리보다 빨라집니다.') }, { at: 50, text: t('약 2분 42초 뒤 1단이 떨어져 나갑니다. 그동안 연료와 산화제 2천 톤을 태웠습니다.') }, { at: 66, text: t('2단과 3단이 차례로 타고, 발사 11분 49초 만에 고도 190km 궤도에 오릅니다.') }, { at: 82, text: t('창밖의 하늘이 검어지고, 둥근 지구의 가장자리가 보입니다.') }, { at: 102, text: t('지구 궤도에 올랐습니다. 지구를 한 바퀴 반 돌며 우주선을 점검합니다.') }, { at: 112, text: t('창밖은 고도 190km. 타고 있는 사람은 암스트롱, 올드린, 콜린스 세 사람입니다.') }, { at: 122, text: t('곧 3단 로켓을 다시 켜고 달로 가는 길에 오릅니다.') }, { at: 134, text: t('엔진이 6분 가까이 타며 우주선은 시속 3만 9천km까지 빨라집니다.') }, { at: 162, text: t('지구가 점점 작아집니다. 달까지 38만km, 사흘이 걸리는 길입니다.') }, { at: 200, text: t('가는 동안 우주선은 한쪽만 햇볕에 달궈지지 않게 천천히 돌았습니다. 바비큐 굴리기라고 불렀습니다.') }, { at: 250, text: t('7월 19일, 달 뒤편으로 들어서면 지구와의 무선이 끊깁니다.') }, { at: 294, text: t('달 뒤편에서 엔진을 켜 속도를 줄여야 달 궤도에 붙잡힙니다.') }, { at: 342, text: t('달 궤도에 들어섰습니다. 아래는 지구에서는 한 번도 보이지 않는 달의 뒤편입니다.') }, { at: 368, text: t('곧 달의 지평선 위로 지구가 떠오릅니다. 지구돋이입니다.') }, { at: 400, text: t('지구돋이를 처음 사진으로 남긴 것은 1968년 크리스마스이브, 아폴로 8호였습니다.') }, { at: 467, text: t('7월 20일, 암스트롱과 올드린이 착륙선 이글로 옮겨 탑니다. 콜린스는 사령선 컬럼비아에 남습니다.') }, { at: 493, text: t('이글이 컬럼비아에서 떨어져 나왔습니다. 이제 이글의 세모난 창으로 봅니다.') }, { at: 509, text: t('엔진을 켜고 고요의 바다로 내려가기 시작합니다. 12분 동안의 하강입니다.') }, { at: 525, text: t('경보 "1202"가 울립니다. 켜 둔 레이더가 컴퓨터를 바쁘게 해 울렸지만, 컴퓨터는 착륙에 꼭 필요한 일만 남기고 계속했습니다.') }, { at: 545, text: t('컴퓨터가 고른 자리는 바위가 널린 분화구였습니다. 암스트롱이 손으로 몰아 넘어갑니다.') }, { at: 565, text: t('"60초." 연료가 얼마 남지 않았다고 지상에서 알립니다. 엔진 바람에 먼지가 날립니다.') }, { at: 597, text: t('"휴스턴, 여기는 고요의 기지. 이글은 착륙했다." 한국 시간으로 7월 21일 새벽 5시 17분이었습니다.') }, { at: 615, text: t('창밖은 잿빛 땅과 검은 하늘, 그리고 지구입니다.') }, { at: 632, text: t('원래는 한숨 자고 나갈 계획이었지만, 두 사람은 바로 나가겠다고 했습니다.') }, { at: 660, text: t('여섯 시간 반 뒤 암스트롱이 첫발을 디뎠습니다. "한 사람에게는 작은 한 걸음이지만, 인류에게는 위대한 도약이다."') }, { at: 680, text: t('둘은 2시간 31분 동안 걸으며 성조기를 세우고 돌과 흙 21.5kg을 모았습니다. 바람이 없어 발자국은 오래 남습니다.') }, { at: 700, text: t('21시간 36분 만에 이글의 윗부분이 아랫부분을 발사대 삼아 떠오릅니다.') }, { at: 720, text: t('엔진 바람에 성조기가 쓰러지는 것을 올드린이 창으로 보았습니다.') }, { at: 726, text: t('컬럼비아가 다가옵니다. 콜린스가 혼자 달을 돌며 기다리고 있었습니다.') }, { at: 731, text: t('이글의 천장 창으로 올려다봅니다. 컬럼비아가 머리 위로 내려옵니다.') }, { at: 741, text: t('탐침이 걸리는 순간 두 배가 크게 흔들렸습니다. 콜린스가 손으로 자세를 바로잡았습니다.') }, { at: 752, text: t('네 시간쯤 뒤 이글은 컬럼비아와 다시 만나 붙었습니다. 다시 사령선의 창입니다.') }, { at: 772, text: t('세 사람이 다시 모였습니다. 이글의 윗부분은 떼어 달 궤도에 남겨 두었습니다.') }, { at: 804, text: t('달 뒤편에서 엔진이 2분 반 동안 타며 지구로 향합니다.') }, { at: 816, text: t('그때까지 컬럼비아는 달 궤도를 서른 바퀴 돌았습니다.') }, { at: 836, text: t('달이 작아집니다. 지구까지 이틀 반 길입니다.') }, { at: 880, text: t('돌아오는 길에 세 사람은 TV 중계로 지구의 사람들에게 고맙다는 인사를 전했습니다.') }, { at: 930, text: t('7월 24일, 지구가 다가옵니다. 들어가는 각도가 조금만 어긋나도 대기에 튕겨 나가거나 타 버립니다.') }, { at: 984, text: t('시속 4만km로 대기에 부딪힙니다. 바닥의 방열판이 수천 도의 열을 견딥니다.') }, { at: 1004, text: t('불꽃에 둘러싸여 몇 분 동안 무선이 끊깁니다.') }, { at: 1042, text: t('작은 낙하산 두 개가 먼저 펴져 캡슐을 붙잡습니다.') }, { at: 1056, text: t('고도 3km. 큰 낙하산 세 개가 펴집니다.') }, { at: 1080, text: t('태평양에 내렸습니다. 항공모함 호넷이 세 사람을 맞았습니다. 8일 3시간 18분의 여행이었습니다.') }], cabinKeys: [{ cabin: 'assets/tours/apollo-cabin.webp', does: 'sound', label: 'Sound', hit: [862, 150, 935, 265], lever: [862, 152, 938, 264], down: { src: 'assets/tours/apollo-switch-down.webp', x: 840, y: 130, w: 220, h: 170 }, labelY: 160 }, { cabin: 'assets/tours/apollo-cabin.webp', does: 'music', label: 'Music', hit: [965, 170, 1040, 280], lever: [962, 173, 1038, 281], down: { src: 'assets/tours/apollo-switch-down.webp', x: 840, y: 130, w: 220, h: 170 }, labelY: 180 }, { cabin: 'assets/tours/apollo-cabin.webp', does: 'caption', label: 'Caption', hit: [1065, 185, 1140, 295], lever: [1063, 186, 1139, 298], down: { src: 'assets/tours/apollo-switch3-down.webp', x: 1040, y: 150, w: 140, h: 150 }, labelY: 196 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'sound', label: 'Sound', hit: [704, 1165, 800, 1300], lever: [704, 1165, 800, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'music', label: 'Music', hit: [814, 1165, 910, 1300], lever: [814, 1165, 910, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'caption', label: 'Caption', hit: [926, 1165, 1022, 1300], lever: [926, 1165, 1022, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }], pace: 1, countdowns: [{ at: 20, from: 20, beeps: 10, said: t('발사까지'), go: t('이륙!') }, { at: 130, from: 25, beeps: 10, said: t('달로 가는 점화까지'), go: t('점화!'), goCue: 'none' }, { at: 322, from: 20, beeps: 10, said: t('달 궤도 진입 점화까지'), go: t('점화!'), goCue: 'none' }, { at: 800, from: 30, beeps: 10, said: t('지구로 돌아가는 점화까지'), go: t('점화!'), goCue: 'none' }], met: [[20, 0], [92, 0.197], [130, 2.73], [294, 75.83], [490, 100.2], [595, 102.76], [660, 109.41], [700, 124.37], [748, 128.05], [800, 135.4], [980, 195.05], [1080, 195.3]], phases: [[20, t('발사')], [100, t('지구 궤도')], [130, t('달로 가는 길')], [300, t('달 궤도')], [490, t('달로 내려가는 중')], [595, t('달 표면')], [700, t('달 궤도')], [800, t('지구로 가는 길')], [980, t('대기권 진입')], [1080, t('태평양')]], startS: -26, photos: [{ from: -26, to: -12, src: 'assets/tours/kennedy-pan.webp', pan: [5, 90], zoom: [1.06, 1] }, { from: -12, to: 0, src: 'assets/tours/pad.webp', pan: [61, 61], zoom: [1, 3.2], origin: '50% 32%' }], parkKm: 190, moonKm: 110, legs: { launch: 100, park: 30, burn: 50, coast: 230, rise: 290, undock: 405, land: 495, liftoff: 600, dock: 650, tei: 700, teiEnd: 720, home: 880, chute: 940, end: 980 } }, name: t('아폴로 11호의 길'), todo: t('지구를 돌다 달로 떠나, 사흘 길을 건너 달 뒤편을 돌며 지구돋이를 봅니다.') },
  // Discovery's flight that let Hubble go, STS-31, April 1990 (the user, 2026-11-19:
  // "우주왕복선 중에서 유명한게 뭐였지? 그거 관광 비행 코스"; the flight chosen with GPT): from the
  // aft flight deck, Hubble just let go of, over the Earth; the shuttle backs away and the
  // telescope goes small; at the end the view turns to the horizon ahead.
  { id: 'discovery', body: 'earth', lapS: 480, rail: { shuttle: true, arm: true, craftLook: 'hubble1990', cabin: 'assets/tours/shuttle-cabin.webp', floaters: ['assets/tours/candy.webp'], pace: 50, nearKm: 14, farKm: 600, turnS: 330, loops: true, fades: [479.2], startS: -30, photos: [{ from: -30, to: -14, src: 'assets/tours/hubble-grapple.webp', pan: [30, 62], zoom: [1.08, 1] }, { from: 440, to: 480, src: 'assets/tours/pillars.webp', pan: [18, 48], zoom: [1.15, 1], origin: '50% 30%' }], countdowns: [{ at: 0, from: 10, beeps: 10, said: t('허블 분리 카운트다운'), go: t('분리!'), goCue: 'click' }], met: [[-30, 30.55], [0, 31.07], [330, 32.6], [480, 33.2]], phases: [[-30, t('놓기 전')], [0, t('놓아줌')], [40, t('멀어지는 중')], [330, t('지구 궤도')]], captions: [{ at: -29, text: t('1990년 4월 25일, 지구 위 612km. 우주 왕복선 디스커버리의 로봇팔이 허블 우주망원경을 들고 있습니다.') }, { at: -18, text: t('팔을 움직이는 사람은 스티븐 홀리. 이제 허블을 우주에 놓아줄 차례입니다.') }, { at: 1, text: t('허블이 팔에서 떨어졌습니다. 이제 혼자 우주에 떠 있습니다.') }, { at: 14, text: t('길이 13m, 무게 11톤. 버스 한 대만 한 망원경입니다.') }, { at: 42, text: t('디스커버리가 허블에게서 천천히 멀어집니다.') }, { at: 68, text: t('이름은 천문학자 에드윈 허블에게서 왔습니다. 우리 은하 밖에도 은하가 있고, 우주가 커지고 있다는 것을 밝힌 사람입니다.') }, { at: 96, text: t('별이 반짝이는 것은 공기가 별빛을 흔들기 때문입니다. 허블은 공기가 없는 우주에서 흔들림 없는 별빛을 봅니다.') }, { at: 124, text: t('거울의 지름은 2.4m. 허블은 95분마다 지구를 한 바퀴 돕니다.') }, { at: 152, text: t('그런데 첫 사진이 흐렸습니다. 거울 가장자리가 머리카락 굵기의 50분의 1만큼 잘못 깎여 있었습니다.') }, { at: 180, text: t('1993년 우주비행사들이 찾아가, 안경을 씌우듯 흐림을 바로잡는 장치를 달았습니다.') }, { at: 208, text: t('그 뒤로도 2009년까지 모두 다섯 번 찾아가 허블을 고치고 새 장비를 달았습니다.') }, { at: 236, text: t('창밖의 허블은 2002년에 고치러 갔을 때 찍은 실제 사진입니다.') }, { at: 264, text: t('1995년, 허블은 빈 하늘의 작은 점 하나를 열흘 동안 보았습니다. 그 안에 은하가 3천 개쯤 있었습니다.') }, { at: 292, text: t('허블은 우주가 얼마나 빨리 커지는지 재어, 우주의 나이를 더 정확히 알게 해 주었습니다.') }, { at: 334, text: t('디스커버리가 앞쪽 지평선으로 몸을 돌립니다. 나흘 뒤 지구로 돌아갑니다.') }, { at: 364, text: t('그 뒤 36년. 허블은 지금도 지구를 돌며 하늘을 보고 있습니다.') }, { at: 395, text: t('허블이 보낸 자료로 쓴 논문은 2만 편이 넘습니다.') }, { at: 442, text: t('1995년 허블이 찍은 「창조의 기둥」. 별이 태어나는 가스 기둥으로, 6,500광년 떨어져 있습니다.') }, { at: 458, text: t('맨 왼쪽 기둥의 길이는 약 4광년. 허블이 본 수많은 우주 가운데 하나입니다.') }] }, name: t('우주 왕복선 디스커버리와 허블'), todo: t('1990년 우주 왕복선 디스커버리가 허블 우주망원경을 우주에 놓아준 날, 조종실 창으로 멀어지는 허블을 봅니다.') },
  // Bruce McCandless's flight on the MMU from Challenger, 7 February 1984, the first
  // untethered spacewalk, seen from inside his helmet (the user, 2026-11-20: "우주 왕복선에서 우주
  // 유영하는걸 추천 코스로", "우주 유영을 1인칭 시점으로"): Challenger (a cut-out of the photo he
  // took) in Hubble's place, falling back to about 100 m and coming near again.
  { id: 'mmu', body: 'earth', lapS: 340, rail: { shuttle: true, mmu: true, craftModel: 'challenger', doorsS: [-44, -36], armPose: { yaw: 0.12, pitch: 0.12, elbow: -0.15 }, noseDeg: 35, feel: true, air: 'assets/tours/helmet-air.mp3', hands: 'assets/tours/helmet-hands.webp', cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp' }, { at: -4, cabin: 'assets/tours/helmet-rim.webp' }], floaters: [], nearS: [-62, -46], farOutKm: 900, nearOutKm: 80, outS: [-32, -20], roundS: [-22, -10], figureOutKm: 11, figureKm: 3.4, figure: { src: 'assets/tours/mmu-figure.webp', aspect: 1029 / 900, width: 1 }, pace: 50, nearKm: 7, farKm: 140, turnS: 100000, aimOff: [0, 0], craftKm: 46, kmAt: [[0, 140], [20, 150], [170, 280], [230, 280], [320, 150], [340, 140]], figureEndKm: 50, loops: true, fades: [339.2], startS: -64, photos: [{ from: -8, to: 2.5, fadeS: 2.5, src: 'assets/tours/mmu-face.webp', pan: [50, 50], zoom: [1, 4.5], origin: '54% 22%' }], phases: [[-64, t('챌린저 곁')], [0, t('홀로 나는 중')], [230, t('돌아가는 중')]], captions: [{ at: -62, text: t('1984년 2월 7일, 지구 위를 도는 우주 왕복선 챌린저.') }, { at: -32, text: t('브루스 매캔들리스가 등에 추진기를 메고 화물칸에서 나옵니다.') }, { at: -20, text: t('줄 하나 없이 우주를 나는 첫 우주 유영입니다.') }, { at: -14, text: t('이제 그의 헬멧 안으로 들어갑니다.') }, { at: 3, text: t('등에 멘 추진기의 이름은 MMU. 질소 가스를 뿜는 작은 분사구 24개로 움직입니다.') }, { at: 28, text: t('양손의 손잡이로 앞뒤, 위아래로 가고 몸을 돌립니다.') }, { at: 55, text: t('이제 챌린저와 그를 잇는 줄은 없습니다. 그 스스로가 작은 우주선입니다.') }, { at: 85, text: t('둘 다 시속 2만 8천km로 지구를 돌고 있지만, 함께 돌기에 서로는 거의 멈춘 듯 보입니다.') }, { at: 115, text: t('챌린저가 점점 작아집니다. 그는 약 100m까지 멀어졌습니다.') }, { at: 150, text: t('15년 전 아폴로 11호 때, 매캔들리스는 휴스턴에서 달 위의 암스트롱과 교신하던 사람이었습니다.') }, { at: 180, text: t('떠나며 그는 말했습니다. "닐에게는 작은 한 걸음이었겠지만, 내게는 엄청나게 큰 도약이다."') }, { at: 210, text: t('그는 이 추진기를 만드는 일에 오래 힘을 보탰습니다.') }, { at: 240, text: t('이제 챌린저로 돌아갑니다.') }, { at: 270, text: t('이날 동료 로버트 스튜어트도 같은 추진기로 날았습니다.') }, { at: 300, text: t('이날의 우주 유영은 5시간 55분 동안 이어졌습니다.') }] }, name: t('줄 하나 없이 우주 유영'), todo: t('1984년 줄 하나 없이 우주를 난 첫 사람, 브루스 매캔들리스의 헬멧 안에서 멀어지는 챌린저를 봅니다.') },
  // Starship's fifth flight, 13 October 2024 (the user, 2026-11-22: "스페이스X 이륙 -> 착륙은
  // 어때?", "1안" (the flight whose booster the tower caught), "3" (the liftoff and the catch
  // from the ground, the flight between from a camera on the booster), "만들어"). stage: the
  // stretches drawn on the ground at Starbase (render/starshipStage.js); the rest from the
  // booster over the Gulf of Mexico (starshipAt). hotStage: the ship lighting and leaving.
  // The Moon's birth (the user, 2026-11-24: "테이아 달 형성론을 3D로 만들어볼까", "개발 시작"): the
  // giant impact, drawn by render/theiaStage.js; its seconds are THEIA's there.
  { id: 'theia', body: 'earth', lapS: 238, rail: { theia: true, stage: [[-2, 248]], sounds: [[50, 'theiaHit'], [134, 'theiaGather']], latDeg: 0, atKm: 0, sunwardKm: 0, highKm: 2000, rangeKm: 300, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }], floaters: [], loops: true, startS: -1, fades: [0, 237.9], still: [[-60, 248]], phases: [[0, t('다가오는 테이아')], [50, t('충돌')], [62, t('파편의 팔')], [90, t('불타는 원반')], [130, t('달의 탄생')], [164, t('멀어지는 달')], [208, t('오늘의 지구와 달')]], captions: [
    { at: 1, text: t('45억 년 전쯤, 태양계가 생긴 지 얼마 안 됐을 때입니다. 갓 생긴 지구 곁으로 화성만 한 천체가 다가옵니다. 테이아라고 부릅니다.') },
    { at: 14, text: t('달이 어떻게 생겼는지는 오랫동안 수수께끼였습니다. 아폴로가 가져온 달의 돌이 지구의 돌과 무척 닮아, 이 충돌설이 가장 널리 받아들여집니다.') },
    // Where Theia came from (the user, 2026-11-25: "테이아는 어디에서 온거야", "넣어"; checked
    // by Codex): Belbruno & Gott 2005 (at the Earth's L4 or L5), Hopp et al., Science 2025.
    { at: 27, text: t('테이아의 고향은 아직 모릅니다. 지구와 같은 궤도에서 자랐다는 설도 있고, 지구보다 태양에 가까운 곳에서 생겼다는 2025년 연구도 있습니다.') },
    { at: 39, text: t('테이아는 정면이 아니라 비스듬히, 45도쯤으로 부딪혔다고 봅니다.') },
    { at: 52, text: t('두 천체의 겉이 녹아 섞이고, 엄청난 양의 돌이 하늘로 뿜어져 나갑니다.') },
    { at: 64, text: t('뿜어진 돌은 긴 팔처럼 늘어나 지구를 감습니다. 테이아의 금속 핵은 지구 속으로 가라앉아, 원래 있던 지구의 핵과 합쳐졌습니다.') },
    { at: 75, text: t('튀어 나간 것은 주로 가벼운 겉돌이었습니다. 그래서 달은 금속이 적고, 핵이 아주 작습니다.') },
    { at: 85, text: t('지구의 겉과 속 많은 곳이 녹아, 수천 도의 마그마 바다가 됩니다.') },
    { at: 92, text: t('녹은 돌과 돌 증기가 지구를 도는 원반이 됩니다. 토성의 고리처럼 빛나지만 훨씬 뜨겁습니다.') },
    { at: 108, text: t('원반의 돌들이 서로 부딪히며 뭉치기 시작합니다.') },
    { at: 124, text: t('지구 반지름의 3배쯤보다 안쪽에서는, 지구가 돌무더기를 잡아늘려 크게 뭉치지 못합니다.') },
    { at: 136, text: t('그 바깥에서 돌들이 뭉쳐 달이 됩니다. 몇 시간 만이라는 계산도, 몇백 년이라는 계산도 있습니다.') },
    { at: 150, text: t('갓 생긴 달은 지구에서 2만 4천km, 지금 거리(38만km)의 15분의 1쯤 되는 곳을 돌았습니다. 하늘에서는 지금보다 15배쯤 크게 보였을 것입니다.') },
    { at: 166, text: t('그 뒤로 달은 조금씩 멀어졌습니다. 지금도 1년에 3.8cm씩 멀어지는 것을, 아폴로가 달에 놓고 온 거울에 레이저를 쏘아 잽니다.') },
    { at: 180, text: t('지구의 하루도 길어졌습니다. 그때 하루는 5시간쯤이었을 것으로 보며, 지금은 24시간입니다.') },
    { at: 194, text: t('지구는 식어 굳고, 바다가 생겼습니다.') },
    { at: 208, text: t('지금의 지구와 달입니다. 달은 38만km, 지구 반지름의 60배 떨어져 있습니다.') },
    // (The user, 2026-11-25: "지구의 위성은 다른 행성에 비해서 매우 크다는거 넣고"; checked by Codex:
    // the Moon 0.273 of the Earth across, the next of the eight planets' moons Triton, 0.055.)
    { at: 218, text: t('달의 지름은 지구의 4분의 1이 넘습니다. 여덟 행성의 위성 가운데, 자기 행성에 견주어 이만큼 큰 위성은 달뿐입니다.') },
    { at: 230, text: t('여기서 본 것은 가장 널리 받아들여지는 설을 따른 것이고, 아직 정해지지 않은 부분이 많습니다.') },
  ] }, name: t('달의 탄생, 테이아 충돌'), todo: t('45억 년 전쯤 화성만 한 천체가 지구에 부딪혀, 흩어진 돌이 모여 달이 되기까지를 봅니다.') },
  // How the Solar System turns, smallest first (the user, 2026-11-24: "태양계 공전에 대해서
  // 설명하는 우주멍 만들자", "작은 것부터 설명해봐", "만들어"): drawn by render/orbitStage.js,
  // whose ORBITS its seconds keep to; sizes, distances and paces not to scale (said at once).
  { id: 'orbits', body: 'earth', lapS: 430, rail: { orbits: true, stage: [[-2, 440]], latDeg: 0, atKm: 0, sunwardKm: 0, highKm: 2000, rangeKm: 300, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }], floaters: [], loops: true, startS: -1, fades: [0, 45.8, 303.8, 339.8, 429.9], still: [[-60, 440]], phases: [[-1, t('지구의 자전')], [46, t('지구의 공전')], [100, t('행성들의 공전')], [150, t('태양의 자전')], [162, t('해를 따라가는 행성들')], [220, t('이웃 별들')], [304, t('은하의 중심')], [340, t('은하를 도는 태양')]], captions: [
    { at: 1, text: t('태양계는 모두 돌고 있습니다. 작은 것부터 차례로 봅니다. 크기와 거리는 보기 쉽게 줄였고, 시간은 빠르게 돌렸습니다.') },
    { at: 15, text: t('지구는 스스로 하루에 한 바퀴 돕니다. 자전이라고 합니다. 북쪽에서 내려다보면 시계 반대 방향입니다.') },
    { at: 29, text: t('축은 23.4도 기울어 있습니다. 해를 향한 쪽은 낮, 반대쪽은 밤입니다.') },
    { at: 48, text: t('이제 해 둘레입니다. 지구는 1년에 한 바퀴 해를 돕니다.') },
    { at: 63, text: t('지구의 축은 1년 내내 같은 쪽을 가리킵니다. 북반구가 해 쪽으로 기울 때는 여름, 반대쪽으로 기울 때는 겨울입니다.') },
    { at: 82, text: t('해와 지구는 1억 5천만km 떨어져 있습니다. 지구는 초속 30km로 이 길을 갑니다.') },
    { at: 102, text: t('다른 행성들도 모두 같은 방향으로 해를 돕니다.') },
    { at: 116, text: t('해에 가까울수록 빠릅니다. 수성은 88일, 목성은 12년, 해왕성은 165년에 한 바퀴입니다.') },
    { at: 134, text: t('멀수록 해가 끄는 힘이 약해, 더 천천히 더 먼 길을 돕니다. 케플러가 이 규칙을 찾았습니다.') },
    { at: 152, text: t('해도 스스로 돕니다. 흑점을 따라가 보면 적도에서 25일쯤에 한 바퀴 돕니다.') },
    { at: 164, text: t('해는 가만히 있지 않습니다. 행성들과 함께 은하 속을 나아갑니다. 해가 끌고 가는 것이 아니라, 모두 함께 갑니다.') },
    { at: 177, text: t('그래서 은하에서 보면 행성들은 나선을 그리며 해를 따라갑니다. 행성들이 도는 판은 해가 나아가는 쪽과 60도쯤 기울어 있습니다.') },
    { at: 190, text: t('실제로는 해가 훨씬 빨라, 지구가 한 바퀴 도는 동안 지구 궤도의 48배를 나아갑니다. 나선이 보이게 해를 느리게 그렸습니다.') },
    { at: 200, text: t('실제 비율로 그리면 나선이 길게 늘어나, 옆에서 보면 얕은 물결처럼 보입니다. 다른 행성들의 거리는 줄여 그렸습니다.') },
    { at: 209, text: t('같은 길을 해가 가는 쪽에서 보면, 다시 스프링처럼 보입니다.') },
    { at: 221, text: t('해 곁의 별들도 모두 함께 은하를 달립니다. 가까운 별 몇을 찾아가 봅니다. 별 사이의 거리는 줄여 그렸습니다.') },
    { at: 235, text: t('알파 센타우리. 해 둘이 80년에 한 번 서로를 돌고, 멀리 작은 붉은 별 프록시마가 따라갑니다.') },
    { at: 241, text: t('가장 가까운 별이라 SF에 자주 나옵니다. 영화 「아바타」의 판도라도, 소설 「삼체」의 외계인이 사는 곳도 여기입니다.') },
    { at: 258, text: t('트라피스트-1. 작은 붉은 별을 지구만 한 행성 일곱이 돕니다. 모두 20일 안에 한 바퀴를 돕니다.') },
    { at: 275, text: t('케플러-16. 해 둘이 41일마다 서로를 돌고, 토성만 한 행성이 그 둘을 함께 돕니다. 해가 둘 지는 행성입니다.') },
    { at: 291, text: t('케플러-452. 해를 닮은 별을 지구보다 조금 큰 행성이 385일에 한 바퀴 돕니다. 다만 정말 행성인지는 아직 논쟁 중입니다.') },
    { at: 299, text: t('곁의 별들도 함께 달리지만, 조금씩 빠르기가 달라 언젠가 흩어집니다.') },
    { at: 305, text: t('은하 한가운데에는 블랙홀 궁수자리 A*가 있습니다. 수천억 개의 별이 이 중심을 돕니다.') },
    { at: 317, text: t('별들을 붙잡는 것은 블랙홀이 아니라, 은하의 모든 별과 기체와 보이지 않는 암흑물질의 무게입니다. 블랙홀이 사라져도 해의 길은 거의 바뀌지 않습니다.') },
    { at: 329, text: t('블랙홀의 힘이 은하를 이기는 곳은 중심에서 10광년 안쪽뿐입니다. 그 안의 별들은 블랙홀을 돕니다. 그중 S2는 16년에 한 바퀴 돕니다.') },
    { at: 342, text: t('해도 태양계의 모든 것과 함께 이 중심을 돕니다. 초속 230km로 달려도, 한 바퀴에 2억 3천만 년이 걸립니다.') },
    { at: 355, text: t('나선팔도 함께 돕니다. 다만 별이 잠시 몰린 자리라, 별들은 팔을 드나들며 저마다 제 빠르기로 돕니다. 팔이 도는 실제 빠르기는 연구마다 다릅니다.') },
    { at: 370, text: t('태양은 은하를 돌며 원반의 위아래를 오갑니다. 한 바퀴에 두세 번, 약 300광년까지 멀어집니다. 잘 보이게 열 배 넘게 키워 그렸습니다.') },
    { at: 382, text: t('분홍빛은 새 별이 태어나는 구름입니다. 해도 46억 년 전 이런 구름에서 태어났습니다.') },
    { at: 396, text: t('6600만 년 전 소행성이 떨어져 새를 뺀 공룡이 사라졌을 때, 해는 이 길의 3분의 2쯤을 와 있었습니다.') },
    { at: 413, text: t('해가 한 바퀴를 돌아 다시 이 자리에 왔습니다. 지난번 이 자리에서 지구에는 첫 공룡이 나타나고 있었습니다.') },
    { at: 421, text: t('오늘 밤에도 우리는 지구와 함께 돌고, 해와 함께 초속 230km로 은하를 달립니다. 느끼지 못할 뿐입니다.') },
  ] }, name: t('태양계는 어떻게 도는가'), todo: t('지구의 자전에서 은하를 도는 태양까지, 작은 움직임부터 차례로 봅니다.') },
  { id: 'moonFace', body: 'earth', lapS: 264, rail: { voice: ['ko', 'en', 'ja', 'zh'], moonFace: true, stage: [[-2, 274]], latDeg: 0, atKm: 0, sunwardKm: 0, highKm: 2000, rangeKm: 300, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }], floaters: [], loops: true, startS: -1, fades: [0, 263.9], still: [[-60, 274]], phases: [[-1, t('달의 공전')], [34, t('달의 자전')], [72, t('왜 한쪽 얼굴일까')], [132, t('지구의 밀물과 썰물')], [170, t('명왕성과 카론')], [204, t('에리스와 디스노미아')], [228, t('파트로클로스와 메노이티오스')]], captions: [
    { at: 1, text: t('달은 지구 둘레를 27.3일에 한 바퀴 돕니다. 공전이라고 합니다. 크기와 거리는 보기 쉽게 줄였고, 시간은 빠르게 돌렸습니다.') },
    { at: 12, text: t('달은 평균 38만km 떨어져 있습니다. 지구 지름의 약 30배입니다.') },
    { at: 23, text: t('도는 방향은 지구의 자전과 같습니다. 지구 북극 위에서 내려다보면 둘 다 시계 반대 방향입니다.') },
    { at: 36, text: t('달도 스스로 돕니다. 달에 빨간 점을 찍어 봅니다.') },
    { at: 48, text: t('바깥쪽은 스스로 돌지 않는 달을 그려 본 것입니다. 빨간 점이 늘 같은 쪽을 가리켜, 지구에서는 앞면과 뒷면이 번갈아 보일 것입니다.') },
    { at: 60, text: t('달은 한 바퀴 공전하는 동안 꼭 한 바퀴 자전합니다. 둘 다 27.3일입니다. 그래서 빨간 점이 지구를 향하고, 우리는 거의 늘 달의 같은 얼굴만 봅니다.') },
    { at: 74, text: t('왜 꼭 같을까요? 갓 생긴 달은 지금보다 훨씬 빨리 스스로 돌았던 것으로 봅니다.') },
    { at: 84, text: t('지구가 당기는 힘은 가까운 쪽에 더 셉니다. 그래서 달은 지구 쪽과 그 반대쪽으로 조금 늘어납니다. 잘 보이게 아주 크게 부풀려 그렸습니다.') },
    { at: 96, text: t('달이 빨리 돌면, 몸이 바로 따라 변하지 못해 볼록한 곳이 앞으로 밀려 나갑니다. 지구는 그곳을 되당겨 달의 자전에 브레이크를 겁니다.') },
    { at: 109, text: t('자전이 점점 느려지다 공전과 같아지면, 볼록한 곳이 늘 지구를 향해 브레이크가 거의 걸리지 않습니다. 이것을 조석 고정이라고 합니다.') },
    { at: 121, text: t('달은 생긴 뒤 이른 시기에 이렇게 묶인 것으로 봅니다. 목성과 토성의 큰 위성들도 대부분 제 행성에 한쪽 얼굴만 보입니다.') },
    { at: 133, text: t('같은 일이 지구에도 일어납니다. 달이 지구의 바다를 당겨 부풀립니다. 밀물과 썰물입니다. 크게 부풀렸고, 실제 바닷물의 움직임은 이보다 복잡합니다.') },
    { at: 146, text: t('지구가 달의 공전보다 훨씬 빨리 돌아, 바다의 볼록한 곳이 앞서 갑니다. 달이 그것을 되당겨, 하루가 100년에 약 2밀리초씩 길어집니다.') },
    { at: 158, text: t('앞서 가는 볼록한 곳은 달을 공전 방향으로 조금씩 끕니다. 앞으로 떠밀린 달은 더 큰 궤도로 올라가, 지금 해마다 약 3.8cm씩 멀어집니다.') },
    { at: 171, text: t('제 짝에게 늘 한쪽 얼굴만 보이는 천체는 달뿐일까요?') },
    { at: 177, text: t('왜소행성 명왕성과 카론입니다. 카론의 지름은 명왕성의 절반쯤으로, 짝에 견주어 아주 큰 위성입니다.') },
    { at: 188, text: t('둘은 6.4일마다 서로를 돌고, 둘 다 같은 6.4일에 한 바퀴 자전합니다. 서로 한쪽 얼굴만 마주 보는, 서로 묶인 짝입니다.') },
    { at: 206, text: t('왜소행성 에리스와 위성 디스노미아입니다. 에리스는 명왕성과 크기가 비슷하고, 평균적으로 해에서 더 멀리 있습니다.') },
    { at: 216, text: t('에리스의 자전과 디스노미아의 공전은 모두 약 15.8일입니다. 에리스도 위성에 늘 같은 면을 보인다는 연구가 2023년에 실렸습니다.') },
    { at: 230, text: t('목성과 같은 궤도에서 해를 도는 소행성 파트로클로스와 메노이티오스입니다. 둘 다 지름 100km 남짓인, 크기가 비슷한 짝입니다.') },
    { at: 241, text: t('둘은 4.3일마다 서로를 돌며, 서로 한쪽 얼굴만 마주 봅니다. 2033년 NASA의 탐사선 루시가 찾아갈 예정입니다.') },
    { at: 251, text: t('지구의 자전도 조금씩 느려져, 아주 먼 훗날에는 지구도 달에 한쪽 얼굴만 보이게 될 수 있습니다. 하지만 그보다 먼저, 약 50억 년 뒤 해가 적색 거성으로 부풀어 오릅니다.') },
  ] }, name: t('달은 왜 한쪽 얼굴만 보일까'), todo: t('달이 한 바퀴 공전하는 동안 꼭 한 바퀴 자전하는 까닭을, 갓 생긴 달부터 서로 묶인 짝들까지 봅니다.') },
  // Why the near side has smooth dark seas and the far side is all craters (the user,
  // 2026-11-26: "달의 뒷면은 왜 곰보이고, 앞면은 매끈한다에 대해서 우주멍 만들어보자", "만들어봐"):
  // drawn by render/moonSidesStage.js, whose SIDES its seconds keep to. Checked by Codex
  // (assets/codex/moonsides/answer1.md): Burns 2013 (seas 31% / 1%), Gallant 2009, Wieczorek
  // 2013 and NASA (crust some 40 / up to 60 km), Lawrence 1998, Roy 2014, Jones 2022,
  // Jutzi & Asphaug 2011, Zhang 2024 (Chang'e 6 basalt 2.807 Ga); the four ideas are said
  // to be ideas. (The user, 2026-11-26: "지구의 중력 방패가 될 수도 있지않나?": Le Feuvre &
  // Wieczorek 2011, a few % when the Moon was within 30 Earth radii, 0.1% today; "하나 <- 이건
  // 너무 억지 아니냐. 멀다며": Roy 2014 has the Moon some 3 Earth radii off, the Earth
  // 20 times wider in its sky; He & Li 2025, Nature Geoscience, the far side's mantle some
  // 100 degrees cooler; answer2.md, answer3.md; "셋 다 넣고 개발해".)
  // ("아직 정설은 없는거지?", "그럼 그런 얘기도 마무리에 넣어": no settled answer; heat-making
  // elements a strong explanation, crust thickness and mantle make-up studied too, where
  // the elements came from argued: Moriarty 2021, Elardo 2020, Li 2026; answer4.md.)
  { id: 'moonSides', body: 'earth', lapS: 238, rail: { moonSides: true, stage: [[-2, 248]], latDeg: 0, atKm: 0, sunwardKm: 0, highKm: 2000, rangeKm: 300, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }], floaters: [], loops: true, startS: -1, fades: [0, 237.9], still: [[-60, 248]], phases: [[-1, t('앞면의 바다')], [22, t('곰보 뒷면')], [44, t('지구가 막아 줬을까')], [60, t('바다가 생기다')], [104, t('반으로 자른 달')], [134, t('설 하나: 뜨거운 지구')], [150, t('설 둘: 열을 내는 원소')], [166, t('설 셋: 큰 충돌')], [182, t('설 넷: 둘째 달')], [198, t('뒷면의 돌')], [218, t('다시 앞면')]], captions: [
    { at: 1, text: t('지구에서 보는 달의 앞면입니다. 검은 얼룩이 넓게 퍼져 있어, 옛사람들은 여기서 방아 찧는 토끼를 보았습니다.') },
    { at: 11, text: t('검은 곳을 바다라고 부르지만 물은 없습니다. 굳은 용암이 덮은 평평한 땅이라 매끈하고, 크레이터가 적습니다.') },
    { at: 23, text: t('달을 돌려, 지구에서는 보이지 않는 뒷면으로 갑니다. 1959년 소련의 루나 3호가 처음 사진을 찍었습니다.') },
    { at: 33, text: t('뒷면에는 바다가 거의 없습니다. 바다가 앞면은 3분의 1쯤 덮지만, 뒷면은 1%쯤뿐입니다. 크레이터 위에 크레이터가 겹친 고지대입니다.') },
    { at: 45, text: t('지구가 앞면을 가려 줘서 운석을 덜 맞았을까요? 아닙니다. 달에서 보면 지구는 하늘의 아주 작은 부분만 가립니다.') },
    { at: 53, text: t('지구의 중력도 방패가 되지 못했습니다. 달이 가까웠던 옛날에도 몇 %를 막는 데 그쳤습니다. 크기와 거리는 보기 쉽게 줄였습니다.') },
    { at: 61, text: t('앞면도 처음에는 뒷면처럼 크레이터투성이였습니다. 큰 소행성이 부딪혀, 지름 수백 km의 커다란 구덩이도 파였습니다.') },
    { at: 72, text: t('약 39억 년 전부터 30억 년 전 무렵까지, 달 속에서 녹은 돌이 갈라진 틈을 따라 올라와 낮은 곳부터 채웠습니다.') },
    { at: 86, text: t('용암은 옛 크레이터를 덮어 묻고, 식어서 검은 현무암이 되었습니다. 그래서 바다는 어둡고 매끈합니다.') },
    { at: 96, text: t('바다에도 그 뒤에 떨어진 운석의 크레이터가 있지만 훨씬 적습니다. 바다가 고지대보다 젊다는 표시입니다.') },
    { at: 105, text: t('왜 앞면에만 용암이 나왔을까요? 달을 반으로 잘라 봅니다.') },
    { at: 113, text: t('2012년 쌍둥이 탐사선 그레일이 달의 중력을 재어 겉껍질의 두께를 알아냈습니다. 앞면 쪽은 40km쯤, 뒷면은 두꺼운 곳이 60km쯤입니다. 잘 보이게 두껍게 그렸습니다.') },
    { at: 124, text: t('껍질이 얇은 앞면에서는 녹은 돌이 뚫고 나왔고, 두꺼운 뒷면에서는 대부분 막혔습니다.') },
    { at: 135, text: t('그럼 겉껍질의 두께는 왜 다를까요? 아직 정답은 없고, 몇 가지 설이 있습니다.') },
    { at: 141, text: t('하나. 갓 생긴 달은 지금보다 훨씬 가까웠고, 지구는 녹은 돌로 뜨겁게 빛났습니다. 그 열에 앞면이 데워져, 더 차가운 뒷면에 껍질의 재료가 먼저 굳어 쌓였다는 설입니다.') },
    { at: 151, text: t('둘. 1998년 루나 프로스펙터가 재어 보니, 토륨처럼 열을 내는 방사성 원소가 앞면 서쪽의 큰 바다 둘레에 몰려 있었습니다.') },
    { at: 159, text: t('이 원소들이 내는 열이 앞면 속을 오래 녹여, 용암이 많이 나왔다는 설입니다.') },
    { at: 167, text: t('셋. 뒷면 남쪽에는 지름 2,500km에 이르는, 태양계에서 손꼽히게 큰 충돌 구덩이가 있습니다. 남극-에이킨 분지입니다.') },
    { at: 175, text: t('이 충돌이 달 속을 휘저어, 열을 내는 원소를 앞면 쪽으로 밀어냈다는 설입니다.') },
    { at: 183, text: t('넷. 달 곁에 작은 달이 하나 더 있다가, 천천히 뒷면에 부딪혀 두꺼운 고지대를 덮었다는 설도 있습니다.') },
    { at: 199, text: t('2024년 중국의 창어 6호가 뒷면의 돌을 처음 지구로 가져왔습니다. 남극-에이킨 분지 안에서 떠 왔습니다.') },
    { at: 205, text: t('그 돌을 보니 뒷면에도 28억 년 전쯤 용암이 흘렀습니다. 다만 앞면보다 훨씬 적었습니다.') },
    { at: 211, text: t('2025년에는 그 돌로, 옛날 뒷면의 맨틀이 앞면보다 100도쯤 차가웠다는 연구도 나왔습니다. 뒷면의 돌이 더 모이면 답이 가까워질 것입니다.') },
    { at: 219, text: t('아직 정설은 없습니다. 열을 내는 원소가 앞면에 몰린 것이 유력한 설명이지만, 껍질의 두께와 맨틀의 성분도 함께 연구되고, 그 원소가 왜 앞면에 몰렸는지도 논쟁 중입니다.') },
    { at: 228, text: t('앞면이 늘 지구를 향하는 까닭은 「달은 왜 한쪽 얼굴만 보일까」에서 볼 수 있습니다.') },
  ] }, name: t('달의 뒷면은 왜 곰보일까'), todo: t('매끈한 검은 바다가 달의 앞면에만 있는 까닭을, 달을 반으로 잘라 보며 찾아봅니다.') },
  { id: 'starship', body: 'earth', lapS: 440, rail: { starship: true, stage: [[-20, 30], [372, 460]], hotStage: { from: 158, to: 178, nearKm: 11, farKm: 400, sizeKm: 30, sideKm: 6, aimKm: 9 }, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }, { at: 30, cabin: 'assets/tours/booster-up.webp' }, { at: 184, cabin: 'assets/tours/booster-down.webp' }, { at: 372, cabin: 'assets/tours/none.webp', captionY: 76 }], stageShakes: [{ from: 0.5, peak: 2.5, to: 9, power: 1 }, { from: 407.8, peak: 408.2, to: 410.5, power: 0.6 }], floaters: [], loops: true, fades: [30, 372, 439.2], startS: -44, burns: [{ from: -3, to: 20, power: 0.9, buzz: true }, { from: 20, to: 158, power: 0.55 }, { from: 188, to: 226, power: 0.6, buzz: true }, { from: 381, to: 407, power: 0.75, buzz: true }], shakes: [{ from: -3, peak: 2, to: 30 }, { from: 158, peak: 159, to: 163 }, { from: 406.8, peak: 407, to: 409 }], still: [[-60, 30], [372, 460]], photos: [{ from: -44, to: -32, src: 'assets/tours/starbase-sat.webp', pan: [60, 76], zoom: [1, 2.4], origin: '74% 90%', credit: 'SpaceFrom.Space, CC BY 2.0' }, { from: -32, to: -20, src: 'assets/tours/starship-pad.webp', pan: [57, 57], zoom: [1.1, 1.4], origin: '50% 12%', credit: 'Steve Jurvetson, CC BY 2.0' }], sounds: [[1.3, 'liftoff'], [158, 'staging'], [408.1, 'capture']], countdowns: [{ at: 0, from: 20, beeps: 10, said: t('발사까지'), go: t('이륙!') }], phases: [[-44, t('발사대')], [0, t('발사')], [158, t('단 분리')], [184, t('돌아오는 길')], [381, t('착륙')], [407, t('붙잡음')]], captions: [{ at: -43, text: t('2024년 10월 13일 아침, 미국 텍사스 남쪽 바닷가의 발사장. 높이 121m, 지금까지 만든 가장 큰 로켓입니다.') }, { at: -31, text: t('전날 밤의 발사대. 불 밝힌 탑 옆에서 로켓이 기다립니다.') }, { at: -19, text: t('아래는 1단 슈퍼 헤비, 위는 2단 스타십. 둘 다 다시 쓰려고 만든 로켓입니다.') }, { at: 2, text: t('1단 바닥의 엔진 33개에 불이 붙습니다.') }, { at: 34, text: t('1단 옆에 붙은 카메라로 봅니다. 하늘이 점점 검어집니다.') }, { at: 70, text: t('가장 큰 공기의 힘을 견디고 지나갑니다. 곧 소리보다 몇 배 빨라집니다.') }, { at: 120, text: t('2분 반 동안 연료 3,400톤을 태웠습니다.') }, { at: 158, text: t('2단이 1단에 붙은 채로 엔진을 켜고 떨어져 나갑니다. 핫 스테이징이라고 합니다.') }, { at: 186, text: t('1단은 몸을 돌려 엔진을 다시 켜고, 떠나온 발사장으로 되돌아갑니다.') }, { at: 232, text: t('고도 약 95km. 이제 떨어지며 격자 날개로 방향을 잡습니다.') }, { at: 300, text: t('1단에서 떨어져 나간 2단은 우주로 올라가 지구를 3분의 2 바퀴쯤 돌고, 1시간 남짓 뒤 인도양에 내렸습니다.') }, { at: 374, text: t('다시 발사장. 1단이 하늘에서 내려옵니다.') }, { at: 383, text: t('엔진 13개를 켜고 속도를 줄입니다.') }, { at: 394, text: t('마지막엔 엔진 세 개만 켜고 탑 옆으로 내려옵니다.') }, { at: 407, text: t('탑의 두 팔이 70m 높이의 1단을 공중에서 붙잡았습니다. 처음 해낸 일이었습니다.') }, { at: 420, text: t('발사부터 7분 만의 일이었습니다.') }], track: { alt: [[30, 2.5], [60, 12], [100, 35], [158, 65], [200, 92], [215, 95], [260, 82], [320, 40], [372, 3]], down: [[30, 0.3], [60, 3], [100, 20], [158, 62], [200, 86], [215, 88], [260, 70], [320, 26], [372, 1]], tilt: [[30, 0], [60, 14], [100, 34], [158, 52], [176, 60], [190, -60], [226, -55], [300, -15], [372, 0]] } }, name: t('스타십, 하늘에서 붙잡은 로켓'), todo: t('2024년 거대한 로켓이 날아올랐다 돌아와, 발사탑의 두 팔에 붙잡히기까지를 땅과 로켓에서 봅니다.') },
  // A walk on Mars along Perseverance's tracks, landing site to Van Zyl Overlook (the user,
  // 2026-11-23: "화성 산책하는 것 같은 3D 모션", "가+나로 만들어"): drawn on the ground
  // (render/marsStage.js, whose MARS_WALK its seconds keep to); before it, a moment over Mars.
  { id: 'marsWalk', body: 'mars', lapS: 835, rail: { marsWalk: true, stage: [[0, 751.2]], orbitFrom: 751, latDeg: 18, atKm: 0, sunwardKm: 0, highKm: 900, rangeKm: 300, cabin: 'assets/tours/none.webp', cabins: [{ at: -100, cabin: 'assets/tours/none.webp', captionY: 76 }], floaters: [], loops: true, startS: -7, fades: [0, 750.5, 834.9], still: [[-60, 751.2]], phases: [[-7, t('화성')], [0, t('착륙지')], [40, t('바퀴 자국을 따라')], [393, t('밴 질 전망대')], [412, t('첫 비행')], [475, t('먼지 회오리')], [503, t('포보스 일식')], [557, t('해 질 녘')], [585, t('빛나는 구름')], [611, t('저녁별 지구')], [655, t('포보스')], [703, t('초록 오로라')], [751, t('궤도에서 본 오로라')], [806, t('화성의 해돋이')]], captions: [
    { at: -6, text: t('화성의 예제로 분화구로 내려갑니다.') },
    { at: 1, text: t('2021년 2월 18일, 퍼서비어런스가 이곳에 내렸습니다. 사흘째 날 돛대 위 카메라로 찍은 360도 사진입니다.') },
    { at: 20, text: t('아래는 탐사선의 갑판입니다. 멀리 보이는 산들은 너비 45km인 분화구의 가장자리입니다.') },
    { at: 42, text: t('이제 탐사선이 실제로 지나간 길을 따라 걷습니다. 땅은 궤도선이 25cm까지 찍은 사진과 높이로 만들었습니다.') },
    { at: 60, text: t('솔 14. 내린 지 14일째, 처음으로 바퀴를 굴려 6m를 갔다 왔습니다. 화성의 하루를 솔이라고 하며, 지구의 하루보다 40분쯤 깁니다.') },
    { at: 96, text: t('솔 15. 하루에 몇십 m씩, 바퀴와 카메라를 시험하며 나아갑니다.') },
    { at: 216, text: t('솔 31. 헬리콥터를 내려놓을 평평한 땅을 찾아 이리저리 다닙니다.') },
    { at: 280, text: t('솔 43. 여기서 배 밑에 달고 온 헬리콥터 인제뉴어티를 땅에 내려놓았습니다. 나중에 이곳은 "라이트 형제 비행장"이라는 이름을 얻었습니다.') },
    { at: 332, text: t('헬리콥터에서 물러나, 비행을 지켜볼 자리로 갑니다.') },
    { at: 392.5, text: t('솔 52, 밴 질 전망대. 헬리콥터에서 65m 떨어진 이곳에서 13일을 머물렀습니다.') },
    { at: 398, text: t('헬리콥터 쪽으로 돌아봅니다. 탐사선의 돛대 카메라처럼 크게 당겨 봅니다.') },
    { at: 412.5, text: t('2021년 4월 19일, 솔 58. 날개 두 쌍이 1분에 2,400번씩 돌기 시작합니다.') },
    { at: 423, text: t('3m 높이로 떠올라 제자리에서 96도 돕니다. 화성의 공기는 지구의 1%뿐이라, 날기가 무척 어렵습니다.') },
    { at: 455.5, text: t('39초 만에 내려앉았습니다. 다른 행성에서 처음 해낸 동력 비행이었습니다.') },
    { at: 476, text: t('몇 시간 뒤, 해가 서쪽으로 기웁니다.') },
    { at: 481, text: t('들판 멀리 먼지 회오리가 일어납니다. 예제로 분화구에서 퍼서비어런스가 여러 번 찍은, 높이 수백 m까지 솟는 회오리입니다.') },
    { at: 493, text: t('햇볕에 데워진 땅에서 더운 공기가 돌며 솟아올라 먼지를 감아올립니다.') },
    { at: 504, text: t('해를 크게 당겨 봅니다.') },
    { at: 511, text: t('2022년 4월 2일, 퍼서비어런스는 화성의 달 포보스가 해 앞을 지나는 모습을 찍었습니다.') },
    { at: 526, text: t('포보스는 지름 22km쯤의 울퉁불퉁한 감자 모양이라 해를 다 가리지 못하고, 그림자도 감자 모양입니다.') },
    { at: 540, text: t('포보스는 화성을 하루에 세 바퀴 넘게 돕니다. 그래서 40초 남짓 만에 해 앞을 지나갑니다.') },
    { at: 558, text: t('해가 집니다. 화성의 노을은 파랗습니다. 고운 먼지가 파란빛을 해 쪽으로 더 많이 보내 해 둘레만 파랗게 물듭니다.') },
    { at: 573, text: t('해가 지구에서 볼 때의 3분의 2 크기로 작습니다. 화성은 태양에서 1.5배 멀리 있습니다.') },
    { at: 587, text: t('해가 진 뒤, 높은 구름에 아직 햇빛이 닿아 진주빛으로 빛납니다. 2021년 큐리오시티가 찍은 빛나는 구름입니다.') },
    { at: 600, text: t('물이나 이산화탄소가 언 얼음 알갱이의 구름으로, 60km보다 높이 뜬 것도 있습니다.') },
    { at: 613, text: t('하늘이 어두워지자 서쪽 낮은 곳에 파란 별 하나가 나타납니다. 지구입니다.') },
    { at: 627, text: t('곁의 작은 점은 달입니다. 2014년 큐리오시티가 화성에서 지구와 달을 함께 찍었습니다.') },
    { at: 655, text: t('밤이 깊어지면 화성의 달 포보스가 서쪽에서 떠오릅니다. 화성이 한 바퀴 도는 동안 세 바퀴 넘게 돌아, 해와 반대로 서쪽에서 떠서 동쪽으로 집니다.') },
    { at: 671, text: t('당겨 보면 해 쪽만 가늘게 빛나는 감자 모양입니다. 지구에서 본 달의 3분의 1쯤 크기로 보입니다.') },
    { at: 687, text: t('포보스는 화성에 조금씩 다가가고 있어, 수천만 년 뒤에는 부서지거나 화성에 떨어질 것으로 봅니다.') },
    { at: 705, text: t('2024년 3월, 큰 태양 폭풍이 닿은 밤, 퍼서비어런스가 화성 땅에서 처음으로 오로라를 찍었습니다.') },
    { at: 719, text: t('지구의 커튼 같은 오로라와 달리 하늘 전체가 엷은 초록빛으로 물듭니다. 화성에는 지구 같은 큰 자기장이 없어, 태양에서 온 알갱이가 대기 곳곳에 부딪힙니다.') },
    { at: 737, text: t('이제 하늘로 올라가, 이 오로라를 위에서 내려다봅니다.') },
    { at: 753, text: t('화성 위로 올라왔습니다. 밤쪽을 지나 남쪽으로 갑니다.') },
    { at: 765, text: t('남반구의 땅속 바위에는 옛 자기가 군데군데 남아 있어, 그 위로 오로라가 띠처럼 맺힙니다.') },
    { at: 779, text: t('2021년부터 아랍에미리트의 화성 탐사선 아말이 궤도에서 이 오로라를 찍었습니다. 사진은 자외선이라, 여기서는 퍼서비어런스가 본 초록빛으로 그렸습니다.') },
    { at: 793, text: t('큰 태양 폭풍이 닿으면 밤쪽 전체가 엷게 빛납니다. 궤도에서는 메이븐이 보았고, 땅에서 퍼서비어런스가 본 것이 이 빛입니다.') },
    { at: 807, text: t('화성의 가장자리 너머로 해가 떠오릅니다.') },
    { at: 820, text: t('퍼서비어런스는 그 뒤로도 달려, 솔 2,000을 넘기며 45km 넘게 갔습니다.') },
  ] }, name: t('화성 산책, 퍼서비어런스의 바퀴 자국'), todo: t('2021년 퍼서비어런스가 화성에 내린 곳에서 바퀴 자국을 따라 걸으며, 헬리콥터 인저뉴어티의 첫 비행과 화성의 노을을 봅니다.') },
  { id: 'orbitSunrise', body: 'earth', lapS: 360, rail: { orbit: true, highKm: 400, lookDeg: 12, startS: 22 }, name: t('궤도 일출'), todo: t('우주정거장 높이에서 밤의 지구를 지나며, 지평선이 붉게 물들고 얇은 대기층이 빛나다 태양이 떠오르는 것을 봅니다.') },
  { id: 'milkyWay', body: 'earth', lapS: 180, radii: 8, rollDeg: 35, sky: 'milkyWay', name: t('은하수 일주'), todo: t('은하수가 놓인 평면을 따라 지구 둘레를 비행합니다. 은하 중심에서 출발합니다.') },
  { id: 'orion', body: 'earth', lapS: 150, radii: 6, sky: 'm42', overDeg: 16, name: t('오리온 대성운'), todo: t('지구를 돌면서 겨울 밤하늘의 붉은 성운을 봅니다.') },
  { id: 'andromeda', body: 'moon', lapS: 150, radii: 7, sky: 'm31', overDeg: 16, name: t('안드로메다은하'), todo: t('달을 돌면서 안드로메다은하와 곁의 삼각형자리 은하를 봅니다.') },
  { id: 'pleiades', body: 'earth', lapS: 150, radii: 6, sky: 'm45', overDeg: 16, name: t('플레이아데스'), todo: t('지구를 돌면서 일곱 자매 별무리를 봅니다.') },
  // In the place of the low round of the Moon (the user, 2026-11-24: "아폴로 8호가 달 저공비행
  // 대신이야").
  // Apollo 8's round of the Moon, seen out of the command module's window (lunarAt); a
  // lap in 30 minutes, four times the true pace (the user, 2026-11-24, of the ground
  // going by at eight: "달 표면 움직이는 속도를 1/2로"); near a half moon (main.js).
  { id: 'apollo8', body: 'moon', lapS: 1800, rail: { lunar: true, sunEarthDeg: 105, cabin: 'assets/tours/apollo-cabin.webp', highKm: 110, overHorizonDeg: 12, riseS: 70, hold: [84, 150], startS: 0, pace: 1, loops: true, floaters: [], fades: [1799.9], phases: [[0, t('달의 뒷면')], [70, t('지구돋이')], [170, t('달의 앞면')], [1070, t('다시 뒷면으로')]], captions: [
    { at: 1, text: t('1968년 12월 24일, 아폴로 8호. 사람이 처음으로 달을 돌고 있습니다. 달 위 110km, 한 바퀴에 2시간입니다.') },
    { at: 16, text: t('창밖은 달의 뒷면입니다. 지구에서는 한 번도 보이지 않는 쪽입니다.') },
    { at: 32, text: t('뒷면을 지나는 동안은 달이 가로막아 지구와 무전이 끊깁니다.') },
    { at: 56, text: t('곧 앞쪽 지평선 위로 지구가 떠오릅니다.') },
    { at: 76, text: t('"저기 좀 봐! 지구가 떠오르고 있어. 정말 예쁘다." 사령관 프랭크 보먼') },
    { at: 92, text: t('윌리엄 앤더스가 서둘러 컬러 필름을 끼워 찍은 사진이 "지구돋이"입니다.') },
    { at: 110, text: t('실제로 창밖의 지구는 엄지손톱만 했습니다. 여기서는 잘 보이게 크게 그렸습니다.') },
    { at: 128, text: t('세 사람은 달을 보러 와서, 지구를 발견했다고 말했습니다.') },
    { at: 180, text: t('달에는 공기가 없어, 해가 낮게 드는 곳에서는 크레이터 그림자가 길고 검게 떨어집니다.') },
    { at: 260, text: t('짐 러벨은 달을 "넓고 쓸쓸하고 험한 곳"이라 했습니다. 그래서 지구가 우주의 오아시스로 보였다고 했습니다.') },
    { at: 360, text: t('그날 밤 세 사람은 창세기의 첫 구절을 읽어 지구로 보냈습니다.') },
    { at: 460, text: t('아폴로 8호는 달을 열 바퀴 돌고, 크리스마스에 지구로 돌아오는 길에 올랐습니다.') },
    { at: 700, text: t('지금 보는 것은 2시간 걸리는 한 바퀴를 4배 빠르게 보인 것입니다.') },
    { at: 1076, text: t('다시 달의 뒷면으로 들어갑니다. 지구는 등 뒤로 저뭅니다.') },
  ] }, name: t('아폴로 8호 창밖의 달'), todo: t('처음으로 사람이 달을 돈 아폴로 8호의 창으로, 달 뒷면과 지구돋이를 봅니다.') },
  { id: 'jupiterMoons', body: 'jupiter', lapS: 180, radii: 5, name: t('목성과 위성들'), todo: t('목성을 돌면서 구름 띠와 안쪽 위성들을 봅니다.'),
    sun: { from: [0.7, 0.1, 0.7], toward: [-0.7, 0.1, 0.7] } },
  { id: 'saturnRings', body: 'saturn', lapS: 180, radii: 4.6, name: t('토성의 고리'), todo: t('고리 위로 비스듬히 토성 둘레를 비행합니다. 고리에 드리운 그림자가 보입니다.'),
    rings: { overDeg: 16, roundDeg: 30 } },
  { id: 'redMars', body: 'mars', lapS: 120, radii: 4, name: t('붉은 화성'), todo: t('화성의 두 극 위로 돌면서 낮과 밤의 경계를 지나갑니다.'),
    sun: { from: [0.8, 0.1, 0.6], toward: [-0.1, 0.95, 0.2] } },
  { id: 'venusPhases', body: 'venus', lapS: 120, radii: 5.5, name: t('금성의 위상'), todo: t('금성을 돌면서 둥근 모습이 초승달처럼 변하는 것을 봅니다.'),
    sun: { from: [1, 0.05, 0], toward: [0, 0, 1] } },
  { id: 'coronaDrift', body: 'sun', lapS: 180, radii: 4.5, rollDeg: 35, sky: 'milkyWay', name: t('태양 코로나 유영'), todo: t('태양 가까이에서 코로나를 따라 비행합니다. 뒤로 은하수가 흐릅니다.') },
  { id: 'magellan', body: 'moon', lapS: 150, radii: 7, sky: 'lmc', overDeg: 14, name: t('마젤란은하'), todo: t('달을 돌면서 남쪽 하늘의 큰 은하와 작은 은하를 봅니다.') },
];

export const courseById = (id) => COURSES.find((course) => course.id === id) ?? null;

const rad = (deg) => (deg * Math.PI) / 180;
const dot = (a, b) => a.reduce((sum, n, i) => sum + n * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (v) => {
  const length = Math.hypot(...v) || 1;
  return v.map((n) => n / length);
};
const mix = (a, u, b, v) => u.map((n, i) => a * n + b * v[i]);
const squareTo = (v, n) => unit(mix(1, v, -dot(v, n), n));

// How far she looks under the body, so that it stands over her head and not behind her.
const DIP = 0.14;

// The direction of a thing of the fixed sky.
function skyWay(id) {
  const thing = [...GALAXIES, ...NEBULAE].find((x) => x.id === id);
  return fromEquatorial(thing.raH, thing.decDeg);
}

// The round: `from` the body's centre to where it starts, and `along` the way it goes.
function roundOf(course, frame, ringNormal) {
  if (course.sun) {
    const from = unit(outOf(frame, course.sun.from));
    return { from, along: squareTo(outOf(frame, course.sun.toward), from) };
  }
  if (course.rings) {
    const { overDeg, roundDeg } = course.rings;
    const sunSide = squareTo(frame.toSun, ringNormal);
    const flat = mix(Math.cos(rad(roundDeg)), sunSide, Math.sin(rad(roundDeg)), cross(ringNormal, sunSide));
    return { from: mix(Math.cos(rad(overDeg)), flat, Math.sin(rad(overDeg)), ringNormal), along: unit(cross(ringNormal, flat)) };
  }
  const galaxy = course.sky === 'milkyWay';
  const thing = galaxy ? GALACTIC_CENTRE : skyWay(course.sky);
  const flat = squareTo(galaxy ? GALACTIC_POLE : [0, 1, 0], thing);
  const over = rad(course.overDeg ?? 0);
  const looking = mix(Math.cos(over), thing, -Math.sin(over), flat);
  const normal = mix(Math.sin(over), thing, Math.cos(over), flat);
  const from = looking.map((n) => -n);
  return { from, along: cross(normal, from) };
}

// Where a rail has her after `seconds`, looking at the point it goes round.
export function railAt(course, body, sun, seconds, moon = null, hubble = null, earth = null) {
  if (course.rail.mmu && seconds < 0) return mmuAt(course, body, hubble, seconds, sun);
  if (course.rail.shuttle) return shuttleAt(course, body, hubble, seconds, sun);
  if (course.rail.starship) return starshipAt(course, body, seconds, sun);
  if (course.rail.apollo) return apolloAt(course, body, moon, seconds, sun);
  if (course.rail.orbit) return orbitAt(course, body, sun, seconds);
  if (course.rail.cupola) return cupolaAt(course, body, sun, seconds);
  if (course.rail.lunar) return lunarAt(course, body, sun, seconds, earth);
  if (course.rail.orbitFrom !== undefined && seconds >= course.rail.orbitFrom) return marsOrbitAt(course, body, sun, seconds);
  if (course.rail.oval) return ovalAt(course, body, sun, seconds);
  // (Over midnight, Earth a strip at the foot of the view (the user, 2026-11-02: "지구가 조금
  // 보여야해"); facing the Sun the view rises by sunwardKm, for the Sun, drawn large, stands
  // on the horizon there, and in view it puts out the aurora and the stars. The user, 2026-11-02: "태양은 안 나와야해... 다 없어지네".)
  const { latDeg, atKm, sunwardKm, highKm, rangeKm } = course.rail;
  const away = unit([body.position[0] - sun.position[0], 0, body.position[2] - sun.position[2]]);
  const over = mix(Math.cos(rad(latDeg)), away, Math.sin(rad(latDeg)), [0, 1, 0]);
  const east = unit(cross(over, [0, 1, 0]));
  const north = cross(over, east);
  const turn = (2 * Math.PI * seconds) / course.lapS;
  const aside = mix(Math.cos(turn), east, Math.sin(turn), north);
  const position = body.position.map((n, i) => n + over[i] * (body.radiusKm + highKm) + aside[i] * rangeKm);
  const facingSun = Math.max(0, dot(aside, away));
  const point = body.position.map((n, i) => n + over[i] * (body.radiusKm + atKm + sunwardKm * facingSun));
  return { position, orientation: orientationFrom(point.map((n, i) => n - position[i]), over) };
}

// Along the aurora's ring (rail.oval; the user, 2026-11-25, of the old round of one
// stretch: "코스를 좀 바꿔보자", "나"): on the night side, flying along the ring that stands
// at ringDeg about the spin axis, a little to the equator's side of it (latDeg) at highKm,
// from fromDeg to toDeg round the pole (0 is midnight, the east positive), looking ahead
// along the ring aheadDeg on to a point atKm up in the curtain, so it runs on ahead like
// a river, the night Earth under it.
function ovalAt(course, body, sun, seconds) {
  const { latDeg, ringDeg, highKm, atKm, aheadDeg, fromDeg, toDeg } = course.rail.oval;
  const night = unit([body.position[0] - sun.position[0], 0, body.position[2] - sun.position[2]]);
  const east = unit(cross([0, 1, 0], night));
  const outAt = (phiDeg, lat) => {
    const round = mix(Math.cos(rad(phiDeg)), night, Math.sin(rad(phiDeg)), east);
    return mix(Math.cos(rad(lat)), round, Math.sin(rad(lat)), [0, 1, 0]);
  };
  const k = ((seconds % course.lapS) + course.lapS) % course.lapS / course.lapS;
  const phi = fromDeg + (toDeg - fromDeg) * k;
  const over = outAt(phi, latDeg);
  const position = body.position.map((n, i) => n + over[i] * (body.radiusKm + highKm));
  const ahead = outAt(phi + Math.sign(toDeg - fromDeg) * aheadDeg, ringDeg);
  const point = body.position.map((n, i) => n + ahead[i] * (body.radiusKm + atKm));
  return { position, orientation: orientationFrom(point.map((n, i) => n - position[i]), over) };
}

// The round passes over a place (rail.plan, set when the course starts: core/surface.js
// gives where Korea will be when she is over it): plan.over, the way to it from the
// Earth's middle then; plan.on, square to it in the plane that holds it and the night;
// plan.atS, when she is over it. She looks out of the side window away from the Sun
// (which stays in that plane, so never in the window), and for a few minutes at dusk and
// dawn, while the Sun is just under the horizon, she turns slowly to look along the
// horizon toward it, where the dawn layers burn (shaders/air.frag), and back.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// How much to turn toward the aurora, and which way (along the ground). Earth's aurora
// rings stand at 67 degrees north and south about the spin axis, y (core/glows.js); she
// turns toward the nearest point of the nearer ring, 500 km up, among those she can look
// at with the Sun 80 degrees or more from the middle of the view, when one is within
// 3,800 km, at night only. (Turned nearer the Sun, the ground she looked at over the
// curtains lay past the day-night line and shone grey in daylight: the axis here stands
// square to the Earth's path, so there is no polar night.)
export function auroraGlance(position, body, sunUpDeg, toSun, dipRad = 0) {
  const out = unit(position.map((n, i) => n - body.position[i]));
  const lat = (Math.asin(out[1]) * 180) / Math.PI;
  const ring = rad(67) * (lat < 0 ? -1 : 1);
  const r = body.radiusKm + 500;
  let best = null;
  for (let k = 0; k < 96; k++) {
    const lon = (2 * Math.PI * k) / 96;
    const point = [body.position[0] + Math.cos(ring) * Math.cos(lon) * r, body.position[1] + Math.sin(ring) * r, body.position[2] + Math.cos(ring) * Math.sin(lon) * r];
    const to = point.map((n, i) => n - position[i]);
    const km = Math.hypot(...to);
    if (best && km >= best.km) continue;
    const flat = mix(1, to, -dot(to, out), out);
    if (Math.hypot(...flat) < 1e-6) continue;
    const toward = unit(flat);
    const look = mix(Math.cos(dipRad), toward, -Math.sin(dipRad), out);
    if (toSun && dot(look, toSun) > 0.15) continue;
    best = { km, toward };
  }
  const night = smooth(-6, -18, sunUpDeg);
  if (!best) return { weight: 0, toward: out, lat };
  return { weight: 0.9 * night * smooth(3800, 2200, best.km), toward: best.toward, lat };
}

// After the walk on Mars (rail.orbitFrom): up over the night side, south toward the aurora
// over the southern highlands, low enough at first to see it stand over the horizon, then
// out to 4,000 km for the whole night side, and round toward the Sun until it comes up
// over the edge of the globe (the user, 2026-11-24: "화성의 오로라를 공중에서 보는건어떄?").
function marsOrbitAt(course, body, sun, seconds) {
  const u = seconds - course.rail.orbitFrom;
  const away = unit([body.position[0] - sun.position[0], 0, body.position[2] - sun.position[2]]);
  const north = [0, 1, 0];
  const side = unit(cross(north, away));
  // (The Sun, drawn large, stays behind the globe while she is straight over midnight;
  // the round toward it brings it up over the edge.)
  const phi = rad(40) * smooth(54, 76, u);
  const lat = rad(12 - 42 * smooth(0, 30, u) + 22 * smooth(32, 50, u));
  const flat = mix(Math.cos(phi), away, Math.sin(phi), side);
  const out = mix(Math.cos(lat), flat, Math.sin(lat), north);
  const highKm = 350 * Math.pow(4000 / 350, smooth(18, 48, u));
  const position = body.position.map((n, i) => n + out[i] * (body.radiusKm + highKm));
  // Low: looking south a little under the horizon; high: at the globe's middle; at the
  // end, turned a little toward where the Sun comes up.
  const dip = Math.acos(body.radiusKm / (body.radiusKm + highKm)) + 0.06;
  const south = squareTo(north.map((n) => -n), out);
  const low = mix(Math.cos(dip), south, -Math.sin(dip), out);
  const toMiddle = out.map((n) => -n);
  // (Not quite at the middle: at a point 40 degrees south of under her, so the aurora's
  // band over the south stands in the middle of the view and the globe fills the top.)
  const ring = mix(Math.cos(rad(-40)), out, Math.sin(rad(-40)), squareTo(north, out));
  const toRing = unit(body.position.map((n, i) => n + ring[i] * body.radiusKm - position[i]));
  const k = smooth(22, 46, u);
  let forward = unit(mix(1 - k, low, k, unit(mix(1, toRing, 0.25, toMiddle))));
  const toSun = sun.position.map((n, i) => n - position[i]);
  const sunSide = squareTo(unit(toSun), toMiddle);
  forward = unit(mix(1, forward, 0.35 * smooth(52, 68, u), sunSide));
  const up = unit(mix(1 - k, out, k, north));
  return { position, orientation: orientationFrom(forward, up) };
}

function cupolaAt(course, body, sun, seconds) {
  const { highKm, overHorizonDeg, plan } = course.rail;
  const frame = sunFrame(body.position, sun.position);
  const over = plan?.over ?? frame.toSun.map((n) => -n);
  const on = plan?.on ?? frame.aside;
  const turn = (2 * Math.PI * (seconds - (plan?.atS ?? 0))) / course.lapS;
  const out = mix(Math.cos(turn), over, Math.sin(turn), on);
  const position = body.position.map((n, i) => n + out[i] * (body.radiusKm + highKm));
  const normal = cross(over, on);
  const side = dot(normal, frame.toSun) > 0 ? normal.map((n) => -n) : normal;
  const horizon = (Math.acos(body.radiusKm / (body.radiusKm + highKm)) * 180) / Math.PI;
  // The Sun's height over the level, in degrees; it looks 18 degrees in radius here.
  const c = dot(out, frame.toSun);
  const sunUp = (Math.asin(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
  const glance = smooth(-66, -60, sunUp) * (1 - smooth(-54, -50, sunUp));
  const sunward = squareTo(frame.toSun, out);
  let ahead = unit(mix(1 - glance, side, glance, sunward));
  // When the aurora is near on the night side, she turns slowly along the ground to it and
  // back (the user, 2026-11-19: "돌다가, 오로라가 보이면, 그쪽으로 패닝해줘").
  const aurora = auroraGlance(position, body, sunUp, frame.toSun, rad(horizon + overHorizonDeg));
  if (aurora.weight > 0) ahead = unit(mix(1 - aurora.weight, ahead, aurora.weight, aurora.toward));
  const dip = rad(horizon + overHorizonDeg * (1 - glance) + 3 * glance);
  const look = mix(Math.cos(dip), ahead, -Math.sin(dip), out);
  return { position, orientation: orientationFrom(look, out) };
}

// Round the Moon low, looking ahead out of the command module's window (rail.lunar; the
// user, 2026-11-24, of seeing the Moon's ground as from the cupola: "큐폴라처럼", "가"):
// Apollo 8's round, 110 km up, in the plane of the Earth and the line square to it and to
// the Sun, so the ground ahead where the Earth comes up stands on the line of day and
// night, its craters long in shadow. Seen from the far side, the Earth comes up over the
// horizon ahead riseS into a lap; she looks up after it a while (hold: [from, to]) so it
// stays in the window, then lets it go over the top. overHorizonDeg: how far over the
// middle of the view the horizon stands.
function lunarAt(course, body, sun, seconds, earth) {
  const { highKm, overHorizonDeg, riseS, hold } = course.rail;
  const R = body.radiusKm;
  const toSun = unit(sun.position.map((n, i) => n - body.position[i]));
  const e = earth ? unit(earth.position.map((n, i) => n - body.position[i])) : toSun;
  let p = cross(e, toSun);
  p = Math.hypot(...p) > 1e-3 ? unit(p) : squareTo([0, 1, 0], e);
  // The horizon's dip under the level, and where round the lap the Earth stands on it.
  const dipH = Math.acos(R / (R + highKm));
  const rise = Math.acos(Math.sin(dipH));
  const th = rise + (2 * Math.PI * (seconds - riseS)) / course.lapS;
  const out = mix(-Math.cos(th), e, Math.sin(th), p);
  const ahead = mix(Math.sin(th), e, Math.cos(th), p);
  const position = body.position.map((n, i) => n + out[i] * (R + highKm));
  // Looking ahead and down, so the horizon stands overHorizonDeg over the middle of the view;
  // while the Earth is held, raised to keep it 8 degrees over the horizon's place.
  const d = dipH + rad(overHorizonDeg);
  const earthUp = Math.asin(Math.max(-1, Math.min(1, dot(e, out)))) + d;
  const lift = Math.max(0, earthUp - rad(overHorizonDeg + 8));
  const w = smooth(hold[0], hold[0] + 12, seconds) * (1 - smooth(hold[1], hold[1] + 25, seconds));
  const pitch = d - lift * w;
  const look = mix(Math.cos(pitch), ahead, -Math.sin(pitch), out);
  return { position, orientation: orientationFrom(look, out) };
}

// Where the cupola course is to pass over a place, startS + leadS into the course:
// `toward(seconds)` gives the way to the place then, from the Earth's middle.
export function cupolaPlan(course, body, sun, toward) {
  const atS = course.rail.startS + course.rail.leadS;
  const place = unit(toward(course.rail.leadS));
  const frame = sunFrame(body.position, sun.position);
  const night = frame.toSun.map((n) => -n);
  // Round the poles (Earth's spin axis is y): over Seoul, then over the polar night and
  // its aurora, both north and south (the user, 2026-11-19: "돌다가, 오로라가 보이면,
  // 그쪽으로 패닝해줘"; a round in the plane of the night stayed far from it).
  const planeOn = (over) => {
    const on = mix(1, [0, 1, 0], -over[1], over);
    return Math.hypot(...on) < 1e-6 ? frame.aside : unit(on);
  };
  // She looks out to the side, so she passes the place by as far as the middle of the
  // view reaches over the ground: beta, the arc from under her to there.
  const { highKm, overHorizonDeg } = course.rail;
  const R = body.radiusKm;
  const nadir = rad(90 - ((Math.acos(R / (R + highKm)) * 180) / Math.PI + overHorizonDeg));
  const beta = Math.asin(Math.min(1, ((R + highKm) / R) * Math.sin(nadir))) - nadir;
  const normal = cross(place, planeOn(place));
  const side = dot(normal, frame.toSun) > 0 ? normal.map((n) => -n) : normal;
  const over = unit(mix(Math.cos(beta), place, Math.sin(beta), side));
  return { over, on: planeOn(over), atS };
}

// Apollo 11's way, in the plane of the Earth, the Moon and a level line square to them:
// u from the Earth to the Moon, w square to it (the way she goes at the burn). The burn is
// on the far side of the Earth from the Moon, going w; the coast is a curve out on the w
// side that comes in behind the Moon going -w, at moonKm over its far side; the round of
// the Moon then brings her over its limb, toward the Earth: the earthrise.
const lerp = (a, b, x) => a + (b - a) * x;
const bez = (p0, p1, p2, p3, x) => p0.map((_, i) => {
  const y = 1 - x;
  return y * y * y * p0[i] + 3 * y * y * x * p1[i] + 3 * y * x * x * p2[i] + x * x * x * p3[i];
});
// The way to look, turned from `a` toward `b` by x, going round through `via` (so that a
// half turn does not pass through nothing).
function turnLook(a, b, x, via) {
  const c = Math.max(-1, Math.min(1, dot(a, b)));
  const side = mix(1, b, -c, a);
  const way = Math.hypot(...side) > 1e-3 ? unit(side) : unit(squareTo(via, a));
  const t = Math.acos(c) * x;
  return unit(mix(Math.cos(t), a, Math.sin(t), way));
}
function apolloAt(course, earth, moon, seconds, sun = null) {
  const { parkKm, moonKm, legs } = course.rail;
  const toMoon = moon.position.map((n, i) => n - earth.position[i]);
  const u = unit(toMoon);
  const w = unit(cross([0, 1, 0], u));
  const n = cross(u, w);
  const Re = earth.radiusKm + parkKm;
  const Rm = moon.radiusKm + moonKm;
  // (The launch first, from Florida: legs.launch seconds; the legs below count from its end.)
  if (legs.launch && seconds < legs.launch) return launchAt(course, earth, seconds, sun, w);
  const s = Math.max(0, seconds - (legs.launch ?? 0));
  const lookAhead = (position, out, ahead, overDeg, rBody) => {
    const horizon = Math.acos(rBody / Math.hypot(...position.map((v, i) => v - (out.centre)[i])));
    const dip = horizon - rad(overDeg);
    const look = mix(Math.cos(dip), ahead, -Math.sin(dip), out.way);
    return look;
  };
  if (s < legs.burn) {
    // Round the Earth, from a quarter turn before the far side to the burn, then on a
    // little, rising: the parking orbit and the burn.
    const x = s / legs.burn;
    const angle = lerp(-0.5 * Math.PI, 0.35 * Math.PI, x);
    const out = mix(-Math.cos(angle), u, Math.sin(angle), w);
    const ahead = mix(Math.sin(angle), u, Math.cos(angle), w);
    const rise = s > legs.park ? ((s - legs.park) / (legs.burn - legs.park)) ** 2 * 900 : 0;
    const position = earth.position.map((v, i) => v + out[i] * (Re + rise));
    const look = lookAhead(position, { centre: earth.position, way: out }, ahead, 6, earth.radiusKm);
    return { position, orientation: orientationFrom(look, out) };
  }
  // Where the coast starts: where the burn left her, and its way.
  const a0 = 0.35 * Math.PI;
  const p0out = mix(-Math.cos(a0), u, Math.sin(a0), w);
  const p0 = earth.position.map((v, i) => v + p0out[i] * (Re + 900));
  const p0way = mix(Math.sin(a0), u, Math.cos(a0), w);
  const far = moon.position.map((v, i) => v + u[i] * Rm);
  const reach = Math.hypot(...toMoon);
  const c1 = p0.map((v, i) => v + p0way[i] * reach * 0.45);
  const c2 = far.map((v, i) => v + w[i] * reach * 0.12);
  if (s < legs.coast) {
    const x = (s - legs.burn) / (legs.coast - legs.burn);
    // Speeding up after the burn, slowing at the end to the pace of the round of the Moon.
    const along = smoothstep01(x);
    const position = bez(p0, c1, c2, far, along);
    const tangent = unit(bez(p0, c1, c2, far, Math.min(1, along + 0.001)).map((v, i) => v - position[i]));
    const toEarth = unit(earth.position.map((v, i) => v - position[i]));
    // (Toward the Moon as seen from where she was at 85% of the way: close to it, its
    // middle swings round too fast to follow.)
    const seenFrom = bez(p0, c1, c2, far, Math.min(along, 0.9));
    const toMoonNow = unit(moon.position.map((v, i) => v - seenFrom[i]));
    // Back at the Earth going small for the first part, then round to the Moon ahead;
    // at the end down to the horizon of the Moon, as the round of it begins.
    const turn = smoothstep01((x - 0.32) / 0.3);
    let look = turnLook(toEarth, toMoonNow, turn, squareTo(cross(n, toEarth), toEarth));
    // Just after the burn, round from ahead to the Earth behind, over the top.
    const back = smoothstep01(x / 0.25);
    if (back < 1) look = turnLook(tangent, toEarth, back, squareTo(n, tangent));
    const out = unit(position.map((v, i) => v - moon.position[i]));
    if (x > 0.7) {
      const ahead = w.map((v) => -v);
      const level = lookAhead(position, { centre: moon.position, way: out }, ahead, 8, moon.radiusKm);
      look = unit(mix(1 - smoothstep01((x - 0.7) / 0.3), look, smoothstep01((x - 0.7) / 0.3), level));
    }
    // Head up as round the Earth at first, then square to the plane, then out from the Moon.
    const fromEarth = unit(position.map((v, i) => v - earth.position[i]));
    let above = unit(mix(1 - smoothstep01(x / 0.12), fromEarth, smoothstep01(x / 0.12), n));
    if (x > 0.7) above = unit(mix(1 - smoothstep01((x - 0.7) / 0.3), above, smoothstep01((x - 0.7) / 0.3), out));
    return { position, orientation: orientationFrom(look, above) };
  }
  // Round the Moon from over its far side, going -w, so that the Earth comes up over the
  // limb ahead a quarter turn on, at legs.rise: quick at first, easing to a slow round that
  // goes on to the end of the lap with the Earth over the limb (the user, 2026-11-19, of
  // three minutes of grey ground and black sky that then stood still: "이 화면에서 꽤 오래
  // 있는데, 이유는?").
  const slow = (0.16 * Math.PI) / 260;
  const orbitAngle = (t) => {
    const x = Math.min(1, (t - legs.coast) / (legs.rise - legs.coast));
    return t < legs.rise
      ? slow * (t - legs.coast) + (0.5 * Math.PI - slow * (legs.rise - legs.coast)) * (1 - (1 - x) ** 2)
      : 0.5 * Math.PI + slow * (t - legs.rise);
  };
  const outAt = (a) => mix(Math.cos(a), u, -Math.sin(a), w);
  const aheadAt = (a) => mix(-Math.sin(a), u, -Math.cos(a), w);
  const R = moon.radiusKm;
  const atMoon = (a, h) => moon.position.map((v, i) => v + outAt(a)[i] * (R + h));
  const moonLook = (position, a, overDeg) => lookAhead(position, { centre: moon.position, way: outAt(a) }, aheadAt(a), overDeg, R);
  const frameOf = (look, above) => ({ orientation: orientationFrom(look, above) });
  // Along the way or back along it, whichever is turned from the Sun (drawn large, it
  // washes the window out: the far side before the burn home was all glare).
  const moonLookShaded = (position, a, overDeg) => {
    const ahead = aheadAt(a);
    const toSunHere = sun ? unit(sun.position.map((v, i) => v - position[i])) : null;
    const way = toSunHere && dot(ahead, toSunHere) > 0 ? ahead.map((v) => -v) : ahead;
    return lookAhead(position, { centre: moon.position, way: outAt(a) }, way, overDeg, R);
  };
  if (s < legs.undock) {
    const a = orbitAngle(s);
    const position = atMoon(a, moonKm);
    return { position, ...frameOf(moonLook(position, a, 3), outAt(a)) };
  }
  // Eagle's way down to the Sea of Tranquillity: off the round, slowing, from moonKm to the
  // ground at aLand, where the Earth stands 20 degrees up ahead (cos aLand = -sin 20°). The view
  // tips down to the ground ahead, and up again at the touch (the user, 2026-11-19: "달
  // 착륙까지 이어 붙여. 지구까지 귀환하자").
  const EYE = 0.008;
  const aUndock = orbitAngle(legs.undock);
  const aLand = Math.acos(-Math.sin(rad(20)));
  const toEarthFrom = (position) => unit(earth.position.map((v, i) => v - position[i]));
  const groundLook = (position) => {
    const up = unit(position.map((v, i) => v - moon.position[i]));
    const level = squareTo(toEarthFrom(position), up);
    return unit(mix(Math.cos(rad(3)), level, Math.sin(rad(3)), up));
  };
  // The last of it as Armstrong flew it, past the boulders of the crater the computer had
  // chosen (the user, 2026-11-20: "이렇게 하자", "이글 하강 장면 만들고"): from legs.hover
  // [from, to] low and level, highKm down to lowKm, going on ahead aheadKm over the ground;
  // then down onto it. The view kept ahead and down all the way, where the Sun behind her
  // throws her shadow (main.js cabinGround).
  const hover = course.rail.hover ?? { from: 478, to: 493, highKm: 0.05, lowKm: 0.015, aheadKm: 0.3 };
  const span = legs.land - legs.undock;
  const xH = (hover.from - legs.undock) / span, xD = (hover.to - legs.undock) / span;
  const dA = hover.aheadKm / moon.radiusKm;
  const descent = (t) => {
    const x = Math.min(1, Math.max(0, (t - legs.undock) / span));
    let a, h;
    if (x < xH) {
      const k = x / xH;
      a = aUndock + (aLand - dA - aUndock) * (1 - (1 - k) ** 1.6);
      h = EYE + hover.highKm + (moonKm - hover.highKm) * (1 - k) ** 2.2;
    } else if (x < xD) {
      const k = (x - xH) / (xD - xH);
      a = aLand - dA + 0.92 * dA * smooth(0, 1, k);
      h = EYE + hover.highKm + (hover.lowKm - hover.highKm) * smooth(0, 1, k);
    } else {
      const k = (x - xD) / (1 - xD);
      a = aLand - 0.08 * dA * (1 - k);
      h = EYE + hover.lowKm * (1 - k) ** 1.5;
    }
    const over = 3 - 24 * smooth(0.45, 0.8, x);
    const position = atMoon(a, h);
    // Toward her shadow as she comes low: along the ground away from the Sun, when that is
    // within 60 degrees of her way (the Sun behind her, as the course's clock is set for).
    let ahead = aheadAt(a);
    if (sun) {
      const out = outAt(a);
      const toSun = unit(sun.position.map((v, i) => v - position[i]));
      const k0 = dot(toSun, out);
      const away = unit(toSun.map((v, i) => -(v - out[i] * k0)));
      const k = smooth(0.7, xH, x);
      if (k0 > 0 && dot(away, ahead) > 0.5 && k > 0) ahead = unit(mix(1 - k, ahead, k, away));
    }
    const look = lookAhead(position, { centre: moon.position, way: outAt(a) }, ahead, over, R);
    return { position, look, up: outAt(a) };
  };
  if (s < legs.land) {
    const d = descent(s);
    return { position: d.position, ...frameOf(d.look, d.up) };
  }
  const ground = atMoon(aLand, EYE);
  const landed = descent(legs.land);
  if (s < legs.liftoff) {
    const look = turnLook(landed.look, groundLook(ground), smoothstep01((s - legs.land) / 8), outAt(aLand));
    return { position: ground, ...frameOf(look, outAt(aLand)) };
  }
  // The ascent stage rises off the descent stage and tips over toward the way ahead.
  if (s < legs.dock) {
    const x = (s - legs.liftoff) / (legs.dock - legs.liftoff);
    const a = aLand + 0.03 * Math.PI * x * x;
    const position = atMoon(a, EYE + 18 * x ** 1.8);
    const look = turnLook(groundLook(ground), moonLook(position, a, 6), smoothstep01(x / 0.4), outAt(a));
    return { position, ...frameOf(look, outAt(a)) };
  }
  // Docked again with Columbia (a jump, hidden by the change of window), round to the far
  // side, and the burn home there at legs.tei.
  const aTei = 2 * Math.PI;
  if (s < legs.tei) {
    const a = aTei - 0.2 * Math.PI * (1 - (s - legs.dock) / (legs.tei - legs.dock));
    const position = atMoon(a, moonKm);
    return { position, ...frameOf(moonLookShaded(position, a, 3), outAt(a)) };
  }
  const burnRise = (t) => ((Math.min(t, legs.teiEnd) - legs.tei) / (legs.teiEnd - legs.tei)) ** 2 * 600;
  if (s < legs.teiEnd) {
    const a = aTei + slow * 4 * (s - legs.tei);
    const position = atMoon(a, moonKm + burnRise(s));
    return { position, ...frameOf(moonLookShaded(position, a, 3), outAt(a)) };
  }
  // Home: a curve from where the burn left her to the edge of the air on the Earth's day
  // side, entryKm up, going level; then down through the air, and under the parachutes.
  const RE = earth.radiusKm;
  const toSun = sun ? unit(sun.position.map((v, i) => v - earth.position[i])) : w;
  let dirE = squareTo(unit(mix(0.75, toSun, 0.65, w)), n);
  const aEnd = aTei + slow * 4 * (legs.teiEnd - legs.tei);
  const q0 = atMoon(aEnd, moonKm + 600);
  let tIn = unit(cross(n, dirE));
  if (dot(tIn, dirE.map((v, i) => earth.position[i] + v * RE - q0[i])) < 0) tIn = tIn.map((v) => -v);
  // Under the parachutes over the Pacific, in daylight (rail.splash, the way to the spot
  // from the Earth's middle at the end, set by main.js): the way in runs west to it, so that
  // the morning Sun there is behind (main.js apolloPlan).
  if (course.rail.splash) {
    const spot = course.rail.splash;
    // (Longitude grows along cross(spot, up): core/surface.js surfaceDirection.)
    const west = unit(cross([0, 1, 0], spot));
    const arcEnd = 0.204;
    dirE = unit(mix(Math.cos(arcEnd), spot, -Math.sin(arcEnd), west));
    tIn = unit(mix(Math.sin(arcEnd), spot, Math.cos(arcEnd), west));
  }
  const entryKm = 120;
  const E = earth.position.map((v, i) => v + dirE[i] * (RE + entryKm));
  const homeReach = Math.hypot(...E.map((v, i) => v - q0[i]));
  const h1 = q0.map((v, i) => v + aheadAt(aEnd)[i] * homeReach * 0.3);
  const h2 = E.map((v, i) => v - tIn[i] * homeReach * 0.4);
  const overEarth = (arc, h) => {
    const outE = unit(mix(Math.cos(arc), dirE, Math.sin(arc), tIn));
    const aheadE = unit(mix(-Math.sin(arc), dirE, Math.cos(arc), tIn));
    const position = earth.position.map((v, i) => v + outE[i] * (RE + h));
    return { position, outE, aheadE };
  };
  if (s < legs.home) {
    const x = (s - legs.teiEnd) / (legs.home - legs.teiEnd);
    // Quick off the Moon, slowing at the end to the pace of the way into the air.
    const along = smoothstep01(x);
    const position = bez(q0, h1, h2, E, along);
    const toMoonNow = unit(moon.position.map((v, i) => v - position[i]));
    const toEarthNow = toEarthFrom(position);
    let look = turnLook(toMoonNow, toEarthNow, smoothstep01((x - 0.3) / 0.3), squareTo(n, toMoonNow));
    // From the way ahead at the burn round to the Moon behind, in the first few seconds.
    const burnLook = moonLookShaded(q0, aEnd, 3);
    if (x < 0.18) look = turnLook(burnLook, look, smoothstep01(x / 0.18), outAt(aEnd));
    const fromEarth = unit(position.map((v, i) => v - earth.position[i]));
    if (x > 0.85) {
      const tangent = unit(bez(q0, h1, h2, E, Math.min(1, along + 0.001)).map((v, i) => v - position[i]));
      const level = lookAhead(position, { centre: earth.position, way: fromEarth }, tangent, 3, RE);
      look = unit(mix(1 - smooth(0.85, 1, x), look, smooth(0.85, 1, x), level));
    }
    let above = unit(mix(1 - smooth(0.6, 1, x), n, smooth(0.6, 1, x), fromEarth));
    // (Head up off the Moon at the burn, rolling to square to the plane as she turns.)
    if (x < 0.15) above = unit(mix(1 - smoothstep01(x / 0.15), outAt(aEnd), smoothstep01(x / 0.15), above));
    return { position, ...frameOf(look, above) };
  }
  if (s < legs.chute) {
    const x = (s - legs.home) / (legs.chute - legs.home);
    const e = overEarth(0.2 * (1 - (1 - x) ** 2), entryKm - 75 * smoothstep01(x));
    return { position: e.position, ...frameOf(lookAhead(e.position, { centre: earth.position, way: e.outE }, e.aheadE, 2, RE), e.outE) };
  }
  // Under the two drogues from 45 km to 3 km, then under the three mains to the sea (the
  // mains opened at about 3 km), a few metres over the water at the end.
  const x = Math.min(1, (s - legs.chute) / (legs.end - legs.chute));
  const k = 0.35;
  const hKm = x < k ? 3 + 42 * (1 - smoothstep01(x / k)) : 0.004 + 2.996 * (1 - (x - k) / (1 - k)) ** 1.4;
  const e = overEarth(0.2 + 0.004 * x, hKm);
  const over = 2 - 10 * smoothstep01(x);
  return { position: e.position, ...frameOf(lookAhead(e.position, { centre: earth.position, way: e.outE }, e.aheadE, over, RE), e.outE) };
}
// Apollo 11's launch (the user, 2026-11-19: "휴스턴에서 카운트 다운하고 출발하는 것부터
// 시작하자"; the countdown was Kennedy's, Houston took over as the tower was cleared): from
// the top of the Saturn V on the pad (rail.pad, the way to it from the Earth's middle, set by
// main.js), lying on their backs: the sky high up over the sea to the east, then pitching over
// east as it climbs to the orbit, insertKm up and 1,500 km downrange at ascent.insert.
function launchAt(course, earth, seconds, sun, w) {
  const { liftoff, insert, insertKm } = course.rail.ascent;
  const toSun = sun ? unit(sun.position.map((v, i) => v - earth.position[i])) : w;
  const pad = course.rail.pad ?? unit(mix(0.7, toSun, 0.7, w));
  // (Longitude grows along cross(pad, up): core/surface.js surfaceDirection.)
  const east = unit(cross(pad, [0, 1, 0]));
  const x = Math.min(1, Math.max(0, (seconds - liftoff) / (insert - liftoff)));
  const arc = (1500 / earth.radiusKm) * x * x;
  const h = 0.11 + insertKm * x ** 1.6;
  const up = unit(mix(Math.cos(arc), pad, Math.sin(arc), east));
  const ahead = unit(mix(-Math.sin(arc), pad, Math.cos(arc), east));
  const position = earth.position.map((v, i) => v + up[i] * (earth.radiusKm + h));
  // (Looking east or west, whichever has the Sun behind: drawn large, it fills the window.)
  const away = dot(ahead, toSun) > 0 ? ahead.map((v) => -v) : ahead;
  // (Low over the horizon: the sky drawn from the ground is blue only near it.)
  const e = rad(6 - 3 * smoothstep01(x / 0.85));
  const look = unit(mix(Math.cos(e), away, Math.sin(e), up));
  return { position, orientation: orientationFrom(look, up) };
}
const smoothstep01 = (x) => { const t = Math.min(1, Math.max(0, x)); return t * t * (3 - 2 * t); };
// Starship's booster over the Gulf of Mexico (rail.track: alt, km up; down, km east of the
// pad; tilt, degrees its nose leans from upright toward the east (on the way back, toward the
// west), each at course seconds): where it is, its nose, and the pad's own up and east.
// rail.pad: the pad (main.js starshipPlan); without it, east of the Sun's side, as for Apollo.
const linear = (marks, s) => {
  if (s <= marks[0][0]) return marks[0][1];
  for (let i = 1; i < marks.length; i++) {
    if (s < marks[i][0]) {
      const [s0, v0] = marks[i - 1];
      const [s1, v1] = marks[i];
      return v0 + (v1 - v0) * ((s - s0) / (s1 - s0));
    }
  }
  return marks[marks.length - 1][1];
};
export function starshipTrack(course, earth, seconds, sun = null) {
  const { track } = course.rail;
  const toSun = sun ? unit(sun.position.map((v, i) => v - earth.position[i])) : [1, 0, 0];
  const pad = course.rail.pad ?? toSun;
  const east = unit(cross(pad, [0, 1, 0]));
  const north = cross(east, pad);
  const down = linear(track.down, seconds);
  const arc = down / earth.radiusKm;
  const up = unit(mix(Math.cos(arc), pad, Math.sin(arc), east));
  const ahead = unit(mix(-Math.sin(arc), pad, Math.cos(arc), east));
  const position = earth.position.map((v, i) => v + up[i] * (earth.radiusKm + linear(track.alt, seconds)));
  const tilt = rad(linear(track.tilt, seconds));
  const nose = unit(mix(Math.cos(tilt), up, Math.sin(tilt), ahead));
  return { position, nose, up, ahead, north };
}
// The view from the camera on the booster: up along it (cabin booster-up) until it turns
// back after the ship has gone, then down past its grid fin to the ground it is coming back
// to (cabin booster-down), the turn between over flip seconds.
function starshipAt(course, earth, seconds, sun) {
  const { position, nose, up, ahead, north } = starshipTrack(course, earth, seconds, sun);
  const hs = course.rail.hotStage;
  // Up along it, from a little to its side (the camera is on its flank), at a point a little
  // way up the ship sitting on it, the booster's axis upright in the view (render/craft.js
  // draws the ship there, main.js starshipStep).
  const eye = position.map((n, i) => n - north[i] * hs.sideKm);
  const aimAt = position.map((n, i) => n + nose[i] * (hs.nearKm + hs.aimKm));
  const upView = unit(aimAt.map((n, i) => n - eye[i]));
  // Down past the fin: 30 degrees off straight down, toward the coast it is coming back to,
  // so the ground is seen to grow as it falls (the user, 2026-11-22: was 60, the ground
  // seemed not to move: "지표가 왜 안 움직여", "가+나로 만들어").
  const toward = ahead.map((v) => -v);
  const downView = unit(mix(-Math.cos(rad(30)), up, Math.sin(rad(30)), toward));
  const x = smoothstep01((seconds - 176) / 12);
  let look = unit(mix(1 - x, upView, x, downView));
  let screenUp = x < 0.5 ? squareTo(nose, look) : squareTo(toward, look);
  // Falling, the booster sways as its grid fins steer it, and slowly rolls a little each
  // way: a few slow waves of yaw, pitch and roll, growing in as it turns down.
  if (x > 0) {
    const s = seconds;
    const yaw = rad(3.5 * Math.sin(s * 0.53) + 1.5 * Math.sin(s * 1.31 + 1)) * x;
    const pitch = rad(2.5 * Math.sin(s * 0.71 + 2) + 1 * Math.sin(s * 1.7)) * x;
    const roll = rad(14 * Math.sin(s * 0.11) + 3 * Math.sin(s * 0.47 + 0.5)) * x;
    const side = cross(look, screenUp);
    look = unit(look.map((n, i) => n + side[i] * Math.tan(yaw) + screenUp[i] * Math.tan(pitch)));
    const side2 = cross(look, screenUp);
    screenUp = squareTo(mix(Math.cos(roll), screenUp, Math.sin(roll), side2), look);
  }
  return { position: x < 0.5 ? eye : position, orientation: orientationFrom(look, screenUp) };
}
// A value along [[seconds, value], ...], eased between the marks, held before and after.
function eased(marks, s) {
  if (s <= marks[0][0]) return marks[0][1];
  for (let i = 1; i < marks.length; i++) {
    const [s1, v1] = marks[i];
    if (s < s1) {
      const [s0, v0] = marks[i - 1];
      return v0 + (v1 - v0) * smoothstep01((s - s0) / (s1 - s0));
    }
  }
  return marks[marks.length - 1][1];
}

// Discovery backing away from Hubble: she stands above and behind it (the Earth below it
// in the view, its horizon over it), from nearKm to farKm on a slow curve, swinging a
// little round it; after turnS she turns to the horizon ahead along the way east.
function shuttleAt(course, earth, hubble, seconds, sun) {
  const { nearKm, farKm, turnS } = course.rail;
  const s = Math.max(0, seconds);
  const up = unit(hubble.position.map((v, i) => v - earth.position[i]));
  // East or west, whichever looks away from the Sun (drawn large, it would fill the view).
  const eastward = unit(cross([0, 1, 0], up));
  const sunWay = sun ? sun.position.map((v, i) => v - hubble.position[i]) : [0, 0, 0];
  const east = dot(eastward, sunWay) > 0 ? eastward.map((v) => -v) : eastward;
  const north = cross(up, east);
  const away = smoothstep01((s - 40) / (course.lapS - 40));
  // (rail.kmAt: [seconds, km] the distance instead, eased between, for McCandless's flight out and back.)
  // (Let go at 0 s, Hubble drifts off a little before she backs away.)
  const km = course.rail.kmAt ? eased(course.rail.kmAt, s) : nearKm * (farKm / nearKm) ** away * (1 + 0.3 * smoothstep01(s / 40));
  const az = rad(-25 + 50 * smoothstep01(s / course.lapS));
  const back = mix(-Math.cos(az), east, Math.sin(az), north);
  const el = rad(35);
  const offset = mix(Math.cos(el), back, Math.sin(el), up);
  const position = hubble.position.map((v, i) => v + offset[i] * km);
  const toHubble = unit(hubble.position.map((v, i) => v - position[i]));
  const r = Math.hypot(...position.map((v, i) => v - earth.position[i]));
  // (The horizon up in the upper windows of the drawn flight deck, out of the bars.)
  const dip = Math.acos(earth.radiusKm / r) + rad(12);
  const out = unit(position.map((v, i) => v - earth.position[i]));
  const ahead = squareTo(east, out);
  const level = mix(Math.cos(dip), ahead, -Math.sin(dip), out);
  const turn = smoothstep01((s - turnS) / 60);
  // Hubble in the upper right window, not behind the bars in the middle of the drawing:
  // she looks a little below and left of it.
  const sr = unit(cross(out, toHubble));
  const su = cross(toHubble, sr);
  const [offUp, offSide] = course.rail.aimOff ?? [0.3, 0.17];
  const aimed = unit(toHubble.map((v, i) => v - offUp * su[i] - offSide * sr[i]));
  const look = turn > 0 ? turnLook(aimed, level, turn, out) : aimed;
  return { position, orientation: orientationFrom(look, out) };
}

// McCandless flying himself (main.js mmuFly): where he floats, given as the way from
// Challenger (km), and looking at her, his head up away from the Earth.
export function mmuFlyAt(earth, hubble, rel) {
  const position = hubble.position.map((v, i) => v + rel[i]);
  const out = unit(position.map((v, i) => v - earth.position[i]));
  return { position, orientation: orientationFrom(unit(rel.map((v) => -v)), out) };
}

// McCandless's course before he is in his helmet (seconds < 0), the way the user drew it
// (2026-11-20): Challenger far off, near until it is as in his own photo of it, its bay
// opening (the pictures change, rail.craftPhotos), he coming out of it, the eye going round
// to him floating alone over the Earth, then (under the photo of his visor) into his helmet,
// where shuttleAt takes over at 0 s from where he floats.
function mmuFrame(earth, hubble, sun) {
  const up = unit(hubble.position.map((v, i) => v - earth.position[i]));
  const eastward = unit(cross([0, 1, 0], up));
  const sunWay = sun ? sun.position.map((v, i) => v - hubble.position[i]) : [0, 0, 0];
  const east = dot(eastward, sunWay) > 0 ? eastward.map((v) => -v) : eastward;
  const north = cross(up, east);
  const az = rad(-25);
  const back = mix(-Math.cos(az), east, Math.sin(az), north);
  const el = rad(35);
  const offset = mix(Math.cos(el), back, Math.sin(el), up);
  const side = unit(cross(up, back));
  return { up, offset, back, side };
}
const along = (a, b, x) => a.map((n, i) => n + (b[i] - n) * x);
// How the 3D Challenger lies (render/challenger3d.js): her open bay toward the
// side the eye first comes from, which is also the way McCandless leaves it, her nose
// across the view and tipped `noseDeg` up it, as in his photo of her (S84-27020).
export function mmuShipFacing(course, earth, hubble, sun) {
  const f = mmuFrame(earth, hubble, sun);
  const bay = f.offset;
  const lift = unit(f.up.map((v, i) => v - bay[i] * dot(f.up, bay)));
  const tip = rad(course.rail.noseDeg ?? 35);
  return { forward: unit(mix(Math.cos(tip), f.side, Math.sin(tip), lift)), up: bay };
}
// Where McCandless floats (km), or null while he is in the bay or the view is his own.
export function mmuFigure(course, earth, hubble, sun, seconds) {
  const [from, to] = course.rail.outS;
  if (seconds < from || seconds >= 0) return null;
  const f = mmuFrame(earth, hubble, sun);
  const startKm = course.rail.figureEndKm ?? course.rail.kmAt[0][1];
  const x = smoothstep01((seconds - from) / (to - from));
  return hubble.position.map((v, i) => v + f.offset[i] * (0.6 + (startKm - 0.6) * x));
}
function mmuAt(course, earth, hubble, seconds, sun) {
  const f = mmuFrame(earth, hubble, sun);
  const [farS, nearS] = course.rail.nearS;
  const [outFrom, outTo] = course.rail.outS;
  const [roundFrom, roundTo] = course.rail.roundS;
  const startKm = course.rail.kmAt[0][1];
  const he = mmuFigure(course, earth, hubble, sun, Math.max(outFrom, Math.min(-1e-6, seconds))) ?? hubble.position;
  // Far, coming near Challenger, from his side of it.
  const d = eased([[farS, course.rail.farOutKm], [nearS, course.rail.nearOutKm]], seconds);
  const byShip = hubble.position.map((v, i) => v + f.offset[i] * d);
  // Round to him: beside him and a little above, looking down past him to the Earth.
  const dip = rad(10);
  const beside = mix(Math.cos(dip), f.side, Math.sin(dip), f.up);
  const byHim = he.map((v, i) => v + beside[i] * course.rail.figureOutKm);
  const go = smoothstep01((seconds - roundFrom) / (roundTo - roundFrom));
  const position = along(byShip, byHim, go);
  // Looking at Challenger, then at him as he comes out.
  const target = seconds < outFrom ? hubble.position : along(hubble.position, he, smoothstep01((seconds - outFrom) / (outTo - outFrom)));
  const look = unit(target.map((v, i) => v - position[i]));
  const out = unit(position.map((v, i) => v - earth.position[i]));
  return { position, orientation: orientationFrom(look, out) };
}

// The orbital sunrise's round: from midnight (0 s) toward the Sun's side, square to the
// Sun's pole, looking ahead.
function orbitAt(course, body, sun, seconds) {
  const { highKm, lookDeg } = course.rail;
  const frame = sunFrame(body.position, sun.position);
  const night = frame.toSun.map((n) => -n);
  const turn = (2 * Math.PI * seconds) / course.lapS;
  const out = mix(Math.cos(turn), night, Math.sin(turn), frame.aside);
  const ahead = mix(-Math.sin(turn), night, Math.cos(turn), frame.aside);
  const position = body.position.map((n, i) => n + out[i] * (body.radiusKm + highKm));
  const look = mix(Math.cos(rad(lookDeg)), ahead, -Math.sin(rad(lookDeg)), out);
  return { position, orientation: orientationFrom(look, out) };
}

// Where a round starts and the slide that carries her along it, with the bodies where
// they are now. ringNormal: of the body, for a round kept to its rings.
export function courseStart(course, body, sun, ringNormal = null, moon = null, hubble = null, earth = null) {
  if (course.rail) return { ...railAt(course, body, sun, course.rail.startS, moon, hubble, earth), slide: {} };
  const frame = sunFrame(body.position, sun.position);
  const { from, along } = roundOf(course, frame, ringNormal);
  const km = course.radii * body.radiusKm;
  const looking = from.map((n) => -n);
  const normal = cross(from, along);
  const roll = rad(course.rollDeg ?? 0);
  const above = mix(Math.cos(roll), normal, Math.sin(roll), cross(looking, normal));
  const stand = {
    position: body.position.map((n, i) => n + from[i] * km),
    orientation: orientationFrom(mix(Math.cos(DIP), looking, -Math.sin(DIP), above), above),
  };
  const speed = (2 * Math.PI * km) / course.lapS;
  const side = dot(along, right(stand.orientation)) * speed;
  const rise = dot(along, up(stand.orientation)) * speed;
  return { ...stand, slide: { sideSpeed: Math.abs(side), sideSign: side < 0 ? -1 : 1, riseSpeed: Math.abs(rise), riseSign: rise < 0 ? -1 : 1 } };
}
