import { generateReadme } from '@generators/readme-generator';

import {
  mockFullScrapeResult,
  mockProjectContext,
} from '../../fixtures/mock-scrape-result';
import type { FullScrapeResult, ProjectContext } from '@shared/types';

describe('generateReadme', () => {
  it('should return a non-empty markdown string', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the project name as a heading', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(`# ${mockFullScrapeResult.projectName}`);
  });

  it('should include the target URL', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(mockFullScrapeResult.targetUrl);
  });

  it('should include design token counts', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(`${mockFullScrapeResult.designTokens.colors.length} unique colors`);
    expect(result).toContain(`${mockFullScrapeResult.typography.fontFamilies.length} font families`);
    expect(result).toContain(`${mockFullScrapeResult.designTokens.spacing.length} spacing values`);
    expect(result).toContain(`${mockFullScrapeResult.designTokens.shadows.length} shadow values`);
  });

  it('should include accessibility score', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(`${mockFullScrapeResult.accessibility.overallScore}/100`);
  });

  it('should include project context table', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(mockProjectContext.goal);
    expect(result).toContain(mockProjectContext.industry);
    expect(result).toContain(mockProjectContext.targetAudience);
    expect(result).toContain(mockProjectContext.designStyle);
  });

  it('should include competitors when provided', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('competitor-a.com');
    expect(result).toContain('competitor-b.com');
  });

  it('should omit competitors row when none provided', () => {
    const ctxWithoutCompetitors: ProjectContext = {
      ...mockProjectContext,
      competitors: undefined,
    };
    const result = generateReadme(mockFullScrapeResult, ctxWithoutCompetitors);
    expect(result).not.toContain('Competitors');
  });

  it('should include Double Black Box Method section', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Double Black Box Method');
  });

  it('should include Quick Start instructions', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Quick Start');
    expect(result).toContain('CLAUDE.md');
    expect(result).toContain('workflow-chain.md');
  });

  it('should include folder structure documentation', () => {
    const result = generateReadme(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('/design-tokens/');
    expect(result).toContain('/scraped-code/');
    expect(result).toContain('/assets/');
    expect(result).toContain('/analysis/');
    expect(result).toContain('/prompts/');
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom README';
    const result = generateReadme(mockFullScrapeResult, mockProjectContext, custom);
    expect(result).toBe(custom);
  });
});
