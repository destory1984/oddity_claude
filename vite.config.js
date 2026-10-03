import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/precache.js';
import { versionPlugin } from './build/version.js';

export default defineConfig({
  base: '/oddity_claude/',
  plugins: [serviceWorkerPlugin(), versionPlugin()],
  test: {
    include: ['tests/**/*.test.js'],
  },
});
