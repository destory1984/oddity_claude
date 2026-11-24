// Draws the Short of "태양계는 어떻게 도는가" frame by frame: the course's own stage
// (src/render/orbitStage.js) set to each moment and photographed, so a sped-up part has no
// stutter however slow this PC is. Six parts of the course, each sped up, a short dip to
// black between them; the frames go to assets/promo/<lang>/orbits/ with times.json as
// shoot.cjs writes it, so build/promo/tour.py cuts the film (captions, music, end card).
// The music is a separate recording: node build/promo/shoot.cjs ko music60.
// Run: node build/promo/orbits.cjs <lang> [part numbers, from 1, to draw again only those]
// (the dev server running)
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');
const FPS = 30;
// [from, to] in the course's seconds, how long it lasts in the film, and how far (CSS
// pixels) the stage is moved down, so what it shows is not under the captions at the top,
// and how much smaller it is drawn (the Earth's year is wider than a phone held upright:
// the user, 2026-11-25, of its sides: "이쪽이 잘리네").
const PARTS = [
  [15, 27, 6], // the Earth turning
  [211, 225, 7, 0, 0.8], // its year, the axis keeping its way
  [263, 284, 7], // the planets, the further the slower
  [324, 351, 9, 170], // the helices behind the Sun
  [368, 395, 9], // back from the Sun to the stars near it, on to Alpha Centauri
  [456, 486, 10, 100], // down to the black hole
];
const DIP = 0.25; // seconds of black at each end of a part
// The names over the stage, as src/main.js ORBIT_WORDS gives them.
const WORDS = {
  ko: { sun: '태양', earth: '지구', moon: '달', ghost: '스스로 돌지 않는다면', here: '태양계', sgr: ['궁수자리 A*', '질량은 태양의 400만 배 · 2만 6천 광년'], mercury: '수성', venus: '금성', mars: '화성', jupiter: '목성', saturn: '토성', uranus: '천왕성', neptune: '해왕성', firstDino: '첫 공룡', dinoGone: '공룡이 사라짐', hood: { sun: ['태양계', ''], alpha: ['알파 센타우리', '4.4광년 · 해가 셋'], trappist: ['트라피스트-1', '40광년 · 지구만 한 행성 일곱'], kepler16: ['케플러-16', '245광년 · 해가 둘인 행성'], kepler452: ['케플러-452', '1,800광년 · 지구의 사촌'] } },
};

(async () => {
  const lang = process.argv[2] || 'ko';
  const only = process.argv.slice(3).map(Number);
  const out = path.join(ROOT, lang, 'orbits');
  if (!only.length) fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    const p = await (await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3 })).newPage();
    await p.goto(`${DEV}fonts/gaegu/400.css`);
    await p.evaluate(async ([dev, words]) => {
      document.documentElement.innerHTML = '<body style="margin:0;width:100vw;height:100vh;background:#000;overflow:hidden"><canvas id="c" style="position:fixed;inset:0;width:100%;height:100%;background:#000"></canvas><div id="dip" style="position:fixed;inset:0;z-index:20;background:#000;opacity:0"></div></body>';
      const B = await import(`${dev}src/render/babylon.js`);
      const m = await import(`${dev}src/render/orbitStage.js`);
      window.st = m.createOrbitStage(document.getElementById('c'));
      // (Drawn at the screen's own pixels, not the page's: the stage places its names by
      // the ratio of the two.)
      const engine = (B.EngineStore ?? B.Engine).Instances.at(-1);
      engine.setHardwareScalingLevel(1 / devicePixelRatio);
      window.st.resize();
      // (No transitions: each frame is a moment of its own.)
      const s = document.createElement('style');
      s.textContent = '* { transition: none !important; }';
      document.head.append(s);
      window.W = { ...words, ago: (my) => `${my}만 년 전` };
    }, [DEV, WORDS[lang]]);
    // The pictures and shaders first.
    await p.evaluate(() => { for (let i = 0; i < 5; i++) window.st.update(20 + i * 0.03, window.W); });
    await p.waitForTimeout(4000);
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
      for (let f = 0; f < frames; f++) {
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
