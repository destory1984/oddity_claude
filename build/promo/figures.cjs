// Draws the Short of "달에는 누가 살까" frame by frame, as sunlight.cjs does for "햇빛은 몇
// 살일까": the course's own stage (src/render/moonFiguresStage.js) set to each moment and
// photographed, each part sped or slowed to 하린's lines over it (figures-timing.py), a short
// dip to black between parts; the frames go to assets/promo/<lang>/figures/ with times.json,
// so build/promo/tour.py cuts the film.
// Run: node build/promo/figures.cjs <lang> [part numbers, from 1, to draw again only those]
// PEEK=1 draws one frame from the middle of each part only. (the dev server running)
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');
const FPS = 30;
// [from, to] in the course's seconds (as core/courses.js and the stage's FIGS time them),
// how long it lasts in the film (set from figures-timing.json), how far (CSS pixels) the stage is moved down, out from under
// the captions at the top, and how much smaller it is drawn.
const PARTS = [
  [0.2, 9.0, 8, 110, 1.0], // the title, then the full Moon
  [12.2, 24.5, 5, 110, 1.0], // Korea: the rabbit, its mortar and the tree drawn on
  [25.7, 31.3, 4, 110, 1.0], // Japan: the same rabbit at its mortar
  [31.8, 43.8, 5, 110, 1.0], // China: the toad joins it
  [44.3, 51.3, 5, 110, 1.0], // Vietnam: Cuội under the banyan
  [51.6, 70.0, 6, 110, 1.0], // India: the hare and the fire
  [77.6, 89.5, 6, 110, 1.0], // the Aztecs: the Moon too bright, struck
  [90.3, 103.8, 5, 110, 1.0], // Europe: the man with his sticks
  [104.4, 125.3, 6, 110, 1.0], // the North, the Maori and Hawaii, quickly one after another
  [132.4, 140.0, 5, 110, 1.0], // the Moon upside down, as seen from the south
];
const DIP = 0.25; // seconds of black at each end of a part
// No place names over the stage: the captions name each place.
const WORDS = {
  ko: { korea: '', japan: '', china: '', vietnam: '', india: '', aztec: '', europe: '', north: '', maori: '', hawaii: '', south: '', seas: '' },
};

// In another language, each Korean word as the game's own translation gives it.
function wordsIn(lang) {
  if (lang === 'ko') return WORDS.ko;
  const table = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'i18n', `${lang}.json`), 'utf8'));
  const say = (v) => (typeof v === 'string' ? (v ? table[v] ?? v : v) : Array.isArray(v) ? v.map(say) : Object.fromEntries(Object.entries(v).map(([k, w]) => [k, say(w)])));
  return say(WORDS.ko);
}

(async () => {
  const lang = process.argv[2] || 'ko';
  const only = process.argv.slice(3).map(Number);
  const out = path.join(ROOT, lang, 'figures');
  // Each part as long as 하린's lines over it in this language (build/promo/figures-timing.py).
  const timing = path.join(ROOT, lang, 'figures-timing.json');
  if (fs.existsSync(timing)) JSON.parse(fs.readFileSync(timing, 'utf8')).films.forEach((film, k) => { PARTS[k][2] = film; });
  if (!only.length) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3 })).newPage();
    await p.goto(`${DEV}fonts/gaegu/400.css`);
    await p.evaluate(async ([dev, words, lang]) => {
      document.documentElement.innerHTML = '<body style="margin:0;width:100vw;height:100vh;background:#000;overflow:hidden"><canvas id="c" style="position:fixed;inset:0;width:100%;height:100%;background:#000"></canvas><div id="dip" style="position:fixed;inset:0;z-index:20;background:#000;opacity:0"></div></body>';
      const m = await import(`${dev}src/render/moonFiguresStage.js`);
      window.st = m.createMoonFiguresStage(document.getElementById('c'), { maxDpr: 3 });
      // (Drawn at the screen's own pixels, not the page's: maxDpr above.)
      // (No transitions: each frame is a moment of its own.)
      const s = document.createElement('style');
      s.textContent = '* { transition: none !important; }';
      document.head.append(s);
      window.W = words;
    }, [DEV, wordsIn(lang), lang]);
    // The pictures and shaders first.
    // (Drawn for a while, not only stepped: the first frames came out without the bodies.)
    for (let i = 0; i < 40; i++) {
      await p.evaluate((T) => window.st.update(T, window.W), [3, 20, 50, 95, 125][i % 5] + i * 0.03);
      await p.waitForTimeout(100);
    }
    const times = [];
    let n = 0;
    for (const [k, [from, to, film, down = 0, size = 1]] of PARTS.entries()) {
      const frames = Math.round(film * FPS);
      if (only.length && !only.includes(k + 1)) {
        for (let f = 0; f < frames; f++) times.push(n++ / FPS);
        continue;
      }
      // (Smaller: the stage drawn on a page wider by 1 / size, then that page made smaller,
      // so what lay beyond the screen's sides comes in.)
      await p.evaluate(([down, size]) => {
        const b = document.body.style;
        // (Wider only: the camera keeps its height of view, so a taller page would just be
        // the same picture larger. Set in the middle of the screen's height.)
        b.width = `${100 / size}vw`;
        b.height = '100vh';
        b.transformOrigin = '0 0';
        b.transform = `translateY(${down + ((1 - size) * innerHeight) / 2}px) scale(${size})`;
        window.st.resize();
      }, [down, size]);
      // (A few steps into the part before the first frame, so that what it keeps is set.)
      await p.evaluate((T) => { for (let i = 3; i > 0; i--) window.st.update(T - i * 0.03, window.W); }, from);
      const peek = Math.floor(frames / 2);
      for (let f = process.env.PEEK ? peek : 0; f < (process.env.PEEK ? peek + 1 : frames); f++) {
        const s = f / FPS;
        const T = from + ((to - from) * s) / film;
        const dark = Math.max(0, 1 - Math.min(s, film - s - 1 / FPS) / DIP);
        await p.evaluate(([T, dark]) => {
          window.st.update(T, window.W);
          document.getElementById('dip').style.opacity = String(dark);
        }, [T, dark]);
        await p.screenshot({ path: path.join(out, `${String(n).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
        times.push(n / FPS);
        n++;
      }
      console.log(`part ${from} → ${to}: ${frames} frames`);
    }
    fs.writeFileSync(path.join(out, 'times.json'), JSON.stringify(times));
    console.log(out, n, 'frames');
  } finally {
    await browser.close();
  }
})();
