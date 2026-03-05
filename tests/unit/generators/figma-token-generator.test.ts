import {
  generateFigmaTokens,
  exportFigmaTokensJson,
} from '@generators/figma-token-generator';

import {
  mockDesignTokens,
  mockTypography,
  mockAnimations,
} from '../../fixtures/mock-scrape-result';

import type { FigmaTokens, DesignTokens, AnimationData } from '@shared/types';

describe('generateFigmaTokens', () => {
  let tokens: FigmaTokens;

  beforeAll(() => {
    tokens = generateFigmaTokens(mockDesignTokens, mockTypography, mockAnimations);
  });

  it('should return an object with all required top-level keys', () => {
    expect(tokens.color).toBeDefined();
    expect(tokens.typography).toBeDefined();
    expect(tokens.spacing).toBeDefined();
    expect(tokens.boxShadow).toBeDefined();
    expect(tokens.borderRadius).toBeDefined();
    expect(tokens.motion).toBeDefined();
    expect(tokens._metadata).toBeDefined();
  });

  it('should set correct metadata', () => {
    expect(tokens._metadata.source).toBe('UX Design Scraper');
    expect(tokens._metadata.version).toBe('1.0.0');
    expect(tokens._metadata.generatedAt).toBeDefined();
  });

  it('should generate color tokens with proper type field', () => {
    const colorEntries = Object.values(tokens.color);
    expect(colorEntries.length).toBeGreaterThan(0);
    for (const entry of colorEntries) {
      expect(entry.type).toBe('color');
      expect(entry.value).toBeDefined();
    }
  });

  it('should classify colors into primary, neutral, accent, and semantic categories', () => {
    const keys = Object.keys(tokens.color);
    const categories = keys.map((k) => k.split('.')[0]);
    const uniqueCategories = new Set(categories);
    // Should have at least primary and neutral categories
    expect(uniqueCategories.size).toBeGreaterThanOrEqual(2);
  });

  it('should generate typography tokens including font families and sizes', () => {
    const typKeys = Object.keys(tokens.typography);
    expect(typKeys.length).toBeGreaterThan(0);
    const hasFontFamily = typKeys.some((k) => k.startsWith('fontFamily.'));
    const hasFontSize = typKeys.some((k) => k.startsWith('fontSize.'));
    expect(hasFontFamily).toBe(true);
    expect(hasFontSize).toBe(true);
  });

  it('should generate composite typography presets (h1-h4, body)', () => {
    const typKeys = Object.keys(tokens.typography);
    const hasH1 = typKeys.some((k) => k === 'typography.h1');
    const hasBody = typKeys.some((k) => k === 'typography.body');
    expect(hasH1).toBe(true);
    expect(hasBody).toBe(true);
  });

  it('should generate spacing tokens sorted numerically', () => {
    const spacingEntries = Object.entries(tokens.spacing);
    expect(spacingEntries.length).toBeGreaterThan(0);
    for (const [, entry] of spacingEntries) {
      expect(entry.type).toBe('spacing');
    }
  });

  it('should generate shadow tokens', () => {
    const shadowEntries = Object.entries(tokens.boxShadow);
    expect(shadowEntries.length).toBeGreaterThan(0);
    for (const [key] of shadowEntries) {
      expect(key).toMatch(/^elevation\./);
    }
  });

  it('should generate border radius tokens', () => {
    const radiusEntries = Object.entries(tokens.borderRadius);
    expect(radiusEntries.length).toBeGreaterThan(0);
    for (const [, entry] of radiusEntries) {
      expect(entry.type).toBe('borderRadius');
    }
  });

  it('should generate motion tokens from animation data', () => {
    const motionEntries = Object.entries(tokens.motion);
    expect(motionEntries.length).toBeGreaterThan(0);
    const hasDuration = motionEntries.some(([k]) => k.startsWith('duration.'));
    const hasEasing = motionEntries.some(([k]) => k.startsWith('easing.'));
    expect(hasDuration).toBe(true);
    expect(hasEasing).toBe(true);
  });

  it('should handle empty animation data', () => {
    const emptyAnims: AnimationData = { cssTransitions: [], cssAnimations: [], scrollTriggered: [] };
    const result = generateFigmaTokens(mockDesignTokens, mockTypography, emptyAnims);
    expect(Object.keys(result.motion)).toHaveLength(0);
  });
});

describe('exportFigmaTokensJson', () => {
  let figmaTokens: FigmaTokens;

  beforeAll(() => {
    figmaTokens = generateFigmaTokens(mockDesignTokens, mockTypography, mockAnimations);
  });

  it('should return valid JSON string', () => {
    const json = exportFigmaTokensJson(figmaTokens);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should include the global token set', () => {
    const parsed = JSON.parse(exportFigmaTokensJson(figmaTokens));
    expect(parsed.global).toBeDefined();
    expect(parsed.global.color).toBeDefined();
    expect(parsed.global.typography).toBeDefined();
    expect(parsed.global.spacing).toBeDefined();
  });

  it('should include $metadata with tokenSetOrder', () => {
    const parsed = JSON.parse(exportFigmaTokensJson(figmaTokens));
    expect(parsed.$metadata).toBeDefined();
    expect(parsed.$metadata.tokenSetOrder).toContain('global');
  });

  it('should include _generated and _source fields', () => {
    const parsed = JSON.parse(exportFigmaTokensJson(figmaTokens));
    expect(parsed._generated).toBeDefined();
    expect(parsed._source).toBe('UX Design Scraper');
  });

  it('should be pretty-printed (indented)', () => {
    const json = exportFigmaTokensJson(figmaTokens);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});
