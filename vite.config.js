import { defineConfig } from 'vitest/config';
import { serviceWorkerPlugin } from './build/precache.js';

export default defineConfig({
  base: '/oddity_claude/',
  plugins: [serviceWorkerPlugin()],
  test: {
    include: ['tests/**/*.test.js'],
  },
});
