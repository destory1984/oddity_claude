// Draws the promo video's captions and its end card as see-through 1080 x 1920 pictures,
// in the game's own fonts (Pretendard and the hand of Gaegu, served by the dev server).
// Run: node build/promo/captions.cjs <lang>  ->  assets/promo/<lang>/captions/<n>.png
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');

// One line for each shot of the cut (build/promo/cut.py CUT), in its order.
const LINES = {
  ko: {
    earth: '할머니가 적다 만 우주 탐험 수첩',
    naro: '그날의 발사를 다시 보고',
    aurora: '오로라 위를 날고',
    apollo: '달에 내리던 순간으로',
    jupiter: '목성의 붉은 폭풍을 지나',
    saturn: '토성의 고리까지',
    journal: '빈칸 208개를 채워요',
    end: { title: '할머니의 수첩', note: '본격 우주멍 힐링 게임', find: "구글 플레이에서 'Space Oddity - 할머니의 수첩'을 찾아보세요" },
  },
  en: {
    earth: "Grandma's unfinished space notebook",
    naro: 'Watch the launches again',
    aurora: 'Fly over the aurora',
    apollo: 'Be there when Apollo 11 lands',
    jupiter: "Pass Jupiter's Great Red Spot",
    saturn: "Out to Saturn's rings",
    journal: 'Fill all 208 slots',
    end: { title: "Grandma's Notes", note: 'A chill game of gazing at space', find: "Find 'Space Oddity - Grandma's Notes' on Google Play" },
  },
};

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${DEV}fonts/pretendard/pretendardvariable-dynamic-subset.css">
<link rel="stylesheet" href="${DEV}fonts/gaegu/400.css">
<style>
html, body { margin: 0; width: 405px; height: 720px; background: transparent; overflow: hidden; }
.band { position: absolute; left: 0; right: 0; bottom: 0; height: 200px; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; padding: 0 22px 46px; box-sizing: border-box;
  background: linear-gradient(to bottom, rgba(5, 9, 28, 0) 0%, rgba(5, 9, 28, 0.86) 38%, rgba(5, 9, 28, 0.96) 100%); }
.kick { font: 700 11px/1 Pretendard Variable, Pretendard, sans-serif; letter-spacing: 0.32em; color: #f2c46b; margin-bottom: 12px; }
.line { font: 400 37px/1.15 Gaegu, cursive; color: #fdf8ec; text-align: center; word-break: keep-all; text-wrap: balance; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.end img { width: 150px; image-rendering: pixelated; margin-bottom: 14px; }
.end .name { font: 800 40px/1 Pretendard Variable, Pretendard, sans-serif; color: #fdf8ec; letter-spacing: 0.02em; }
.end .title { font: 400 50px/1.1 Gaegu, cursive; color: #f2c46b; margin-top: 8px; }
.end .note { font: 400 27px/1.2 Gaegu, cursive; color: #fdf8ec; margin-top: 22px; word-break: keep-all; }
.end .find { font: 500 13px/1.5 Pretendard Variable, Pretendard, sans-serif; color: #c9d3f2; margin-top: 30px; padding: 9px 16px; border: 1px solid rgba(242, 196, 107, 0.55); border-radius: 999px; word-break: keep-all; max-width: 330px; }
</style></head><body>${body}</body></html>`;

(async () => {
  const lang = process.argv[2];
  const lines = LINES[lang];
  const out = path.join(ROOT, lang, 'captions');
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, });
  const p = await (await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 8 / 3 })).newPage();
  // (From the dev server's own origin, or the fonts are refused as another site's.)
  await p.goto(`${DEV}fonts/gaegu/400.css`);
  for (const [key, line] of Object.entries(lines)) {
    const body = key === 'end'
      ? `<div class="end"><img src="${DEV}assets/seora-sprites/cheer-big-1.png"><div class="name">Space Oddity</div><div class="title">${line.title}</div><div class="note">${line.note}</div><div class="find">${line.find}</div></div>`
      : `<div class="band"><div class="kick">SPACE ODDITY</div><div class="line">${line}</div></div>`;
    await p.setContent(page(body), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${key}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(out);
})();
