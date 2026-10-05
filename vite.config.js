import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/precache.js';
import { versionPlugin } from './build/version.js';

// (The repo's own assets/, not public/assets, which the game is served from.)
const here = process.cwd().split('\\').join('/');

export default defineConfig({
  base: '/oddity_claude/',
  plugins: [serviceWorkerPlugin(), versionPlugin()],
  // The dev server does not watch the work folders: it fell over (EBUSY) when it tried
  // to watch a picture in assets/ that an art order was still writing.
  server: {
    watch: { ignored: [`${here}/assets/**`, `${here}/.playwright-mcp/**`] },
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
