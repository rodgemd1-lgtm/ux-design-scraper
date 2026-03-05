import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '..', '..', 'dist');

/**
 * Custom Playwright test fixtures for Chrome extension testing.
 *
 * - `context`     -- a persistent Chromium context with the extension loaded
 *                    from the dist/ directory.
 * - `extensionId` -- the runtime extension ID assigned by Chrome, extracted
 *                    from the service worker URL.
 *
 * Usage in spec files:
 *   import { test, expect } from './fixtures';
 */
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-first-run',
        '--disable-gpu',
        '--disable-default-apps',
        '--disable-popup-blocking',
        '--disable-translate',
        '--disable-sync',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Manifest V3 registers a service worker instead of a background page.
    // Wait for the service worker to appear so we can parse its URL for
    // the extension ID.
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
