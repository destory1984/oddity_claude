import { t } from '../core/i18n.js';
const $ = (id) => document.getElementById(id);

// Draws the goal line: the first-visit guide (core/guide.js decides what it says), or
// the next stop of a tour (core/tours.js), which also gets a button to jump near it, or
// how a stunt flight is going (core/stunts.js).
export function createGuideView({ onSkip, onJump = () => {}, onBack = () => {} }) {
  $('guideSkip').addEventListener('click', onSkip);
  $('guideBack').addEventListener('click', onBack);
  $('guideJump').addEventListener('click', onJump);
  let shown = null;
  return {
    // back: the small key before the count shows (the flight practice's lesson before).
    // goal: { count, text, jump, quit, lead, leave } or null to hide. leave: what the
    // button says, when it is neither of its two usual words. jump: a tour's stop. quit:
    // the button gives it up (a tour, a stunt) and does not skip a guide. lead: words
    // before the text that a phone leaves out (a tour's name before its next place).
    show(goal) {
      const text = goal ? `${goal.count} ${goal.lead ?? ''}${goal.text}${goal.back ? ' <' : ''}` : null;
      if (text === shown) return;
      shown = text;
      $('guide').hidden = !goal;
      if (!goal) return;
      $('guideCount').textContent = goal.count;
      $('guideText').textContent = goal.text;
      if (goal.lead) {
        const lead = document.createElement('span');
        lead.className = 'lead';
        lead.textContent = goal.lead;
        $('guideText').prepend(lead);
      }
      $('guideJump').hidden = !goal.jump;
      $('guideBack').hidden = !goal.back;
      $('guideSkip').textContent = goal.leave ?? (goal.jump || goal.quit ? t('그만두기') : t('건너뛰기'));
    },
  };
}
