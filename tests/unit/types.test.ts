import type {
  FullScrapeResult,
  AppSettings,
  ScoringWeights,
  DesignTokens,
  TypographySystem,
  ComponentData,
  AccessibilityAudit,
  LighthouseData,
  FlowAnalysis,
  FigmaTokens,
  PerformanceBudget,
  MultiSiteResult,
  ProjectContext,
} from '@shared/types';

import { mockFullScrapeResult, mockProjectContext } from '../fixtures/mock-scrape-result';

describe('Type Interfaces', () => {
  it('FullScrapeResult should have all required top-level fields', () => {
    const result: FullScrapeResult = mockFullScrapeResult;

    expect(result.projectName).toBeDefined();
    expect(result.targetUrl).toBeDefined();
    expect(result.projectContext).toBeDefined();
    expect(result.timestamp).toBeDefined();
    expect(result.designTokens).toBeDefined();
    expect(result.typography).toBeDefined();
    expect(result.icons).toBeDefined();
    expect(result.gridLayout).toBeDefined();
    expect(result.navigation).toBeDefined();
    expect(result.copyAnalysis).toBeDefined();
    expect(result.accessibility).toBeDefined();
    expect(result.thirdPartyStack).toBeDefined();
    expect(result.darkMode).toBeDefined();
    expect(result.imageAssets).toBeDefined();
    expect(result.conversionPatterns).toBeDefined();
    expect(result.components).toBeDefined();
    expect(result.animations).toBeDefined();
    expect(result.scrollBehavior).toBeDefined();
    expect(result.flowAnalysis).toBeDefined();
    expect(result.screenshots).toBeDefined();
    expect(result.lighthouse).toBeDefined();
    expect(result.waybackSnapshots).toBeDefined();
    expect(result.heatmaps).toBeDefined();
    expect(result.seo).toBeDefined();
    expect(result.colorIntelligence).toBeDefined();
    expect(result.whitespace).toBeDefined();
    expect(result.interactionPatterns).toBeDefined();
    expect(result.motionCapture).toBeDefined();
  });

  it('ProjectContext should have all required fields', () => {
    const ctx: ProjectContext = mockProjectContext;

    expect(typeof ctx.goal).toBe('string');
    expect(typeof ctx.industry).toBe('string');
    expect(typeof ctx.targetAudience).toBe('string');
    expect(typeof ctx.designStyle).toBe('string');
  });

  it('ProjectContext optional fields should be assignable', () => {
    const ctx: ProjectContext = {
      goal: 'test',
      industry: 'tech',
      targetAudience: 'devs',
      designStyle: 'minimal',
      competitors: ['https://a.com'],
      specificComponents: ['button'],
    };
    expect(ctx.competitors).toHaveLength(1);
    expect(ctx.specificComponents).toHaveLength(1);
  });

  it('DesignTokens should have the correct structure', () => {
    const tokens: DesignTokens = mockFullScrapeResult.designTokens;

    expect(Array.isArray(tokens.colors)).toBe(true);
    expect(Array.isArray(tokens.spacing)).toBe(true);
    expect(Array.isArray(tokens.shadows)).toBe(true);
    expect(Array.isArray(tokens.borderRadii)).toBe(true);
    expect(Array.isArray(tokens.zIndices)).toBe(true);
    expect(Array.isArray(tokens.opacities)).toBe(true);

    // Verify token entries have required fields
    if (tokens.colors.length > 0) {
      expect(tokens.colors[0]).toHaveProperty('value');
      expect(tokens.colors[0]).toHaveProperty('count');
      expect(tokens.colors[0]).toHaveProperty('contexts');
    }
  });

  it('AccessibilityAudit wcagLevel should be a valid enum value', () => {
    const validLevels = ['A', 'AA', 'AAA', 'FAIL'] as const;
    const audit: AccessibilityAudit = mockFullScrapeResult.accessibility;

    expect(validLevels).toContain(audit.wcagLevel);
    expect(typeof audit.overallScore).toBe('number');
    expect(audit.overallScore).toBeGreaterThanOrEqual(0);
    expect(audit.overallScore).toBeLessThanOrEqual(100);
  });

  it('LighthouseData should have all metric fields as numbers', () => {
    const lh: LighthouseData = mockFullScrapeResult.lighthouse;

    expect(typeof lh.performanceScore).toBe('number');
    expect(typeof lh.accessibilityScore).toBe('number');
    expect(typeof lh.lcp).toBe('number');
    expect(typeof lh.cls).toBe('number');
    expect(typeof lh.inp).toBe('number');
    expect(typeof lh.fcp).toBe('number');
    expect(typeof lh.speedIndex).toBe('number');
    expect(typeof lh.totalBlockingTime).toBe('number');
  });

  it('ComponentData should have all required fields', () => {
    const component: ComponentData = mockFullScrapeResult.components[0];

    expect(typeof component.name).toBe('string');
    expect(typeof component.selector).toBe('string');
    expect(typeof component.html).toBe('string');
    expect(typeof component.css).toBe('string');
    expect(typeof component.type).toBe('string');
    expect(typeof component.stateVariants).toBe('object');
  });

  it('ScoringWeights should accept correct numeric properties', () => {
    const weights: ScoringWeights = {
      industryFit: 20,
      audienceAlignment: 20,
      conversionOptimization: 20,
      accessibilityCompliance: 15,
      performance: 15,
      designTrend: 10,
    };

    const total = Object.values(weights).reduce((sum, v) => sum + v, 0);
    expect(total).toBe(100);
  });

  it('AppSettings should accept all settings fields', () => {
    const settings: AppSettings = {
      claudeApiKey: 'sk-test',
      braveApiKey: 'bsk-test',
      supabaseUrl: 'https://test.supabase.co',
      supabaseAnonKey: 'anon-key',
      hotjarApiKey: 'hj-key',
      hotjarSiteId: '123456',
      fullstoryApiKey: 'fs-key',
      fullstoryOrgId: 'org-123',
      outputBasePath: '~/Desktop',
      scoringWeights: {
        industryFit: 20,
        audienceAlignment: 20,
        conversionOptimization: 20,
        accessibilityCompliance: 15,
        performance: 15,
        designTrend: 10,
      },
    };

    expect(settings.claudeApiKey).toBe('sk-test');
    expect(settings.scoringWeights.performance).toBe(15);
  });
});
