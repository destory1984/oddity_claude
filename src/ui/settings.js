// The settings: the gear at the right end of the top buttons. Four pages, in the order
// the user set on 2026-10-05: the options (the screen's shape, the layout of the
// planets, the sounds), the help (how to fly: it had a "?" button and a sheet of its own
// until then), what changed, a hundred lines at a time (core/changes.js), and "About"
// (the title and why the game was made). They open on the options.
import { changesUntil, firstLines, PAGE_LINES, dayLabel, startedLine } from '../core/changes.js';
import { language } from '../core/i18n.js';
import { saveLanguage } from './storage.js';

const $ = (id) => document.getElementById(id);

// onOpen, onClose: the game is held while the settings are open.
// today: () => 'YYYY-MM-DD', the device's own day.
// onLanguage: called just before the game starts again in the language chosen.
// reopen: the settings open at once (the game has just started again from them); a tab's
// name opens them at that tab (back from a link on the About tab).
// (Each written out in full: the titles differ by language.)
export const SAGAN_PAGES = {
  ko: 'https://ko.wikipedia.org/wiki/%EC%B9%BC_%EC%84%B8%EC%9D%B4%EA%B1%B4',
  en: 'https://en.wikipedia.org/wiki/Carl_Sagan',
  ja: 'https://ja.wikipedia.org/wiki/%E3%82%AB%E3%83%BC%E3%83%AB%E3%83%BB%E3%82%BB%E3%83%BC%E3%82%AC%E3%83%B3',
  zh: 'https://zh.wikipedia.org/wiki/%E5%8D%A1%E5%B0%94%C2%B7%E8%90%A8%E6%A0%B9',
};

// onLeave: called when a link out of the game is pressed (it may open in this window).
export function createSettings({ onOpen, onClose, today, onLanguage = () => {}, onLeave = () => {}, reopen = false }) {
  const dialog = $('settings');

  function showTab(name) {
    for (const button of $('settingsTabs').children) button.setAttribute('aria-selected', String(button.dataset.tab === name));
    for (const part of dialog.querySelectorAll('section')) part.hidden = part.dataset.tab !== name;
    dialog.scrollTop = 0;
  }
  for (const button of $('settingsTabs').children) button.addEventListener('click', () => showTab(button.dataset.tab));

  // How many lines of the changes are shown: a hundred, and a hundred more for each
  // press of "더 읽기". Opening the settings starts over.
  let newsShown = PAGE_LINES;
  function renderNews() {
    let lastDay = null;
    $('newsStarted').textContent = startedLine(today());
    const { lines, more } = firstLines(changesUntil(today()), newsShown);
    $('newsMore').hidden = !more;
    $('newsList').replaceChildren(...lines.map(({ day, text }) => {
      const item = document.createElement('li');
      // The day is written once, at the first line of that day.
      const when = document.createElement('time');
      when.dateTime = day;
      when.textContent = day === lastDay ? '' : dayLabel(day);
      lastDay = day;
      item.append(when, text);
      return item;
    }));
  }

  $('settingsButton').addEventListener('click', () => {
    if (dialog.open) return;
    onOpen();
    newsShown = PAGE_LINES;
    renderNews();
    showTab('options');
    dialog.showModal();
  });
  $('newsMore').addEventListener('click', () => {
    newsShown += PAGE_LINES;
    renderNews();
  });
  $('closeSettings').addEventListener('click', () => dialog.close());
  // A press outside the sheet does what "비행 계속하기" does (the user, 2026-10-06: "메뉴의
  // 바깥 부분을 누르면, 비행 계속하기 버튼을 누르는 것과 같은 효과로 해줘"). Outside is
  // told by where the press fell, not by its target: the sheet's own margin and its
  // scroll bar are the dialog too.
  dialog.addEventListener('click', (e) => {
    if (e.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) dialog.close();
  });
  // The language: the game starts again in the one chosen, where she was, with the
  // settings open again (the notebook stays).
  for (const [id, choice] of [['langKo', 'ko'], ['langEn', 'en'], ['langJa', 'ja'], ['langZh', 'zh']]) {
    $(id).setAttribute('aria-pressed', String(language() === choice));
    $(id).addEventListener('click', () => {
      if (language() === choice) return;
      saveLanguage(choice);
      onLanguage();
      window.top.location.reload();
    });
  }
  // The policy page holds the four languages one under another: the link opens it at hers.
  if (language() !== 'ko') $('privacyLink').href = `./privacy.html#${language()}`;
  // Carl Sagan's page on Wikipedia in the language in use (the user, 2026-10-07).
  // (His photograph over the line goes there too.)
  for (const id of ['aboutMemory', 'aboutPhoto']) $(id).href = SAGAN_PAGES[language()] ?? SAGAN_PAGES.en;
  // A link out may open in this same window: the place is kept for the way back.
  for (const id of ['aboutMemory', 'aboutPhoto', 'privacyLink']) $(id).addEventListener('click', () => onLeave());
  dialog.addEventListener('close', () => onClose());

  if (reopen) {
    $('settingsButton').click();
    if (typeof reopen === 'string' && dialog.querySelector(`section[data-tab="${reopen}"]`)) showTab(reopen);
  }

  return { isOpen: () => dialog.open };
}
