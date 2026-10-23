// How long the game takes to start, step by step: opens it a few times in a headless
// Chromium on the real GPU and reads the page's "oddity:…" marks (boot.js, main.js,
// render/world.js). Each opening after the first has the browser's cache warm, as a
// reload after a change of language does.
// Run: node build/playtest/startup.cjs [url] [times]   (default: the dev server, 4 times)
const { chromium, executablePath } = require('../promo/env.cjs');

const URL = process.argv[2] || 'http://localhost:4417/oddity_claude/';
const TIMES = Number(process.argv[3]) || 4;
const STEPS = ['boot', 'code', 'init', 'engine', 'bodies', 'stars', 'craft', 'sites', 'glows', 'models', 'sceneReady', 'ready'];

async function main() {
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const rows = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: 402, height: 657 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      try {
        localStorage.setItem('oddity.music', '0');
        localStorage.setItem('oddity.muted', '1');
        localStorage.setItem('oddity.guide.v1', 'done');
      } catch { /* storage shut */ }
      if (window.SpeechSynthesis) SpeechSynthesis.prototype.speak = () => {};
    });
    for (let i = 0; i < TIMES; i++) {
      await page.goto(URL);
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
      rows.push(await page.evaluate(() => {
        const at = Object.fromEntries(performance.getEntriesByType('mark').filter((m) => m.name.startsWith('oddity:')).map((m) => [m.name.slice(7), m.startTime]));
        const nav = performance.getEntriesByType('navigation')[0];
        at.html = nav ? nav.responseEnd : 0;
        return at;
      }));
    }
  } finally {
    await browser.close();
  }
  const pad = (s, n) => String(s).padStart(n);
  console.log(`${URL}\n${pad('step', 11)} ${rows.map((_, i) => pad(i ? `warm ${i}` : 'cold', 8)).join(' ')}   (ms since the page was asked for; in brackets: since the step before)`);
  for (const step of ['html', ...STEPS]) {
    const cells = rows.map((r) => {
      const prev = ['html', ...STEPS].slice(0, ['html', ...STEPS].indexOf(step)).reverse().find((s) => r[s] !== undefined);
      if (r[step] === undefined) return pad('-', 8);
      return pad(`${Math.round(r[step])}${prev ? `(${Math.round(r[step] - r[prev])})` : ''}`, 8);
    });
    console.log(`${pad(step, 11)} ${cells.join(' ')}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
