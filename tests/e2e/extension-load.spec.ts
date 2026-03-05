import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';

const DIST_PATH = path.resolve(__dirname, '..', '..', 'dist');

test.describe('Extension loading', () => {
  test('manifest.json loads correctly from dist', async () => {
    const manifestPath = path.join(DIST_PATH, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe('UX Design Scraper');
    expect(manifest.version).toBe('1.0.0');
  });

  test('service worker activates', async ({ context, extensionId }) => {
    // The extensionId fixture already waits for the service worker, so
    // if we reach this point the service worker has registered.
    const serviceWorkers = context.serviceWorkers();
    const extWorker = serviceWorkers.find((sw) =>
      sw.url().includes(extensionId)
    );
    expect(extWorker).toBeDefined();
    expect(extWorker!.url()).toContain('service-worker.js');
  });

  test('side panel HTML loads', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/sidepanel.html`);
    await page.waitForLoadState('domcontentloaded');

    // The side panel's root div should be present
    const root = page.locator('#root');
    await expect(root).toBeAttached();

    // The page title should match what the HTML template provides
    await expect(page).toHaveTitle('UX Design Scraper');

    await page.close();
  });

  test('all entry points exist in dist', async () => {
    const expectedFiles = [
      'service-worker.js',
      'sidepanel.js',
      'content-script-scraper.js',
      'content-script-heatmap.js',
      'offscreen.js',
    ];

    for (const file of expectedFiles) {
      const filePath = path.join(DIST_PATH, file);
      expect(
        fs.existsSync(filePath),
        `Expected ${file} to exist in dist/`
      ).toBe(true);
    }
  });

  test('sidepanel.html exists in dist', async () => {
    const htmlPath = path.join(DIST_PATH, 'sidepanel.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('id="root"');
    expect(html).toContain('sidepanel.js');
  });

  test('offscreen.html exists in dist', async () => {
    const htmlPath = path.join(DIST_PATH, 'offscreen.html');
    expect(fs.existsSync(htmlPath)).toBe(true);

    const html = fs.readFileSync(htmlPath, 'utf-8');
    expect(html).toContain('offscreen.js');
  });

  test('manifest.json is copied to dist', async () => {
    const manifestPath = path.join(DIST_PATH, 'manifest.json');
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.background.service_worker).toBe('service-worker.js');
    expect(manifest.side_panel.default_path).toBe('sidepanel.html');
  });
});
