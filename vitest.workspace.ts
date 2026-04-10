import { defineWorkspace } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineWorkspace([
  {
    extends: 'packages/tempo/vitest.config.ts',
    test: {
      name: 'Tempo: Full',
      include: ['**/test/**/*.{test,spec}.ts'],
      exclude: [
        '**/node_modules/**',
        '**/test/**/*.core.test.ts',
        '**/test/**/*.lazy.test.ts'
      ],
      setupFiles: [resolve(__dirname, 'packages/tempo/scripts/setup.full.ts')],
    }
  },
  {
    extends: 'packages/tempo/vitest.config.ts',
    test: {
      name: 'Tempo: Core',
      include: ['**/test/**/*.core.test.ts', '**/test/**/*.lazy.test.ts'],
      exclude: ['**/node_modules/**'],
      setupFiles: [],
    }
  }
])
