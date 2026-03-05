import { test, expect } from './fixtures';
import fs from 'fs';
import path from 'path';

const DIST_PATH = path.resolve(__dirname, '..', '..', 'dist');

/**
 * Reads and parses the manifest.json from the built dist/ directory.
 */
function readManifest(): Record<string, unknown> {
  const manifestPath = path.join(DIST_PATH, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

test.describe('Manifest validation', () => {
  test('all required permissions are declared', async () => {
    const manifest = readManifest();
    const permissions = manifest.permissions as string[];

    const requiredPermissions = [
      'activeTab',
      'tabs',
      'storage',
      'alarms',
      'offscreen',
      'downloads',
      'sidePanel',
      'scripting',
      'debugger',
    ];

    for (const perm of requiredPermissions) {
      expect(
        permissions,
        `Missing required permission: ${perm}`
      ).toContain(perm);
    }

    // Verify host_permissions for broad web access
    const hostPermissions = manifest.host_permissions as string[];
    expect(hostPermissions).toContain('https://*/*');
    expect(hostPermissions).toContain('http://*/*');
  });

  test('side_panel configuration is correct', async () => {
    const manifest = readManifest();
    const sidePanel = manifest.side_panel as { default_path: string };

    expect(sidePanel).toBeDefined();
    expect(sidePanel.default_path).toBe('sidepanel.html');

    // Verify the referenced sidepanel.html actually exists in dist
    const sidepanelPath = path.join(DIST_PATH, sidePanel.default_path);
    expect(
      fs.existsSync(sidepanelPath),
      `side_panel.default_path "${sidePanel.default_path}" does not exist in dist/`
    ).toBe(true);
  });

  test('background service_worker path is correct', async () => {
    const manifest = readManifest();
    const background = manifest.background as {
      service_worker: string;
      type: string;
    };

    expect(background).toBeDefined();
    expect(background.service_worker).toBe('service-worker.js');
    expect(background.type).toBe('module');

    // Verify the referenced service-worker.js actually exists in dist
    const swPath = path.join(DIST_PATH, background.service_worker);
    expect(
      fs.existsSync(swPath),
      `background.service_worker "${background.service_worker}" does not exist in dist/`
    ).toBe(true);
  });

  test('content_security_policy allows API calls', async () => {
    const manifest = readManifest();
    const csp = manifest.content_security_policy as {
      extension_pages: string;
    };

    expect(csp).toBeDefined();
    expect(csp.extension_pages).toBeDefined();

    // The CSP for extension pages should allow 'self' for scripts.
    // Manifest V3 extension pages can make fetch() calls to external APIs
    // without requiring connect-src in the CSP (those are governed by
    // host_permissions instead).  Verify the CSP permits self-hosted
    // scripts and objects.
    expect(csp.extension_pages).toContain("script-src 'self'");
    expect(csp.extension_pages).toContain("object-src 'self'");
  });

  test('manifest_version is 3', async () => {
    const manifest = readManifest();
    expect(manifest.manifest_version).toBe(3);
  });

  test('action icons are declared and reference existing files', async () => {
    const manifest = readManifest();
    const action = manifest.action as {
      default_icon: Record<string, string>;
      default_title: string;
    };

    expect(action).toBeDefined();
    expect(action.default_title).toBe('UX Design Scraper');

    // Check each icon size exists
    const expectedSizes = ['16', '48', '128'];
    for (const size of expectedSizes) {
      const iconPath = action.default_icon[size];
      expect(iconPath).toBeDefined();

      const fullPath = path.join(DIST_PATH, iconPath);
      expect(
        fs.existsSync(fullPath),
        `Icon file "${iconPath}" for size ${size} does not exist in dist/`
      ).toBe(true);
    }
  });

  test('content_scripts array is empty (dynamic injection only)', async () => {
    const manifest = readManifest();
    const contentScripts = manifest.content_scripts as unknown[];

    // The extension uses dynamic content script injection via the
    // scripting API, so manifest content_scripts should be empty.
    expect(contentScripts).toBeDefined();
    expect(contentScripts).toHaveLength(0);
  });
});
