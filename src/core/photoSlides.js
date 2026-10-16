import { t } from './i18n.js';
import { STORY_DETAILS, storyPhotoFile, DRAWN } from './storyDetails.js';
import { FAMOUS } from './famous.js';

// What the "사진 보기" key on the name plate shows (ui/photoView.js), one picture after
// another: a place's card photo; for a craft, the photos it is best known for (the user,
// 2026-10-16: "장소는 장소 사진을 넣고, 탐사선은 탐사선 사진과 그 탐사선이 찍은 대표적인
// 사진을 또 넣자"). file: under public/assets/.
// Each craft's list: a famous photo by its key in core/famous.js, or { story: id } for a
// place's card photo the craft took.
export const CRAFT_SHOTS = {
  voyager1: ['paleBlueDot', 'familyPortrait', 'earthAndMoon'],
  voyager2: [{ story: 'greatDarkSpot' }],
  cassini: ['saturnShadow'],
  newHorizons: ['plutoCharon'],
  juno: [{ story: 'greatRedSpot' }],
  dawn: [{ story: 'occator' }],
  mro: [{ story: 'cydonia' }],
  lro: [{ story: 'tycho' }],
  danuri: [{ story: 'shackleton' }],
  iss: [{ story: 'yiSoyeon' }],
};

// The slide of a place's card photo; its title is the place's name, or the caption's
// first sentence when the place itself is not what the plate names.
function storySlide(id, title) {
  const file = storyPhotoFile(id);
  if (!file) return null;
  const { caption, credit } = STORY_DETAILS[id].photo;
  return { file, title, caption, credit: credit === DRAWN ? credit : t`사진: ${credit}` };
}

// thing: what the plate names (a place, a craft, a body …). An empty list: no key.
export function photoSlides(thing) {
  if (!thing) return [];
  if (thing.kind === 'site') {
    const slide = storySlide(thing.id, thing.name);
    return slide ? [slide] : [];
  }
  if (thing.kind === 'craft') {
    return (CRAFT_SHOTS[thing.id] ?? []).map((shot) => {
      if (shot.story) return storySlide(shot.story, thing.name);
      const famous = FAMOUS[shot];
      return { file: famous.file, title: famous.name, caption: famous.note, credit: `${famous.by} · ${famous.credit}` };
    }).filter(Boolean);
  }
  return [];
}
