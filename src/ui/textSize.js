import { textSizeFrom, nextTextSize, canResize } from '../core/textSize.js';
import { loadTextSize, saveTextSize } from './storage.js';

// The size of the writing in the journal, the settings and the help: two buttons
// ("가−", "가+") at the head of each, five sizes (core/textSize.js), one size for all
// three, kept between visits. The page's root carries it as --text; style.css grows
// the part of each sheet that is read (CSS zoom, so the lines wrap again).
export function bindTextSize() {
  let size = textSizeFrom(loadTextSize());
  const buttons = [...document.querySelectorAll('.textSize button[data-way]')];
  const show = () => {
    document.documentElement.style.setProperty('--text', String(size));
    for (const button of buttons) button.disabled = !canResize(size, Number(button.dataset.way));
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      size = nextTextSize(size, Number(button.dataset.way));
      saveTextSize(size);
      show();
    });
  }
  show();
}
