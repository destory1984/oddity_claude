// The real photographs that eight of the photo missions (core/missions.js) follow. When
// a saved photo meets one of them, the real one is shown beside it (ui/pair.js).
// file: under public/assets/. Sources and licences: THIRD-PARTY.md.
// by: who took it and when. note: one or two plain sentences about the real one.
export const FAMOUS = {
  paleBlueDot: {
    file: 'stories/paleBlueDot.jpg',
    name: '창백한 푸른 점',
    by: '보이저 1호, 1990년 2월 14일',
    credit: 'NASA/JPL-Caltech',
    note: '지구에서 60억km 떨어진 곳에서 돌아보고 찍었다. 빛줄기 속 작은 점 하나가 지구다.',
  },
  earthrise: {
    file: 'famous/earthrise.jpg',
    name: '지구돋이',
    by: '아폴로 8호 윌리엄 앤더스, 1968년 12월 24일',
    credit: 'NASA / Bill Anders',
    note: '달을 돌던 우주선 창밖으로 지구가 떠오르자 급히 컬러 필름을 끼워 찍었다.',
  },
  familyPortrait: {
    file: 'famous/familyPortrait.jpg',
    name: '태양계 가족사진',
    by: '보이저 1호, 1990년 2월 14일',
    credit: 'NASA/JPL-Caltech',
    note: '사진 60장을 이어 붙였다. 금성, 지구, 목성, 토성, 천왕성, 해왕성 여섯이 담겼다. 수성과 화성은 빠졌다.',
  },
  blueMarble: {
    file: 'famous/blueMarble.jpg',
    name: '푸른 구슬',
    by: '아폴로 17호, 1972년 12월 7일',
    credit: 'NASA / Apollo 17 crew',
    note: '달로 가는 길에 지구에서 2만 9천km쯤 떨어져 찍었다. 해를 등지고 있어 지구가 통째로 환하다.',
  },
  saturnShadow: {
    file: 'famous/saturnShadow.jpg',
    name: '토성의 그늘에서',
    by: '카시니, 2006년 9월 15일',
    credit: 'NASA/JPL/Space Science Institute',
    note: '토성이 해를 가린 동안 220만km 밖에서 찍은 165장을 이어 붙였다. 고리 왼쪽 바깥의 작은 점이 지구다.',
  },
  earthAndMoon: {
    file: 'famous/earthAndMoon.jpg',
    name: '한 장에 담긴 지구와 달',
    by: '보이저 1호, 1977년 9월 18일',
    credit: 'NASA/JPL',
    note: '떠난 지 13일째, 1,166만km 밖에서 찍었다. 지구와 달을 한 장에 담은 첫 사진이다.',
  },
  plutoCharon: {
    file: 'famous/plutoCharon.jpg',
    name: '명왕성과 카론',
    by: '뉴허라이즌스, 2015년 7월 14일',
    credit: 'NASA/JHUAPL/SwRI',
    note: '색을 강조한 사진 둘을 붙인 것이다. 크기의 비는 맞고, 둘 사이는 실제보다 가깝게 놓았다.',
  },
  cometTail: {
    file: 'stories/giotto.jpg',
    name: '핼리 혜성의 핵',
    by: '지오토, 1986년 3월 14일',
    credit: 'ESA/MPS (CC BY-SA 3.0 IGO)',
    note: '핵에서 596km까지 다가가며 찍었다. 길이 15km쯤 되는 땅콩 모양의 검은 핵에서 가스가 뿜어 나온다.',
  },
};

// The real photograph for a saved photo: that of the first mission it met that has one.
export function famousFor(missionIds) {
  const id = (missionIds ?? []).find((m) => FAMOUS[m]);
  return id ? { id, ...FAMOUS[id] } : null;
}
