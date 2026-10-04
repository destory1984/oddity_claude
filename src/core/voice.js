// Which of the browser's voices says the landing and docking calls ("Docking in
// progress", "3", "2", "1"). The words are English, and only setting the language left
// the choice to the device: a phone set to Korean read them with its Korean voice.
// So an English voice is named outright: American first, then any English, a voice on
// the device before one from the network. null when the device has no English voice
// (then the language alone is set, as before).
export function englishVoice(voices) {
  const lang = (v) => (v.lang ?? '').replace('_', '-').toLowerCase();
  const english = voices.filter((v) => lang(v).startsWith('en'));
  const rank = (v) => (lang(v) === 'en-us' ? 0 : lang(v) === 'en-gb' ? 2 : 4) + (v.localService === false ? 1 : 0);
  return english.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

// A device set to Korean hears the calls in Korean, by its Korean voice: "도킹 준비 중."
// and the count 삼, 이, 일, 영 (the user's words, 2026-10-04). Any other device hears
// them in English as above.
export const KOREAN_CALLS = {
  'Docking in progress.': '도킹 준비 중.',
  'Landing in progress.': '착륙 준비 중.',
  5: '오', 4: '사', 3: '삼', 2: '이', 1: '일', 0: '영',
};

// language: the device's own (navigator.language).
export function speaksKorean(language) {
  return (language ?? '').toLowerCase().startsWith('ko');
}

// A Korean voice, one on the device before one from the network, or null.
export function koreanVoice(voices) {
  const korean = voices.filter((v) => (v.lang ?? '').replace('_', '-').toLowerCase().startsWith('ko'));
  return korean.sort((a, b) => Number(a.localService === false) - Number(b.localService === false))[0] ?? null;
}

// What is said and how: { text, lang, voice } for a call written in English.
export function callFor(text, language, voices) {
  if (speaksKorean(language)) {
    const voice = koreanVoice(voices);
    return { text: KOREAN_CALLS[text] ?? text, lang: voice ? voice.lang.replace('_', '-') : 'ko-KR', voice };
  }
  const voice = englishVoice(voices);
  return { text, lang: voice ? voice.lang.replace('_', '-') : 'en-US', voice };
}

