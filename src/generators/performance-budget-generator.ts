/**
 * Performance Budget Generator
 * Generates a performance.budget.json based on Lighthouse data, image assets,
 * and third-party stack analysis. Includes:
 * - Image budget (total KB, per-image max, format requirements)
 * - JavaScript budget (total KB, per-bundle max)
 * - CSS budget
 * - Font budget (number of families, total KB)
 * - Third-party budget (max number, categories to keep)
 * - Core Web Vitals targets (based on current scores + improvement targets)
 * - Lighthouse CI config for automated monitoring
 */

import type {
  LighthouseData,
  ImageAssetData,
  ThirdPartyStack,
  TypographySystem,
  PerformanceBudget,
} from '../shared/types';

/**
 * Generate a performance budget based on current site metrics.
 * Sets targets that are realistic improvements over current performance.
 */
export function generatePerformanceBudget(
  lighthouse: LighthouseData,
  imageAssets: ImageAssetData,
  thirdParty: ThirdPartyStack,
  typography?: TypographySystem
): PerformanceBudget {
  // ===== Image Budget =====
  const currentImageTotalKB = Math.round(imageAssets.totalSize / 1024);
  const imageCount = imageAssets.images.length;
  const avgImageKB = imageCount > 0 ? Math.round(currentImageTotalKB / imageCount) : 100;

  // Set image budget: aim for 20% reduction from current or industry standard, whichever is stricter
  const imageTotalBudgetKB = Math.min(
    Math.round(currentImageTotalKB * 0.8), // 20% reduction
    1500 // Industry standard max for total images
  );
  const perImageMaxKB = Math.min(
    Math.round(avgImageKB * 1.5), // Allow 50% above average for hero images
    300 // Absolute max per image
  );

  // Determine required formats based on what's currently used
  const requiredFormats: string[] = ['webp']; // Always recommend WebP
  if (imageAssets.formatDistribution['avif'] || imageAssets.images.length > 20) {
    requiredFormats.push('avif');
  }
  if (imageAssets.images.some(img => img.srcset)) {
    requiredFormats.push('responsive-srcset');
  }

  const images: PerformanceBudget['images'] = {
    totalBudgetKB: Math.max(imageTotalBudgetKB, 200),
    perImageMaxKB: Math.max(perImageMaxKB, 50),
    requiredFormats,
    currentTotalKB: currentImageTotalKB,
  };

  // ===== JavaScript Budget =====
  // Typical target: 300-500KB total JS
  const estimatedCurrentJSKB = estimateJSSize(lighthouse);
  const jsTotalBudgetKB = Math.min(
    Math.round(estimatedCurrentJSKB * 0.85), // 15% reduction
    400 // Industry best practice
  );

  const javascript: PerformanceBudget['javascript'] = {
    totalBudgetKB: Math.max(jsTotalBudgetKB, 150),
    perBundleMaxKB: Math.min(Math.round(jsTotalBudgetKB * 0.6), 200),
    currentTotalKB: estimatedCurrentJSKB,
  };

  // ===== CSS Budget =====
  const estimatedCurrentCSSKB = estimateCSSSize(lighthouse);

  const css: PerformanceBudget['css'] = {
    totalBudgetKB: Math.min(Math.round(estimatedCurrentCSSKB * 0.85), 100),
    currentTotalKB: estimatedCurrentCSSKB,
  };

  // ===== Font Budget =====
  const currentFontFamilies = typography?.fontFamilies.length || 2;
  const estimatedFontKB = currentFontFamilies * 80; // ~80KB per font family average

  const fonts: PerformanceBudget['fonts'] = {
    maxFamilies: Math.min(currentFontFamilies, 3), // Recommend max 3 families
    totalBudgetKB: Math.min(estimatedFontKB, 250),
    currentFamilies: currentFontFamilies,
    currentTotalKB: estimatedFontKB,
  };

  // ===== Third-Party Budget =====
  const currentThirdPartyCount = countThirdParties(thirdParty);
  const categoriesToKeep = determineEssentialCategories(thirdParty);

  const thirdPartyBudget: PerformanceBudget['thirdParty'] = {
    maxCount: Math.min(currentThirdPartyCount + 2, 15), // Allow slight growth, cap at 15
    categoriesToKeep,
    currentCount: currentThirdPartyCount,
  };

  // ===== Core Web Vitals Targets =====
  const coreWebVitals: PerformanceBudget['coreWebVitals'] = {
    lcpTarget: calculateTarget(lighthouse.lcp, 2500, 'lower'),
    clsTarget: calculateTarget(lighthouse.cls, 0.1, 'lower'),
    inpTarget: calculateTarget(lighthouse.inp, 200, 'lower'),
    fcpTarget: calculateTarget(lighthouse.fcp, 1800, 'lower'),
    currentLCP: lighthouse.lcp,
    currentCLS: lighthouse.cls,
    currentINP: lighthouse.inp,
    currentFCP: lighthouse.fcp,
  };

  // ===== Lighthouse CI Config =====
  const lighthouseCIConfig = generateLighthouseCIConfig(coreWebVitals, lighthouse);

  // ===== Budget JSON (standard format) =====
  const budgetJson = generateBudgetJson(images, javascript, css, fonts);

  return {
    images,
    javascript,
    css,
    fonts,
    thirdParty: thirdPartyBudget,
    coreWebVitals,
    lighthouseCIConfig,
    budgetJson,
  };
}

/**
 * Export the performance budget as a formatted JSON string.
 */
export function exportPerformanceBudgetJson(budget: PerformanceBudget): string {
  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper - Performance Budget Generator',
    budget,
  }, null, 2);
}

/**
 * Export as a Lighthouse CI compatible budget file.
 */
export function exportLighthouseBudgetJson(budget: PerformanceBudget): string {
  return JSON.stringify(budget.budgetJson, null, 2);
}

/**
 * Export as lighthouserc.json for Lighthouse CI.
 */
export function exportLighthouseCIConfig(budget: PerformanceBudget): string {
  return JSON.stringify(budget.lighthouseCIConfig, null, 2);
}

// ===== Helper Functions =====

function estimateJSSize(lighthouse: LighthouseData): number {
  // Estimate based on TBT and performance score
  // Higher TBT typically correlates with more JS
  const tbt = lighthouse.totalBlockingTime;

  if (tbt > 2000) return 800;
  if (tbt > 1000) return 600;
  if (tbt > 500) return 400;
  if (tbt > 200) return 300;
  return 200;
}

function estimateCSSSize(lighthouse: LighthouseData): number {
  // Rough estimate based on FCP (more CSS = slower FCP)
  const fcp = lighthouse.fcp;

  if (fcp > 3000) return 150;
  if (fcp > 2000) return 100;
  if (fcp > 1000) return 70;
  return 50;
}

function countThirdParties(thirdParty: ThirdPartyStack): number {
  let count = 0;
  for (const category of Object.values(thirdParty)) {
    if (Array.isArray(category)) {
      count += category.length;
    }
  }
  return count;
}

function determineEssentialCategories(thirdParty: ThirdPartyStack): string[] {
  const essential: string[] = [];

  // Analytics is usually essential
  if (thirdParty.analytics.length > 0) essential.push('analytics');
  // CMS is structural
  if (thirdParty.cms.length > 0) essential.push('cms');
  // Auth is required
  if (thirdParty.auth.length > 0) essential.push('auth');
  // Payment is required for e-commerce
  if (thirdParty.payment.length > 0) essential.push('payment');
  // Frameworks are structural
  if (thirdParty.frameworks.length > 0) essential.push('frameworks');

  return essential;
}

function calculateTarget(
  currentValue: number,
  goodThreshold: number,
  direction: 'lower' | 'higher'
): number {
  if (direction === 'lower') {
    // For metrics where lower is better (LCP, CLS, INP, FCP)
    if (currentValue <= goodThreshold) {
      // Already good - set target 10% better
      return Math.round(currentValue * 0.9 * 100) / 100;
    }
    // Set target to be 20% improvement toward the good threshold
    const improvement = (currentValue - goodThreshold) * 0.2;
    return Math.round((currentValue - improvement) * 100) / 100;
  }

  // For metrics where higher is better (score-based)
  if (currentValue >= goodThreshold) {
    return Math.min(Math.round(currentValue * 1.05), 100);
  }
  const improvement = (goodThreshold - currentValue) * 0.2;
  return Math.round(currentValue + improvement);
}

function generateBudgetJson(
  images: PerformanceBudget['images'],
  javascript: PerformanceBudget['javascript'],
  css: PerformanceBudget['css'],
  fonts: PerformanceBudget['fonts']
): Record<string, unknown> {
  return {
    budgets: [
      {
        resourceSizes: [
          {
            resourceType: 'image',
            budget: images.totalBudgetKB,
          },
          {
            resourceType: 'script',
            budget: javascript.totalBudgetKB,
          },
          {
            resourceType: 'stylesheet',
            budget: css.totalBudgetKB,
          },
          {
            resourceType: 'font',
            budget: fonts.totalBudgetKB,
          },
          {
            resourceType: 'total',
            budget: images.totalBudgetKB + javascript.totalBudgetKB + css.totalBudgetKB + fonts.totalBudgetKB,
          },
        ],
        resourceCounts: [
          {
            resourceType: 'script',
            budget: 15,
          },
          {
            resourceType: 'stylesheet',
            budget: 5,
          },
          {
            resourceType: 'font',
            budget: fonts.maxFamilies * 3, // ~3 files per family (regular, bold, italic)
          },
          {
            resourceType: 'third-party',
            budget: 10,
          },
        ],
      },
    ],
  };
}

function generateLighthouseCIConfig(
  coreWebVitals: PerformanceBudget['coreWebVitals'],
  lighthouse: LighthouseData
): Record<string, unknown> {
  // Calculate score assertion thresholds
  const perfTarget = Math.max(
    Math.round(lighthouse.performanceScore * 0.9) / 100,
    0.5
  );
  const a11yTarget = Math.max(
    Math.round(lighthouse.accessibilityScore * 0.95) / 100,
    0.7
  );

  return {
    ci: {
      collect: {
        numberOfRuns: 3,
        settings: {
          preset: 'desktop',
        },
      },
      assert: {
        assertions: {
          'categories:performance': ['error', { minScore: perfTarget }],
          'categories:accessibility': ['error', { minScore: a11yTarget }],
          'largest-contentful-paint': ['error', { maxNumericValue: coreWebVitals.lcpTarget }],
          'cumulative-layout-shift': ['error', { maxNumericValue: coreWebVitals.clsTarget }],
          'interactive': ['warn', { maxNumericValue: coreWebVitals.inpTarget * 10 }],
          'first-contentful-paint': ['warn', { maxNumericValue: coreWebVitals.fcpTarget }],
          'total-blocking-time': ['warn', { maxNumericValue: 500 }],
          'speed-index': ['warn', { maxNumericValue: 4000 }],
          // Image optimization assertions
          'uses-webp-images': 'warn',
          'uses-optimized-images': 'warn',
          'uses-responsive-images': 'warn',
          // JS optimization assertions
          'unused-javascript': 'warn',
          'render-blocking-resources': 'warn',
          // General best practices
          'uses-text-compression': 'error',
          'uses-long-cache-ttl': 'warn',
        },
      },
      upload: {
        target: 'temporary-public-storage',
      },
    },
  };
}
