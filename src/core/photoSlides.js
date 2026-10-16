import { t } from './i18n.js';
import { STORY_DETAILS, storyPhotoFile, DRAWN } from './storyDetails.js';
import { FAMOUS } from './famous.js';

// What the "사진 보기" key on the name plate shows (ui/photoView.js), one picture after
// another: a place's card photo; for a craft, the photos it is best known for (the user,
// 2026-10-16: "장소는 장소 사진을 넣고, 탐사선은 탐사선 사진과 그 탐사선이 찍은 대표적인
// 사진을 또 넣자"). file: under public/assets/.
export const CRAFT_SHOTS = {
  voyager1: ['paleBlueDot', 'familyPortrait', 'earthAndMoon'],
  cassini: ['saturnShadow'],
  newHorizons: ['plutoCharon'],
};

// thing: what the plate names (a place, a craft, a body …). An empty list: no key.
export function photoSlides(thing) {
  if (!thing) return [];
  if (thing.kind === 'site') {
    const file = storyPhotoFile(thing.id);
    if (!file) return [];
    const { caption, credit } = STORY_DETAILS[thing.id].photo;
    return [{ file, title: thing.name, caption, credit: credit === DRAWN ? credit : t`사진: ${credit}` }];
  }
  if (thing.kind === 'craft') {
    return (CRAFT_SHOTS[thing.id] ?? []).map((key) => {
      const shot = FAMOUS[key];
      return { file: shot.file, title: shot.name, caption: shot.note, credit: `${shot.by} · ${shot.credit}` };
    });
  }
  return [];
}
