import { defineConfig, devices } from '@playwright/test';

// On failure, Playwright produces:
//   - tests/e2e/playwright-report/index.html  (HTML report, run `npx playwright show-report` to view)
//   - tests/e2e/test-results/<...>/*.png       (failure screenshots)
//   - tests/e2e/test-results/<...>/*.zip       (trace bundles, open with the HTML report)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'tests/e2e/playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  outputDir: 'tests/e2e/test-results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}-snapshots/{projectName}/{arg}{ext}',
  expect: { timeout: 5_000 },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // Override VITE_API_URL so the admin app points at a local backend
    // for the duration of the test run. Without this, admin/.env points
    // at https://pockettrade-ebaq.onrender.com (production) and the
    // mocked routes in tests/e2e/fixtures.ts would never match.
    env: {
      VITE_API_URL: process.env.VITE_API_URL ?? 'http://localhost:3000',
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
});