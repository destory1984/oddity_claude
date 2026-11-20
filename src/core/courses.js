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
  { id: 'auroraDrift', body: 'earth', lapS: 120, rail: { latDeg: 67, startS: 75, atKm: 800, sunwardKm: 470, highKm: 400, rangeKm: 1500 }, name: t('오로라 유영'), todo: t('밤쪽 오로라 한 곳을 가까이에서 맴돌며 빛의 커튼 사이를 지나갑니다.') },
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
  { id: 'cupola', body: 'earth', lapS: 3150, rail: { cupola: true, cabin: 'assets/cupola/frame.png', highKm: 1000, overHorizonDeg: 5, startS: 0, leadS: 700 }, name: t('큐폴라에서 본 지구'), todo: t('큐폴라는 국제우주정거장 아래쪽에 달린, 창 일곱 개짜리 둥근 전망대입니다. 그 창 안에서 지구를 내려다봅니다. 낮과 노을, 밤의 도시 불빛이 지나갑니다.') },
  // Apollo 11's way (the user, 2026-11-19: "그럼 아폴로 하자"): a parking orbit round the
  // Earth, the burn for the Moon, the three days' coast, into orbit round the Moon behind it,
  // and the earthrise. legs: when each part ends, in seconds.
  { id: 'apollo11', body: 'earth', lapS: 1100, rail: { apollo: true, dock: { from: 724, at: 746, to: 748.5, farKm: 600, nearKm: 15, sizeKm: 9 }, cabin: 'assets/tours/apollo-cabin.webp', cabins: [{ at: 0, cabin: 'assets/tours/apollo-cabin.webp' }, { at: 490, cabin: 'assets/tours/eagle-cabin.webp', aim: [-0.12, -0.12] }, { at: 748, cabin: 'assets/tours/apollo-cabin.webp' }], glow: { from: 980, peak: 1005, to: 1035 }, shakes: [{ from: 19, peak: 23, to: 60 }, { from: 49, peak: 50, to: 53 }, { from: 71, peak: 72, to: 75 }, { from: 745.8, peak: 746.1, to: 747.6 }], still: [[-26, 100], [130, 150], [505, 750], [800, 820], [980, 1100]], fades: [99.2, 1099.2], loops: true, ascent: { liftoff: 20, insert: 92, insertKm: 185 }, sounds: [[20, 'liftoff'], [26, 'roll'], [50, 'staging'], [52, 'ascent'], [72, 'staging'], [509, 'burnLong'], [530, 'burnLong'], [551, 'burnLong'], [572, 'burnLong'], [595, 'landed'], [700, 'burnLong'], [721, 'burnLong'], [746, 'dock'], [982, 'burnLong'], [1003, 'burnLong'], [1056, 'chute']], captions: [{ at: -25, text: t('미국 플로리다의 케네디 우주센터. 왼쪽의 큰 건물에서 로켓을 세워서 조립합니다.') }, { at: -18, text: t('다 만든 로켓은 운반차에 실려 시속 1.6km로, 5.6km 떨어진 발사대까지 갑니다.') }, { at: -11, text: t('39A 발사대에 선 아폴로 11호의 새턴 5호. 높이 110m, 연료를 채우면 2,900톤입니다.') }, { at: 1, text: t('1969년 7월 16일 아침. 세 사람은 새턴 5호 꼭대기의 사령선에 누워 있습니다.') }, { at: 11, text: t('발사 9초 전, 1단 엔진 다섯 개에 불이 붙습니다.') }, { at: 21, text: t('이륙! 높이 110m의 새턴 5호가 떠오릅니다. 발사탑을 벗어나자 관제가 휴스턴으로 넘어갑니다.') }, { at: 36, text: t('기체를 돌려 동쪽 바다 쪽으로 눕기 시작합니다. 곧 소리보다 빨라집니다.') }, { at: 50, text: t('약 2분 42초 뒤 1단이 떨어져 나갑니다. 그동안 연료와 산화제 2천 톤을 태웠습니다.') }, { at: 66, text: t('2단과 3단이 차례로 타고, 발사 11분 49초 만에 고도 190km 궤도에 오릅니다.') }, { at: 82, text: t('창밖의 하늘이 검어지고, 둥근 지구의 가장자리가 보입니다.') }, { at: 102, text: t('지구 궤도에 올랐습니다. 지구를 한 바퀴 반 돌며 우주선을 점검합니다.') }, { at: 112, text: t('창밖은 고도 190km. 타고 있는 사람은 암스트롱, 올드린, 콜린스 세 사람입니다.') }, { at: 122, text: t('곧 3단 로켓을 다시 켜고 달로 가는 길에 오릅니다.') }, { at: 134, text: t('엔진이 6분 가까이 타며 우주선은 시속 3만 9천km까지 빨라집니다.') }, { at: 162, text: t('지구가 점점 작아집니다. 달까지 38만km, 사흘이 걸리는 길입니다.') }, { at: 200, text: t('가는 동안 우주선은 한쪽만 햇볕에 달궈지지 않게 천천히 돌았습니다. 바비큐 굴리기라고 불렀습니다.') }, { at: 250, text: t('7월 19일, 달 뒤편으로 들어서면 지구와의 무선이 끊깁니다.') }, { at: 294, text: t('달 뒤편에서 엔진을 켜 속도를 줄여야 달 궤도에 붙잡힙니다.') }, { at: 334, text: t('달 궤도에 들어섰습니다. 아래는 지구에서는 한 번도 보이지 않는 달의 뒤편입니다.') }, { at: 368, text: t('곧 달의 지평선 위로 지구가 떠오릅니다. 지구돋이입니다.') }, { at: 400, text: t('지구돋이를 처음 사진으로 남긴 것은 1968년 크리스마스이브, 아폴로 8호였습니다.') }, { at: 467, text: t('7월 20일, 암스트롱과 올드린이 착륙선 이글로 옮겨 탑니다. 콜린스는 사령선 컬럼비아에 남습니다.') }, { at: 493, text: t('이글이 컬럼비아에서 떨어져 나왔습니다. 이제 이글의 세모난 창으로 봅니다.') }, { at: 509, text: t('엔진을 켜고 고요의 바다로 내려가기 시작합니다. 12분 동안의 하강입니다.') }, { at: 525, text: t('경보가 울립니다. "1202." 컴퓨터에 일이 너무 몰렸다는 뜻이었고, 지상은 계속 가라고 답했습니다.') }, { at: 545, text: t('컴퓨터가 고른 자리는 바위가 널린 분화구였습니다. 암스트롱이 손으로 몰아 넘어갑니다.') }, { at: 565, text: t('"60초." 연료가 얼마 남지 않았다고 지상에서 알립니다. 엔진 바람에 먼지가 날립니다.') }, { at: 597, text: t('"휴스턴, 여기는 고요의 기지. 이글은 착륙했다." 한국 시간으로 7월 21일 새벽 5시 17분이었습니다.') }, { at: 615, text: t('창밖은 잿빛 땅과 검은 하늘, 그리고 지구입니다.') }, { at: 632, text: t('원래는 한숨 자고 나갈 계획이었지만, 두 사람은 바로 나가겠다고 했습니다.') }, { at: 660, text: t('여섯 시간 반 뒤 암스트롱이 첫발을 디뎠습니다. "한 사람에게는 작은 한 걸음이지만, 인류에게는 위대한 도약이다."') }, { at: 680, text: t('둘은 2시간 31분 동안 걸으며 성조기를 세우고 돌과 흙 21.5kg을 모았습니다. 바람이 없어 발자국은 오래 남습니다.') }, { at: 700, text: t('21시간 36분 만에 이글의 윗부분이 아랫부분을 발사대 삼아 떠오릅니다.') }, { at: 720, text: t('엔진 바람에 성조기가 쓰러지는 것을 올드린이 창으로 보았습니다.') }, { at: 728, text: t('컬럼비아가 다가옵니다. 콜린스가 혼자 달을 돌며 기다리고 있었습니다.') }, { at: 752, text: t('네 시간쯤 뒤 이글은 컬럼비아와 다시 만나 붙었습니다. 다시 사령선의 창입니다.') }, { at: 772, text: t('세 사람이 다시 모였습니다. 이글의 윗부분은 떼어 달 궤도에 남겨 두었습니다.') }, { at: 804, text: t('달 뒤편에서 엔진이 2분 반 동안 타며 지구로 향합니다.') }, { at: 816, text: t('그때까지 컬럼비아는 달 궤도를 서른 바퀴 돌았습니다.') }, { at: 836, text: t('달이 작아집니다. 지구까지 이틀 반 길입니다.') }, { at: 880, text: t('돌아오는 길에 세 사람은 TV 중계로 지구의 사람들에게 고맙다는 인사를 전했습니다.') }, { at: 930, text: t('7월 24일, 지구가 다가옵니다. 들어가는 각도가 조금만 어긋나도 대기에 튕겨 나가거나 타 버립니다.') }, { at: 984, text: t('시속 4만km로 대기에 부딪힙니다. 바닥의 방열판이 수천 도의 열을 견딥니다.') }, { at: 1004, text: t('불꽃에 둘러싸여 몇 분 동안 무선이 끊깁니다.') }, { at: 1042, text: t('작은 낙하산 두 개가 먼저 펴져 캡슐을 붙잡습니다.') }, { at: 1056, text: t('고도 3km. 큰 낙하산 세 개가 펴집니다.') }, { at: 1080, text: t('태평양에 내렸습니다. 항공모함 호넷이 세 사람을 맞았습니다. 8일 3시간 18분의 여행이었습니다.') }], cabinKeys: [{ cabin: 'assets/tours/apollo-cabin.webp', does: 'sound', label: 'Sound', hit: [862, 150, 935, 265], lever: [862, 152, 938, 264], down: { src: 'assets/tours/apollo-switch-down.webp', x: 840, y: 130, w: 220, h: 170 }, labelY: 160 }, { cabin: 'assets/tours/apollo-cabin.webp', does: 'music', label: 'Music', hit: [965, 170, 1040, 280], lever: [962, 173, 1038, 281], down: { src: 'assets/tours/apollo-switch-down.webp', x: 840, y: 130, w: 220, h: 170 }, labelY: 180 }, { cabin: 'assets/tours/apollo-cabin.webp', does: 'caption', label: 'Caption', hit: [1065, 185, 1140, 295], lever: [1063, 186, 1139, 298], down: { src: 'assets/tours/apollo-switch3-down.webp', x: 1040, y: 150, w: 140, h: 150 }, labelY: 196 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'sound', label: 'Sound', hit: [704, 1165, 800, 1300], lever: [704, 1165, 800, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'music', label: 'Music', hit: [814, 1165, 910, 1300], lever: [814, 1165, 910, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }, { cabin: 'assets/tours/eagle-cabin.webp', does: 'caption', label: 'Caption', hit: [926, 1165, 1022, 1300], lever: [926, 1165, 1022, 1309], down: { src: 'assets/tours/eagle-switch-down.webp', x: 690, y: 1150, w: 350, h: 180 }, labelY: 1170 }], pace: 1, countdowns: [{ at: 20, from: 20, beeps: 10, said: t('발사까지'), go: t('이륙!') }, { at: 130, from: 25, beeps: 10, said: t('달로 가는 점화까지'), go: t('점화!') }, { at: 800, from: 30, beeps: 10, said: t('지구로 돌아가는 점화까지'), go: t('점화!') }], met: [[20, 0], [92, 0.197], [130, 2.73], [294, 75.83], [490, 100.2], [595, 102.76], [660, 109.41], [700, 124.37], [748, 128.05], [800, 135.4], [980, 195.05], [1080, 195.3]], phases: [[20, t('발사')], [100, t('지구 궤도')], [130, t('달로 가는 길')], [300, t('달 궤도')], [490, t('달로 내려가는 중')], [595, t('달 표면')], [700, t('달 궤도')], [800, t('지구로 가는 길')], [980, t('대기권 진입')], [1080, t('태평양')]], startS: -26, photos: [{ from: -26, to: -12, src: 'assets/tours/kennedy-pan.jpg', pan: [5, 90], zoom: [1.06, 1] }, { from: -12, to: 0, src: 'assets/tours/pad.jpg', pan: [61, 61], zoom: [1, 3.2], origin: '50% 32%' }], parkKm: 190, moonKm: 110, legs: { launch: 100, park: 30, burn: 50, coast: 230, rise: 290, undock: 405, land: 495, liftoff: 600, dock: 650, tei: 700, teiEnd: 720, home: 880, chute: 940, end: 980 } }, name: t('아폴로 11호의 길'), todo: t('지구를 돌다 달로 떠나, 사흘 길을 건너 달 뒤편을 돌며 지구돋이를 봅니다.') },
  // Discovery's flight that let Hubble go, STS-31, April 1990 (the user, 2026-11-19:
  // "우주왕복선 중에서 유명한게 뭐였지? 그거 관광 비행 코스"; the flight chosen with GPT): from the
  // aft flight deck, Hubble just let go of, over the Earth; the shuttle backs away and the
  // telescope goes small; at the end the view turns to the horizon ahead.
  { id: 'discovery', body: 'earth', lapS: 480, rail: { shuttle: true, arm: true, cabin: 'assets/tours/shuttle-cabin.webp', floaters: ['assets/tours/candy.webp'], pace: 50, nearKm: 14, farKm: 600, turnS: 330, loops: true, fades: [479.2], startS: -30, photos: [{ from: -30, to: -14, src: 'assets/tours/hubble-grapple.jpg', pan: [30, 62], zoom: [1.08, 1] }, { from: 440, to: 480, src: 'assets/tours/pillars.jpg', pan: [18, 48], zoom: [1.15, 1], origin: '50% 30%' }], countdowns: [{ at: 0, from: 10, beeps: 10, said: t('허블 분리 카운트다운'), go: t('분리!'), goCue: 'click' }], met: [[-30, 30.55], [0, 31.07], [330, 32.6], [480, 33.2]], phases: [[-30, t('놓기 전')], [0, t('놓아줌')], [40, t('멀어지는 중')], [330, t('지구 궤도')]], captions: [{ at: -29, text: t('1990년 4월 25일, 지구 위 612km. 우주 왕복선 디스커버리의 로봇팔이 허블 우주망원경을 들고 있습니다.') }, { at: -18, text: t('팔을 움직이는 사람은 스티븐 홀리. 이제 허블을 우주에 놓아줄 차례입니다.') }, { at: 1, text: t('허블이 팔에서 떨어졌습니다. 이제 혼자 우주에 떠 있습니다.') }, { at: 14, text: t('길이 13m, 무게 11톤. 버스 한 대만 한 망원경입니다.') }, { at: 42, text: t('디스커버리가 허블에게서 천천히 멀어집니다.') }, { at: 68, text: t('이름은 천문학자 에드윈 허블에게서 왔습니다. 우리 은하 밖에도 은하가 있고, 우주가 커지고 있다는 것을 밝힌 사람입니다.') }, { at: 96, text: t('별이 반짝이는 것은 공기가 별빛을 흔들기 때문입니다. 허블은 공기가 없는 우주에서 흔들림 없는 별빛을 봅니다.') }, { at: 124, text: t('거울의 지름은 2.4m. 허블은 95분마다 지구를 한 바퀴 돕니다.') }, { at: 152, text: t('그런데 첫 사진이 흐렸습니다. 거울 가장자리가 머리카락 굵기의 50분의 1만큼 잘못 깎여 있었습니다.') }, { at: 180, text: t('1993년 우주비행사들이 찾아가, 안경을 씌우듯 흐림을 바로잡는 장치를 달았습니다.') }, { at: 208, text: t('그 뒤로도 2009년까지 모두 다섯 번 찾아가 허블을 고치고 새 장비를 달았습니다.') }, { at: 236, text: t('창밖의 허블은 2002년에 고치러 갔을 때 찍은 실제 사진입니다.') }, { at: 264, text: t('1995년, 허블은 빈 하늘의 작은 점 하나를 열흘 동안 보았습니다. 그 안에 은하가 3천 개쯤 있었습니다.') }, { at: 292, text: t('허블은 우주가 얼마나 빨리 커지는지 재어, 우주의 나이를 더 정확히 알게 해 주었습니다.') }, { at: 334, text: t('디스커버리가 앞쪽 지평선으로 몸을 돌립니다. 나흘 뒤 지구로 돌아갑니다.') }, { at: 364, text: t('그 뒤 36년. 허블은 지금도 지구를 돌며 하늘을 보고 있습니다.') }, { at: 395, text: t('허블이 보낸 자료로 쓴 논문은 2만 편이 넘습니다.') }, { at: 442, text: t('1995년 허블이 찍은 「창조의 기둥」. 별이 태어나는 가스 기둥으로, 6,500광년 떨어져 있습니다.') }, { at: 458, text: t('맨 왼쪽 기둥의 길이는 약 4광년. 허블이 본 수많은 우주 가운데 하나입니다.') }] }, name: t('우주 왕복선 디스커버리와 허블'), todo: t('1990년 우주 왕복선 디스커버리가 허블 우주망원경을 우주에 놓아준 날, 조종실 창으로 멀어지는 허블을 봅니다.') },
  // Bruce McCandless's flight on the MMU from Challenger, 7 February 1984, the first
  // untethered spacewalk, seen from inside his helmet (the user, 2026-11-20: "우주 왕복선에서 우주
  // 유영하는걸 추천 코스로", "우주 유영을 1인칭 시점으로"): Challenger (a cut-out of the photo he
  // took) in Hubble's place, falling back to about 100 m and coming near again.
  { id: 'mmu', body: 'earth', lapS: 340, rail: { shuttle: true, mmu: true, craftModel: 'challenger', doorsS: [-44, -36], armPose: { yaw: 0.12, pitch: 0.12, elbow: -0.15 }, noseDeg: 35, feel: true, air: 'assets/tours/helmet-air.mp3', hands: 'assets/tours/helmet-hands.webp', cabin: 'assets/tours/none.png', cabins: [{ at: -100, cabin: 'assets/tours/none.png' }, { at: -4, cabin: 'assets/tours/helmet-rim.webp' }], floaters: [], nearS: [-62, -46], farOutKm: 900, nearOutKm: 80, outS: [-32, -20], roundS: [-22, -10], figureOutKm: 11, figureKm: 3.4, figure: { src: 'assets/tours/mmu-figure.webp', aspect: 1029 / 900, width: 1 }, pace: 50, nearKm: 7, farKm: 140, turnS: 100000, aimOff: [0, 0], craftKm: 46, kmAt: [[0, 140], [20, 150], [170, 280], [230, 280], [320, 150], [340, 140]], figureEndKm: 50, loops: true, fades: [339.2], startS: -64, photos: [{ from: -8, to: 2.5, fadeS: 2.5, src: 'assets/tours/mmu-face.jpg', pan: [50, 50], zoom: [1, 4.5], origin: '54% 22%' }], phases: [[-64, t('챌린저 곁')], [0, t('홀로 나는 중')], [230, t('돌아가는 중')]], captions: [{ at: -62, text: t('1984년 2월 7일, 지구 위를 도는 우주 왕복선 챌린저.') }, { at: -44, text: t('화물칸 문이 열립니다.') }, { at: -32, text: t('브루스 매캔들리스가 등에 추진기를 메고 화물칸에서 나옵니다.') }, { at: -20, text: t('줄 하나 없이 우주를 나는 첫 우주 유영입니다.') }, { at: -14, text: t('이제 그의 헬멧 안으로 들어갑니다.') }, { at: 3, text: t('등에 멘 추진기의 이름은 MMU. 질소 가스를 뿜는 작은 분사구 24개로 움직입니다.') }, { at: 28, text: t('양손의 손잡이로 앞뒤, 위아래로 가고 몸을 돌립니다.') }, { at: 55, text: t('이제 챌린저와 그를 잇는 줄은 없습니다. 그 스스로가 작은 우주선입니다.') }, { at: 85, text: t('둘 다 시속 2만 8천km로 지구를 돌고 있지만, 함께 돌기에 서로는 거의 멈춘 듯 보입니다.') }, { at: 115, text: t('챌린저가 점점 작아집니다. 그는 약 100m까지 멀어졌습니다.') }, { at: 150, text: t('15년 전 아폴로 11호 때, 매캔들리스는 휴스턴에서 달 위의 암스트롱과 교신하던 사람이었습니다.') }, { at: 180, text: t('떠나며 그는 말했습니다. "닐에게는 작은 한 걸음이었겠지만, 내게는 엄청나게 큰 도약이다."') }, { at: 210, text: t('그는 이 추진기를 만드는 일에 오래 힘을 보탰습니다.') }, { at: 240, text: t('이제 챌린저로 돌아갑니다.') }, { at: 270, text: t('이날 동료 로버트 스튜어트도 같은 추진기로 날았습니다.') }, { at: 300, text: t('이날의 우주 유영은 5시간 55분 동안 이어졌습니다.') }] }, name: t('줄 하나 없이 우주 유영'), todo: t('1984년 줄 하나 없이 우주를 난 첫 사람, 브루스 매캔들리스의 헬멧 안에서 멀어지는 챌린저를 봅니다.') },
  { id: 'orbitSunrise', body: 'earth', lapS: 360, rail: { orbit: true, highKm: 400, lookDeg: 12, startS: 22 }, name: t('궤도 일출'), todo: t('지구 400km 위를 돌며 밤에서 낮으로 넘어갑니다. 지평선에 빨강, 주황, 파랑의 띠가 켜지고 태양이 솟습니다.') },
  { id: 'milkyWay', body: 'earth', lapS: 180, radii: 8, rollDeg: 35, sky: 'milkyWay', name: t('은하수 일주'), todo: t('은하수가 놓인 평면을 따라 지구 둘레를 비행합니다. 은하 중심에서 출발합니다.') },
  { id: 'orion', body: 'earth', lapS: 150, radii: 6, sky: 'm42', overDeg: 16, name: t('오리온 대성운'), todo: t('지구를 돌면서 겨울 밤하늘의 붉은 성운을 봅니다.') },
  { id: 'andromeda', body: 'moon', lapS: 150, radii: 7, sky: 'm31', overDeg: 16, name: t('안드로메다은하'), todo: t('달을 돌면서 안드로메다은하와 곁의 삼각형자리 은하를 봅니다.') },
  { id: 'pleiades', body: 'earth', lapS: 150, radii: 6, sky: 'm45', overDeg: 16, name: t('플레이아데스'), todo: t('지구를 돌면서 일곱 자매 별무리를 봅니다.') },
  { id: 'moonLow', body: 'moon', lapS: 120, radii: 1.25, name: t('달 저공비행'), todo: t('달의 땅 위를 낮게 돌며 크레이터를 내려다봅니다.'),
    sun: { from: [0.6, 0.35, 0.7], toward: [-0.7, 0, 0.6] } },
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
export function railAt(course, body, sun, seconds, moon = null, hubble = null) {
  if (course.rail.mmu && seconds < 0) return mmuAt(course, body, hubble, seconds, sun);
  if (course.rail.shuttle) return shuttleAt(course, body, hubble, seconds, sun);
  if (course.rail.apollo) return apolloAt(course, body, moon, seconds, sun);
  if (course.rail.orbit) return orbitAt(course, body, sun, seconds);
  if (course.rail.cupola) return cupolaAt(course, body, sun, seconds);
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
  const descent = (t) => {
    const x = Math.min(1, Math.max(0, (t - legs.undock) / (legs.land - legs.undock)));
    const a = aUndock + (aLand - aUndock) * (1 - (1 - x) ** 1.6);
    const h = EYE + moonKm * (1 - x) ** 2.2;
    const over = 3 - 21 * smooth(0.45, 0.8, x) + 15 * smooth(0.85, 1, x);
    const position = atMoon(a, h);
    return { position, look: moonLook(position, a, over), up: outAt(a) };
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
export function courseStart(course, body, sun, ringNormal = null, moon = null, hubble = null) {
  if (course.rail) return { ...railAt(course, body, sun, course.rail.startS, moon, hubble), slide: {} };
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
