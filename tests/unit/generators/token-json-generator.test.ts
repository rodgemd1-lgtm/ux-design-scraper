import {
  generateColorsJson,
  generateTypographyJson,
  generateSpacingJson,
  generateShadowsJson,
  generateAnimationsJson,
} from '@generators/token-json-generator';

import {
  mockDesignTokens,
  mockTypography,
  mockAnimations,
} from '../../fixtures/mock-scrape-result';

import type { DesignTokens, TypographySystem, AnimationData } from '@shared/types';

describe('generateColorsJson', () => {
  it('should return valid JSON string', () => {
    const result = generateColorsJson(mockDesignTokens);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should include metadata fields', () => {
    const parsed = JSON.parse(generateColorsJson(mockDesignTokens));
    expect(parsed._generated).toBeDefined();
    expect(parsed._source).toBe('UX Design Scraper');
    expect(parsed._totalColors).toBe(mockDesignTokens.colors.length);
  });

  it('should classify colors into palette categories', () => {
    const parsed = JSON.parse(generateColorsJson(mockDesignTokens));
    expect(parsed.palette).toBeDefined();
    expect(parsed.palette.primary).toBeInstanceOf(Array);
    expect(parsed.palette.neutral).toBeInstanceOf(Array);
    expect(parsed.palette.accent).toBeInstanceOf(Array);
    expect(parsed.palette.semantic).toBeInstanceOf(Array);
  });

  it('should categorize error/success/warning colors as semantic', () => {
    const parsed = JSON.parse(generateColorsJson(mockDesignTokens));
    // Our mock has error, success, warning colors
    expect(parsed.palette.semantic.length).toBeGreaterThan(0);
  });

  it('should include allColors array with usage data', () => {
    const parsed = JSON.parse(generateColorsJson(mockDesignTokens));
    expect(parsed.allColors).toBeInstanceOf(Array);
    expect(parsed.allColors.length).toBeGreaterThan(0);
    expect(parsed.allColors[0]).toHaveProperty('value');
    expect(parsed.allColors[0]).toHaveProperty('usageCount');
    expect(parsed.allColors[0]).toHaveProperty('contexts');
  });

  it('should handle empty colors array', () => {
    const emptyTokens: DesignTokens = { ...mockDesignTokens, colors: [] };
    const result = generateColorsJson(emptyTokens);
    const parsed = JSON.parse(result);
    expect(parsed._totalColors).toBe(0);
    expect(parsed.allColors).toEqual([]);
  });

  it('should limit palette categories to 10 items each', () => {
    const parsed = JSON.parse(generateColorsJson(mockDesignTokens));
    expect(parsed.palette.primary.length).toBeLessThanOrEqual(10);
    expect(parsed.palette.neutral.length).toBeLessThanOrEqual(10);
    expect(parsed.palette.accent.length).toBeLessThanOrEqual(10);
    expect(parsed.palette.semantic.length).toBeLessThanOrEqual(10);
  });
});

describe('generateTypographyJson', () => {
  it('should return valid JSON string', () => {
    const result = generateTypographyJson(mockTypography);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it('should include font families with usage data', () => {
    const parsed = JSON.parse(generateTypographyJson(mockTypography));
    expect(parsed.fontFamilies).toBeInstanceOf(Array);
    expect(parsed.fontFamilies.length).toBeGreaterThan(0);
    expect(parsed.fontFamilies[0]).toHaveProperty('family');
    expect(parsed.fontFamilies[0]).toHaveProperty('usageCount');
    expect(parsed.fontFamilies[0]).toHaveProperty('usedIn');
  });

  it('should include font sizes', () => {
    const parsed = JSON.parse(generateTypographyJson(mockTypography));
    expect(parsed.fontSizes).toBeInstanceOf(Array);
    expect(parsed.fontSizes.length).toBeGreaterThan(0);
  });

  it('should include a recommended scale with heading and body', () => {
    const parsed = JSON.parse(generateTypographyJson(mockTypography));
    expect(parsed.recommendedScale).toBeDefined();
    expect(parsed.recommendedScale.heading).toBe('Inter');
    expect(parsed.recommendedScale.body).toBe('JetBrains Mono');
    expect(parsed.recommendedScale.mono).toBe('monospace');
  });

  it('should use first family for heading when only one exists', () => {
    const singleFamily: TypographySystem = {
      ...mockTypography,
      fontFamilies: [{ family: 'Roboto', count: 100, usage: ['all'] }],
    };
    const parsed = JSON.parse(generateTypographyJson(singleFamily));
    expect(parsed.recommendedScale.heading).toBe('Roboto');
    expect(parsed.recommendedScale.body).toBe('Roboto');
  });

  it('should handle empty typography system', () => {
    const empty: TypographySystem = {
      fontFamilies: [],
      fontWeights: [],
      fontSizes: [],
      lineHeights: [],
      letterSpacings: [],
    };
    const parsed = JSON.parse(generateTypographyJson(empty));
    expect(parsed.fontFamilies).toEqual([]);
    expect(parsed.recommendedScale.heading).toBe('system-ui');
  });
});

describe('generateSpacingJson', () => {
  it('should return valid JSON with spacing scale', () => {
    const result = generateSpacingJson(mockDesignTokens);
    const parsed = JSON.parse(result);
    expect(parsed.spacingScale).toBeInstanceOf(Array);
    expect(parsed.spacingScale.length).toBeGreaterThan(0);
  });

  it('should assign sequential names to spacing values', () => {
    const parsed = JSON.parse(generateSpacingJson(mockDesignTokens));
    parsed.spacingScale.forEach((s: { name: string }) => {
      expect(s.name).toMatch(/^space-\d+$/);
    });
  });

  it('should include border radii', () => {
    const parsed = JSON.parse(generateSpacingJson(mockDesignTokens));
    expect(parsed.borderRadii).toBeInstanceOf(Array);
    expect(parsed.borderRadii.length).toBeGreaterThan(0);
  });

  it('should sort spacing values numerically', () => {
    const parsed = JSON.parse(generateSpacingJson(mockDesignTokens));
    for (let i = 1; i < parsed.spacingScale.length; i++) {
      const prev = parseFloat(parsed.spacingScale[i - 1].value);
      const curr = parseFloat(parsed.spacingScale[i].value);
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('should deduplicate spacing values', () => {
    const tokensWithDuplicates: DesignTokens = {
      ...mockDesignTokens,
      spacing: [
        { value: '8px', count: 10, contexts: ['a'] },
        { value: '8px', count: 20, contexts: ['b'] },
        { value: '16px', count: 5, contexts: ['c'] },
      ],
    };
    const parsed = JSON.parse(generateSpacingJson(tokensWithDuplicates));
    const values = parsed.spacingScale.map((s: { value: string }) => s.value);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe('generateShadowsJson', () => {
  it('should return valid JSON with shadows array', () => {
    const parsed = JSON.parse(generateShadowsJson(mockDesignTokens));
    expect(parsed.shadows).toBeInstanceOf(Array);
    expect(parsed.shadows.length).toBe(mockDesignTokens.shadows.length);
  });

  it('should assign sequential names to shadows', () => {
    const parsed = JSON.parse(generateShadowsJson(mockDesignTokens));
    parsed.shadows.forEach((s: { name: string }, i: number) => {
      expect(s.name).toBe(`shadow-${i + 1}`);
    });
  });

  it('should include z-indices', () => {
    const parsed = JSON.parse(generateShadowsJson(mockDesignTokens));
    expect(parsed.zIndices).toBeInstanceOf(Array);
    expect(parsed.zIndices.length).toBe(mockDesignTokens.zIndices.length);
  });

  it('should include opacities', () => {
    const parsed = JSON.parse(generateShadowsJson(mockDesignTokens));
    expect(parsed.opacities).toBeInstanceOf(Array);
    expect(parsed.opacities.length).toBe(mockDesignTokens.opacities.length);
  });
});

describe('generateAnimationsJson', () => {
  it('should return valid JSON with transitions', () => {
    const parsed = JSON.parse(generateAnimationsJson(mockAnimations));
    expect(parsed.transitions).toBeInstanceOf(Array);
    expect(parsed.transitions.length).toBe(mockAnimations.cssTransitions.length);
  });

  it('should include keyframe animations', () => {
    const parsed = JSON.parse(generateAnimationsJson(mockAnimations));
    expect(parsed.keyframeAnimations).toBeInstanceOf(Array);
    expect(parsed.keyframeAnimations.length).toBe(mockAnimations.cssAnimations.length);
  });

  it('should include scroll-triggered animations', () => {
    const parsed = JSON.parse(generateAnimationsJson(mockAnimations));
    expect(parsed.scrollTriggered).toBeInstanceOf(Array);
    expect(parsed.scrollTriggered.length).toBe(mockAnimations.scrollTriggered.length);
  });

  it('should handle empty animation data', () => {
    const empty: AnimationData = { cssTransitions: [], cssAnimations: [], scrollTriggered: [] };
    const parsed = JSON.parse(generateAnimationsJson(empty));
    expect(parsed.transitions).toEqual([]);
    expect(parsed.keyframeAnimations).toEqual([]);
    expect(parsed.scrollTriggered).toEqual([]);
  });

  it('transition entries should have required fields', () => {
    const parsed = JSON.parse(generateAnimationsJson(mockAnimations));
    const t = parsed.transitions[0];
    expect(t).toHaveProperty('property');
    expect(t).toHaveProperty('duration');
    expect(t).toHaveProperty('easing');
    expect(t).toHaveProperty('selector');
  });
});
