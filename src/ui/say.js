// Seora's speech bubble: one short line above her head for a few seconds.
// A line stays up at least this long before the next takes its place: at a tour's stop
// her line for the stop and her line for finding the body came 0.2 s apart, and the
// first was gone before it could be read.
const MIN_S = 2.5;
// No more than this many wait; an older waiting line gives way.
const WAITING = 2;

export function createSay(el) {
  let timer = null;
  let nextTimer = null;
  let shownAt = -Infinity;
  const queue = [];

  function display(text, seconds) {
    shownAt = performance.now();
    el.textContent = text;
    el.classList.add('on');
    clearTimeout(timer);
    timer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
  }

  function next() {
    nextTimer = null;
    const line = queue.shift();
    if (!line) return;
    display(line.text, line.seconds);
    if (queue.length) nextTimer = setTimeout(next, MIN_S * 1000);
  }

  return {
    show(text, seconds = 5) {
      const since = (performance.now() - shownAt) / 1000;
      if (!queue.length && (since >= MIN_S || !el.classList.contains('on'))) {
        display(text, seconds);
        return;
      }
      if (el.textContent === text || queue.some((line) => line.text === text)) return;
      queue.push({ text, seconds });
      if (queue.length > WAITING) queue.shift();
      if (!nextTimer) nextTimer = setTimeout(next, Math.max(0, MIN_S - since) * 1000);
    },
    // Whether a line is up now (she is drawn speaking while it is).
    showing: () => el.classList.contains('on'),
    // card: world.update's heroCard (the sprite on screen); without one the bubble
    // stands a little above the middle of the view.
    place(card) {
      const top = card
        ? innerHeight / 2 - card.up * innerHeight - (card.height * innerHeight) / 2
        : innerHeight * 0.42;
      el.style.top = `${Math.max(70, top).toFixed(0)}px`;
    },
  };
}
