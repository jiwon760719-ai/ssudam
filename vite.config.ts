import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
