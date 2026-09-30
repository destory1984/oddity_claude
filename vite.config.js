import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/oddity_claude/',
  test: {
    include: ['tests/**/*.test.js'],
  },
});
