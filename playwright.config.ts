import { defineConfig } from '@playwright/test';

/**
 * Playwright configuration for Chrome extension E2E tests.
 *
 * The extension is loaded from ./dist via a custom test fixture
 * defined in tests/e2e/fixtures.ts.  Only Chromium supports
 * loading unpacked extensions, and headed mode is required.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  workers: 1, // Extensions require serial execution (single browser profile)
  use: {
    headless: false,
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {},
    },
  ],
});
