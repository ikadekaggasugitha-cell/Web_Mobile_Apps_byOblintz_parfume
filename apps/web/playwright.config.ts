import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for the OBLINTZ storefront.
 * Live run needs the web app (:3000) and API (:5000) + database running.
 *   BASE_URL=http://localhost:3000 pnpm --filter @oblintz/web e2e
 * Set PLAYWRIGHT_WEB_SERVER=1 to let Playwright boot `next dev` automatically.
 */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.PLAYWRIGHT_WEB_SERVER
    ? {
        command: 'pnpm dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
