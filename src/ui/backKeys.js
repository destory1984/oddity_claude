import { t } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);

// One way back from every sheet and card: a square ✕ in its upper left corner (the user,
// 2026-10-19, of the round ✕ at the upper right of the photo view: "이전 메뉴로...는 화면
// 왼쪽위 네모난 X 아이콘 버튼으로 통일"). It does what the sheet's own way out does, so
// whatever that one also does on leaving (saving, sounds, the next lesson) is not lost.
// The words at the foot stay (the user: "남기기"); the round ✕ of the photo view and the
// ✕ at the right of the journal's head give way to it (style.css).
// The way back is drawn as an arrow that bends back on itself, "to where you were" (the
// user, 2026-10-20: "메뉴의 X 아이콘을 모두 왼쪽 화살표 아이콘으로 바꾸자", of five drawn:
// "파란색 4"; it was a ✕). (Moved up 2.25 so that it sits in the middle of the key.)
const BACK_ARROW = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(0.25 -2.25)"><path d="M9 7L4.5 11.5 9 16"/><path d="M5 11.5h9a5 5 0 0 1 0 10h-2"/></g></svg>';
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
  appOffer: 'appOfferStay',
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
    key.innerHTML = BACK_ARROW;
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

// The same square ✕ while a view of its own is open (photo mode, which the close look at
// a target, "확대", is): it presses that view's own way back (the user, 2026-10-20, of the
// close look at the Moon: "화면 왼쪽 상단에 X 버튼 없다"; the only way out was "비행으로
// 돌아가기" at the foot). It stands in the upper left of the reading's sheet when that is
// up, as every sheet's does ("디자인 통일성을 완전히 무시했네": it stood alone beside it),
// and in the screen's upper left when it is not. view: the element shown while the view is
// open; way: its way back; sheet: the reading's sheet.
export function addViewBackKey(view, way, sheet = null) {
  if (!view || !way) return;
  const key = document.createElement('button');
  key.className = 'backKey viewBackKey';
  key.type = 'button';
  key.setAttribute('aria-label', t('이전 화면으로'));
  key.title = t('이전 화면으로');
  key.innerHTML = BACK_ARROW;
  key.addEventListener('click', (event) => {
    event.stopPropagation();
    way.click();
  });
  const sync = () => {
    key.hidden = view.hidden;
    const home = sheet && !sheet.hidden ? sheet : document.body;
    if (key.parentElement !== home) home.prepend(key);
  };
  const watch = new MutationObserver(sync);
  for (const el of [view, sheet]) if (el) watch.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  sync();
}
