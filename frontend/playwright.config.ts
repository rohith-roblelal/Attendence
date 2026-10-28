import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Sequential single worker - required for local XAMPP/MySQL environment
  // to avoid exhausting the connection pool
  workers: 1,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries - deterministic failures must be surfaced
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
