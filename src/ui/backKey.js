// The phone's back key, when the game runs as an app (installed from the browser, or the
// Android app from the store). There the back key leaves the page, which closed the whole
// game even with the notebook open (seen on Android, 2026-10-05). With this, back puts
// away what is open first: the sheet on top, or photo mode and the close view. With
// nothing open it leaves the game as before.
//
// How: each thing that opens is given a step in the page's history; the back key takes
// that step back, and the thing is closed. A thing closed by its own button takes its
// step back itself.
//
// isView: whether photo mode or the close view is up. leaveView: puts it away.
// In a browser tab nothing is done: there the back key belongs to the browser.
export function createBackKey({ isView = () => false, leaveView = () => {}, watch = [] } = {}) {
  if (!matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) return;
  // Steps in the history that stand for things now open, and steps back of our own
  // making that are still to be told of (they must not close anything).
  let held = 0;
  let ours = 0;
  const sheets = () => [...document.querySelectorAll('dialog[open]')];
  const open = () => sheets().length + (isView() ? 1 : 0);
  function sync() {
    const now = open();
    while (held < now) {
      history.pushState({ oddity: 'open' }, '');
      held += 1;
    }
    if (held > now) {
      ours += 1;
      history.go(now - held);
      held = now;
    }
  }
  const observer = new MutationObserver(sync);
  observer.observe(document.body, { attributes: true, attributeFilter: ['open'], subtree: true });
  for (const el of watch) observer.observe(el, { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('popstate', () => {
    if (ours > 0) {
      ours -= 1;
      return;
    }
    // The back key: one step is gone, and with it goes the thing on top.
    if (held === 0) return;
    held -= 1;
    const top = sheets().pop();
    if (top) top.close();
    else if (isView()) leaveView();
  });
  sync();
}
