import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/precache.js';
import { versionPlugin } from './build/version.js';

// (The repo's own assets/, not public/assets, which the game is served from.)
const here = process.cwd().split('\\').join('/');

export default defineConfig({
  base: '/oddity_claude/',
  plugins: [serviceWorkerPlugin(), versionPlugin()],
  // The dev server does not watch the work folders: it fell over (EBUSY) when it tried
  // to watch a picture in assets/ that an art order was still writing; and again on
  // 2026-10-18 at a picture a helper was writing in its own worktree under .claude/.
  server: {
    watch: { ignored: [`${here}/assets/**`, `${here}/.playwright-mcp/**`, `${here}/.claude/**`] },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
