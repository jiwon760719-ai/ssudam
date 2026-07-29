import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'ko-KR',
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: 'node scripts/e2e.mjs --server-only',
    port: 4173,
    reuseExistingServer: true,
  },
})
