import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    pool: 'forks',                                          // isolated child processes (no shared memory)
    poolOptions: {
      forks: {
        minForks: 1,                                        // always keep at least 1 worker alive
        maxForks: 2,                                        // cap at 2 concurrent forks to limit load
      },
    },
  },
  resolve: {
    alias: [
      { find: /^#tempo\/core$/, replacement: resolve(__dirname, './src/core.index.ts') },
      { find: /^#tempo\/term$/, replacement: resolve(__dirname, './src/plugin/term/term.index.ts') },
      { find: /^#tempo\/term\/standard$/, replacement: resolve(__dirname, './src/plugin/term/standard.index.ts') },
      { find: /^#tempo\/ticker$/, replacement: resolve(__dirname, './src/plugin/extend/extend.ticker.ts') },
      { find: /^#tempo\/duration$/, replacement: resolve(__dirname, './src/plugin/module/module.duration.ts') },
      { find: /^#tempo\/format$/, replacement: resolve(__dirname, './src/plugin/module/module.format.ts') },

      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.ts') },
      { find: /^#tempo\/plugin\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/plugin.$1.ts') },
      { find: /^#tempo\/plugin\/extend\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/extend/extend.$1.ts') },
      { find: /^#tempo\/plugin\/module\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/module/module.$1.ts') },
      { find: /^#tempo\/plugin\/term\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugin/term/term.$1.ts') },
      
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },

      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/src/common.index.ts') },
    ]
  }
})
