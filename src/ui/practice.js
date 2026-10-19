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
  // The offer begins the practice by its own key only. (Until 2026-10-19 a press anywhere
  // on it or beside it began it, the user, 2026-10-10: "사용자가 클릭하면 비행 연습 화면으로
  // 넘어가게 해"; now a press outside it means "건너뛰기", as outside every sheet means its
  // way back, ui/backKeys.js: "다 해".) Not in its first moment: a finger already tapping
  // the game as the sheet came up would begin it unread.
  let offeredAt = 0;
  $('practiceGo').addEventListener('click', () => {
    if (answered || performance.now() - offeredAt < OFFER_WAIT_MS) return;
    answer('practiceOffer', onOffer, true);
  });
  $('practicePass').addEventListener('click', () => answer('practiceOffer', onOffer, false));
  $('practiceKeep').addEventListener('click', () => answer('practiceDone', onDone, false));
  $('practiceWhyOk').addEventListener('click', () => $('practiceWhy').close());
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
    // staged: a lesson has just begun (its name stands in the middle for a moment).
    show(goal, spot, km, side = 1, staged = false) {
      $('practiceLayer').hidden = !goal;
      const stage = $('practiceStage');
      if (goal && staged && stage.hidden) {
        $('practiceStageCount').textContent = goal.count;
        $('practiceStageName').textContent = goal.name;
        $('practiceStageText').textContent = goal.text;
      }
      stage.hidden = !(goal && staged);
      const tag = $('practiceTag');
      tag.hidden = !goal?.tag;
      if (goal?.tag) {
        tag.style.left = `${spot.x}px`;
        tag.style.top = `${spot.y}px`;
        tag.classList.toggle('inView', !spot.off);
        const text = `${spot.off ? `${arrowFor(spot.angle)} ` : ''}${t('연습 고리')} · ${distanceText(km)}`;
        if (tag.textContent !== text) tag.textContent = text;
      }
      // Out of view with no name tag to show the way: an arrow on the edge toward it.
      const arrow = $('practiceArrow');
      arrow.hidden = !(goal && !goal.tag && spot?.off);
      if (!arrow.hidden) {
        arrow.style.left = `${spot.x}px`;
        arrow.style.top = `${spot.y}px`;
        arrow.style.setProperty('--turn', `${spot.angle}rad`);
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
      $('practiceKeep').textContent = ask ? t('그대로 두기') : t('비행으로 돌아가기');
      $('practiceDone').showModal();
    },
    // Why a lesson is learnt: a sheet held until its OK (goal: practiceGoal()).
    why(goal) {
      $('practiceWhyCount').textContent = goal.count;
      $('practiceWhyName').textContent = goal.name;
      // One paragraph to a line of it.
      $('practiceWhyText').replaceChildren(...goal.why.split('\n').map((line) => Object.assign(document.createElement('p'), { textContent: line })));
      $('practiceWhy').showModal();
    },
    isOpen: () => $('practiceOffer').open || $('practiceDone').open || $('practiceWhy').open,
  };
}
