import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, './bin/setup.ts')],
  },
  resolve: {
    alias: [
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/src/common/index.ts') },
    ]
  }
})
