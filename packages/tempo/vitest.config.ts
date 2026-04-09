import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [],
  test: {
    globals: true,
    setupFiles: [resolve(__dirname, './scripts/setup.ts')],
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
      { find: /^#tempo\/tempo\.class\.js$/, replacement: resolve(__dirname, './src/tempo.class.ts') },
      { find: /^#tempo\/scripts\/(.*)\.js$/, replacement: resolve(__dirname, './scripts/$1.ts') },
      { find: /^#tempo\/plugins\/plugin\.util\.js$/, replacement: resolve(__dirname, './src/plugins/plugin.util.ts') },
      { find: /^#tempo\/plugins\/plugin\.type\.js$/, replacement: resolve(__dirname, './src/plugins/plugin.type.ts') },
      { find: /^#tempo\/plugins\/plugin\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugins/extend/plugin.$1.ts') },
      { find: /^#tempo\/plugins\/term\.(.*)\.js$/, replacement: resolve(__dirname, './src/plugins/term/term.$1.ts') },
      { find: /^#tempo\/plugins\/term\/index\.js$/, replacement: resolve(__dirname, './src/plugins/term/index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: resolve(__dirname, './src/$1.ts') },
      { find: /^#tempo$/, replacement: resolve(__dirname, './src/tempo.index.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: resolve(__dirname, '../library/src/common/$1.ts') },
      { find: /^#library$/, replacement: resolve(__dirname, '../library/src/common/index.ts') },
    ]
  }
})
