import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');

describe('Build Smoke Tests', () => {
  describe('Source files exist', () => {
    const requiredSourceFiles = [
      'src/shared/types.ts',
      'src/shared/constants.ts',
      'src/shared/message-types.ts',
      'src/shared/utils.ts',
      'src/shared/logger.ts',
      'src/background/service-worker.ts',
      'src/generators/token-json-generator.ts',
      'src/generators/analysis-generator.ts',
      'src/generators/prompt-generator.ts',
      'src/generators/folder-manifest.ts',
      'src/generators/readme-generator.ts',
      'src/generators/figma-token-generator.ts',
      'src/generators/competitive-intel-generator.ts',
      'src/generators/image-prompt-generator.ts',
      'src/generators/performance-budget-generator.ts',
    ];

    it.each(requiredSourceFiles)('should have source file: %s', (filePath) => {
      const fullPath = path.join(ROOT, filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });
  });

  describe('Webpack output exists', () => {
    const requiredDistFiles = [
      'dist/service-worker.js',
      'dist/sidepanel.js',
      'dist/sidepanel.html',
      'dist/manifest.json',
    ];

    it.each(requiredDistFiles)('should have dist file: %s', (filePath) => {
      const fullPath = path.join(ROOT, filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    it('dist/service-worker.js should be non-empty', () => {
      const fullPath = path.join(ROOT, 'dist/service-worker.js');
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        expect(stat.size).toBeGreaterThan(0);
      }
    });
  });

  describe('manifest.json is valid', () => {
    const manifestPath = path.join(ROOT, 'manifest.json');

    it('should be valid JSON', () => {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      expect(() => JSON.parse(raw)).not.toThrow();
    });

    it('should have manifest_version 3', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.manifest_version).toBe(3);
    });

    it('should have a name', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.name).toBeDefined();
      expect(typeof manifest.name).toBe('string');
      expect(manifest.name.length).toBeGreaterThan(0);
    });

    it('should have a valid version string', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.version).toBeDefined();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should declare required permissions', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.permissions).toBeInstanceOf(Array);
      expect(manifest.permissions).toContain('storage');
      expect(manifest.permissions).toContain('activeTab');
    });

    it('should specify a background service worker', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.background).toBeDefined();
      expect(manifest.background.service_worker).toBeDefined();
      expect(typeof manifest.background.service_worker).toBe('string');
    });

    it('should have a side_panel default path', () => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
      expect(manifest.side_panel).toBeDefined();
      expect(manifest.side_panel.default_path).toBeDefined();
    });
  });

  describe('Configuration files exist', () => {
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'webpack.config.js',
      'jest.config.js',
    ];

    it.each(configFiles)('should have config file: %s', (filePath) => {
      const fullPath = path.join(ROOT, filePath);
      expect(fs.existsSync(fullPath)).toBe(true);
    });

    it('package.json should be valid JSON with required fields', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
      expect(pkg.name).toBeDefined();
      expect(pkg.version).toBeDefined();
      expect(pkg.scripts).toBeDefined();
      expect(pkg.scripts.build).toBeDefined();
      expect(pkg.scripts.test).toBeDefined();
    });
  });
});
