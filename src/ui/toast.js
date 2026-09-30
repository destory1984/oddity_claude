const VISIBLE_MS = 3500;

export function createToast(element) {
  let timer = null;
  return {
    show(text) {
      clearTimeout(timer);
      // Same text while visible: extend it without re-announcing to screen readers.
      if (!(element.classList.contains('on') && element.textContent === text)) {
        element.textContent = text;
        element.classList.add('on');
      }
      timer = setTimeout(() => element.classList.remove('on'), VISIBLE_MS);
    },
  };
}
