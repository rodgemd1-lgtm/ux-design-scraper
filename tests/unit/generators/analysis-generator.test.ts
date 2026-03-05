import {
  generateAccessibilityAudit,
  generatePerformanceReport,
  generateFlowAnalysis,
} from '@generators/analysis-generator';

import { mockFullScrapeResult } from '../../fixtures/mock-scrape-result';
import type { FullScrapeResult } from '@shared/types';

describe('generateAccessibilityAudit', () => {
  it('should return a markdown string', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the overall score and WCAG level', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(result).toContain('72/100');
    expect(result).toContain('AA');
  });

  it('should include the target URL', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(result).toContain(mockFullScrapeResult.targetUrl);
  });

  it('should include contrast issues section', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(result).toContain('Contrast Issues');
    expect(result).toContain(`${mockFullScrapeResult.accessibility.contrastIssues.length}`);
  });

  it('should include missing alt text section', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(result).toContain('Missing Alt Text');
  });

  it('should include action items', () => {
    const result = generateAccessibilityAudit(mockFullScrapeResult);
    expect(result).toContain('Action Items');
    expect(result).toContain('Fix all contrast ratio violations');
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom Audit Report';
    const result = generateAccessibilityAudit(mockFullScrapeResult, custom);
    expect(result).toBe(custom);
  });

  it('should handle empty audit data gracefully', () => {
    const emptyAudit: FullScrapeResult = {
      ...mockFullScrapeResult,
      accessibility: {
        contrastIssues: [],
        missingAltText: [],
        missingAriaLabels: [],
        tabOrderIssues: [],
        semanticIssues: [],
        focusIndicatorsMissing: [],
        overallScore: 100,
        wcagLevel: 'AAA',
      },
    };
    const result = generateAccessibilityAudit(emptyAudit);
    expect(result).toContain('100/100');
    expect(result).toContain('AAA');
  });
});

describe('generatePerformanceReport', () => {
  it('should return a markdown string', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include Core Web Vitals section', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    expect(result).toContain('Core Web Vitals');
    expect(result).toContain('LCP');
    expect(result).toContain('CLS');
    expect(result).toContain('INP');
    expect(result).toContain('FCP');
  });

  it('should show PASS/FAIL for each metric', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    // LCP is 2800, target < 2500 => FAIL
    expect(result).toContain('FAIL');
    // FCP is 1600, target < 1800 => PASS
    expect(result).toContain('PASS');
  });

  it('should include performance and accessibility scores', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    expect(result).toContain('78/100');
    expect(result).toContain('85/100');
  });

  it('should include image analysis section', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    expect(result).toContain('Image Analysis');
    expect(result).toContain('Lazy-loaded');
  });

  it('should include recommendations', () => {
    const result = generatePerformanceReport(mockFullScrapeResult);
    expect(result).toContain('Recommendations');
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom Performance Report';
    const result = generatePerformanceReport(mockFullScrapeResult, custom);
    expect(result).toBe(custom);
  });
});

describe('generateFlowAnalysis', () => {
  it('should return a markdown string', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include steps to conversion', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(result).toContain(`${mockFullScrapeResult.flowAnalysis.stepsToConversion}`);
  });

  it('should include cognitive load score', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(result).toContain(`${mockFullScrapeResult.flowAnalysis.estimatedCognitiveLoad}/100`);
  });

  it('should include friction points', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(result).toContain('Friction Points');
    expect(result).toContain('Account creation required');
  });

  it('should include decisions per screen', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(result).toContain('Decisions Per Screen');
  });

  it('should include recommendations section', () => {
    const result = generateFlowAnalysis(mockFullScrapeResult);
    expect(result).toContain('Recommendations');
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom Flow Analysis';
    const result = generateFlowAnalysis(mockFullScrapeResult, custom);
    expect(result).toBe(custom);
  });
});
