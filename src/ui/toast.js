const VISIBLE_MS = 3500;
// While more messages wait, each one stays up this long before the next.
const QUEUED_MS = 2500;

export function createToast(element) {
  let timer = null;
  const queue = [];

  function display(text) {
    element.textContent = text;
    element.classList.add('on');
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(next, queue.length ? QUEUED_MS : VISIBLE_MS);
  }

  function next() {
    if (queue.length) display(queue.shift());
    else element.classList.remove('on');
  }

  return {
    show(text) {
      const showing = element.classList.contains('on');
      if (showing && element.textContent === text) {
        // Same text while visible: extend it without re-announcing to screen readers.
        if (!queue.length) schedule();
        return;
      }
      if (!showing) {
        display(text);
        return;
      }
      if (!queue.includes(text)) queue.push(text);
      schedule();
    },
  };
}
