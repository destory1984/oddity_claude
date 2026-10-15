// Draws the promo video's captions and its end card as see-through 1080 x 1920 pictures,
// in the game's own fonts (Pretendard and the hand of Gaegu, served by the dev server).
// Run: node build/promo/captions.cjs <lang>  ->  assets/promo/<lang>/captions/<n>.png
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const DEV = process.env.PROMO_DEV || 'http://localhost:4417/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');

// One line for each shot of the cut (build/promo/cut.py CUT), in its order.
const FIRST = {
  ko: {
    earth: '할머니가 적다 만 우주 탐험 수첩',
    fly: '내 손으로 직접 날아서',
    naro: '그날의 발사를 다시 보고',
    aurora: '오로라 위를 날고',
    apollo: '달에 내리던 순간으로',
    jupiter: '목성의 붉은 폭풍을 지나',
    saturn: '토성의 고리까지',
    journal: '빈칸 208개를 채워요',
    end: { title: '할머니의 수첩', note: '본격 우주멍 힐링 비행 게임', find: '구글 플레이에서 찾아보세요', store: 'Space Oddity - 할머니의 수첩' },
  },
  en: {
    earth: "Grandma's unfinished space notebook",
    fly: 'Fly there with your own hands',
    naro: 'Watch the launches again',
    aurora: 'Fly over the aurora',
    apollo: 'Be there when Apollo 11 lands',
    jupiter: "Pass Jupiter's Great Red Spot",
    saturn: "Out to Saturn's rings",
    journal: 'Fill all 208 slots',
    end: { title: "Grandma's Notes", note: 'A chill space-gazing flight game', find: 'Find it on Google Play', store: "Space Oddity - Grandma's Notes" },
  },
};
// The "그날로" film (FILM=thatday): the same end card.
const THAT_DAY = {
  ko: {
    dart: '다트가 소행성에 부딪히던 날로',
    hayabusa: '하야부사2와 류구에 내려앉고',
    soho: '태양을 가리면 코로나가 보이고',
    osiris: '베누의 흙을 한 줌 떠 오고',
    herschel: '죽음의 별을 닮은 분화구를 찍고',
    tess: '새 행성을 찾아 하늘을 훑어요',
    end: FIRST.ko.end,
  },
  en: {
    dart: 'Be there the day DART hit an asteroid',
    hayabusa: 'Touch down on Ryugu with Hayabusa2',
    soho: 'Hide the Sun and see its corona',
    osiris: 'Grab a handful of Bennu',
    herschel: "Find the Death Star's crater",
    tess: 'Sweep the sky for new worlds',
    end: FIRST.en.end,
  },
};
// The space-out film (FILM=gaze): the first two shots as in the first film, then what
// space-out is (the user, 2026-10-16: "1,2는 그대로 쓰고, 그 이후는 우주멍에 대해서 소개하는 글").
const GAZE = {
  ko: {
    earth: FIRST.ko.earth,
    fly: FIRST.ko.fly,
    // (Broken by hand: balanced, it fell as "멍때리고 싶을 / 땐 우주멍".)
    spaceout: '멍때리고 싶을 땐\n우주멍',
    // (Was "소라도 숨고, 우주만 남아요": the user, 2026-10-16, "의미 전달 0%"; they picked this.)
    hide: '캐릭터도 숨기고 풍경만 오롯이',
    aurora: '오로라 위에 가만히 떠서',
    jupiter: '목성의 폭풍을 바라보다 보면',
    calm: '그냥 바라만 봐도 돼요',
    // (Still in closed testing: nobody but the testers could find it on Google Play. The
    // user, 2026-10-16: "차라리 출시 준비 중이라고 해라".)
    end: { ...FIRST.ko.end, find: '구글 플레이 출시 준비 중' },
  },
  en: {
    earth: FIRST.en.earth,
    fly: FIRST.en.fly,
    spaceout: 'Want to zone out? Tap "Just looking"',
    hide: 'Hide the character too: just the view',
    aurora: 'Float over the aurora',
    jupiter: "Watch Jupiter's storm go by",
    calm: 'You can just look. That is all',
    end: { ...FIRST.en.end, find: 'Coming soon to Google Play' },
  },
};
const LINES = { thatday: THAT_DAY, gaze: GAZE }[process.env.FILM] ?? FIRST;

const page = (body) => `<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="${DEV}fonts/pretendard/pretendardvariable-dynamic-subset.css">
<link rel="stylesheet" href="${DEV}fonts/gaegu/400.css">
<style>
html, body { margin: 0; width: 405px; height: 720px; background: transparent; overflow: hidden; }
/* YouTube Shorts lays its own things over the film: its logo row at the top (8 to 12%),
   the channel, the title and the subscribe key at the foot (the last 12% and more), the
   like, comment and share keys down the right (from 65%). So the words stand at the top,
   between 13% and 25%, clear of the sides. */
.band { position: absolute; left: 0; right: 0; top: 0; height: 215px; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; padding: 94px 40px 0; box-sizing: border-box;
  background: linear-gradient(to top, rgba(5, 9, 28, 0) 0%, rgba(5, 9, 28, 0.82) 30%, rgba(5, 9, 28, 0.94) 100%); }
.kick { font: 700 11px/1 Pretendard Variable, Pretendard, sans-serif; letter-spacing: 0.32em; color: #f2c46b; margin-bottom: 12px; }
.line { font: 400 37px/1.15 Gaegu, cursive; color: #fdf8ec; text-align: center; word-break: keep-all; text-wrap: balance; text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6); }
.end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding-top: 86px; text-align: center; }
.end img { width: 120px; image-rendering: pixelated; margin-bottom: 14px; }
.end .name { font: 800 40px/1 Pretendard Variable, Pretendard, sans-serif; color: #fdf8ec; letter-spacing: 0.02em; }
.end .title { font: 400 50px/1.1 Gaegu, cursive; color: #f2c46b; margin-top: 8px; }
.end .note { font: 400 27px/1.2 Gaegu, cursive; color: #fdf8ec; margin-top: 22px; word-break: keep-all; }
.end .find { font: 500 13px/1.5 Pretendard Variable, Pretendard, sans-serif; color: #c9d3f2; margin-top: 30px; padding: 9px 16px; border: 1px solid rgba(242, 196, 107, 0.55); border-radius: 999px; word-break: keep-all; max-width: 250px; }
.end .find b { display: block; font-weight: 800; font-size: 15px; color: #fdf8ec; white-space: nowrap; margin-top: 2px; }
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
      ? `<div class="end"><img src="${DEV}assets/seora-sprites/cheer-big-1.png"><div class="name">Space Oddity</div><div class="title">${line.title}</div><div class="note">${line.note}</div><div class="find">${line.find}<b>${line.store}</b></div></div>`
      : `<div class="band"><div class="kick">SPACE ODDITY</div><div class="line">${line.replace(/\n/g, '<br>')}</div></div>`;
    await p.setContent(page(body), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `${key}.png`), omitBackground: true });
  }
  await browser.close();
  console.log(out);
})();
