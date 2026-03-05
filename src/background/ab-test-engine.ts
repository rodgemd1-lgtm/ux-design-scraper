import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import {
  AB_TEST_SYSTEM_PROMPT,
  AB_TEST_USER_TEMPLATE,
} from '@shared/prompt-templates/ab-test-prompt';
import type {
  FullScrapeResult,
  ProjectContext,
  ABTestPlan,
  ABTest,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('ABTestEngine');

export class ABTestEngine {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async generateTestPlan(
    scrapeResult: FullScrapeResult,
    projectContext?: ProjectContext
  ): Promise<ABTestPlan> {
    log.info('Generating A/B test plan', { url: scrapeResult.targetUrl });

    const context = projectContext || scrapeResult.projectContext;

    const projectContextSummary = `
- Goal: ${context.goal}
- Industry: ${context.industry}
- Target Audience: ${context.targetAudience}
- Design Style: ${context.designStyle}
${context.competitors?.length ? `- Competitors: ${context.competitors.join(', ')}` : ''}`;

    const conversionSummary = this.formatConversion(scrapeResult);
    const copySummary = this.formatCopy(scrapeResult);
    const accessibilitySummary = this.formatAccessibility(scrapeResult);
    const performanceSummary = this.formatPerformance(scrapeResult);
    const flowSummary = this.formatFlow(scrapeResult);
    const componentsSummary = this.formatComponents(scrapeResult);
    const navigationSummary = this.formatNavigation(scrapeResult);

    const userMessage = AB_TEST_USER_TEMPLATE(
      scrapeResult.targetUrl,
      projectContextSummary,
      conversionSummary,
      copySummary,
      accessibilitySummary,
      performanceSummary,
      flowSummary,
      componentsSummary,
      navigationSummary
    );

    try {
      const responseText = await this.claudeClient.singleCall(
        AB_TEST_SYSTEM_PROMPT,
        userMessage
      );
      const testPlan = this.parseTestPlanResponse(responseText);

      log.info('A/B test plan generated', {
        testCount: testPlan.prioritizedTests.length,
        estimatedLift: testPlan.estimatedTotalLift,
      });

      // Broadcast the result
      chrome.runtime.sendMessage({
        type: MSG.AB_TESTS_RESULT,
        payload: testPlan,
      }).catch(() => {});

      return testPlan;
    } catch (err) {
      log.error('A/B test plan generation failed', err);
      throw new Error(
        `A/B test plan generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private parseTestPlanResponse(responseText: string): ABTestPlan {
    try {
      const parsed = JSON.parse(responseText);

      return {
        summary: parsed.summary || '',
        prioritizedTests: this.validateTests(parsed.prioritizedTests),
        estimatedTotalLift: parsed.estimatedTotalLift || 'Unknown',
        testingTimeline: parsed.testingTimeline || 'To be determined based on traffic volume',
        prerequisites: Array.isArray(parsed.prerequisites)
          ? parsed.prerequisites.map(String)
          : [],
      };
    } catch {
      log.warn('Failed to parse A/B test plan as JSON');
      return this.createFallbackTestPlan(responseText);
    }
  }

  private validateTests(raw: unknown): ABTest[] {
    if (!Array.isArray(raw)) return [];

    return raw.map((test: Record<string, unknown>, index: number) => ({
      rank: typeof test.rank === 'number' ? test.rank : index + 1,
      name: (test.name as string) || `Test ${index + 1}`,
      hypothesis: (test.hypothesis as string) || '',
      control: (test.control as string) || '',
      variant: (test.variant as string) || '',
      expectedLift: (test.expectedLift as string) || 'Unknown',
      metricToTrack: (test.metricToTrack as string) || 'Conversion rate',
      trafficAllocation: (test.trafficAllocation as string) || '50/50 split',
      durationEstimate: (test.durationEstimate as string) || '2-4 weeks',
      category: (test.category as string) || 'general',
      confidence: this.validateConfidence(test.confidence),
      implementation: (test.implementation as string) || '',
    }));
  }

  private validateConfidence(value: unknown): 'low' | 'medium' | 'high' {
    if (typeof value === 'string' && ['low', 'medium', 'high'].includes(value)) {
      return value as 'low' | 'medium' | 'high';
    }
    return 'medium';
  }

  private createFallbackTestPlan(rawText: string): ABTestPlan {
    return {
      summary: 'Unable to parse structured test plan. Raw analysis available below.',
      prioritizedTests: [{
        rank: 1,
        name: 'Analysis Available',
        hypothesis: 'See raw analysis for test hypotheses.',
        control: 'Current design',
        variant: 'See recommendations',
        expectedLift: 'TBD',
        metricToTrack: 'Conversion rate',
        trafficAllocation: '50/50',
        durationEstimate: 'TBD',
        category: 'general',
        confidence: 'medium',
        implementation: rawText.slice(0, 500),
      }],
      estimatedTotalLift: 'Unknown',
      testingTimeline: 'To be determined',
      prerequisites: ['Re-run A/B test analysis for structured results'],
    };
  }

  private formatConversion(scrapeResult: FullScrapeResult): string {
    const cp = scrapeResult.conversionPatterns;
    return `
**CTAs (${cp.ctas.length}):**
${cp.ctas.map(c =>
  `- "${c.text}" — position: ${c.position}, size: ${c.size}, color: ${c.color}, prominence: ${c.prominence}/10`
).join('\n')}

**Social Proof Elements (${cp.socialProof.length}):**
${cp.socialProof.map(s =>
  `- Type: ${s.type}, Position: ${s.position}, Content: "${s.content.slice(0, 80)}"`
).join('\n')}

**Form Fields (${cp.formFields.length}):**
${cp.formFields.map(f =>
  `- "${f.label}" (${f.type}) — ${f.required ? 'Required' : 'Optional'}`
).join('\n')}

**Trust Badges:** ${cp.trustBadges.length > 0 ? cp.trustBadges.join(', ') : 'None detected'}
**Urgency Patterns:** ${cp.urgencyPatterns.length > 0 ? cp.urgencyPatterns.map(u => `${u.type}: "${u.content}"`).join('; ') : 'None detected'}`;
  }

  private formatCopy(scrapeResult: FullScrapeResult): string {
    const c = scrapeResult.copyAnalysis;
    return `
**CTA Labels:** ${c.ctaLabels.map(l => `"${l.text}" (${l.count}x on ${l.element})`).join(', ')}
**Tone Keywords:** ${c.toneKeywords.join(', ')}
**Error Messages:** ${c.errorMessages.length}
**Placeholders:** ${c.placeholders.length}
**Microcopy Items:** ${c.microcopy.length}`;
  }

  private formatAccessibility(scrapeResult: FullScrapeResult): string {
    const a = scrapeResult.accessibility;
    return `
**Score:** ${a.overallScore}/100 (WCAG ${a.wcagLevel})
**Contrast Issues:** ${a.contrastIssues.length} ${a.contrastIssues.length > 0 ? '(conversion barrier for users with low vision)' : ''}
**Missing Alt Text:** ${a.missingAltText.length}
**Missing ARIA Labels:** ${a.missingAriaLabels.length}
**Tab Order Issues:** ${a.tabOrderIssues.length} ${a.tabOrderIssues.length > 0 ? '(may prevent keyboard-only users from converting)' : ''}
**Focus Indicators Missing:** ${a.focusIndicatorsMissing.length}`;
  }

  private formatPerformance(scrapeResult: FullScrapeResult): string {
    const lh = scrapeResult.lighthouse;
    return `
**Lighthouse Score:** ${lh.performanceScore}/100
**LCP:** ${lh.lcp}ms ${lh.lcp > 2500 ? '(SLOW — each 100ms over 2500ms costs ~1% conversion)' : ''}
**CLS:** ${lh.cls} ${lh.cls > 0.1 ? '(HIGH — layout shifts cause misclicks and frustration)' : ''}
**INP:** ${lh.inp}ms ${lh.inp > 200 ? '(SLOW — sluggish interactions reduce engagement)' : ''}
**FCP:** ${lh.fcp}ms
**Speed Index:** ${lh.speedIndex}ms
**Total Blocking Time:** ${lh.totalBlockingTime}ms

**Image Stats:**
- Total: ${scrapeResult.imageAssets.images.length}
- Lazy loaded: ${scrapeResult.imageAssets.lazyLoadPercentage}% ${scrapeResult.imageAssets.lazyLoadPercentage < 50 ? '(LOW — opportunity for speed improvement)' : ''}
- Total size: ${scrapeResult.imageAssets.totalSize} bytes`;
  }

  private formatFlow(scrapeResult: FullScrapeResult): string {
    const f = scrapeResult.flowAnalysis;
    return `
**Steps to Conversion:** ${f.stepsToConversion} ${f.stepsToConversion > 3 ? '(HIGH — each additional step loses ~20% of users)' : ''}
**Form Fields:** ${f.formFieldCount} ${f.formFieldCount > 5 ? '(HIGH — each field beyond 3 reduces completion by ~7%)' : ''}
**Cognitive Load:** ${f.estimatedCognitiveLoad}/100 ${f.estimatedCognitiveLoad > 60 ? '(HIGH — consider progressive disclosure)' : ''}
**Decisions Per Screen:** ${f.decisionsPerScreen.join(', ')} ${Math.max(...f.decisionsPerScreen) > 5 ? '(TOO MANY — reduce choices per screen)' : ''}
**Friction Points (${f.frictionPoints.length}):**
${f.frictionPoints.map(fp =>
  `- Step ${fp.step}: ${fp.description} (severity: ${fp.severity}/10)`
).join('\n')}`;
  }

  private formatComponents(scrapeResult: FullScrapeResult): string {
    const componentsByType = new Map<string, number>();
    for (const c of scrapeResult.components) {
      componentsByType.set(c.type, (componentsByType.get(c.type) || 0) + 1);
    }

    return `
**Component Types Available for Testing:**
${[...componentsByType.entries()].map(([type, count]) =>
  `- ${type}: ${count} instances`
).join('\n')}

**Components with State Variants (testable):**
${scrapeResult.components
  .filter(c => Object.keys(c.stateVariants).length > 0)
  .map(c => `- ${c.name} (${c.type}): states = ${Object.keys(c.stateVariants).join(', ')}`)
  .join('\n') || 'None have documented state variants'}`;
  }

  private formatNavigation(scrapeResult: FullScrapeResult): string {
    const nav = scrapeResult.navigation;
    return `
**Menu Depth:** ${nav.menuDepth} ${nav.menuDepth > 3 ? '(DEEP — consider flattening)' : ''}
**Total Pages:** ${nav.totalPages}
**Primary Nav Items:** ${nav.primaryNav.length} ${nav.primaryNav.length > 7 ? '(TOO MANY — Miller\'s Law suggests 7 +/- 2 items max)' : ''}
**Top-Level Labels:** ${nav.primaryNav.map(item => `"${item.label}"`).join(', ')}
**Footer Nav:** ${nav.footerNav.length} items
**Has Breadcrumbs:** ${nav.breadcrumbs.length > 0 ? 'Yes' : 'No'}`;
  }
}
