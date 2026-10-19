import { t } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);

// One way back from every sheet and card: a square ✕ in its upper left corner (the user,
// 2026-10-19, of the round ✕ at the upper right of the photo view: "이전 메뉴로...는 화면
// 왼쪽위 네모난 X 아이콘 버튼으로 통일"). It does what the sheet's own way out does, so
// whatever that one also does on leaving (saving, sounds, the next lesson) is not lost.
// The words at the foot stay (the user: "남기기"); the round ✕ of the photo view and the
// ✕ at the right of the journal's head give way to it (style.css).
const BACK = {
  settings: 'closeSettings',
  journal: 'closeJournal',
  bigMap: 'bigMapClose',
  photoView: 'photoViewClose',
  shareSheet: 'shareClose',
  pair: 'closePair',
  lookBack: 'lookClose',
  storyCard: 'closeStoryCard',
  noteCard: 'closeNoteCard',
  gateScene: 'closeGate',
  practiceOffer: 'practicePass',
  practiceWhy: 'practiceWhyOk',
  practiceDone: 'practiceKeep',
};

export function addBackKeys() {
  for (const [sheet, way] of Object.entries(BACK)) {
    const dialog = $(sheet);
    if (!dialog || !$(way)) continue;
    const key = document.createElement('button');
    key.className = 'backKey';
    key.type = 'button';
    key.setAttribute('aria-label', t('이전 화면으로'));
    key.title = t('이전 화면으로');
    key.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
    key.addEventListener('click', (event) => {
      // (Not also a press on the sheet, which some sheets take as "close" or "next".)
      event.stopPropagation();
      $(way).click();
    });
    dialog.prepend(key);
    // As it opens, the focus goes to its title (or, with none, to the sheet itself), so a
    // keyboard starts at the top and a key still held does not press a button (the user,
    // 2026-10-19: "다 해"). The browser alone gave it to the first button, this ✕, where
    // the title held autofocus but was hidden, or there was none.
    const showModal = dialog.showModal;
    dialog.showModal = function showAtTop(...args) {
      showModal.apply(this, args);
      const title = [...this.querySelectorAll('[autofocus]')].find((el) => el.getClientRects().length);
      if (title) title.focus({ preventScroll: true });
      else if (this.hasAttribute('tabindex')) this.focus({ preventScroll: true });
    };
    // A press outside the sheet's edge goes back the same way; a press on its own margin,
    // beside what is in it, does nothing (the user, 2026-10-19: "다 해", of "바깥 누르기는
    // 한 규칙으로"). Outside is told by where the press fell, not by its target: the
    // sheet's margin and scroll bar are the dialog too. (The settings and the map did so
    // already; the journal and the share sheet closed on a press on their margin; the
    // cards and the practice's sheets did not close at all, and the practice's offer
    // began the practice on a press anywhere.) Not the photo page: the photo is the whole
    // screen, and a press on it closes it (ui/photoView.js).
    if (sheet === 'photoView') continue;
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const box = dialog.getBoundingClientRect();
      const outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
      if (outside) $(way).click();
    });
  }
}
