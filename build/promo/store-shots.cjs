// Phone screenshots for the Play Store listing: 1080 x 1920 (a 432 x 768 phone at 2.5x),
// seven for each language, into assets/store/<lang>-N.png, in a headless Chromium on the
// real GPU (no window on the screen). Silent; a made-up save in a fresh browser, so no
// real save is touched.
//   1 Earth, 2 Saturn with Sora (photo mode, no HUD), 3 Jupiter with her (the same),
//   4 Mars, 5 the journal's stories, 6 the Apollo 11 story card, 7 its "That day" scene.
// Run: node build/promo/store-shots.cjs [ko en ja zh]   (STORE_URL: the dev server)
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');

const URL = process.env.STORE_URL || 'http://localhost:4417/oddity_claude/';
const OUT = path.join(__dirname, '..', '..', 'assets', 'store');
// The name tag of each body stood by, in each language.
const NAMES = {
  saturn: ['토성', 'Saturn', '土星'],
  jupiter: ['목성', 'Jupiter', '木星'],
  mars: ['화성', 'Mars', '火星'],
  earth: ['지구', 'Earth', '地球'],
  apollo11: ['아폴로 11호', 'Apollo 11', 'アポロ11号', '阿波罗11号'],
};

async function shoot(browser, lang) {
  const ctx = await browser.newContext({ viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
  await p.addInitScript((lang) => {
    try {
      localStorage.setItem('oddity.lang.v1', lang);
      localStorage.setItem('oddity.music', '0');
      localStorage.setItem('oddity.muted', '1');
    } catch { /* storage shut */ }
    if (window.SpeechSynthesis) SpeechSynthesis.prototype.speak = () => {};
  }, lang);
  // Seeded from a page that does not run the game (the game writes its own save as it
  // leaves): about two thirds found, three landings, two notes, one tour.
  await p.goto(URL + 'og.jpg');
  await p.evaluate(async (base) => {
    const { STORIES } = await import(base + 'src/core/stories.js');
    const { CRAFT } = await import(base + 'src/core/craft.js');
    const { BODY_DATA } = await import(base + 'src/core/bodies.js');
    const some = (list, n) => list.filter((_, i) => i % n !== 1).map((x) => x.id);
    localStorage.setItem('oddity.progress.v1', JSON.stringify({ discovered: some(BODY_DATA, 4), landed: ['moon', 'mars', 'earth'], photos: [], stories: some(STORIES, 3), craft: some(CRAFT, 3), notes: ['opening', 'note1969'], tours: ['firstSteps'], tour: null, quiz: ['apollo11'] }));
    localStorage.setItem('oddity.guide.v1', 'done');
  }, new globalThis.URL(URL).pathname);
  await p.goto(URL);
  await p.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
  await p.addStyleTag({ content: '#testBar { display: none !important; }' });
  // Notes and offers that come by themselves in the first minute: shut as they come,
  // all but the sheets kept open on purpose.
  await p.evaluate(() => {
    window.__keep = [];
    setInterval(() => document.querySelectorAll('dialog[open]').forEach((d) => { if (!window.__keep.includes(d.id)) d.close(); }), 150);
  });
  await p.waitForTimeout(12000);

  let n = 0;
  const shot = async () => {
    n += 1;
    await p.screenshot({ path: path.join(OUT, `${lang}-${n}.png`) });
  };
  // Stand near a body on its sunlit side, a little off to one side and above.
  const near = async (id, radii, lift, aside) => {
    await p.evaluate(({ id, radii, lift, aside }) => {
      const bodies = window.oddity.bodies();
      const b = bodies.find((x) => x.id === id);
      const sun = bodies.find((x) => x.id === 'sun');
      const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
      const d = norm(sun.position.map((x, i) => x - b.position[i]));
      const side = norm([d[2], 0, -d[0]]);
      const dir = norm([d[0] * 0.8 + side[0] * aside, lift, d[2] * 0.8 + side[2] * aside]);
      window.oddity.place(b.position.map((x, i) => x + dir[i] * b.radiusKm * radii), b.position);
    }, { id, radii, lift, aside });
    await p.waitForTimeout(2500);
    // The body stood by becomes the target, so the name at the top is its own. (Its tag
    // is "✓ Mars · 3,638 km": the name just before the dot, so not "The Potato Farm on Mars".)
    await p.evaluate((names) => {
      const own = (e) => names.some((n) => new RegExp(`(^|[\s✓○])${n}\s*·`).test(e.textContent.trim()));
      // (Its tag may be hidden under her bubble: a click event reaches it all the same.)
      [...document.querySelectorAll('.marker')].find(own)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }, NAMES[id]);
    await p.waitForTimeout(3000);
  };
  // In photo mode with her in the picture and nothing else laid over the view.
  const stand = (id, { radii, sun = 0.8, side = 0.5, lift = 0.2, look = id, off = [0, 0, 0], from = null }) => p.evaluate(({ id, radii, sun, side, lift, look, off, from }) => {
    const bodies = window.oddity.bodies();
    const by = (x) => bodies.find((b) => b.id === x);
    const b = by(id);
    const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const d = from ? norm(b.position.map((x, i) => x - by(from).position[i])) : norm(by('sun').position.map((x, i) => x - b.position[i]));
    const s = norm([d[2], 0, -d[0]]);
    const dir = norm([d[0] * sun + s[0] * side, d[1] * sun + lift, d[2] * sun + s[2] * side]);
    const at = b.position.map((x, i) => x + dir[i] * b.radiusKm * radii);
    const t = by(look).position.map((x, i) => x + (s[i] * off[0] + [0, 1, 0][i] * off[1] + d[i] * off[2]) * b.radiusKm);
    window.oddity.place(at, t);
  }, { id, radii, sun, side, lift, look, off, from });

  // Earth with the Sun low beside it; her bubble waited out (the first words after a
  // jump are about the spin).
  await near('earth', 2.4, 0.3, 0.9);
  await p.waitForFunction(() => !document.getElementById('heroSay').textContent.trim() || getComputedStyle(document.getElementById('heroSay')).opacity < 0.05, null, { timeout: 20000 }).catch(() => {});
  await shot();
  await p.evaluate(() => document.getElementById('photoButton').click());
  await p.waitForTimeout(800);
  const bare = await p.addStyleTag({ content: '#hud > *:not(#markers), #photoTools, #toast, #heroSay, #guide, #skyTold, .marker, .skyName, .viewBackKey { visibility: hidden !important; }' });
  // The planet above her head: looking at a point under it.
  await stand('saturn', { radii: 6.5, sun: 0.7, side: 0.7, lift: 0.3, off: [0, -1.3, 0] });
  await p.waitForTimeout(4500);
  await shot();
  // (Io before Jupiter, as on 2026-10-05, is in Jupiter's shadow by now: Jupiter alone.)
  await stand('jupiter', { radii: 4.6, sun: 0.8, side: 0.6, lift: 0.25, off: [0, -1.4, 0] });
  await p.waitForTimeout(4500);
  await shot();
  await bare.evaluate((el) => el.remove());
  // Out of photo mode by its own back key.
  await p.evaluate(() => [...document.querySelectorAll('.viewBackKey')].find((b) => b.getClientRects().length)?.click());
  await p.waitForTimeout(800);
  await near('mars', 3.6, 0.15, 0.6);
  await shot();

  await p.evaluate(() => { window.__keep = ['journal']; });
  await p.click('#journalButton');
  await p.waitForTimeout(900);
  await p.click('#journalTabs [data-tab=stories]');
  await p.waitForTimeout(800);
  await shot();
  // The Apollo 11 landing site's card, opened from its row.
  const opened = await p.evaluate(() => {
    window.__keep = ['journal', 'storyCard', 'noteCard', 'detailCard'];
    const b = [...document.querySelectorAll('#journalStories button')].find((x) => /11/.test(x.getAttribute('aria-label') || '') && x.getClientRects().length);
    if (!b) return false;
    b.scrollIntoView();
    b.click();
    return true;
  });
  await p.waitForTimeout(1500);
  if (!opened) errors.push('no Apollo 11 row to open');
  await shot();
  // The Apollo 11 site's "That day" scene: 60 km above the site, its name tag picked,
  // then the scene's key; the scene's own keys hidden.
  await p.evaluate(() => {
    window.__keep = [];
    document.querySelectorAll('dialog[open]').forEach((d) => d.close());
  });
  await p.waitForTimeout(800);
  await p.evaluate(() => {
    const o = window.oddity;
    const s = o.sites().find((x) => x.id === 'apollo11');
    const b = o.bodies().find((x) => x.id === 'moon');
    const up = s.position.map((n, i) => n - b.position[i]);
    const l = Math.hypot(...up);
    o.place(s.position.map((n, i) => n + (up[i] / l) * 60), s.position);
  });
  await p.waitForTimeout(2500);
  await p.evaluate((names) => {
    const all = [...document.querySelectorAll('.marker')].filter((e) => names.some((n) => e.textContent.includes(n)));
    (all.find((e) => e.classList.contains('site')) ?? all[0])?.click();
  }, NAMES.apollo11);
  await p.waitForTimeout(11000);
  if (!(await p.evaluate(() => { const k = document.getElementById('thenKey'); k?.click(); return Boolean(k); }))) errors.push('no "That day" key');
  await p.waitForTimeout(Number(process.env.STORE_DAY_MS) || 45000);
  await p.addStyleTag({ content: '#photoTools, #testBar, .viewBackKey { visibility: hidden !important; }' });
  await shot();
  await ctx.close();
  return errors;
}

async function main() {
  const langs = process.argv.slice(2).length ? process.argv.slice(2) : ['ko', 'en', 'ja', 'zh'];
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  try {
    for (const lang of langs) {
      const errors = await shoot(browser, lang);
      console.log(lang, errors.length ? errors : 'ok');
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
