import {
  buildFolderManifest,
  getOutputPaths,
  getScreenshotPath,
  getComponentHtmlPath,
} from '@generators/folder-manifest';

describe('buildFolderManifest', () => {
  it('should return an OutputManifest object with correct projectName', () => {
    const manifest = buildFolderManifest('my-project', []);
    expect(manifest.projectName).toBe('my-project');
  });

  it('should set the output path to ~/Desktop/{projectName}', () => {
    const manifest = buildFolderManifest('test-project', []);
    expect(manifest.outputPath).toBe('~/Desktop/test-project');
  });

  it('should include the provided files array', () => {
    const files = [
      { path: 'readme.md', type: 'markdown', size: 1024 },
      { path: 'tokens.json', type: 'json', size: 2048 },
    ];
    const manifest = buildFolderManifest('my-project', files);
    expect(manifest.files).toHaveLength(2);
    expect(manifest.files[0].path).toBe('readme.md');
    expect(manifest.files[1].size).toBe(2048);
  });

  it('should initialize syncedToSupabase as false', () => {
    const manifest = buildFolderManifest('my-project', []);
    expect(manifest.syncedToSupabase).toBe(false);
  });

  it('should set generatedAt to a recent timestamp', () => {
    const before = Date.now();
    const manifest = buildFolderManifest('my-project', []);
    const after = Date.now();
    expect(manifest.generatedAt).toBeGreaterThanOrEqual(before);
    expect(manifest.generatedAt).toBeLessThanOrEqual(after);
  });

  it('should handle empty files array', () => {
    const manifest = buildFolderManifest('empty-project', []);
    expect(manifest.files).toEqual([]);
  });
});

describe('getOutputPaths', () => {
  it('should return an object with all expected path keys', () => {
    const paths = getOutputPaths('my-project');
    expect(paths.claudeMd).toBeDefined();
    expect(paths.readme).toBeDefined();
    expect(paths.masterPrompt).toBeDefined();
    expect(paths.workflowChain).toBeDefined();
    expect(paths.colorsJson).toBeDefined();
    expect(paths.typographyJson).toBeDefined();
    expect(paths.spacingJson).toBeDefined();
    expect(paths.shadowsJson).toBeDefined();
    expect(paths.animationsJson).toBeDefined();
    expect(paths.accessibilityAudit).toBeDefined();
    expect(paths.performanceReport).toBeDefined();
    expect(paths.flowAnalysis).toBeDefined();
  });

  it('should prefix all paths with the project name', () => {
    const paths = getOutputPaths('test-proj');
    for (const [key, value] of Object.entries(paths)) {
      expect(value).toMatch(/^test-proj\//);
    }
  });

  it('should use correct file extensions', () => {
    const paths = getOutputPaths('proj');
    expect(paths.colorsJson).toMatch(/\.json$/);
    expect(paths.readme).toMatch(/\.md$/);
    expect(paths.accessibilityAudit).toMatch(/\.md$/);
  });

  it('should place files in correct subdirectories', () => {
    const paths = getOutputPaths('proj');
    expect(paths.colorsJson).toContain('design-tokens/');
    expect(paths.masterPrompt).toContain('prompts/');
    expect(paths.accessibilityAudit).toContain('analysis/');
  });

  it('should return consistent results for the same project name', () => {
    const paths1 = getOutputPaths('consistent');
    const paths2 = getOutputPaths('consistent');
    expect(paths1).toEqual(paths2);
  });
});

describe('getScreenshotPath', () => {
  it('should return a path containing the project name', () => {
    const path = getScreenshotPath('my-project', 1280);
    expect(path).toContain('my-project');
  });

  it('should include the breakpoint in the filename', () => {
    const path = getScreenshotPath('my-project', 375);
    expect(path).toContain('375px');
  });

  it('should end with .png extension', () => {
    const path = getScreenshotPath('my-project', 768);
    expect(path).toMatch(/\.png$/);
  });

  it('should place files in assets/screenshots/', () => {
    const path = getScreenshotPath('my-project', 1920);
    expect(path).toContain('assets/screenshots/');
  });

  it('should work with different breakpoints', () => {
    const breakpoints = [375, 768, 1280, 1920];
    const paths = breakpoints.map((bp) => getScreenshotPath('proj', bp));
    const uniquePaths = new Set(paths);
    expect(uniquePaths.size).toBe(breakpoints.length);
  });
});

describe('getComponentHtmlPath', () => {
  it('should return a path containing the project name', () => {
    const path = getComponentHtmlPath('my-project', 'PrimaryButton');
    expect(path).toContain('my-project');
  });

  it('should lowercase the component name', () => {
    const path = getComponentHtmlPath('my-project', 'PrimaryButton');
    expect(path).toContain('primarybutton');
  });

  it('should replace non-alphanumeric characters with hyphens', () => {
    const path = getComponentHtmlPath('my-project', 'Header Nav Bar');
    expect(path).toContain('header-nav-bar');
  });

  it('should end with .html extension', () => {
    const path = getComponentHtmlPath('my-project', 'Card');
    expect(path).toMatch(/\.html$/);
  });

  it('should place files in scraped-code/html/', () => {
    const path = getComponentHtmlPath('my-project', 'Button');
    expect(path).toContain('scraped-code/html/');
  });
});
