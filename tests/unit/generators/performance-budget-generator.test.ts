import {
  generatePerformanceBudget,
  exportPerformanceBudgetJson,
} from '@generators/performance-budget-generator';

import {
  mockLighthouse,
  mockImageAssets,
  mockThirdPartyStack,
  mockTypography,
} from '../../fixtures/mock-scrape-result';

import type { PerformanceBudget, LighthouseData, ImageAssetData, ThirdPartyStack } from '@shared/types';

describe('generatePerformanceBudget', () => {
  let budget: PerformanceBudget;

  beforeAll(() => {
    budget = generatePerformanceBudget(mockLighthouse, mockImageAssets, mockThirdPartyStack, mockTypography);
  });

  it('should return a budget with all required sections', () => {
    expect(budget.images).toBeDefined();
    expect(budget.javascript).toBeDefined();
    expect(budget.css).toBeDefined();
    expect(budget.fonts).toBeDefined();
    expect(budget.thirdParty).toBeDefined();
    expect(budget.coreWebVitals).toBeDefined();
    expect(budget.lighthouseCIConfig).toBeDefined();
    expect(budget.budgetJson).toBeDefined();
  });

  describe('Image budget', () => {
    it('should set a positive total budget in KB', () => {
      expect(budget.images.totalBudgetKB).toBeGreaterThan(0);
    });

    it('should set per-image max in KB', () => {
      expect(budget.images.perImageMaxKB).toBeGreaterThan(0);
      expect(budget.images.perImageMaxKB).toBeLessThanOrEqual(300);
    });

    it('should always include webp in required formats', () => {
      expect(budget.images.requiredFormats).toContain('webp');
    });

    it('should track current total KB', () => {
      const expectedCurrentKB = Math.round(mockImageAssets.totalSize / 1024);
      expect(budget.images.currentTotalKB).toBe(expectedCurrentKB);
    });
  });

  describe('JavaScript budget', () => {
    it('should set a positive total budget in KB', () => {
      expect(budget.javascript.totalBudgetKB).toBeGreaterThan(0);
    });

    it('should set per-bundle max that is less than total', () => {
      expect(budget.javascript.perBundleMaxKB).toBeGreaterThan(0);
      expect(budget.javascript.perBundleMaxKB).toBeLessThanOrEqual(budget.javascript.totalBudgetKB);
    });

    it('should estimate current JS size from TBT', () => {
      expect(budget.javascript.currentTotalKB).toBeGreaterThan(0);
    });
  });

  describe('CSS budget', () => {
    it('should set a positive total budget in KB', () => {
      expect(budget.css.totalBudgetKB).toBeGreaterThan(0);
    });

    it('should track current CSS size estimate', () => {
      expect(budget.css.currentTotalKB).toBeGreaterThan(0);
    });
  });

  describe('Font budget', () => {
    it('should set max families based on current usage', () => {
      expect(budget.fonts.maxFamilies).toBeGreaterThan(0);
      expect(budget.fonts.maxFamilies).toBeLessThanOrEqual(3);
    });

    it('should track current font families count', () => {
      expect(budget.fonts.currentFamilies).toBe(mockTypography.fontFamilies.length);
    });
  });

  describe('Third-party budget', () => {
    it('should count all current third parties', () => {
      expect(budget.thirdParty.currentCount).toBeGreaterThan(0);
    });

    it('should set a max count slightly above current', () => {
      expect(budget.thirdParty.maxCount).toBeGreaterThanOrEqual(budget.thirdParty.currentCount);
      expect(budget.thirdParty.maxCount).toBeLessThanOrEqual(15);
    });

    it('should identify essential categories', () => {
      expect(budget.thirdParty.categoriesToKeep).toContain('analytics');
      expect(budget.thirdParty.categoriesToKeep).toContain('frameworks');
    });
  });

  describe('Core Web Vitals targets', () => {
    it('should set targets for all Core Web Vitals', () => {
      expect(budget.coreWebVitals.lcpTarget).toBeDefined();
      expect(budget.coreWebVitals.clsTarget).toBeDefined();
      expect(budget.coreWebVitals.inpTarget).toBeDefined();
      expect(budget.coreWebVitals.fcpTarget).toBeDefined();
    });

    it('should track current values', () => {
      expect(budget.coreWebVitals.currentLCP).toBe(mockLighthouse.lcp);
      expect(budget.coreWebVitals.currentCLS).toBe(mockLighthouse.cls);
      expect(budget.coreWebVitals.currentINP).toBe(mockLighthouse.inp);
      expect(budget.coreWebVitals.currentFCP).toBe(mockLighthouse.fcp);
    });

    it('LCP target should be better (lower) than current when above threshold', () => {
      // Current LCP is 2800 which is > 2500 threshold
      expect(budget.coreWebVitals.lcpTarget).toBeLessThan(mockLighthouse.lcp);
    });

    it('FCP target should be better (lower) than current when below threshold', () => {
      // Current FCP is 1600 which is < 1800 threshold, so target should be 10% lower
      expect(budget.coreWebVitals.fcpTarget).toBeLessThan(mockLighthouse.fcp);
    });
  });

  describe('Budget JSON output', () => {
    it('should generate a valid budget JSON structure with budgets array', () => {
      expect(budget.budgetJson).toBeDefined();
      const budgetJsonTyped = budget.budgetJson as { budgets: unknown[] };
      expect(budgetJsonTyped.budgets).toBeInstanceOf(Array);
      expect(budgetJsonTyped.budgets.length).toBe(1);
    });

    it('budget should include resourceSizes and resourceCounts', () => {
      const budgetEntry = (budget.budgetJson as { budgets: { resourceSizes: unknown[]; resourceCounts: unknown[] }[] }).budgets[0];
      expect(budgetEntry.resourceSizes).toBeInstanceOf(Array);
      expect(budgetEntry.resourceCounts).toBeInstanceOf(Array);
    });
  });

  describe('Lighthouse CI config', () => {
    it('should generate a ci.assert configuration', () => {
      const config = budget.lighthouseCIConfig as { ci: { assert: { assertions: Record<string, unknown> } } };
      expect(config.ci).toBeDefined();
      expect(config.ci.assert).toBeDefined();
      expect(config.ci.assert.assertions).toBeDefined();
    });

    it('should include performance and accessibility score assertions', () => {
      const assertions = (budget.lighthouseCIConfig as {
        ci: { assert: { assertions: Record<string, unknown> } };
      }).ci.assert.assertions;
      expect(assertions['categories:performance']).toBeDefined();
      expect(assertions['categories:accessibility']).toBeDefined();
    });
  });
});

describe('exportPerformanceBudgetJson', () => {
  it('should return valid JSON string', () => {
    const budget = generatePerformanceBudget(mockLighthouse, mockImageAssets, mockThirdPartyStack, mockTypography);
    const json = exportPerformanceBudgetJson(budget);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should include metadata and budget data', () => {
    const budget = generatePerformanceBudget(mockLighthouse, mockImageAssets, mockThirdPartyStack, mockTypography);
    const parsed = JSON.parse(exportPerformanceBudgetJson(budget));
    expect(parsed._generated).toBeDefined();
    expect(parsed._source).toContain('UX Design Scraper');
    expect(parsed.budget).toBeDefined();
  });

  it('should handle minimal lighthouse data', () => {
    const minLighthouse: LighthouseData = {
      performanceScore: 50,
      accessibilityScore: 50,
      lcp: 5000,
      cls: 0.3,
      inp: 500,
      fcp: 3500,
      speedIndex: 6000,
      totalBlockingTime: 2500,
    };
    const minImages: ImageAssetData = {
      images: [],
      totalSize: 0,
      formatDistribution: {},
      lazyLoadPercentage: 0,
    };
    const minThirdParty: ThirdPartyStack = {
      analytics: [],
      cms: [],
      auth: [],
      payment: [],
      chat: [],
      cdns: [],
      frameworks: [],
      abTesting: [],
    };
    const budget = generatePerformanceBudget(minLighthouse, minImages, minThirdParty);
    const json = exportPerformanceBudgetJson(budget);
    expect(() => JSON.parse(json)).not.toThrow();
    expect(budget.images.totalBudgetKB).toBeGreaterThanOrEqual(200);
    expect(budget.javascript.totalBudgetKB).toBeGreaterThanOrEqual(150);
  });
});
