// The settings: the gear at the right end of the top buttons. Its first page tells what
// changed this week (core/changes.js); the second holds what can be set (the screen's
// shape, the character, the layout of the planets, the sounds), which used to be in the
// help.
import { weekChanges, dayLabel } from '../core/changes.js';

const $ = (id) => document.getElementById(id);

// onOpen, onClose: the game is held while the settings are open.
// today: () => 'YYYY-MM-DD', the device's own day.
export function createSettings({ onOpen, onClose, today }) {
  const dialog = $('settings');

  function showTab(name) {
    for (const button of $('settingsTabs').children) button.setAttribute('aria-selected', String(button.dataset.tab === name));
    for (const part of dialog.querySelectorAll('section')) part.hidden = part.dataset.tab !== name;
    dialog.scrollTop = 0;
  }
  for (const button of $('settingsTabs').children) button.addEventListener('click', () => showTab(button.dataset.tab));

  function renderNews() {
    let lastDay = null;
    $('newsList').replaceChildren(...weekChanges(today()).map(({ day, text }) => {
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
    renderNews();
    showTab('news');
    dialog.showModal();
  });
  $('closeSettings').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => onClose());

  return { isOpen: () => dialog.open };
}
