// Draws the Short of "달의 뒷면은 왜 곰보일까" frame by frame, as moon.cjs does for "달은 왜
// 한쪽 얼굴만 보일까": the course's own stage (src/render/moonSidesStage.js) set to each moment
// and photographed, each part sped or slowed to 하린's lines over it (sides-timing.py), a short
// dip to black between parts; the frames go to assets/promo/<lang>/sides/ with times.json, so
// build/promo/tour.py cuts the film.
// Run: node build/promo/sides.cjs <lang> [part numbers, from 1, to draw again only those]
// PEEK=1 draws one frame from the middle of each part only. (the dev server running)
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');
const FPS = 30;
// [from, to] in the course's seconds (SIDES in moonSidesStage.js), how long it lasts in the film
// (set from sides-timing.json), how far (CSS pixels) the stage is moved down, out from under
// the captions at the top, and how much smaller it is drawn.
const PARTS = [
  [0, 21, 8, 160, 0.72], // the title, then the near side, its seas lit up blue
  [27, 43, 7, 160, 0.72], // turned round to the far side (from its last turning: the user, 2026-11-26)
  [45, 59, 7, 150, 0.8], // rocks from every side, the Earth far
  [62, 98, 9, 230, 0.66], // the old cratered ground flooded by lava (lower and smaller, under its four-line caption)
  [106, 132, 10, 160, 0.72], // the Moon cut in half
  [136, 149, 6, 150, 0.8], // idea one: the hot young Earth
  [152, 165, 4, 160, 0.72], // idea two: thorium
  [167, 175, 4, 160, 0.72], // idea three: South Pole-Aitken
  [184, 197, 5, 160, 0.72], // idea four: a second moon
  [200, 216, 5, 160, 0.72], // Chang'e 6's site
];
const DIP = 0.25; // seconds of black at each end of a part
// The names over the stage, as src/main.js ORBIT_WORDS gives them.
const WORDS = {
  ko: { near: '앞면', far: '뒷면', seas: '바다', highland: '고지대', earth: '지구', earthSide: '지구 쪽', thin: '얇은 겉껍질', thick: '두꺼운 겉껍질', mantle: '맨틀', core: '핵', hotEarth: '갓 생긴 뜨거운 지구', thorium: '토륨이 많은 곳', spa: '남극-에이킨 분지', twin: '작은 둘째 달', change6: '창어 6호 (2024)' },
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
  const out = path.join(ROOT, lang, 'sides');
  // Each part as long as 하린's lines over it in this language (build/promo/moon-timing.py).
  const timing = path.join(ROOT, lang, 'sides-timing.json');
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
      const m = await import(`${dev}src/render/moonSidesStage.js`);
      window.st = m.createMoonSidesStage(document.getElementById('c'));
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
      await p.evaluate((T) => window.st.update(T, window.W), [5, 50, 110, 140, 190][i % 5] + i * 0.03);
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
