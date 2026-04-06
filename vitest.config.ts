import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    alias: [
      { find: /^#library\/(.*)\.js$/, replacement: path.resolve(__dirname, './packages/library/src/common/$1.ts') }
    ]
  },
})
