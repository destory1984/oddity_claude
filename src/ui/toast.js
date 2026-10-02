const VISIBLE_MS = 3500;
// While more messages wait, each one stays up this long before the next.
const QUEUED_MS = 2500;
// Two-line messages (a discovery with its fact) stay up this much longer.
const LONG_TEXT = 30;
const LONG_EXTRA_MS = 2500;
// With two or more waiting, the one showing makes way sooner: at a tour's stop five
// notices come within seconds, and at the usual pace the last was 20 s behind what it told of.
const HURRIED_MS = 1500;
const HURRIED_LONG_EXTRA_MS = 1000;

export function createToast(element) {
  let timer = null;
  let currentKind = null;
  const queue = [];

  function display(text, kind = null) {
    currentKind = kind;
    element.textContent = text;
    element.classList.add('on');
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    const hurried = queue.length >= 2;
    const long = element.textContent.length > LONG_TEXT;
    const extra = long ? (hurried ? HURRIED_LONG_EXTRA_MS : LONG_EXTRA_MS) : 0;
    timer = setTimeout(next, (hurried ? HURRIED_MS : queue.length ? QUEUED_MS : VISIBLE_MS) + extra);
  }

  function next() {
    if (queue.length) {
      const item = queue.shift();
      display(item.text, item.kind);
    }
    else element.classList.remove('on');
  }

  return {
    // kind: messages of the same kind replace each other while waiting in the queue,
    // so a burst of updates does not replay one by one.
    show(text, kind = null) {
      const showing = element.classList.contains('on');
      if (showing && element.textContent === text) {
        // Same text while visible: extend it without re-announcing to screen readers.
        if (!queue.length) schedule();
        return;
      }
      if (!showing || (kind && kind === currentKind)) {
        display(text, kind);
        return;
      }
      const wasEmpty = queue.length === 0;
      const same = kind ? queue.findIndex((item) => item.kind === kind) : -1;
      if (same >= 0) queue[same] = { text, kind };
      else if (!queue.some((item) => item.text === text)) queue.push({ text, kind });
      // Only the first waiting message shortens the current one; later ones keep
      // the existing deadline so a steady stream cannot hold a message up forever.
      if (wasEmpty && queue.length) schedule();
    },
  };
}
