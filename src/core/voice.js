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
