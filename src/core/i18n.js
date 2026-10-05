// Two languages: Korean, which everything is written in, and English.
// The Korean sentence itself is the key: a dictionary (src/i18n/en.js) gives its English.
// A sentence that is not in the dictionary yet is shown in Korean.

export const LANG_KEY = 'oddity.lang.v1';

// The language to use. saved: what the player chose ('ko' or 'en'), or null. device:
// the device's own language (navigator.language). Korean devices get Korean, every
// other device English.
export function pickLanguage(saved, device) {
  if (saved === 'ko' || saved === 'en') return saved;
  return /^ko\b/i.test(device ?? 'ko') ? 'ko' : 'en';
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
const dictionary = new Map();

export const language = () => lang;
export const english = () => lang === 'en';

// For the tests.
export function setLanguage(next) {
  lang = next === 'en' ? 'en' : 'ko';
}

// Adds sentences: { '한글 문장': 'English sentence' }. A sentence of several lines is
// also known line by line, so that it is found when joined to another one.
export function addWords(words) {
  for (const [ko, en] of Object.entries(words)) {
    dictionary.set(ko, en);
    const koLines = ko.split('\n');
    const enLines = en.split('\n');
    // (Not a template's: its values are numbered across the whole sentence.)
    if (koLines.length > 1 && koLines.length === enLines.length && !ko.includes('{}')) {
      koLines.forEach((line, i) => { if (line.trim() && !dictionary.has(line)) dictionary.set(line, enLines[i]); });
    }
  }
}

// The English of a whole Korean text, or null when there is none: the text itself, or
// each of its lines.
export function englishOf(text) {
  const whole = dictionary.get(text);
  if (whole !== undefined) return whole;
  if (!text.includes('\n')) return null;
  const lines = text.split('\n');
  const out = lines.map((line) => (line.trim() ? dictionary.get(line) : line));
  return out.every((line) => line !== undefined) ? out.join('\n') : null;
}

// t('문장') or t`${name}에 도킹했습니다`: the sentence in the language in use. For a
// template the key has {} where each value stands ('{}에 도킹했습니다') and the English
// names the values by number ('Docked with {0}'), so it may reorder or drop them (a
// Korean particle has no English). {the0} writes "the Moon" and "the Sun" but "Mars".
export function t(strings, ...values) {
  if (typeof strings === 'string') return (lang === 'en' && englishOf(strings)) || strings;
  const korean = () => strings.reduce((out, part, i) => out + part + (i < values.length ? values[i] : ''), '');
  if (lang !== 'en') return korean();
  const en = dictionary.get(strings.join('{}'));
  // {the0}: the value with "the" before it when it is the Sun or the Moon.
  return en === undefined ? korean() : en.replace(/\{(the)?(\d+)\}/g, (_, the, n) => {
    const value = values[Number(n)] ?? '';
    return the && /^(Sun|Moon)$/.test(value) ? `the ${value}` : value;
  });
}

// In English every thing in the list goes by its English name (nameEn), which is then
// not written a second time beside it. Returns the list.
export function named(list) {
  if (lang === 'en') {
    for (const item of list) {
      if (item.nameEn) {
        item.name = item.nameEn;
        item.nameEn = '';
      }
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

// Every key and its English, for the tests.
export const words = () => [...dictionary.entries()];
