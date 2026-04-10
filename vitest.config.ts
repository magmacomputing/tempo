import { defineConfig } from 'vitest/config'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: [
      { find: /^#library\/(browser|server|common)\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/$1/$2.ts') },
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1.ts') },
      { find: /^#tempo\/plugins\/plugin\.util\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/plugin.util.ts') },
      { find: /^#tempo\/plugins\/plugin\.type\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/plugin.type.ts') },
      { find: /^#tempo\/plugins\/plugin\.(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/plugins/extend/plugin.$1.ts') },
      { find: /^#tempo\/core$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.core.ts') },
      { find: /^#tempo\/tempo\.class\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/tempo.index.ts') },
      { find: /^#tempo\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') },
      { find: /^#tempo\/(.*)$/, replacement: path.resolve(__dirname, './packages/tempo/src/$1.ts') }
    ]
  },
})
