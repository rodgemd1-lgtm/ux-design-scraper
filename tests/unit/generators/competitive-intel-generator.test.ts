import { generateCompetitiveIntel } from '@generators/competitive-intel-generator';
import type { CompetitiveIntelReport } from '@generators/competitive-intel-generator';

import {
  mockFullScrapeResult,
  createSecondMockScrapeResult,
} from '../../fixtures/mock-scrape-result';
import type { FullScrapeResult } from '@shared/types';

describe('generateCompetitiveIntel', () => {
  let report: CompetitiveIntelReport;
  let secondResult: FullScrapeResult;

  beforeAll(() => {
    secondResult = createSecondMockScrapeResult();
    report = generateCompetitiveIntel([mockFullScrapeResult, secondResult]);
  });

  it('should return a report with all required fields', () => {
    expect(report.generatedAt).toBeDefined();
    expect(report.sites).toBeDefined();
    expect(report.featureMatrix).toBeDefined();
    expect(report.scorecards).toBeDefined();
    expect(report.techComparison).toBeDefined();
    expect(report.uxPatternComparison).toBeDefined();
    expect(report.performanceComparison).toBeDefined();
    expect(report.mobileRanking).toBeDefined();
    expect(report.innovationIndex).toBeDefined();
    expect(report.swotAnalyses).toBeDefined();
    expect(report.categoryWinners).toBeDefined();
    expect(report.markdownReport).toBeDefined();
  });

  it('should include all sites in the sites array', () => {
    expect(report.sites).toHaveLength(2);
    expect(report.sites).toContain(mockFullScrapeResult.targetUrl);
    expect(report.sites).toContain(secondResult.targetUrl);
  });

  it('should generate scorecards for each site', () => {
    expect(report.scorecards).toHaveLength(2);
    for (const scorecard of report.scorecards) {
      expect(scorecard.url).toBeDefined();
      expect(scorecard.accessibility).toBeDefined();
      expect(scorecard.performance).toBeDefined();
      expect(scorecard.conversion).toBeDefined();
      expect(scorecard.visualQuality).toBeDefined();
      expect(scorecard.overallScore).toBeDefined();
      expect(scorecard.grade).toBeDefined();
    }
  });

  it('should assign letter grades to scorecards', () => {
    const validGrades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'];
    for (const scorecard of report.scorecards) {
      expect(validGrades).toContain(scorecard.grade);
    }
  });

  it('should generate a feature matrix based on component types', () => {
    expect(report.featureMatrix.length).toBeGreaterThan(0);
    for (const row of report.featureMatrix) {
      expect(row.componentType).toBeDefined();
      expect(row.sites).toHaveLength(2);
      for (const site of row.sites) {
        expect(typeof site.found).toBe('boolean');
        expect(typeof site.count).toBe('number');
        expect(typeof site.quality).toBe('number');
      }
    }
  });

  it('should generate performance comparison with Core Web Vitals', () => {
    expect(report.performanceComparison.sites).toHaveLength(2);
    for (const site of report.performanceComparison.sites) {
      expect(site.url).toBeDefined();
      expect(typeof site.performanceScore).toBe('number');
      expect(typeof site.lcp).toBe('number');
      expect(typeof site.cls).toBe('number');
      expect(typeof site.inp).toBe('number');
    }
  });

  it('should generate mobile rankings sorted by score descending', () => {
    expect(report.mobileRanking.length).toBeGreaterThan(0);
    for (let i = 1; i < report.mobileRanking.length; i++) {
      expect(report.mobileRanking[i - 1].mobileScore)
        .toBeGreaterThanOrEqual(report.mobileRanking[i].mobileScore);
    }
    // Ranks should be sequential
    report.mobileRanking.forEach((entry, i) => {
      expect(entry.rank).toBe(i + 1);
    });
  });

  it('should generate SWOT analyses for each site', () => {
    expect(report.swotAnalyses).toHaveLength(2);
    for (const swot of report.swotAnalyses) {
      expect(swot.url).toBeDefined();
      expect(Array.isArray(swot.strengths)).toBe(true);
      expect(Array.isArray(swot.weaknesses)).toBe(true);
      expect(Array.isArray(swot.opportunities)).toBe(true);
      expect(Array.isArray(swot.threats)).toBe(true);
    }
  });

  it('should identify category winners', () => {
    expect(report.categoryWinners.length).toBeGreaterThan(0);
    const categories = report.categoryWinners.map((cw) => cw.category);
    expect(categories).toContain('Overall');
    expect(categories).toContain('Accessibility');
    expect(categories).toContain('Performance');

    for (const cw of report.categoryWinners) {
      expect(typeof cw.score).toBe('number');
      expect(cw.winner).toBeDefined();
    }
  });

  it('should generate a non-empty markdown report', () => {
    expect(typeof report.markdownReport).toBe('string');
    expect(report.markdownReport.length).toBeGreaterThan(100);
    expect(report.markdownReport).toContain('Competitive Intelligence Report');
    expect(report.markdownReport).toContain('Overall Winner');
  });

  it('should handle a single site', () => {
    const singleReport = generateCompetitiveIntel([mockFullScrapeResult]);
    expect(singleReport.sites).toHaveLength(1);
    expect(singleReport.scorecards).toHaveLength(1);
    expect(singleReport.categoryWinners.length).toBeGreaterThan(0);
    // With a single site, it should be the winner of all categories
    for (const cw of singleReport.categoryWinners) {
      expect(cw.winner).toBe(mockFullScrapeResult.targetUrl);
    }
  });
});
