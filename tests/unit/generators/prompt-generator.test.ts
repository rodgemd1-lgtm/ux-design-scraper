import {
  generateMasterPrompt,
  generateComponentPrompt,
  generateWorkflowChain,
} from '@generators/prompt-generator';

import {
  mockFullScrapeResult,
  mockProjectContext,
  mockComponents,
} from '../../fixtures/mock-scrape-result';

describe('generateMasterPrompt', () => {
  it('should return a non-empty string', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the target URL', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(mockFullScrapeResult.targetUrl);
  });

  it('should include the design brief with project context', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(mockProjectContext.goal);
    expect(result).toContain(mockProjectContext.industry);
    expect(result).toContain(mockProjectContext.targetAudience);
    expect(result).toContain(mockProjectContext.designStyle);
  });

  it('should reference design token files', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('colors.json');
    expect(result).toContain('typography.json');
    expect(result).toContain('spacing.json');
    expect(result).toContain('shadows.json');
    expect(result).toContain('animations.json');
  });

  it('should list component count', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(`${mockFullScrapeResult.components.length} identified`);
  });

  it('should include validation section with scores', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(`${mockFullScrapeResult.accessibility.overallScore}/100`);
    expect(result).toContain(`${mockFullScrapeResult.lighthouse.performanceScore}/100`);
  });

  it('should include key design decisions', () => {
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Inter'); // primary font
    expect(result).toContain(mockFullScrapeResult.gridLayout.layoutType);
    expect(result).toContain(mockFullScrapeResult.gridLayout.containerMaxWidth);
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom Master Prompt';
    const result = generateMasterPrompt(mockFullScrapeResult, mockProjectContext, custom);
    expect(result).toBe(custom);
  });
});

describe('generateComponentPrompt', () => {
  it('should return a markdown string for a component', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the component name and type', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(result).toContain('PrimaryButton');
    expect(result).toContain('button');
  });

  it('should list state variants', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(result).toContain('hover');
    expect(result).toContain('focus');
    expect(result).toContain('disabled');
  });

  it('should include reference HTML', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(result).toContain('Reference HTML');
    expect(result).toContain('btn-primary');
  });

  it('should include reference CSS', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(result).toContain('Reference CSS');
    expect(result).toContain('background-color');
  });

  it('should handle component with no state variants', () => {
    const result = generateComponentPrompt(mockComponents[2]); // NavBar has empty stateVariants
    expect(result).toContain('Default state only');
  });

  it('should include implementation notes', () => {
    const result = generateComponentPrompt(mockComponents[0]);
    expect(result).toContain('React functional component');
    expect(result).toContain('Tailwind CSS');
    expect(result).toContain('accessibility');
  });
});

describe('generateWorkflowChain', () => {
  it('should return a non-empty string', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should include the project name', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain(mockFullScrapeResult.projectName);
  });

  it('should have multiple numbered phases', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Phase 1');
    expect(result).toContain('Phase 2');
    expect(result).toContain('Phase 3');
    expect(result).toContain('Phase 4');
    expect(result).toContain('Phase 5');
  });

  it('should include environment setup phase', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Environment Setup');
    expect(result).toContain('Next.js');
  });

  it('should include accessibility hardening phase', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Accessibility Hardening');
  });

  it('should include performance optimization phase', () => {
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext);
    expect(result).toContain('Performance Optimization');
    expect(result).toContain('LCP');
  });

  it('should return generatedContent when provided', () => {
    const custom = '# Custom Workflow';
    const result = generateWorkflowChain(mockFullScrapeResult, mockProjectContext, custom);
    expect(result).toBe(custom);
  });
});
