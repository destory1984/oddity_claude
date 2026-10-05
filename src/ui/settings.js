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
// reopen: the settings open at once (the game has just started again from them).
export function createSettings({ onOpen, onClose, today, onLanguage = () => {}, reopen = false }) {
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
  dialog.addEventListener('close', () => onClose());

  if (reopen) $('settingsButton').click();

  return { isOpen: () => dialog.open };
}
