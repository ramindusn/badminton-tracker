import { defineConfig, devices } from '@playwright/test'

const PORT = 4173
const BASE_PATH = '/'

/**
 * Playwright runs against a production build served by `vite preview`,
 * so the e2e suite exercises the same artifact that gets deployed.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    // VITE_E2E=1 enables the auth bypass so the suite can sign in without a
    // real magic-link email (see src/context/AuthContext.tsx).
    command: `VITE_E2E=1 npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}${BASE_PATH}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
