const $ = (id) => document.getElementById(id);

// Draws the goal line: the first-visit guide (core/guide.js decides what it says), or
// the next stop of a tour (core/tours.js), which also gets a button to jump near it.
export function createGuideView({ onSkip, onJump = () => {} }) {
  $('guideSkip').addEventListener('click', onSkip);
  $('guideJump').addEventListener('click', onJump);
  let shown = null;
  return {
    // goal: { count, text, jump } or null to hide. jump: a tour's stop.
    show(goal) {
      const text = goal ? `${goal.count} ${goal.text}` : null;
      if (text === shown) return;
      shown = text;
      $('guide').hidden = !goal;
      if (!goal) return;
      $('guideCount').textContent = goal.count;
      $('guideText').textContent = goal.text;
      $('guideJump').hidden = !goal.jump;
      $('guideSkip').textContent = goal.jump ? '그만두기' : '건너뛰기';
    },
  };
}
