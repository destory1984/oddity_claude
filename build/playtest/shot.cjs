// The playtester's camera (AGENTS.md): opens the game in a headless Chromium on the
// real GPU, as a player's phone would show it, does a short list of steps and keeps a
// picture of each `shot`, with a text file of what was on screen.
// Run: node build/playtest/shot.cjs <name> [options] [steps]
//   --lang ko|en|ja|zh     the game's language (default ko)
//   --size 402x657         the window in CSS pixels (default 402x657, the user's iPhone)
//   --save fresh|keep|all  fresh: a first-time player; keep: the save this browser has
//                          (a new one each run, so the same as fresh unless steps add);
//                          all: everything found and done (the dev server's test key)
//   --near <bodyId>        stand three radii from a body, facing it (moon, mars, ...)
// Steps, done in order:
//   click:<css>   press the first element that matches (e.g. click:#journalButton)
//   tab:<name>    open a tab of the open sheet (e.g. tab:radio)
//   key:<Key>     press a key (e.g. key:Escape, key:j)
//   wait:<ms>     wait
//   close         shut every open sheet
//   shot:<label>  keep a picture: assets/playtest/<name>-<label>.png
// A shot is also taken at the end ("end"). The page's address: PLAYTEST_URL (default the
// dev server, http://localhost:4417/oddity_claude/).
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('../promo/env.cjs');

const URL = process.env.PLAYTEST_URL || 'http://localhost:4417/oddity_claude/';
const OUT = path.join(__dirname, '..', '..', 'assets', 'playtest');

function parse(argv) {
  const run = { name: null, lang: 'ko', size: [402, 657], save: 'fresh', near: null, steps: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--lang') run.lang = argv[++i];
    else if (a === '--size') run.size = argv[++i].split('x').map(Number);
    else if (a === '--save') run.save = argv[++i];
    else if (a === '--near') run.near = argv[++i];
    else if (!run.name) run.name = a;
    else run.steps.push(a);
  }
  if (!run.name || !/^[\w-]+$/.test(run.name)) throw new Error('give a name of letters, digits, - or _ first');
  if (!['ko', 'en', 'ja', 'zh'].includes(run.lang)) throw new Error(`no language ${run.lang}`);
  if (!['fresh', 'keep', 'all'].includes(run.save)) throw new Error(`no save ${run.save}`);
  if (run.size.length !== 2 || !run.size.every((n) => n >= 280 && n <= 1920)) throw new Error('size as 402x657');
  return run;
}

// What a player can read now: the open sheets, the toast, her bubble, the top line; and
// two hints for the tester: text cut off by its box, and Korean left in another language.
function screenText(lang) {
  const shown = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
  };
  const name = (el) => el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : ''}`;
  const where = (el) => {
    const chain = [];
    for (let e = el; e && e !== document.body && chain.length < 3; e = e.parentElement) chain.unshift(name(e));
    return chain.join(' > ');
  };
  const parts = [];
  for (const d of document.querySelectorAll('dialog[open]')) parts.push(`[sheet ${name(d)}]\n${d.innerText.trim()}`);
  for (const id of ['toast', 'heroSay', 'hud']) {
    const el = document.getElementById(id);
    if (el && shown(el) && el.innerText.trim()) parts.push(`[${id}]\n${el.innerText.trim()}`);
  }
  const cut = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!shown(el) || !el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const s = getComputedStyle(el);
    const clips = /hidden|clip|auto|scroll/.test(s.overflowX + s.overflowY) || s.textOverflow === 'ellipsis';
    if (clips && (el.scrollWidth > el.clientWidth + 1 || (s.overflowY !== 'auto' && s.overflowY !== 'scroll' && el.scrollHeight > el.clientHeight + 1))) {
      cut.push(`${where(el)}: "${el.innerText.trim().slice(0, 60)}"`);
    }
    const r = el.getBoundingClientRect();
    if (r.right > innerWidth + 1 || r.left < -1) cut.push(`${where(el)} goes past the screen's edge: "${el.innerText.trim().slice(0, 60)}"`);
  }
  const korean = [];
  if (lang !== 'ko') {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (/[가-힣]/.test(n.textContent) && n.parentElement && shown(n.parentElement)) korean.push(`${where(n.parentElement)}: "${n.textContent.trim().slice(0, 60)}"`);
    }
  }
  return { text: parts.join('\n\n'), cut: [...new Set(cut)].slice(0, 40), korean: [...new Set(korean)].slice(0, 40) };
}

async function main() {
  const run = parse(process.argv.slice(2));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const log = [];
  try {
    const ctx = await browser.newContext({ viewport: { width: run.size[0], height: run.size[1] }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 200)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    // Silent: no music, no effects, no spoken lines.
    await page.addInitScript(([lang, fresh]) => {
      try {
        if (fresh && !sessionStorage.getItem('playtest.started')) {
          localStorage.clear();
          sessionStorage.setItem('playtest.started', '1');
        }
        localStorage.setItem('oddity.lang.v1', lang);
        localStorage.setItem('oddity.music', '0');
        localStorage.setItem('oddity.muted', '1');
      } catch { /* storage shut */ }
      if (window.SpeechSynthesis) SpeechSynthesis.prototype.speak = () => {};
    }, [run.lang, run.save !== 'keep']);
    const ready = () => page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 90000 });
    await page.goto(URL);
    await ready();
    if (run.save === 'all') {
      await page.evaluate(() => document.getElementById('testAll')?.click());
      await page.waitForTimeout(1500);
      await ready();
    }
    if (run.near) {
      const placed = await page.evaluate((id) => {
        const b = window.oddity.bodies().find((x) => x.id === id);
        if (!b) return false;
        const at = [b.position[0] + b.radiusKm * 3, b.position[1] + b.radiusKm * 0.5, b.position[2]];
        window.oddity.place(at, b.position);
        return true;
      }, run.near);
      if (!placed) throw new Error(`no body ${run.near}`);
    }
    await page.waitForTimeout(2500);
    let n = 0;
    const shot = async (label) => {
      n += 1;
      const file = path.join(OUT, `${run.name}-${String(n).padStart(2, '0')}-${label}.png`);
      await page.screenshot({ path: file });
      const seen = await page.evaluate(screenText, run.lang);
      log.push(`=== ${path.basename(file)}\n${seen.text || '(no text)'}`);
      if (seen.cut.length) log.push(`--- text cut off or past the edge:\n${seen.cut.join('\n')}`);
      if (seen.korean.length) log.push(`--- Korean left in ${run.lang}:\n${seen.korean.join('\n')}`);
    };
    for (const step of run.steps) {
      const [kind, ...rest] = step.split(':');
      const arg = rest.join(':');
      if (kind === 'click') {
        const found = await page.evaluate((css) => {
          const el = document.querySelector(css);
          if (!el) return false;
          el.click();
          return true;
        }, arg);
        if (!found) log.push(`(step ${step}: nothing matches)`);
      } else if (kind === 'tab') {
        const found = await page.evaluate((tab) => {
          const el = document.querySelector(`dialog[open] [data-tab="${tab}"]:not(section)`) ?? document.querySelector(`dialog[open] button[data-tab="${tab}"]`);
          if (!el) return false;
          el.click();
          return true;
        }, arg);
        if (!found) log.push(`(step ${step}: no such tab in the open sheet)`);
      } else if (kind === 'key') await page.keyboard.press(arg);
      else if (kind === 'wait') await page.waitForTimeout(Math.min(Number(arg) || 0, 60000));
      else if (kind === 'close') await page.evaluate(() => document.querySelectorAll('dialog[open]').forEach((d) => d.close()));
      else if (kind === 'shot') await shot(arg.replace(/[^\w-]/g, '') || 'shot');
      else throw new Error(`no step ${step}`);
      if (kind !== 'wait' && kind !== 'shot') await page.waitForTimeout(700);
    }
    await shot('end');
    const fps = await page.evaluate(() => window.oddity?.getState().fps ?? null);
    log.push(`--- frames a second at the end: ${fps === null ? '?' : Math.round(fps)}`);
    if (errors.length) log.push(`--- page errors:\n${[...new Set(errors)].join('\n')}`);
  } finally {
    await browser.close();
  }
  const textFile = path.join(OUT, `${run.name}.txt`);
  fs.writeFileSync(textFile, `${log.join('\n\n')}\n`);
  console.log(fs.readFileSync(textFile, 'utf8'));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
