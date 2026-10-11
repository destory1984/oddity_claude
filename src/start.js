// Starts the page once the words of the language in use are there (boot.js).
import { startTranslating } from './ui/translate.js';
import { phoneFrame } from './core/screen.js';
import { loadScreen } from './ui/storage.js';
import { countVisit } from './ui/count.js';

// Which page this is: on a wide window the outer page only holds a phone-shaped frame
// (shell.js) and the game starts inside it; on a phone, inside that frame, or when the
// player chose the wide view, the game starts here.
const inFrame = window.self !== window.top;
const framed = !inFrame && loadScreen() !== 'wide' && phoneFrame({ width: innerWidth, height: innerHeight });

// In another language the page's Korean words are replaced as they appear (ui/translate.js).
startTranslating();

// A long press (or the right button) does not open the browser's own menu: on an Android
// tablet holding a flight key brought up "뒤로 / 앞으로 / 새로고침" (the user, 2026-10-11).
// Both pages, the outer one and the frame. A link keeps its menu (open in a new tab).
addEventListener('contextmenu', (e) => {
  if (!e.target.closest?.('a[href]')) e.preventDefault();
});

// One visit is counted per page opened (ui/count.js): by the outer page, never by the frame.
countVisit();

if (framed) {
  document.documentElement.classList.add('shell');
  import('./shell.js').then((m) => m.startShell());
} else {
  import('./main.js');
}
