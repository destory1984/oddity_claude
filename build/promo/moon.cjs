// Draws the Short of "달은 왜 한쪽 얼굴만 보일까" frame by frame, as orbits.cjs does for
// "태양계는 어떻게 도는가": the course's own stage (src/render/moonStage.js) set to each moment
// and photographed. Parts of the course, each sped up, a short dip to black between them;
// the frames go to assets/promo/<lang>/moon/ with times.json, so build/promo/tour.py cuts the
// film (captions, 하린's voice over the game's music, end card).
// Run: node build/promo/moon.cjs <lang> [part numbers, from 1, to draw again only those]
// PEEK=1 draws one frame from the middle of each part only, to look before drawing them all.
// (the dev server running)
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');
const FPS = 30;
// [from, to] in the course's seconds (MOONS in moonStage.js), how long it lasts in the film,
// how far (CSS pixels) the stage is moved down, out from under the captions at the top, and
// how much smaller it is drawn. The script agreed with the user 2026-11-26 (60 s, the bulge
// as a handle, the moon rabbit at the end).
const PARTS = [
  [36, 46, 7.2, 90], // the Moon with its red spot kept to the Earth
  [48, 72, 10.1, 150, 0.72], // beside a Moon that does not turn
  [74, 84, 5.4, 200, 0.72], // the newborn Moon spinning fast
  [84, 100, 7.4, 150, 0.7], // stretched toward the Earth: a handle
  [100, 124, 9.0, 150, 0.66], // the handle pulled back, the spin slowing
  [120, 131, 9.4, 150, 0.66], // the handle kept toward the Earth: tidal locking
  [178, 186, 4.1, 165, 0.9], // Pluto and Charon
];
const DIP = 0.25; // seconds of black at each end of a part
// The names over the stage, as src/main.js ORBIT_WORDS gives them.
const WORDS = {
  ko: { earth: '지구', moon: '달', ghost: '스스로 돌지 않는다면', pluto: '명왕성', charon: '카론', eris: '에리스', dysnomia: '디스노미아', patroclus: '파트로클로스', menoetius: '메노이티오스' },
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
  const out = path.join(ROOT, lang, 'moon');
  // Each part as long as 하린's lines over it in this language (build/promo/moon-timing.py).
  const timing = path.join(ROOT, lang, 'moon-timing.json');
  if (fs.existsSync(timing)) JSON.parse(fs.readFileSync(timing, 'utf8')).films.forEach((film, k) => { PARTS[k][2] = film; });
  if (!only.length) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3 })).newPage();
    await p.goto(`${DEV}fonts/gaegu/400.css`);
    await p.evaluate(async ([dev, words]) => {
      document.documentElement.innerHTML = '<body style="margin:0;width:100vw;height:100vh;background:#000;overflow:hidden"><canvas id="c" style="position:fixed;inset:0;width:100%;height:100%;background:#000"></canvas><div id="dip" style="position:fixed;inset:0;z-index:20;background:#000;opacity:0"></div></body>';
      const B = await import(`${dev}src/render/babylon.js`);
      const m = await import(`${dev}src/render/moonStage.js`);
      window.st = m.createMoonStage(document.getElementById('c'));
      // (Drawn at the screen's own pixels, not the page's: the stage places its names by
      // the ratio of the two.)
      const engine = (B.EngineStore ?? B.Engine).Instances.at(-1);
      engine.setHardwareScalingLevel(1 / devicePixelRatio);
      window.st.resize();
      // (No transitions: each frame is a moment of its own.)
      const s = document.createElement('style');
      s.textContent = '* { transition: none !important; }';
      document.head.append(s);
      window.W = { ...words, ago: (my) => `${my}` };
    }, [DEV, wordsIn(lang)]);
    // The pictures and shaders first.
    // (Drawn for a while, not only stepped: the first frames came out without the bodies.)
    for (let i = 0; i < 40; i++) {
      await p.evaluate((T) => window.st.update(T, window.W), 36 + i * 0.03);
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
