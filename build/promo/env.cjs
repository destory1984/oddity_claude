// Finds this PC's Playwright and its Chromium for the promo scripts, so that no path of
// one person's machine is written in them. PLAYWRIGHT_DIR and PROMO_CHROME override.
const fs = require('fs');
const path = require('path');

const local = process.env.LOCALAPPDATA || path.join(require('os').homedir(), 'AppData', 'Local');

function newest(dir, test) {
  try {
    return fs.readdirSync(dir).filter(test).map((n) => path.join(dir, n))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  } catch {
    return [];
  }
}

function playwright() {
  if (process.env.PLAYWRIGHT_DIR) return require(process.env.PLAYWRIGHT_DIR);
  try {
    return require('playwright');
  } catch {
    // The copy npx keeps for the Playwright MCP.
    for (const dir of newest(path.join(local, 'npm-cache', '_npx'), () => true)) {
      const p = path.join(dir, 'node_modules', 'playwright');
      if (fs.existsSync(p)) return require(p);
    }
    throw new Error('Playwright not found: set PLAYWRIGHT_DIR');
  }
}

function chrome() {
  if (process.env.PROMO_CHROME) return process.env.PROMO_CHROME;
  for (const dir of newest(path.join(local, 'ms-playwright'), (n) => /^chromium-\d+$/.test(n))) {
    const exe = path.join(dir, 'chrome-win64', 'chrome.exe');
    if (fs.existsSync(exe)) return exe;
  }
  return undefined;
}

module.exports = { chromium: playwright().chromium, executablePath: chrome() };
