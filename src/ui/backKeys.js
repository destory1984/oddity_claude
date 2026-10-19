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
  }
}
