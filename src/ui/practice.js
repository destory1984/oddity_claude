import { t } from '../core/i18n.js';
import { distanceText } from './messages.js';

const $ = (id) => document.getElementById(id);

// Which way an out-of-view ring lies, as the arrow a body's name tag has.
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const arrowFor = (angle) => ARROWS[((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8];

// The keys a lesson lights (core/practice.js practiceGoal's `teach`).
const TEACH = {
  fly: () => [$('flyButton')],
  brake: () => [$('brake')],
  slide: (side) => [$(side < 0 ? 'slideLeft' : 'slideRight')],
  tag: () => [$('practiceTag')],
};

// What the flight practice puts on the screen besides its line at the top (which is
// the goal line, ui/guide.js): the ring's name tag, the key being taught lit, and its
// two sheets (the offer to a newcomer, the end).
// onTag: the tag was pressed (she turns to the ring). onOffer(yes), onDone(hide).
const OFFER_WAIT_MS = 500;

export function createPracticeView({ onTag, onOffer, onDone }) {
  $('practiceTag').addEventListener('click', () => onTag());
  let answered = false;
  const answer = (dialog, fn, value) => {
    answered = true;
    $(dialog).close();
    fn(value);
  };
  // The offer: a press anywhere on it (or beside it) begins the practice; only the small
  // key to skip does not (the user, 2026-10-10: "사용자가 클릭하면 비행 연습 화면으로
  // 넘어가게 해"). Not in its first moment: a finger already tapping the game as the
  // sheet came up would begin it unread.
  let offeredAt = 0;
  $('practiceOffer').addEventListener('click', (event) => {
    if (answered || event.target.closest('#practicePass') || performance.now() - offeredAt < OFFER_WAIT_MS) return;
    answer('practiceOffer', onOffer, true);
  });
  $('practicePass').addEventListener('click', () => answer('practiceOffer', onOffer, false));
  $('practiceKeep').addEventListener('click', () => answer('practiceDone', onDone, false));
  $('practiceHide').addEventListener('click', () => answer('practiceDone', onDone, true));
  // Put away by Esc or the back key: as the quieter of the two answers.
  $('practiceOffer').addEventListener('close', () => { if (!answered) onOffer(false); });
  $('practiceDone').addEventListener('close', () => { if (!answered) onDone(false); });

  let lit = [];
  const light = (els) => {
    if (els.length === lit.length && els.every((el, i) => el === lit[i])) return;
    for (const el of lit) el.classList.remove('teach');
    lit = els;
    for (const el of lit) el.classList.add('teach');
  };

  return {
    // goal: core/practice.js practiceGoal(), or null when it is over. spot: tagSpot().
    // km: how far the ring is. side: which way the slide lesson's ring lies.
    show(goal, spot, km, side = 1) {
      $('practiceLayer').hidden = !goal;
      const tag = $('practiceTag');
      tag.hidden = !goal?.tag;
      if (goal?.tag) {
        tag.style.left = `${spot.x}px`;
        tag.style.top = `${spot.y}px`;
        tag.classList.toggle('inView', !spot.off);
        const text = `${spot.off ? `${arrowFor(spot.angle)} ` : ''}${t('연습 고리')} · ${distanceText(km)}`;
        if (tag.textContent !== text) tag.textContent = text;
      }
      light(goal?.teach ? TEACH[goal.teach](side) : []);
    },
    offer() {
      answered = false;
      offeredAt = performance.now();
      $('practiceOffer').showModal();
    },
    // ask: whether to ask about putting the button away (it is on the screen now).
    done(ask) {
      answered = false;
      $('practiceDoneAsk').hidden = !ask;
      $('practiceHide').hidden = !ask;
      $('practiceKeep').textContent = ask ? t('그대로 두기') : t('확인');
      $('practiceDone').showModal();
    },
    isOpen: () => $('practiceOffer').open || $('practiceDone').open,
  };
}
