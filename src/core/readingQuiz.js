// One question under the reading of every body and craft in the close view
// (ui/inspectInfo.js), as the story cards have theirs (core/storyQuiz.js). The answer is
// always a phrase in the reading itself (core/readings.js), so nothing here is a new fact.
// [body or craft id, question, the answer, a wrong choice, another wrong choice]
import { arrange } from './storyQuiz.js';
import { t } from './i18n.js';

const ROWS = [
  ['sun', t('빛이 지구에 닿는 데 걸리는 시간은?'), t('8분 20초'), t('1초'), t('1시간')],
  ['mercury', t('해가 떠서 다음 해가 뜰 때까지는?'), t('176일'), t('24시간'), t('30일')],
  ['venus', t('해는 어느 쪽에서 뜨나?'), t('서쪽'), t('동쪽'), t('북쪽')],
  ['earth', t('표면에서 바다가 차지하는 넓이는?'), '71%', '50%', '90%'],
  ['moon', t('달은 해마다 얼마씩 멀어지나?'), '3.8cm', '1m', '38km'],
  ['mars', t('붉게 보이는 까닭은 흙에 많은 무엇 때문인가?'), t('산화철'), t('구리'), t('붉은 얼음')],
  ['phobos', t('큰 분화구의 이름은?'), t('스티크니'), t('허셜'), t('오디세우스')],
  ['deimos', t('누가 찾았나?'), t('아사프 홀'), t('갈릴레이'), t('윌리엄 허셜')],
  ['jupiter', t('자전 한 바퀴에 걸리는 시간은?'), t('9시간 56분'), t('24시간'), t('10일')],
  ['io', t('활화산은 몇 개가 넘나?'), t('400개'), t('10개'), t('50개')],
  ['europa', t('얼음 아래 바다의 물은 지구 바다의 얼마쯤인가?'), t('두 배'), t('절반'), t('열 배')],
  ['ganymede', t('위성 가운데 하나뿐으로 스스로 가진 것은?'), t('자기장'), t('두꺼운 대기'), t('고리')],
  ['callisto', t('고리 무늬로 퍼진 가장 큰 흔적의 이름은?'), t('발할라'), t('스티크니'), t('허셜')],
  ['saturn', t('고리는 대부분 무엇으로 되어 있나?'), t('물 얼음'), t('바위'), t('쇳가루')],
  ['mimas', t('큰 분화구의 이름은?'), t('허셜'), t('발할라'), t('오디세우스')],
  ['enceladus', t('물을 뿜는 남극의 틈을 무엇이라 부르나?'), t('호랑이 줄무늬'), t('표범 무늬'), t('용의 비늘')],
  ['tethys', t('위성 둘레를 감은 협곡의 이름은?'), t('이타카'), t('메시나'), t('마리너')],
  ['dione', t('뒤쪽 반구의 밝은 줄무늬는 무엇이었나?'), t('얼음 절벽'), t('용암 줄기'), t('소금 띠')],
  ['rhea', t('토성에서 몇째로 큰 위성인가?'), t('둘째'), t('첫째'), t('셋째')],
  ['titan', t('호수와 바다를 이루는 액체는?'), t('메탄과 에탄'), t('소금물'), t('황산')],
  ['iapetus', t('적도의 산줄기 때문에 무엇처럼 보이나?'), t('호두'), t('땅콩'), t('달걀')],
  ['uranus', t('자전축은 몇 도 누워 있나?'), t('98도'), t('23도'), t('45도')],
  ['miranda', t('태양계에서 가장 높다는 절벽의 이름은?'), t('베로나'), t('이타카'), t('메시나')],
  ['ariel', t('천왕성 위성의 이름은 누구의 작품에서 땄나?'), t('셰익스피어'), t('호메로스'), t('단테')],
  ['umbriel', t('밝은 고리 모양 분화구의 이름은?'), t('운다'), t('허셜'), t('발할라')],
  ['titania', t('길이 1,500km에 이르는 협곡의 이름은?'), t('메시나'), t('이타카'), t('베로나')],
  ['oberon', t('이름은 어느 작품의 요정 왕에서 왔나?'), t('한여름 밤의 꿈'), t('햄릿'), t('맥베스')],
  ['neptune', t('태양을 한 바퀴 도는 데 걸리는 시간은?'), t('165년'), t('84년'), t('248년')],
  ['triton', t('간헐천이 검은 먼지와 함께 뿜는 기체는?'), t('질소'), t('수증기'), t('메탄')],
  ['ceres', t('오카토르 충돌구의 밝은 점은 무엇이었나?'), t('소금'), t('유리'), t('금속')],
  ['pluto', t('하트의 왼쪽 반인 평원의 이름은?'), t('스푸트니크'), t('보이저'), t('카시니')],
  ['charon', t('누가 찾았나?'), t('제임스 크리스티'), t('클라이드 톰보'), t('윌리엄 래셀')],
  ['halley', t('핵은 무슨 모양인가?'), t('땅콩'), t('고무 오리'), t('눈사람')],
  ['haleBopp', t('맨눈으로 보인 기간은?'), t('18개월'), t('18일'), t('3개월')],
  ['churyumov', t('혜성에 내린 착륙선의 이름은?'), t('필레'), t('하위헌스'), t('이글')],
  ['voyager1', t('지구의 소리와 인사를 담아 실은 것은?'), t('금빛 레코드'), t('유리병 편지'), t('사진첩')],
  ['voyager2', t('1호보다 며칠 먼저 떠났나?'), t('16일'), t('2일'), t('100일')],
  ['hubble', t('우주비행사가 고치러 올라간 횟수는?'), t('다섯 번'), t('한 번'), t('열 번')],
  ['jwst', t('육각형 금빛 거울은 몇 장인가?'), t('18장'), t('6장'), t('100장')],
  ['kepler', t('찾은 외계 행성은 몇 개쯤인가?'), t('2,600여 개'), t('26개'), t('100만 개')],
  ['chandra', t('어떤 빛을 보는 망원경인가?'), t('X선'), t('적외선'), t('전파')],
  ['euclid', t('암흑 에너지와 함께 지도를 만들려는 것은?'), t('암흑 물질'), t('외계 행성'), t('소행성')],
  ['iss', t('하루에 해가 몇 번 뜨나?'), t('16번'), t('1번'), t('4번')],
  ['tiangong', t('이름의 뜻은?'), t('하늘의 궁전'), t('길동무'), t('달의 집')],
  ['sputnik', t('이름의 뜻은?'), t('길동무'), t('작은 별'), t('하늘의 궁전')],
  ['mro', t('망원 카메라의 이름은?'), t('하이라이즈'), t('섀도캠'), t('허블')],
  ['juno', t('전자 장치를 넣은 상자의 재료는?'), t('티타늄'), t('납'), t('유리')],
  ['cassini', t('싣고 간 착륙선의 이름은?'), t('하위헌스'), t('필레'), t('이글')],
  ['parker', t('앞을 가린 방패의 재료는?'), t('탄소'), t('티타늄'), t('얼음')],
  ['roadster', t('운전석에 앉은 마네킹의 이름은?'), t('스타맨'), t('로켓맨'), t('루시')],
  ['newHorizons', t('2019년에 지나간 카이퍼대의 작은 천체는?'), t('아로코스'), t('세레스'), t('딩키네시')],
  ['pioneer10', t('어느 별 쪽으로 가고 있나?'), t('알데바란'), t('시리우스'), t('북극성')],
  ['danuri', t('NASA가 실은 카메라의 이름은?'), t('섀도캠'), t('하이라이즈'), t('스타맨')],
  ['lro', t('달 전체의 높낮이를 재는 데 쓴 것은?'), t('레이저'), t('음파'), t('줄자')],
  ['europaClipper', t('유로파를 몇 번 스쳐 지나가나?'), t('49번'), t('5번'), t('200번')],
  ['lucy', t('찾아가는 소행성들을 무엇이라 부르나?'), t('트로이'), t('카이퍼'), t('아폴로')],
  ['pioneer11', t('어느 별자리 쪽으로 가고 있나?'), t('독수리자리'), t('황소자리'), t('백조자리')],
];

export const READING_QUIZ = Object.fromEntries(ROWS.map(([id, question, answer, ...wrong]) => [id, { question, answer, wrong }]));

// How a reading's question is kept in progress.quiz. Three craft share their id with a
// story place (voyager1, cassini, newHorizons), whose card has a question of its own.
export const readingKey = (id) => `r:${id}`;

// The question for a body or a craft: { question, choices, right }, or null.
export function readingQuizFor(id) {
  return arrange(id, READING_QUIZ[id]);
}
