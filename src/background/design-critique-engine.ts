import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import {
  CRITIQUE_SYSTEM_PROMPT,
  CRITIQUE_USER_TEMPLATE,
} from '@shared/prompt-templates/critique-prompt';
import type {
  FullScrapeResult,
  ProjectContext,
  DesignCritique,
  CritiqueSection,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('DesignCritique');

export class DesignCritiqueEngine {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async critiqueDesign(
    scrapeResult: FullScrapeResult,
    projectContext?: ProjectContext
  ): Promise<DesignCritique> {
    log.info('Starting design critique', { url: scrapeResult.targetUrl });

    const context = projectContext || scrapeResult.projectContext;

    const projectContextSummary = `
- Goal: ${context.goal}
- Industry: ${context.industry}
- Target Audience: ${context.targetAudience}
- Design Style: ${context.designStyle}
${context.competitors?.length ? `- Competitors: ${context.competitors.join(', ')}` : ''}
${context.specificComponents?.length ? `- Focus Components: ${context.specificComponents.join(', ')}` : ''}`;

    const designTokensSummary = this.formatDesignTokens(scrapeResult);
    const typographySummary = this.formatTypography(scrapeResult);
    const componentsSummary = this.formatComponents(scrapeResult);
    const accessibilitySummary = this.formatAccessibility(scrapeResult);
    const conversionSummary = this.formatConversion(scrapeResult);
    const animationsSummary = this.formatAnimations(scrapeResult);
    const performanceSummary = this.formatPerformance(scrapeResult);
    const copySummary = this.formatCopy(scrapeResult);

    const userMessage = CRITIQUE_USER_TEMPLATE(
      scrapeResult.targetUrl,
      projectContextSummary,
      designTokensSummary,
      typographySummary,
      componentsSummary,
      accessibilitySummary,
      conversionSummary,
      animationsSummary,
      performanceSummary,
      copySummary
    );

    try {
      const responseText = await this.claudeClient.singleCall(CRITIQUE_SYSTEM_PROMPT, userMessage);
      const critique = this.parseCritiqueResponse(responseText);

      log.info('Design critique complete', {
        overallScore: critique.overallScore,
        strengths: critique.strengths.length,
        weaknesses: critique.weaknesses.length,
      });

      // Broadcast the result
      chrome.runtime.sendMessage({
        type: MSG.CRITIQUE_RESULT,
        payload: critique,
      }).catch(() => {});

      return critique;
    } catch (err) {
      log.error('Design critique failed', err);
      throw new Error(
        `Design critique failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private parseCritiqueResponse(responseText: string): DesignCritique {
    try {
      const parsed = JSON.parse(responseText);

      const defaultSection: CritiqueSection = {
        score: 5,
        summary: 'Analysis not available',
        details: [],
        recommendations: [],
      };

      return {
        overallScore: parsed.overallScore ?? 5,
        strengths: (parsed.strengths || []).slice(0, 5).map((s: Record<string, string>) => ({
          title: s.title || 'Untitled strength',
          evidence: s.evidence || '',
          impact: s.impact || '',
        })),
        weaknesses: (parsed.weaknesses || []).slice(0, 10).map((w: Record<string, string>) => ({
          title: w.title || 'Untitled weakness',
          evidence: w.evidence || '',
          severity: (['critical', 'major', 'minor', 'cosmetic'].includes(w.severity) ? w.severity : 'minor') as 'critical' | 'major' | 'minor' | 'cosmetic',
          recommendation: w.recommendation || '',
          estimatedEffort: (['low', 'medium', 'high'].includes(w.estimatedEffort) ? w.estimatedEffort : 'medium') as 'low' | 'medium' | 'high',
        })),
        visualHierarchy: this.parseSection(parsed.visualHierarchy, defaultSection),
        whitespace: this.parseSection(parsed.whitespace, defaultSection),
        colorHarmony: this.parseSection(parsed.colorHarmony, defaultSection),
        typographyCritique: this.parseSection(parsed.typographyCritique, defaultSection),
        ctaEffectiveness: this.parseSection(parsed.ctaEffectiveness, defaultSection),
        mobileFirst: this.parseSection(parsed.mobileFirst, defaultSection),
        emotionalDesign: this.parseSection(parsed.emotionalDesign, defaultSection),
        brandConsistency: this.parseSection(parsed.brandConsistency, defaultSection),
        microinteractions: this.parseSection(parsed.microinteractions, defaultSection),
        innovationScore: parsed.innovationScore ?? 5,
        innovationAssessment: parsed.innovationAssessment || '',
        executiveSummary: parsed.executiveSummary || '',
      };
    } catch {
      log.warn('Failed to parse critique as JSON, creating structured fallback');
      return this.createFallbackCritique(responseText);
    }
  }

  private parseSection(
    raw: Record<string, unknown> | undefined,
    fallback: CritiqueSection
  ): CritiqueSection {
    if (!raw) return fallback;

    return {
      score: typeof raw.score === 'number' ? raw.score : fallback.score,
      summary: typeof raw.summary === 'string' ? raw.summary : fallback.summary,
      details: Array.isArray(raw.details) ? raw.details.map(String) : fallback.details,
      recommendations: Array.isArray(raw.recommendations) ? raw.recommendations.map(String) : fallback.recommendations,
    };
  }

  private createFallbackCritique(rawText: string): DesignCritique {
    const defaultSection: CritiqueSection = {
      score: 5,
      summary: 'See executive summary for details.',
      details: [],
      recommendations: [],
    };

    return {
      overallScore: 5,
      strengths: [{ title: 'Analysis Available', evidence: 'See executive summary', impact: '' }],
      weaknesses: [{ title: 'Structured Analysis Failed', evidence: 'Raw analysis available in executive summary', severity: 'minor', recommendation: 'Re-run critique', estimatedEffort: 'low' }],
      visualHierarchy: defaultSection,
      whitespace: defaultSection,
      colorHarmony: defaultSection,
      typographyCritique: defaultSection,
      ctaEffectiveness: defaultSection,
      mobileFirst: defaultSection,
      emotionalDesign: defaultSection,
      brandConsistency: defaultSection,
      microinteractions: defaultSection,
      innovationScore: 5,
      innovationAssessment: '',
      executiveSummary: rawText.slice(0, 3000),
    };
  }

  private formatDesignTokens(scrapeResult: FullScrapeResult): string {
    const dt = scrapeResult.designTokens;
    return `
**Colors (${dt.colors.length} unique):**
${dt.colors.slice(0, 20).map(c =>
  `- \`${c.value}\` (${c.count}x): ${c.contexts.slice(0, 3).join(', ')}`
).join('\n')}

**Spacing (${dt.spacing.length} unique):**
${dt.spacing.slice(0, 15).map(s =>
  `- \`${s.value}\` (${s.count}x)`
).join('\n')}

**Border Radii (${dt.borderRadii.length}):**
${dt.borderRadii.map(r => `- \`${r.value}\` (${r.count}x)`).join('\n')}

**Shadows (${dt.shadows.length}):**
${dt.shadows.slice(0, 8).map(s => `- \`${s.value}\` (${s.count}x)`).join('\n')}

**Z-Indices:** ${dt.zIndices.map(z => `${z.value} (${z.element})`).join(', ')}
**Opacities:** ${dt.opacities.map(o => `${o.value} (${o.context})`).join(', ')}`;
  }

  private formatTypography(scrapeResult: FullScrapeResult): string {
    const t = scrapeResult.typography;
    return `
**Font Families (${t.fontFamilies.length}):**
${t.fontFamilies.map(f => `- ${f.family} (${f.count}x): ${f.usage.slice(0, 3).join(', ')}`).join('\n')}

**Font Sizes (${t.fontSizes.length}):**
${t.fontSizes.slice(0, 15).map(f => `- \`${f.size}\` on ${f.element} (${f.count}x)`).join('\n')}

**Font Weights:** ${t.fontWeights.map(w => `${w.weight} (${w.count}x)`).join(', ')}
**Line Heights:** ${t.lineHeights.map(l => `${l.value} (${l.count}x)`).join(', ')}
**Letter Spacings:** ${t.letterSpacings.map(l => `${l.value} (${l.count}x)`).join(', ')}`;
  }

  private formatComponents(scrapeResult: FullScrapeResult): string {
    return `
**Total Components: ${scrapeResult.components.length}**
${scrapeResult.components.map(c => {
  const stateCount = Object.keys(c.stateVariants).length;
  return `- **${c.name}** (${c.type}): ${stateCount} state variants, selector: \`${c.selector}\``;
}).join('\n')}`;
  }

  private formatAccessibility(scrapeResult: FullScrapeResult): string {
    const a = scrapeResult.accessibility;
    return `
**Overall Score: ${a.overallScore}/100 (WCAG ${a.wcagLevel})**

Contrast Issues (${a.contrastIssues.length}):
${a.contrastIssues.slice(0, 10).map(i =>
  `- ${i.element}: ${i.foreground} on ${i.background}, ratio ${i.ratio.toFixed(2)} (${i.level})`
).join('\n')}

Missing Alt Text: ${a.missingAltText.length} images
Missing ARIA Labels: ${a.missingAriaLabels.length} elements
Tab Order Issues: ${a.tabOrderIssues.length}
Semantic Issues: ${a.semanticIssues.length}
Focus Indicators Missing: ${a.focusIndicatorsMissing.length}`;
  }

  private formatConversion(scrapeResult: FullScrapeResult): string {
    const cp = scrapeResult.conversionPatterns;
    return `
**CTAs (${cp.ctas.length}):**
${cp.ctas.slice(0, 10).map(c =>
  `- "${c.text}" at ${c.position}, size ${c.size}, color ${c.color}, prominence ${c.prominence}/10`
).join('\n')}

**Social Proof (${cp.socialProof.length}):**
${cp.socialProof.slice(0, 5).map(s => `- ${s.type} at ${s.position}: "${s.content.slice(0, 80)}"`).join('\n')}

**Form Fields:** ${cp.formFields.length} (${cp.formFields.filter(f => f.required).length} required)
**Trust Badges:** ${cp.trustBadges.join(', ') || 'None'}
**Urgency Patterns:** ${cp.urgencyPatterns.map(u => `${u.type}: "${u.content}"`).join(', ') || 'None'}`;
  }

  private formatAnimations(scrapeResult: FullScrapeResult): string {
    const a = scrapeResult.animations;
    return `
**CSS Transitions (${a.cssTransitions.length}):**
${a.cssTransitions.slice(0, 10).map(t =>
  `- ${t.property} (${t.duration}, ${t.easing}) on \`${t.selector}\``
).join('\n')}

**CSS Animations (${a.cssAnimations.length}):**
${a.cssAnimations.slice(0, 5).map(a =>
  `- ${a.name} (${a.duration}, ${a.easing}) on \`${a.selector}\``
).join('\n')}

**Scroll-Triggered (${a.scrollTriggered.length}):**
${a.scrollTriggered.slice(0, 5).map(s =>
  `- \`${s.selector}\`: ${s.triggerType} -> ${s.animation}`
).join('\n')}`;
  }

  private formatPerformance(scrapeResult: FullScrapeResult): string {
    const lh = scrapeResult.lighthouse;
    return `
**Lighthouse Performance Score: ${lh.performanceScore}/100**
- LCP: ${lh.lcp}ms ${lh.lcp <= 2500 ? '[GOOD]' : lh.lcp <= 4000 ? '[NEEDS WORK]' : '[POOR]'}
- CLS: ${lh.cls} ${lh.cls <= 0.1 ? '[GOOD]' : lh.cls <= 0.25 ? '[NEEDS WORK]' : '[POOR]'}
- INP: ${lh.inp}ms ${lh.inp <= 200 ? '[GOOD]' : lh.inp <= 500 ? '[NEEDS WORK]' : '[POOR]'}
- FCP: ${lh.fcp}ms
- Speed Index: ${lh.speedIndex}ms
- Total Blocking Time: ${lh.totalBlockingTime}ms

**Image Optimization:**
- Total images: ${scrapeResult.imageAssets.images.length}
- Lazy loaded: ${scrapeResult.imageAssets.lazyLoadPercentage}%
- Format distribution: ${Object.entries(scrapeResult.imageAssets.formatDistribution).map(([f, c]) => `${f}: ${c}`).join(', ')}`;
  }

  private formatCopy(scrapeResult: FullScrapeResult): string {
    const c = scrapeResult.copyAnalysis;
    return `
**CTA Labels (${c.ctaLabels.length}):**
${c.ctaLabels.slice(0, 10).map(l => `- "${l.text}" on \`${l.element}\` (${l.count}x)`).join('\n')}

**Error Messages:** ${c.errorMessages.length > 0 ? c.errorMessages.slice(0, 5).join('; ') : 'None detected'}
**Placeholders:** ${c.placeholders.slice(0, 5).map(p => `"${p.text}" in ${p.field}`).join(', ') || 'None'}
**Tooltips:** ${c.tooltips.length}
**Empty States:** ${c.emptyStateText.length > 0 ? c.emptyStateText.slice(0, 3).join('; ') : 'None'}
**Tone Keywords:** ${c.toneKeywords.join(', ')}`;
  }
}
