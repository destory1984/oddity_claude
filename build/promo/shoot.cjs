// Records the game for the promo video: a phone view (405 x 720 drawn at 8/3 = 1080 x
// 1920) taken frame by frame from Chromium's screencast, headless. (The screencast gives
// CSS pixels for a context's deviceScaleFactor; the browser-wide flag gives real ones.)
// Each shot is a short script of moves (shots.cjs); the frames go to
// assets/promo/<lang>/<shot>/ with their times (times.json, seconds since 1970), and the
// game's own sound beside them (audio.webm, its start in audio.json): the effects only,
// with the music off, except in the shot named 'music', which is the music alone.
// build/promo/cut.py makes them into a film.
// Run: node build/promo/shoot.cjs <lang> <shot> [<shot> ...]
const fs = require('fs');
const path = require('path');
const { chromium, executablePath } = require('./env.cjs');
const SHOTS = require('./shots.cjs');

const URL = process.env.PROMO_URL || 'https://destory1984.github.io/oddity_claude/';
const ROOT = path.join(__dirname, '..', '..', 'assets', 'promo');

async function shoot(browser, lang, name) {
  const ctx = await browser.newContext({ viewport: { width: 405, height: 720 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.addInitScript(([l, music]) => {
    SpeechSynthesis.prototype.speak = () => {};
    try {
      localStorage.setItem('oddity.lang.v1', l);
      localStorage.setItem('oddity.music', music ? '1' : '0');
      localStorage.setItem('oddity.muted', music ? '1' : '0');
    } catch {}
    // What goes to the speakers goes to a recorder as well.
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (to, ...rest) {
      if (to instanceof AudioDestinationNode) {
        if (!window.__tap) window.__tap = this.context.createMediaStreamDestination();
        connect.call(this, window.__tap);
      }
      return connect.call(this, to, ...rest);
    };
    window.__tapStart = () => {
      if (!window.__tap) return null;
      window.__chunks = [];
      window.__rec = new MediaRecorder(window.__tap.stream, { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 192000 });
      window.__rec.ondataavailable = (e) => window.__chunks.push(e.data);
      window.__rec.start();
      return Date.now() / 1000;
    };
    window.__tapStop = () => new Promise((done) => {
      if (!window.__rec) return done(null);
      window.__rec.onstop = () => {
        const reader = new FileReader();
        reader.onload = () => done(reader.result.split(',')[1]);
        reader.readAsDataURL(new Blob(window.__chunks, { type: 'audio/webm' }));
      };
      window.__rec.stop();
    });
  }, [lang, name === 'music']);
  const out = path.join(ROOT, lang, name);
  fs.rmSync(out, { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });
  const cdp = await ctx.newCDPSession(p);
  const times = [];
  let n = 0;
  let audioAt = null;
  cdp.on('Page.screencastFrame', (f) => {
    fs.writeFileSync(path.join(out, `${String(n++).padStart(5, '0')}.jpg`), Buffer.from(f.data, 'base64'));
    times.push(f.metadata.timestamp);
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });
  const rec = {
    start: async () => {
      audioAt = await p.evaluate(() => window.__tapStart());
      await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
    },
    stop: () => cdp.send('Page.stopScreencast'),
  };
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  const log = await SHOTS[name](p, rec, lang, out);
  await rec.stop().catch(() => {});
  const sound = await p.evaluate(() => window.__tapStop()).catch(() => null);
  if (sound) {
    fs.writeFileSync(path.join(out, 'audio.webm'), Buffer.from(sound, 'base64'));
    fs.writeFileSync(path.join(out, 'audio.json'), JSON.stringify({ start: audioAt }));
  }
  fs.writeFileSync(path.join(out, 'times.json'), JSON.stringify(times));
  const fps = await p.evaluate(() => window.oddity?.getState().fps).catch(() => null);
  await ctx.close();
  const span = times.length > 1 ? times[times.length - 1] - times[0] : 0;
  console.log(`${lang}/${name}: ${times.length} frames over ${span.toFixed(1)} s (${(times.length / (span || 1)).toFixed(1)} a second), game fps ${Math.round(fps ?? 0)}, sound ${sound ? 'yes' : 'no'}`, log ?? '');
}

(async () => {
  const [lang, ...names] = process.argv.slice(2);
  const browser = await chromium.launch({ headless: true, executablePath, args: ['--force-device-scale-factor=2.6667', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  try {
    for (const name of names) await shoot(browser, lang, name);
  } finally {
    await browser.close();
  }
})();
