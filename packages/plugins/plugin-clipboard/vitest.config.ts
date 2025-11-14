import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/__test__/**/*.spec.ts'],
  },
})
