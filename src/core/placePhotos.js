import { t } from './i18n.js';

// More real photos of a story place, after its card photo, for the "사진 보기" key
// (core/photoSlides.js; the user, 2026-10-19, of the places and bodies added that day:
// "사람들이 읽을거리나 볼 거리 좀 보강해줘"). file: under public/assets/placePhotos/ (the
// card photos are in stories/, one each). Sources and licences: THIRD-PARTY.md.
export const PLACE_PHOTOS = {
  luna3: [{ file: 'luna3-2.jpg', title: t('루나 3호'), caption: t('모스크바 우주 박물관에 있는 루나 3호의 실물 크기 모형. 몸통에 붙은 판들이 태양 전지입니다.'), credit: 'Armael (CC0)' }],
  cheomseongdae: [{ file: 'cheomseongdae-2.jpg', title: t('밤의 첨성대'), caption: t('밤에 푸른 조명을 받은 경주 첨성대.'), credit: 'Brinacor (CC BY-SA 4.0)' }],
  stonehenge: [{ file: 'stonehenge-2.jpg', title: t('하늘에서 본 스톤헨지'), caption: t('1928년 영국 공군이 비행기에서 찍은 스톤헨지. 둥근 도랑과 둑이 돌들을 감싸고 있습니다.'), credit: 'Royal Air Force (public domain)' }],
  richat: [{ file: 'richat-2.jpg', title: t('땅에서 본 사하라의 눈'), caption: t('사하라의 눈 고리 안, 바위 언덕에서 내려다본 모습. 땅 위에서는 고리가 낮은 언덕과 모래 벌판으로만 보입니다.'), credit: 'Clemens Schmillen (CC BY-SA 4.0)' }],
  arecibo: [{ file: 'arecibo-2.jpg', title: t('무너진 뒤의 아레시보'), caption: t('2021년 12월, 무너진 망원경을 치우던 무렵의 아레시보. 떨어진 수신기에 접시 한쪽이 부서졌고, 탑만 남아 있습니다.'), credit: 'Tedder (CC BY-SA 4.0)' }],
};
