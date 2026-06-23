import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: 'https://www.luminamodels.ca',
    headless: true,
    locale: 'fr-CA',
    ...devices['Desktop Chrome'],
  },
})
