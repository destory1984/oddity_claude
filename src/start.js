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

// One visit is counted per page opened (ui/count.js): by the outer page, never by the frame.
countVisit();

if (framed) {
  document.documentElement.classList.add('shell');
  import('./shell.js').then((m) => m.startShell());
} else {
  import('./main.js');
}
