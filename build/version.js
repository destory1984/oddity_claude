// The version and the day of the last update, shown small at the head of the settings.
// The version is package.json's: raised a little with every commit (0.1.0 → 0.1.1; a
// larger step for a larger change). The day is that of the last commit, in Korean time.
// (The hour and minute stood there too until the user's word of 2026-10-05.)
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// '0.1.0' → 'v0.1', '0.1.3' → 'v0.1.3'.
export function versionLabel(version) {
  return `v${version.replace(/\.0$/, '')}`;
}

// A moment as 'YYYY-MM-DD', the day on the Korean clock (UTC+9, no summer time).
export function updatedText(date) {
  const korea = new Date(date.getTime() + 9 * 3600 * 1000);
  const two = (n) => String(n).padStart(2, '0');
  return `${korea.getUTCFullYear()}-${two(korea.getUTCMonth() + 1)}-${two(korea.getUTCDate())}`;
}

// When the last commit was made; now, where there is no git to ask.
function lastCommit() {
  try {
    const date = new Date(execSync('git log -1 --format=%cI', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim());
    return Number.isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

// What stands for {{version}} and {{updated}} in a page.
export function fillVersion(html, version, date) {
  return html.replaceAll('{{version}}', versionLabel(version)).replaceAll('{{updated}}', updatedText(date));
}

export function versionPlugin({ packageFile = 'package.json' } = {}) {
  return {
    name: 'space-oddity-version',
    transformIndexHtml(html) {
      return fillVersion(html, JSON.parse(fs.readFileSync(packageFile, 'utf8')).version, lastCommit());
    },
  };
}
