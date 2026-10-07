// Picture postcards of the best views, and the round of the auroras (the user,
// 2026-10-08, of three things offered: "모두 추가해"). A card is got by going to a place
// with the key on a name plate (core/vista.js, core/home.js): one for each best view,
// one for Korea's sky, one for Earth's aurora place. Standing in all the eight auroras
// by their keys is the round: it leaves a rubber stamp in the journal and the twelfth
// card. Like the stunt flights they are not journal slots and nothing is lost by
// leaving them; they are kept in the browser.
import { VISTAS } from './vista.js';
import { AURORA_VIEWS } from './home.js';
import { t } from './i18n.js';

// by: the key and the world it is on ('vista' the best view, 'home' Korea's sky,
// 'aurora' the place in an aurora); 'round' is given for the whole round.
export const VIEW_CARDS = [
  { id: 'moon', by: ['vista', 'moon'], name: t('달에서 본 지구돋이') },
  { id: 'jupiter', by: ['vista', 'jupiter'], name: t('목성의 대적점') },
  { id: 'saturn', by: ['vista', 'saturn'], name: t('토성 뒤에서 본 고리') },
  { id: 'mars', by: ['vista', 'mars'], name: t('화성의 마리너 계곡') },
  { id: 'io', by: ['vista', 'io'], name: t('목성 앞의 이오') },
  { id: 'enceladus', by: ['vista', 'enceladus'], name: t('엔셀라두스의 얼음 분수') },
  { id: 'pluto', by: ['vista', 'pluto'], name: t('명왕성의 하트') },
  { id: 'uranus', by: ['vista', 'uranus'], name: t('천왕성의 고리') },
  { id: 'neptune', by: ['vista', 'neptune'], name: t('해왕성의 대흑점') },
  { id: 'korea', by: ['home', 'earth'], name: t('한국 하늘') },
  { id: 'auroraEarth', by: ['aurora', 'earth'], name: t('지구의 오로라') },
  { id: 'auroraRound', by: ['round', null], name: t('오로라 순례') },
];

// The picture of a card (384 x 216), under the site's assets folder.
export const cardFile = (id) => `notebook/view-${id}.png`;
// The worlds of the round, and its rubber stamp.
export const AURORA_ROUND = Object.keys(AURORA_VIEWS);
export const AURORA_STAMP = 'notebook/stamp-aurora.png';

export const cardById = (id) => VIEW_CARDS.find((card) => card.id === id) ?? null;

// What is kept: the cards got and the auroras stood in. Anything else in a saved record
// (an older game's, a broken one) is dropped.
export function sanitizeViews(raw) {
  const list = (value, known) => (Array.isArray(value) ? [...new Set(value)].filter((id) => known.includes(id)) : []);
  return {
    cards: list(raw?.cards, VIEW_CARDS.map((card) => card.id)),
    auroras: list(raw?.auroras, AURORA_ROUND),
  };
}

export const roundDone = (views) => AURORA_ROUND.every((id) => views.auroras.includes(id));

// She has just come to the place of a key: kind 'vista', 'home' or 'aurora' on the world
// bodyId. Returns { views, cards, round }: the record after it, the cards got by it
// (new ones only) and whether the round was finished by it.
export function arriveAt(views, kind, bodyId) {
  const before = sanitizeViews(views);
  const auroras = kind === 'aurora' && AURORA_ROUND.includes(bodyId) && !before.auroras.includes(bodyId) ? [...before.auroras, bodyId] : before.auroras;
  const round = !roundDone(before) && roundDone({ auroras });
  const got = VIEW_CARDS.filter((card) => (card.by[0] === kind && card.by[1] === bodyId) || (card.by[0] === 'round' && round))
    .filter((card) => !before.cards.includes(card.id));
  return { views: { cards: [...before.cards, ...got.map((card) => card.id)], auroras }, cards: got, round };
}

// Every best view has its card.
export const cardless = () => VISTAS.filter((id) => !VIEW_CARDS.some((card) => card.by[0] === 'vista' && card.by[1] === id));
