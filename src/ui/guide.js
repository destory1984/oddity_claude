const $ = (id) => document.getElementById(id);

// Draws the first-visit goal line (core/guide.js decides what it says).
export function createGuideView({ onSkip }) {
  $('guideSkip').addEventListener('click', onSkip);
  let shown = null;
  return {
    // goal: { count, text } or null to hide.
    show(goal) {
      const text = goal ? goal.text : null;
      if (text === shown) return;
      shown = text;
      $('guide').hidden = !goal;
      if (!goal) return;
      $('guideCount').textContent = goal.count;
      $('guideText').textContent = goal.text;
    },
  };
}
