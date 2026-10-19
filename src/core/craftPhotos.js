import { t } from './i18n.js';

// Real photos of the craft and of what they took, for the "사진 보기" key
// (core/photoSlides.js; the user, 2026-10-17: "사진 작업 빨리 하자", "받아").
// file: under public/assets/craftPhotos/. Sources and licences: THIRD-PARTY.md.
// craft: the craft itself (its slide is titled with the craft's name); shots: what it
// took, each with its own title. JAXA's Akatsuki and Hayabusa2 and China's Tianwen-1 and
// Tiangong have no free photos of their own (JAXA's may not be used commercially without
// leave, China's have no terms for reuse): theirs are free photos of models and a drawing
// (2026-10-19), as Juno's is NASA's drawing.
export const CRAFT_PHOTOS = {
  juno: {
    craft: { file: 'juno-craft.jpg', caption: t('목성 앞을 나는 주노를 그린 NASA의 그림. 태양전지판 세 장을 바람개비처럼 펼쳤습니다.'), credit: 'NASA/JPL' },
  },
  akatsuki: {
    craft: { file: 'akatsuki-craft.jpg', caption: t('전시관에 놓인 아카쓰키의 모형. 금빛 단열재로 감싼 상자에 태양전지판 두 장이 달렸습니다.'), credit: '江戸村のとくぞう (CC BY-SA 4.0)' },
  },
  hayabusa2: {
    craft: { file: 'hayabusa2-craft.jpg', caption: t('호주 우주 발견 센터에 전시된 하야부사2의 20분의 1 모형.'), credit: 'Yu Chu Chin (CC BY-SA 4.0)' },
  },
  tianwen1: {
    craft: { file: 'tianwen1-craft.jpg', caption: t('중국 과학기술관에 전시된 실물 크기 모형. 톈원 1호가 화성에 내려놓은 착륙선과 탐사차 주룽입니다.'), credit: 'Shujianyang (CC BY-SA 4.0)' },
  },
  tiangong: {
    craft: { file: 'tiangong-craft.jpg', caption: t('2022년에 다 지어진 톈궁 정거장을 3D로 그린 그림. 아래로 지구가 보입니다.'), credit: 'Shujianyang (CC BY-SA 4.0)' },
  },
  voyager1: {
    craft: { file: 'voyager1-craft.jpg', caption: t('1977년에 쏘아 올린 쌍둥이 탐사선 보이저의 모습.'), credit: 'NASA/JPL' },
  },
  voyager2: {
    craft: { file: 'voyager2-craft.jpg', caption: t('1977년 발사 전, 지상에서 시험 중인 보이저 2호.'), credit: 'NASA/JPL' },
  },
  pioneer10: {
    craft: { file: 'pioneer10-craft.jpg', caption: t('1972년 발사 전, 공장에서 마지막 조립을 하는 파이어니어 10호.'), credit: 'NASA Ames/TRW' },
    shots: [{ file: 'pioneer10-shot1.jpg', title: t('파이어니어 10호가 찍은 목성'), caption: t('1973년 12월, 사람이 만든 물건이 처음으로 가까이서 본 목성.'), credit: 'NASA' }],
  },
  pioneer11: {
    craft: { file: 'pioneer11-craft.jpg', caption: t('쌍둥이 탐사선 파이어니어 10호와 11호를 그린 그림.'), credit: 'Don Davis/NASA' },
    shots: [{ file: 'pioneer11-shot1.jpg', title: t('파이어니어 11호가 찍은 토성'), caption: t('1979년 9월, 토성에 처음 다가가며 찍은 토성과 위성 타이탄.'), credit: 'NASA Ames' }],
  },
  cassini: {
    craft: { file: 'cassini-craft.jpg', caption: t('1997년 발사 전, 지상에서 시험 중인 카시니.'), credit: 'NASA' },
  },
  newHorizons: {
    craft: { file: 'newHorizons-craft.jpg', caption: t('2006년에 떠나 2015년 명왕성 곁을 지나간 뉴허라이즌스.'), credit: 'NOIRLab/NSF/AURA/NASA (CC BY 4.0)' },
  },
  parker: {
    craft: { file: 'parker-craft.jpg', caption: t('2018년에 떠나 태양의 대기 속으로 들어가는 파커 태양 탐사선.'), credit: 'NASA/Johns Hopkins APL/Steve Gribben' },
    shots: [{ file: 'parker-shot1.jpg', title: t('파커가 찍은 금성'), caption: t('2020년 7월 금성 곁을 지나며 찍은 밤의 금성. 구름 밑 땅의 열이 비칩니다.'), credit: 'NASA/Johns Hopkins APL/NRL' }],
  },
  dawn: {
    craft: { file: 'dawn-craft.jpg', caption: t('2007년 발사 전, 진공 시험실에 들어간 돈.'), credit: 'NASA/JPL' },
  },
  mro: {
    craft: { file: 'mro-craft.jpg', caption: t('화성을 도는 화성 정찰 궤도선을 그린 그림.'), credit: 'NASA/JPL/Corby Waste' },
  },
  lro: {
    craft: { file: 'lro-craft.jpg', caption: t('2009년 발사 전, 시험 중인 달 정찰 궤도선.'), credit: 'NASA' },
    shots: [{ file: 'lro-shot1.jpg', title: t('달 정찰 궤도선이 찍은 지구돋이'), caption: t('2015년 10월, 달의 컴프턴 분화구 너머로 떠오르는 지구.'), credit: 'NASA/GSFC/Arizona State University' }],
  },
  hubble: {
    craft: { file: 'hubble-craft.jpg', caption: t('2009년 수리를 마치고 우주왕복선 아틀란티스호에서 풀려난 허블.'), credit: 'NASA' },
    shots: [{ file: 'hubble-shot1.jpg', title: t('허블이 찍은 창조의 기둥'), caption: t('독수리 성운에서 별이 태어나는 가스 기둥. 2014년에 다시 찍은 것입니다.'), credit: 'NASA, ESA, Hubble Heritage Team (STScI/AURA)' }],
  },
  jwst: {
    craft: { file: 'jwst-craft.jpg', caption: t('2019년 처음으로 한 몸으로 조립된 제임스 웹 우주망원경.'), credit: 'NASA/Chris Gunn' },
    shots: [{ file: 'jwst-shot1.jpg', title: t('웹이 찍은 우주 절벽'), caption: t('용골자리 성운에서 별이 태어나는 곳. 2022년 7월 처음 공개된 사진 가운데 하나입니다.'), credit: 'NASA, ESA, CSA, STScI' }],
  },
  kepler: {
    craft: { file: 'kepler-craft.jpg', caption: t('2009년 발사 전, 아래쪽에서 본 케플러.'), credit: 'NASA/Troy Cryder' },
  },
  chandra: {
    craft: { file: 'chandra-craft.jpg', caption: t('1999년 우주왕복선 컬럼비아호에서 풀려난 찬드라.'), credit: 'NASA' },
    shots: [{ file: 'chandra-shot1.jpg', title: t('찬드라가 찍은 카시오페이아 A'), caption: t('별이 터지고 남은 잔해를 X선으로 찍은 사진.'), credit: 'NASA/CXC/GSFC/U. Hwang et al.' }],
  },
  euclid: {
    craft: { file: 'euclid-craft.jpg', caption: t('발사 전 깨끗한 방에서 준비 중인 유클리드.'), credit: 'NASA/JPL' },
    shots: [{ file: 'euclid-shot1.jpg', title: t('유클리드가 찍은 페르세우스 은하단'), caption: t('은하 천 개 넘게 담긴 사진. 2023년 11월 공개됐습니다.'), credit: 'ESA/Euclid/Euclid Consortium/NASA, J.-C. Cuillandre, E. Bertin, G. Anselmi (CC BY-SA 3.0 IGO)' }],
  },
  tess: {
    craft: { file: 'tess-craft.jpg', caption: t('태양전지판을 편 테스를 그린 그림.'), credit: 'Orbital ATK/NASA' },
    shots: [{ file: 'tess-shot1.jpg', title: t('테스가 처음 찍은 하늘'), caption: t('2018년, 남쪽 하늘을 담은 테스의 첫 사진.'), credit: 'NASA/MIT/TESS' }],
  },
  soho: {
    shots: [{ file: 'soho-shot1.jpg', title: t('소호와 SDO가 본 코로나 분출'), caption: t('소호와 태양 활동 관측선(SDO)의 사진을 합친 태양의 코로나 분출.'), credit: 'NASA/ESA SOHO, NASA SDO' }],
  },
  solarOrbiter: {
    craft: { file: 'solarOrbiter-craft.jpg', caption: t('2020년 발사 직전, 로켓 덮개 안으로 들어가기 전의 솔라 오비터.'), credit: 'NASA/Ben Smegelsky' },
    shots: [{ file: 'solarOrbiter-shot1.jpg', title: t('솔라 오비터가 찍은 태양'), caption: t('솔라 오비터가 찍은 가장 넓고 또렷한 태양 사진.'), credit: 'ESA & NASA/Solar Orbiter/EUI Team (CC BY-SA 3.0 IGO)' }],
  },
  iss: {
    craft: { file: 'iss-craft.jpg', caption: t('2010년 우주왕복선이 떠나며 찍은 국제우주정거장.'), credit: 'NASA' },
    shots: [{ file: 'iss-shot1.jpg', title: t('국제우주정거장에서 본 남극 오로라'), caption: t('2015년 우주비행사 스콧 켈리가 정거장에서 찍은 오로라.'), credit: 'NASA/Scott Kelly' }],
  },
  sputnik: {
    craft: { file: 'sputnik-craft.jpg', caption: t('1957년 10월 4일 쏘아 올린 첫 인공위성. 사진기는 없었습니다.'), credit: 'NSSDC, NASA' },
  },
  roadster: {
    craft: { file: 'roadster-craft.jpg', caption: t('2018년 2월 6일, 차에 단 사진기가 찍은 스타맨과 지구.'), credit: 'SpaceX (CC0)' },
  },
  danuri: {
    craft: { file: 'danuri-craft.jpg', caption: t('달을 도는 다누리를 그린 그림.'), credit: t('과학기술정보통신부 (공공누리 제1유형)') },
    shots: [{ file: 'danuri-shot2.jpg', title: t('다누리의 발사'), caption: t('2022년 8월 4일(한국 시간 5일) 팰컨 9 로켓에 실려 떠나는 다누리.'), credit: 'U.S. Space Force/Joshua Conti' }],
  },
  europaClipper: {
    craft: { file: 'europaClipper-craft.jpg', caption: t('2024년 깨끗한 방에서 장비를 모두 단 유로파 클리퍼.'), credit: 'NASA/JPL-Caltech' },
  },
  lucy: {
    shots: [{ file: 'lucy-shot1.jpg', title: t('루시가 찍은 딩키네시와 셀람'), caption: t('2023년 11월 1일, 소행성 딩키네시 뒤에서 작은 위성 셀람이 나옵니다.'), credit: 'NASA/Goddard/SwRI/JHU APL/NOIRLab' }],
  },
  bepiColombo: {
    craft: { file: 'bepiColombo-craft.jpg', caption: t('2017년, 수성으로 갈 때의 모양으로 쌓아 올린 베피콜롬보.'), credit: 'ESA (CC BY-SA 3.0 IGO)' },
    shots: [{ file: 'bepiColombo-shot1.jpg', title: t('베피콜롬보가 찍은 지구'), caption: t('2020년 4월, 지구 곁을 지나며 제 몸과 함께 찍은 지구.'), credit: 'ESA/BepiColombo/MTM (CC BY-SA 3.0 IGO)' }],
  },
  mangalyaan: {
    craft: { file: 'mangalyaan-craft.jpg', caption: t('2013년 발사 전, 깨끗한 방의 인도 첫 화성 탐사선.'), credit: 'ISRO (GODL-India)' },
  },
  juice: {
    craft: { file: 'juice-craft.jpg', caption: t('2023년 1월, 깨끗한 방에서 떠날 준비를 하는 주스.'), credit: 'Don-vip (CC BY-SA 4.0)' },
    shots: [{ file: 'juice-shot1.jpg', title: t('주스가 찍은 달'), caption: t('2024년 8월, 달과 지구 곁을 잇달아 지나며 찍은 달.'), credit: 'ESA (CC BY-SA 3.0 IGO)' }],
  },
  osirisRex: {
    craft: { file: 'osirisRex-craft.jpg', caption: t('2016년 5월, 떠날 준비를 마친 오시리스-렉스.'), credit: 'NASA/Dimitri Gerondidakis' },
    shots: [{ file: 'osirisRex-shot1.jpg', title: t('오시리스-렉스가 찍은 베누'), caption: t('2018년 12월 가까이서 찍은 사진을 이어 붙인 소행성 베누.'), credit: 'NASA/Goddard/University of Arizona' }],
  },
  hera: {
    craft: { file: 'hera-craft.jpg', caption: t('쌍둥이 소행성 디디모스 곁을 도는 헤라를 그린 그림.'), credit: 'ESA (CC BY-SA 3.0 IGO)' },
  },
  gaia: {
    craft: { file: 'gaia-craft.jpg', caption: t('2013년 파리 에어쇼에 전시된 가이아 모형. 둥글게 펼친 판이 햇빛 가리개이고, 가운데 원통에 망원경 둘이 들어 있습니다.'), credit: 'Pline (CC BY-SA 3.0)' },
  },
  psyche: {
    craft: { file: 'psyche-craft.jpg', caption: t('2022년 5월, 날개를 접은 채 떠날 준비를 하던 프시케.'), credit: 'NASA/Isaac Watson' },
  },
};
