import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [],
  // root: '.',
  test: {
    globals: true,
    setupFiles: ['./test/setup.ts'],
  }
})