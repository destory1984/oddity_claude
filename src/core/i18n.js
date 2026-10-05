// Four languages: Korean, which everything is written in, and English, Japanese and
// Chinese (simplified). The Korean sentence itself is the key: a dictionary for each
// other language (src/i18n/en.js, ja.js, zh.js) gives its sentence there. A sentence that
// is not in the dictionary yet is shown in Korean.

export const LANG_KEY = 'oddity.lang.v1';
export const LANGUAGES = ['ko', 'en', 'ja', 'zh'];

// The language to use. saved: what the player chose (one of LANGUAGES), or null. device:
// the device's own language (navigator.language). Korean, Japanese and Chinese devices
// get their own, every other device English.
export function pickLanguage(saved, device) {
  if (LANGUAGES.includes(saved)) return saved;
  const own = /^(ko|ja|zh)\b/i.exec(device ?? 'ko');
  return own ? own[1].toLowerCase() : 'en';
}

function detect() {
  // Only in a browser: the tests, which check the Korean sentences, run in Korean.
  if (typeof document === 'undefined') return 'ko';
  let saved = null;
  try {
    saved = localStorage.getItem(LANG_KEY);
  } catch {
    // No storage: the device's language.
  }
  return pickLanguage(saved, navigator.language);
}

let lang = detect();
const dictionaries = { en: new Map(), ja: new Map(), zh: new Map() };
const dictionary = () => dictionaries[lang];

export const language = () => lang;
export const english = () => lang === 'en';
// What the page's lang attribute says (ui/translate.js; style.css tells them apart by it).
export const pageLanguage = () => ({ zh: 'zh-Hans' }[lang] ?? lang);

// For the tests.
export function setLanguage(next) {
  lang = LANGUAGES.includes(next) ? next : 'ko';
}

// Adds sentences: { '한글 문장': 'English sentence' }, to the dictionary of the language
// `to`. A sentence of several lines is also known line by line, so that it is found when
// joined to another one.
export function addWords(words, to = 'en') {
  const book = dictionaries[to];
  for (const [ko, en] of Object.entries(words)) {
    book.set(ko, en);
    const koLines = ko.split('\n');
    const enLines = en.split('\n');
    // (Not a template's: its values are numbered across the whole sentence.)
    if (koLines.length > 1 && koLines.length === enLines.length && !ko.includes('{}')) {
      koLines.forEach((line, i) => { if (line.trim() && !book.has(line)) book.set(line, enLines[i]); });
    }
  }
}

// A whole Korean text in the language in use, or null when there is none: the text
// itself, or each of its lines. (Named when English was the only other language.)
export function englishOf(text) {
  // (Asked in Korean, by the tests: the English.)
  const book = dictionary() ?? dictionaries.en;
  const whole = book.get(text);
  if (whole !== undefined) return whole;
  if (!text.includes('\n')) return null;
  const lines = text.split('\n');
  const out = lines.map((line) => (line.trim() ? book.get(line) : line));
  return out.every((line) => line !== undefined) ? out.join('\n') : null;
}

// t('문장') or t`${name}에 도킹했습니다`: the sentence in the language in use. For a
// template the key has {} where each value stands ('{}에 도킹했습니다') and the other
// language names the values by number ('Docked with {0}'), so it may reorder or drop them
// (a Korean particle has no English). {the0} writes "the Moon" and "the Sun" but "Mars".
export function t(strings, ...values) {
  if (typeof strings === 'string') return (lang !== 'ko' && englishOf(strings)) || strings;
  const korean = () => strings.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '');
  if (lang === 'ko') return korean();
  const en = dictionary().get(strings.join('{}'));
  // {the0}: the value with "the" before it when it is the Sun or the Moon.
  return en === undefined ? korean() : en.replace(/\{(the)?(\d+)\}/g, (_, the, n) => {
    const value = values[Number(n)] ?? '';
    return the && /^(Sun|Moon)$/.test(value) ? `the ${value}` : value;
  });
}

// In English every thing in the list goes by its English name (nameEn), which is then
// not written a second time beside it. In Japanese and Chinese it goes by its name in
// the dictionary (the Korean name is the key), and keeps its English name beside it as
// in Korean. Returns the list.
export function named(list) {
  if (lang === 'ko') return list;
  for (const item of list) {
    if (lang === 'en') {
      if (item.nameEn) {
        item.name = item.nameEn;
        item.nameEn = '';
      }
    } else {
      item.name = dictionary().get(item.name) ?? item.nameEn ?? item.name;
      if (item.name === item.nameEn) item.nameEn = '';
    }
  }
  return list;
}

// A distance in English, short enough for a label: 6,794 km, 45,000 km, 1.5M km,
// 5.9B km, 385T km (Korean counts in 만 and 억: ui/messages.js distanceText).
export function englishKm(km) {
  if (km < 1e6) return `${Math.round(km).toLocaleString('en-US')} km`;
  if (km < 1e9) return `${(km / 1e6).toFixed(1)}M km`;
  if (km < 1e12) return `${(km / 1e9).toFixed(1)}B km`;
  return `${(km / 1e12).toFixed(1)}T km`;
}

// Japanese and Chinese count as Korean does, in ten thousands and hundred millions: a
// number written the Korean way ("4.2만km", "5.9억km", "385조km", "84.0년") is given their
// characters. Korean and English get the text as it is.
const COUNTERS = {
  ja: { 만: '万', 억: '億', 조: '兆', 년: '年' },
  zh: { 만: '万', 억: '亿', 조: '万亿', 년: '年' },
};
export function counted(text) {
  const own = COUNTERS[lang];
  return own ? text.replace(/[만억조년]/g, (c) => own[c]) : text;
}

// Every key and its sentence in the language `of`, for the tests.
export const words = (of = 'en') => [...dictionaries[of].entries()];
