const VISIBLE_MS = 3500;
// While more messages wait, each one stays up this long before the next.
const QUEUED_MS = 2500;

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
    timer = setTimeout(next, queue.length ? QUEUED_MS : VISIBLE_MS);
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
    // so a fast trip does not replay every speed-zone change after arrival.
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
      const same = kind ? queue.findIndex((item) => item.kind === kind) : -1;
      if (same >= 0) queue[same] = { text, kind };
      else if (!queue.some((item) => item.text === text)) queue.push({ text, kind });
      schedule();
    },
  };
}
