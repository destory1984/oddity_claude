import { SPIN_DAY_S, EARTH_START_SPIN, spinAngle, surfaceDirection } from './surface.js';

// Story places: spots where something real happened. Reaching one logs it in the
// journal and tells its story. Each is added by hand.
//   surface: land on the body within withinKm of the spot (east longitude, north latitude)
//   land: touch the body anywhere
//   near: come within withinKm of the target's surface (a body or a spacecraft)
//   far: go at least beyondKm from the target's centre
export const STORIES = [
  {
    id: 'apollo11', name: '아폴로 11호 착륙지', nameEn: 'Apollo 11', year: 1969,
    type: 'surface', body: 'moon', latDeg: 0.674, lonDeg: 23.473, withinKm: 150,
    hint: '달 고요의 바다(북위 0.7도, 동경 23.5도) 150km 안에 내려앉기',
    text: '1969년 7월 20일, 닐 암스트롱과 버즈 올드린이 이곳에 내려 21시간 36분 머물렀습니다.',
  },
  {
    id: 'viking1', name: '바이킹 1호 착륙지', nameEn: 'Viking 1', year: 1976,
    type: 'surface', body: 'mars', latDeg: 22.27, lonDeg: -47.95, withinKm: 150,
    hint: '화성 크리세 평원(북위 22.3도, 서경 48도) 150km 안에 내려앉기',
    text: '1976년 7월 20일 화성에 내려 처음으로 표면 사진을 보내고, 6년 넘게 일했습니다.',
  },
  {
    id: 'huygens', name: '하위헌스 착륙지', nameEn: 'Huygens', year: 2005,
    type: 'surface', body: 'titan', latDeg: -10.57, lonDeg: 167.66, withinKm: 150,
    hint: '타이탄(남위 10.6도, 서경 192.3도) 150km 안에 내려앉기',
    text: '2005년 1월 14일 타이탄에 내렸습니다. 지구에서 가장 먼 곳에 내린 착륙선입니다.',
  },
  {
    id: 'cassini', name: '카시니의 마지막 돌입', nameEn: 'Cassini', year: 2017,
    type: 'land', body: 'saturn',
    hint: '토성의 구름 꼭대기에 닿기',
    text: '13년 동안 토성을 돈 카시니는 2017년 9월 15일 토성 대기로 뛰어들어 타 버렸습니다.',
  },
  {
    id: 'newHorizons', name: '뉴허라이즌스의 최근접', nameEn: 'New Horizons', year: 2015,
    type: 'near', target: 'pluto', withinKm: 12500,
    hint: '명왕성 표면 12,500km 안을 지나기',
    text: '2015년 7월 14일, 9년 반을 날아온 뉴허라이즌스가 명왕성을 12,500km 거리로 스쳐 갔습니다.',
  },
  {
    id: 'giotto', name: '지오토의 혜성 통과', nameEn: 'Giotto', year: 1986,
    type: 'near', target: 'halley', withinKm: 600,
    hint: '핼리 혜성의 핵 600km 안을 지나기',
    text: '1986년 3월 14일 지오토가 핼리의 핵을 596km 거리에서 지나며 처음으로 혜성 핵을 찍었습니다.',
  },
  {
    id: 'voyager1', name: '보이저 1호의 길', nameEn: 'Voyager 1', year: 2012,
    type: 'near', target: 'voyager1', withinKm: 5000,
    hint: '보이저 1호 5,000km 안까지 따라가기',
    text: '1977년 떠난 보이저 1호는 2012년 8월 태양권을 벗어나 별 사이 공간에 들어섰습니다.',
  },
  // The photograph Voyager 1 took looking back from 6 billion km. Distances between
  // bodies are a hundredth of the real ones here, so that is 60 million km: about as
  // far from Earth as Pluto's orbit.
  {
    id: 'paleBlueDot', name: '창백한 푸른 점', nameEn: 'Pale Blue Dot', year: 1990,
    type: 'far', target: 'earth', beyondKm: 6e7,
    hint: '지구에서 6,000만km 넘게 멀어지기 (실제 거리로 60억km, 명왕성 궤도쯤)',
    text: '1990년 2월 14일 보이저 1호가 60억km 밖에서 돌아본 지구는 한 픽셀도 안 되는 푸른 점이었습니다.',
  },
  // Dokdo, in the East Sea. The map shows 10 km per pixel, so the island cannot be
  // seen; the label marks where it is.
  {
    id: 'dokdo', name: '독도', nameEn: 'Dokdo',
    type: 'surface', body: 'earth', latDeg: 37.2417, lonDeg: 131.8667, withinKm: 40,
    hint: '지구 동해의 독도(북위 37.2도, 동경 131.9도) 40km 안에 내려앉기',
    text: '대한민국의 가장 동쪽 섬입니다. 울릉도에서 87.4km 떨어져 있고, 동도와 서도와 89개의 바위섬으로 이루어져 있습니다.',
  },
];

// Landers and rovers still standing where they came down (or, for Luna 2, where it hit):
// [id, name, nameEn, year, latDeg, east lonDeg, the place's name, story].
const MOON_LANDINGS = [
  ['luna2', '루나 2호 충돌지', 'Luna 2', 1959, 29.1, 0.0, '비의 바다 동쪽', '1959년 9월 14일 소련의 루나 2호가 이곳에 부딪혔습니다. 사람이 만든 것이 처음으로 다른 천체에 닿았습니다.'],
  ['luna9', '루나 9호 착륙지', 'Luna 9', 1966, 7.08, -64.37, '폭풍의 바다 서쪽', '1966년 2월 3일 처음으로 달에 부드럽게 내려 표면 사진을 보냈습니다. 달이 먼지 늪이 아님을 알렸습니다.'],
  ['surveyor1', '서베이어 1호 착륙지', 'Surveyor 1', 1966, -2.474, -43.339, '폭풍의 바다', '1966년 6월 미국이 처음으로 달에 부드럽게 내린 착륙선입니다. 사진 1만 1천 장을 보냈습니다.'],
  ['surveyor7', '서베이어 7호 착륙지', 'Surveyor 7', 1968, -40.981, -11.513, '티코 분화구 북쪽', '1968년 1월 서베이어의 마지막 착륙선이 티코 분화구 가장자리에 내려 고지대의 흙을 분석했습니다.'],
  ['apollo12', '아폴로 12호 착륙지', 'Apollo 12', 1969, -3.0124, -23.4216, '폭풍의 바다', '1969년 11월, 2년 반 전에 내린 서베이어 3호 곁 180m에 내려 그 부품을 떼어 지구로 가져왔습니다.'],
  ['luna16', '루나 16호 착륙지', 'Luna 16', 1970, -0.5137, 56.3638, '풍요의 바다', '1970년 9월 사람 없이 달의 흙 101g을 떠서 지구로 가져온 첫 탐사선입니다.'],
  ['lunokhod1', '루노호트 1호', 'Lunokhod 1', 1970, 38.2378, -35.0017, '비의 바다', '1970년 11월 루나 17호가 내려놓은 첫 달 탐사차입니다. 바퀴 여덟으로 열 달 동안 10.5km를 달렸습니다.'],
  ['apollo14', '아폴로 14호 착륙지', 'Apollo 14', 1971, -3.6453, -17.4714, '프라 마우로', '1971년 2월 앨런 셰퍼드가 이곳에서 골프공 두 개를 쳤습니다. 손수레를 끌고 돌 43kg을 모았습니다.'],
  ['apollo15', '아폴로 15호 착륙지', 'Apollo 15', 1971, 26.1322, 3.6339, '해들리 열구', '1971년 7월 처음으로 월면차를 몰았습니다. 깃털과 망치를 함께 떨어뜨려 동시에 닿는 것을 보였습니다.'],
  ['apollo16', '아폴로 16호 착륙지', 'Apollo 16', 1972, -8.973, 15.5002, '데카르트 고지', '1972년 4월 달의 고지대에 내린 하나뿐인 아폴로입니다. 월면차로 27km를 달렸습니다.'],
  ['apollo17', '아폴로 17호 착륙지', 'Apollo 17', 1972, 20.1908, 30.7717, '타우루스-리트로 계곡', '1972년 12월 사람이 마지막으로 달을 걸은 곳입니다. 지질학자 슈미트가 주황색 흙을 찾았습니다.'],
  ['lunokhod2', '루노호트 2호', 'Lunokhod 2', 1973, 25.85, 30.45, '르 모니에 분화구', '1973년 1월 루나 21호가 내려놓은 탐사차입니다. 넉 달 동안 39km를 달려 40년 넘게 기록을 지켰습니다.'],
  ['luna24', '루나 24호 착륙지', 'Luna 24', 1976, 12.7145, 62.2129, '위기의 바다', '1976년 8월 달 흙 170g을 가져온 소련의 마지막 달 탐사선입니다. 그 뒤 37년 동안 아무도 달에 내리지 않았습니다.'],
  ['change3', '창어 3호 착륙지', "Chang'e 3", 2013, 44.1214, -19.5116, '비의 바다 북쪽', '2013년 12월 중국의 창어 3호가 탐사차 위투(옥토끼)와 함께 내렸습니다. 37년 만의 달 착륙입니다.'],
  ['change4', '창어 4호 착륙지', "Chang'e 4", 2019, -45.4446, 177.5991, '뒷면 폰 카르만 분화구', '2019년 1월 3일 처음으로 달의 뒷면에 내렸습니다. 탐사차 위투 2호가 함께 갔습니다.'],
  ['change5', '창어 5호 착륙지', "Chang'e 5", 2020, 43.0576, -51.9161, '폭풍의 바다 북쪽', '2020년 12월 달 흙 1,731g을 지구로 가져왔습니다. 44년 만의 달 시료입니다.'],
  ['chandrayaan3', '찬드라얀 3호 착륙지', 'Chandrayaan-3', 2023, -69.373, 32.319, '남극 가까이', '2023년 8월 23일 인도의 비크람 착륙선이 달 남극 가까이에 처음 내렸습니다. 탐사차 프라그얀이 함께 갔습니다.'],
  ['slim', '슬림 착륙지', 'SLIM', 2024, -13.316, 25.251, '시올리 분화구', '2024년 1월 일본의 슬림이 목표 100m 안에 내렸습니다. 엔진 하나가 떨어져 코를 박은 채로 섰습니다.'],
  ['odysseus', '오디세우스 착륙지', 'Odysseus', 2024, -80.13, 1.44, '남극 말라퍼트 A 분화구', '2024년 2월 민간 기업이 만든 착륙선이 처음으로 달에 내렸습니다. 다리가 걸려 옆으로 누웠습니다.'],
  ['change6', '창어 6호 착륙지', "Chang'e 6", 2024, -41.6385, -153.9852, '뒷면 아폴로 분지', '2024년 6월 달 뒷면의 흙 1,935g을 처음으로 지구에 가져왔습니다.'],
  ['blueGhost', '블루 고스트 착륙지', 'Blue Ghost', 2025, 18.56, 61.81, '위기의 바다', '2025년 3월 2일 민간 착륙선으로는 처음 똑바로 서서 내려, 2주 동안 일하고 달의 일몰을 찍었습니다.'],
];
const MARS_LANDINGS = [
  ['mars3', '마스 3호 착륙지', 'Mars 3', 1971, -45, -158, '남쪽 고지대', '1971년 12월 2일 소련의 마스 3호가 화성에 처음 부드럽게 내렸습니다. 신호는 20초도 안 되어 끊겼습니다.'],
  ['viking2', '바이킹 2호 착륙지', 'Viking 2', 1976, 47.64, 134.29, '유토피아 평원', '1976년 9월 3일 내려 아침마다 땅에 서리가 끼는 것을 찍었습니다. 3년 7개월 일했습니다.'],
  ['pathfinder', '패스파인더 착륙지', 'Pathfinder', 1997, 19.13, -33.22, '아레스 계곡', '1997년 7월 4일 공기 주머니에 싸여 튀며 내렸습니다. 첫 화성 탐사차 소저너가 83일 동안 돌아다녔습니다.'],
  ['beagle2', '비글 2호 착륙지', 'Beagle 2', 2003, 11.53, 90.43, '이시디스 평원', '2003년 성탄절에 내린 영국 착륙선입니다. 소식이 끊겼다가 11년 뒤 사진에서 태양전지판이 덜 펴진 채 발견됐습니다.'],
  ['spirit', '스피릿', 'Spirit', 2004, -14.5684, 175.4726, '구세프 분화구', '2004년 1월 내린 탐사차입니다. 90일 임무였으나 6년을 일하다 모래에 빠져 멈췄습니다.'],
  ['opportunity', '오퍼튜니티', 'Opportunity', 2004, -1.9462, -5.5266, '메리디아니 평원', '90일 임무로 왔다가 14년 동안 45km를 달렸습니다. 2018년 먼지 폭풍 속에서 교신이 끊겼습니다.'],
  ['phoenix', '피닉스 착륙지', 'Phoenix', 2008, 68.22, -125.7, '북극 평원', '2008년 5월 화성 북극 가까이 내려 흙 밑의 얼음을 파냈습니다. 겨울이 오자 얼어붙어 멈췄습니다.'],
  ['curiosity', '큐리오시티', 'Curiosity', 2012, -4.5895, 137.4417, '게일 분화구', '2012년 8월 자동차만 한 탐사차가 줄에 매달려 내렸습니다. 지금도 샤프산을 오르고 있습니다.'],
  ['insight', '인사이트 착륙지', 'InSight', 2018, 4.5024, 135.6234, '엘리시움 평원', '2018년 11월 내려 화성의 지진 1,300번을 듣고 속을 쟀습니다. 4년 뒤 먼지에 덮여 멈췄습니다.'],
  ['perseverance', '퍼서비어런스', 'Perseverance', 2021, 18.4447, 77.4508, '예제로 분화구', '2021년 2월 옛 호수 바닥에 내려 돌 시료를 모으고 있습니다. 헬리콥터 인저뉴어티가 72번 날았습니다.'],
  ['zhurong', '주룽', 'Zhurong', 2021, 25.066, 109.925, '유토피아 평원 남쪽', '2021년 5월 중국의 첫 화성 탐사차 주룽이 내렸습니다. 1년 동안 1.9km를 달린 뒤 겨울잠에서 깨지 못했습니다.'],
];

const degrees = (value, plus, minus) => `${value < 0 ? minus : plus} ${Math.abs(value).toFixed(1)}도`;
function landing(body, bodyName, [id, name, nameEn, year, latDeg, lonDeg, place, text]) {
  return {
    id, name, nameEn, year, type: 'surface', body, latDeg, lonDeg, withinKm: 150,
    hint: `${bodyName} ${place}(${degrees(latDeg, '북위', '남위')}, ${degrees(lonDeg, '동경', '서경')}) 150km 안에 내려앉기`,
    text,
  };
}
STORIES.push(
  ...MOON_LANDINGS.map((row) => landing('moon', '달', row)),
  ...MARS_LANDINGS.map((row) => landing('mars', '화성', row)),
);

// Famous places on the Moon and Mars themselves: craters, seas, mountains. No machine
// stands there, so they get a label and a story but no model (landmark: true).
// [id, name, nameEn, latDeg, east lonDeg, withinKm, story].
const MOON_LANDMARKS = [
  ['tycho', '티코 분화구', 'Tycho', -43.31, -11.36, 150, '1억 800만 년 전에 생긴 지름 85km 분화구입니다. 보름달에 사방으로 뻗은 흰 빛줄기가 여기서 나옵니다.'],
  ['copernicus', '코페르니쿠스 분화구', 'Copernicus', 9.62, -20.08, 150, '지름 93km, 깊이 3.8km의 분화구입니다. 계단처럼 층진 벽과 가운데 봉우리가 뚜렷합니다.'],
  ['tranquillitatis', '고요의 바다', 'Mare Tranquillitatis', 8.5, 31.4, 200, '용암이 굳어 생긴 어두운 평원입니다. 1969년 사람이 처음 달에 내린 곳이 이 바다의 남서쪽입니다.'],
  ['imbrium', '비의 바다', 'Mare Imbrium', 32.8, -15.6, 200, '39억 년 전 큰 충돌로 생긴 지름 1,100km 분지에 용암이 찬 곳입니다. 달 앞면의 둥근 바다 가운데 가장 큽니다.'],
  ['procellarum', '폭풍의 대양', 'Oceanus Procellarum', 18.4, -57.4, 200, '달에서 가장 넓은 바다로 남북으로 2,500km가 넘습니다. 달의 바다 가운데 홀로 대양이라 불립니다.'],
  ['aitken', '남극-에이트켄 분지', 'South Pole-Aitken', -53, -169, 300, '지름 약 2,500km, 깊이 8km로 달에서 가장 크고 오래된 충돌 분지입니다. 달 뒷면 남쪽을 거의 다 차지합니다.'],
  ['shackleton', '섀클턴 분화구', 'Shackleton', -89.67, 129.78, 150, '달 남극에 있는 지름 21km 분화구입니다. 바닥에 햇빛이 한 번도 들지 않아 얼음이 있을 것으로 봅니다.'],
  ['apennines', '아펜니노 산맥', 'Montes Apenninus', 18.9, -3.7, 150, '비의 바다 가장자리를 따라 600km 뻗은 산맥입니다. 가장 높은 하위헌스산은 5,500m입니다.'],
  ['alpineValley', '알프스 계곡', 'Vallis Alpes', 48.5, 3.2, 150, '알프스 산맥을 가로지르는 길이 166km, 폭 10km의 곧은 골짜기입니다.'],
  ['straightWall', '직선벽', 'Rupes Recta', -21.8, -7.8, 150, '길이 110km, 높이 약 300m의 곧은 단층 절벽입니다. 해가 낮게 비치면 검은 선으로 보입니다.'],
  ['moscoviense', '모스크바의 바다', 'Mare Moscoviense', 27.3, 147.9, 200, '달 뒷면에 드문 바다입니다. 1959년 루나 3호가 처음 찍은 뒷면 사진에서 발견되어 이름이 붙었습니다.'],
  ['tsiolkovskiy', '치올콥스키 분화구', 'Tsiolkovskiy', -20.4, 129.1, 150, '달 뒷면에서 가장 눈에 띄는 분화구입니다. 지름 185km 바닥에 검은 용암이 차 있고 가운데 봉우리가 솟아 있습니다.'],
  // More of the near side, the face seen from Earth.
  ['serenitatis', '맑음의 바다', 'Mare Serenitatis', 28.0, 17.5, 200, '지름 670km쯤의 둥근 바다입니다. 지구에서 보면 달 토끼의 머리 자리입니다. 아폴로 17호가 그 가장자리에 내렸습니다.'],
  ['crisium', '위난의 바다', 'Mare Crisium', 17.0, 59.1, 200, '다른 바다와 떨어져 홀로 있는 지름 550km쯤의 둥근 바다입니다. 달 동쪽 가장자리에 있어 맨눈으로도 보입니다.'],
  ['plato', '플라톤 분화구', 'Plato', 51.6, -9.4, 150, '지름 100km쯤의 분화구입니다. 바닥을 용암이 매끈하게 채워, 밝은 산맥 사이의 검은 호수처럼 보입니다.'],
  ['aristarchus', '아리스타르코스 분화구', 'Aristarchus', 23.7, -47.4, 150, '달 앞면에서 가장 밝은 곳입니다. 지름 40km의 젊은 분화구로, 둘레보다 두 배쯤 밝게 빛납니다.'],
  ['kepler', '케플러 분화구', 'Kepler', 8.1, -38.0, 150, '폭풍의 대양 한가운데 있는 지름 30km쯤의 분화구입니다. 밝은 빛줄기가 300km 넘게 뻗어 있습니다.'],
  ['clavius', '클라비우스 분화구', 'Clavius', -58.4, -14.4, 150, '지름 231km로 달 앞면에서 손꼽히게 큰 분화구입니다. 2020년 이곳의 햇빛 드는 땅에서 물 분자가 확인됐습니다.'],
  ['iridum', '무지개의 만', 'Sinus Iridum', 44.1, -31.5, 150, '비의 바다 북서쪽에 반달 모양으로 파인 지름 240km쯤의 만입니다. 쥐라 산맥이 둥글게 둘러싸고 있습니다.'],
  ['reinerGamma', '라이너 감마', 'Reiner Gamma', 7.5, -59.0, 150, '폭풍의 대양에 그려진 길이 70km쯤의 밝은 소용돌이 무늬입니다. 높낮이가 없는 평지에 색만 다릅니다.'],
];
// The sights of Mars: its volcanoes, canyon, basins and ice caps.
const MARS_LANDMARKS = [
  ['olympus', '올림푸스산', 'Olympus Mons', 18.65, -133.8, 300, '높이 22km, 지름 600km쯤의 화산입니다. 에베레스트의 두 배 반 높이로, 태양계에서 알려진 가장 큰 화산입니다.'],
  ['marineris', '마리너 계곡', 'Valles Marineris', -13.9, -59.2, 300, '길이 4,000km, 깊이 7km의 협곡입니다. 화성 둘레의 5분의 1을 가로지르고, 그랜드 캐니언보다 아홉 배 깁니다.'],
  ['tharsis', '타르시스 세 화산', 'Tharsis Montes', 1.48, -112.96, 200, '높이 14 → 18km의 화산 셋이 700km 간격으로 한 줄로 서 있습니다. 가운데 파보니스산은 적도 위에 있습니다.'],
  ['hellas', '헬라스 분지', 'Hellas Planitia', -42.4, 70.5, 300, '지름 2,300km, 깊이 7km의 충돌 분지입니다. 화성에서 가장 낮은 곳이고, 바닥의 기압은 평균의 두 배쯤입니다.'],
  ['northCap', '북극관', 'Planum Boreum', 87.0, 0.0, 300, '지름 1,000km쯤의 얼음 모자입니다. 두께 2km의 물 얼음 위에, 겨울마다 드라이아이스가 1m쯤 덮입니다.'],
  ['southCap', '남극관', 'Planum Australe', -87.0, 160.0, 300, '화성 남극의 얼음 모자입니다. 물 얼음 위에 드라이아이스가 덮여 있고, 그 층은 여름에도 다 사라지지 않습니다.'],
  ['korolev', '코롤료프 분화구', 'Korolev', 72.77, 164.58, 150, '지름 82km의 분화구에 두께 1.8km의 물 얼음이 한 해 내내 녹지 않고 차 있습니다.'],
  ['cydonia', '시도니아의 얼굴', 'Cydonia', 40.75, -9.46, 150, '1976년 바이킹 1호의 사진에서 사람 얼굴처럼 보인 길이 2km쯤의 언덕입니다. 뒤에 또렷한 사진으로 보니 평범한 언덕이었습니다.'],
  ['syrtis', '시르티스 메이저', 'Syrtis Major', 8.4, 69.5, 300, '1659년 하위헌스가 망원경으로 보고 그린, 다른 행성의 지형으로는 처음 기록된 곳입니다. 어두운 현무암 화산 지대입니다.'],
];
const landmark = (body, bodyName) => ([id, name, nameEn, latDeg, lonDeg, withinKm, text]) => ({
  id, name, nameEn, type: 'surface', body, latDeg, lonDeg, withinKm, landmark: true,
  hint: `${bodyName} ${name}(${degrees(latDeg, '북위', '남위')}, ${degrees(lonDeg, '동경', '서경')}) ${withinKm}km 안에 내려앉기`,
  text,
});
STORIES.push(...MOON_LANDMARKS.map(landmark('moon', '달')), ...MARS_LANDMARKS.map(landmark('mars', '화성')));

// Rosetta flew beside 67P for two years and set Philae down on it.
STORIES.push({
  id: 'rosetta', name: '로제타와 필레', nameEn: 'Rosetta', year: 2014,
  type: 'near', target: 'churyumov', withinKm: 300,
  hint: '추류모프-게라시멘코 혜성의 핵 300km 안을 지나기',
  text: '2014년 11월 12일 로제타의 착륙선 필레가 이 혜성에 내렸습니다. 혜성에 내린 첫 탐사선입니다.',
});

// A place's label shows only from within this many of its body's radii above the
// surface (the Moon: 6,950 km; Mars: 13,560 km), like the craft that circle a planet
// (core/craft.js hiddenCraft). From farther off the names pile up on the disc.
export const SITE_SHOWN_RADII = 4;
export function siteFar(body, position) {
  return Math.hypot(...position.map((n, i) => n - body.position[i])) - body.radiusKm > SITE_SHOWN_RADII * body.radiusKm;
}

const gap = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));

// Where the surface places are at game time timeS. They are shown and selected like
// spacecraft (kind 'site', no size), and turn with their body.
export function storySitesAt(timeS, bodies) {
  return STORIES.filter((s) => s.type === 'surface').map((s) => {
    const body = bodies.find((b) => b.id === s.body);
    const start = s.body === 'earth' ? EARTH_START_SPIN : 0;
    const up = surfaceDirection(s.latDeg, s.lonDeg, spinAngle(SPIN_DAY_S[s.body], timeS, start));
    return {
      id: s.id, name: s.name, nameEn: s.nameEn, kind: 'site', parent: s.body, radiusKm: 0, landmark: Boolean(s.landmark),
      position: body.position.map((n, i) => n + up[i] * body.radiusKm),
    };
  });
}

// The stories whose place the traveler is at right now.
export function completedStories({ position, restingOn, bodies, craft = [], sites }) {
  return STORIES.filter((s) => {
    if (s.type === 'land') return restingOn === s.body;
    if (s.type === 'surface') {
      return restingOn === s.body && gap(position, sites.find((site) => site.id === s.id).position) <= s.withinKm;
    }
    const target = bodies.find((b) => b.id === s.target) ?? craft.find((c) => c.id === s.target);
    if (s.type === 'far') return Boolean(target) && gap(position, target.position) >= s.beyondKm;
    return Boolean(target) && gap(position, target.position) - target.radiusKm <= s.withinKm;
  }).map((s) => s.id);
}

// True when the body itself is in the way: the place is over the horizon from here.
export function siteHidden(site, body, position) {
  const up = site.position.map((n, i) => (n - body.position[i]) / body.radiusKm);
  const out = position.map((n, i) => n - body.position[i]);
  const distance = Math.hypot(...out);
  if (distance <= body.radiusKm) return false;
  const cos = up.reduce((s, n, i) => s + n * out[i], 0) / distance;
  return cos < body.radiusKm / distance;
}
