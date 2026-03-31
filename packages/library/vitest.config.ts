import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: [
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, './src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, './src/common/index.ts') },
      { find: /^#browser\/(.*)\.js$/, replacement: resolve(__dirname, './src/browser/$1.ts') },
      { find: /^#server\/(.*)\.js$/, replacement: resolve(__dirname, './src/server/$1.ts') },
      { find: /^#server\/(.*)$/, replacement: resolve(__dirname, './src/server/$1.ts') },
    ]
  }
})
