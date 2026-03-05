import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import {
  COPY_REWRITE_SYSTEM_PROMPT,
  COPY_REWRITE_USER_TEMPLATE,
} from '@shared/prompt-templates/copy-rewrite-prompt';
import type {
  FullScrapeResult,
  ProjectContext,
  RewrittenCopy,
  CopyVariant,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('CopyRewriter');

export class CopyRewriter {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async rewriteCopy(
    scrapeResult: FullScrapeResult,
    brandVoice: string,
    industry: string
  ): Promise<RewrittenCopy> {
    log.info('Starting copy rewrite', {
      url: scrapeResult.targetUrl,
      brandVoice,
      industry,
    });

    const context = scrapeResult.projectContext;

    const projectContextSummary = `
- Goal: ${context.goal}
- Industry: ${industry || context.industry}
- Target Audience: ${context.targetAudience}
- Design Style: ${context.designStyle}`;

    const copySummary = this.formatCopyForRewrite(scrapeResult);
    const conversionSummary = this.formatConversionForRewrite(scrapeResult);
    const toneSummary = `Current tone keywords: ${scrapeResult.copyAnalysis.toneKeywords.join(', ') || 'Not analyzed'}`;

    const userMessage = COPY_REWRITE_USER_TEMPLATE(
      scrapeResult.targetUrl,
      brandVoice,
      industry || context.industry,
      copySummary,
      conversionSummary,
      projectContextSummary,
      toneSummary
    );

    try {
      const responseText = await this.claudeClient.singleCall(
        COPY_REWRITE_SYSTEM_PROMPT,
        userMessage
      );
      const rewrittenCopy = this.parseRewriteResponse(responseText);

      log.info('Copy rewrite complete', {
        ctaRewrites: rewrittenCopy.ctaRewrites.length,
        headlineRewrites: rewrittenCopy.headlineRewrites.length,
        totalVariants: this.countTotalVariants(rewrittenCopy),
      });

      // Broadcast the result
      chrome.runtime.sendMessage({
        type: MSG.COPY_RESULT,
        payload: rewrittenCopy,
      }).catch(() => {});

      return rewrittenCopy;
    } catch (err) {
      log.error('Copy rewrite failed', err);
      throw new Error(
        `Copy rewrite failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private parseRewriteResponse(responseText: string): RewrittenCopy {
    try {
      const parsed = JSON.parse(responseText);

      return {
        ctaRewrites: this.validateCopyVariants(parsed.ctaRewrites),
        headlineRewrites: this.validateCopyVariants(parsed.headlineRewrites),
        errorMessageRewrites: this.validateCopyVariants(parsed.errorMessageRewrites),
        emptyStateRewrites: this.validateCopyVariants(parsed.emptyStateRewrites),
        microcopyRewrites: this.validateCopyVariants(parsed.microcopyRewrites),
        onboardingCopy: this.validateCopyVariants(parsed.onboardingCopy),
        socialProofCopy: this.validateCopyVariants(parsed.socialProofCopy),
        brandVoice: parsed.brandVoice || '',
        toneGuidelines: Array.isArray(parsed.toneGuidelines)
          ? parsed.toneGuidelines.map(String)
          : [],
      };
    } catch {
      log.warn('Failed to parse copy rewrite response as JSON');
      return this.createFallbackRewrite(responseText);
    }
  }

  private validateCopyVariants(raw: unknown): CopyVariant[] {
    if (!Array.isArray(raw)) return [];

    return raw.map((item: Record<string, unknown>) => ({
      original: (item.original as string) || '',
      context: (item.context as string) || '',
      variants: this.validateVariants(item.variants),
      reasoning: (item.reasoning as string) || '',
    }));
  }

  private validateVariants(raw: unknown): CopyVariant['variants'] {
    const defaults = { formal: '', casual: '', urgent: '' };
    if (!raw || typeof raw !== 'object') return defaults;

    const variants = raw as Record<string, unknown>;
    return {
      formal: (variants.formal as string) || defaults.formal,
      casual: (variants.casual as string) || defaults.casual,
      urgent: (variants.urgent as string) || defaults.urgent,
    };
  }

  private createFallbackRewrite(rawText: string): RewrittenCopy {
    return {
      ctaRewrites: [],
      headlineRewrites: [],
      errorMessageRewrites: [],
      emptyStateRewrites: [],
      microcopyRewrites: [],
      onboardingCopy: [],
      socialProofCopy: [],
      brandVoice: 'Unable to parse structured copy rewrites. Raw analysis available.',
      toneGuidelines: [rawText.slice(0, 500)],
    };
  }

  private countTotalVariants(rewrite: RewrittenCopy): number {
    return (
      rewrite.ctaRewrites.length +
      rewrite.headlineRewrites.length +
      rewrite.errorMessageRewrites.length +
      rewrite.emptyStateRewrites.length +
      rewrite.microcopyRewrites.length +
      rewrite.onboardingCopy.length +
      rewrite.socialProofCopy.length
    );
  }

  private formatCopyForRewrite(scrapeResult: FullScrapeResult): string {
    const c = scrapeResult.copyAnalysis;
    const sections: string[] = [];

    if (c.ctaLabels.length > 0) {
      sections.push(`**CTA Labels (${c.ctaLabels.length}):**
${c.ctaLabels.map(l =>
  `- "${l.text}" on \`${l.element}\` (appears ${l.count}x)`
).join('\n')}`);
    }

    if (c.errorMessages.length > 0) {
      sections.push(`**Error Messages (${c.errorMessages.length}):**
${c.errorMessages.map(m => `- "${m}"`).join('\n')}`);
    }

    if (c.placeholders.length > 0) {
      sections.push(`**Placeholders (${c.placeholders.length}):**
${c.placeholders.map(p => `- "${p.text}" in ${p.field}`).join('\n')}`);
    }

    if (c.tooltips.length > 0) {
      sections.push(`**Tooltips (${c.tooltips.length}):**
${c.tooltips.slice(0, 10).map(t => `- "${t}"`).join('\n')}`);
    }

    if (c.emptyStateText.length > 0) {
      sections.push(`**Empty State Text (${c.emptyStateText.length}):**
${c.emptyStateText.map(t => `- "${t}"`).join('\n')}`);
    }

    if (c.microcopy.length > 0) {
      sections.push(`**Microcopy (${c.microcopy.length}):**
${c.microcopy.slice(0, 15).map(m => `- "${m.text}" (context: ${m.context})`).join('\n')}`);
    }

    return sections.join('\n\n') || 'No copy data extracted.';
  }

  private formatConversionForRewrite(scrapeResult: FullScrapeResult): string {
    const cp = scrapeResult.conversionPatterns;

    return `
**CTAs (${cp.ctas.length}):**
${cp.ctas.slice(0, 10).map(c =>
  `- "${c.text}" — position: ${c.position}, color: ${c.color}, prominence: ${c.prominence}/10`
).join('\n')}

**Social Proof (${cp.socialProof.length}):**
${cp.socialProof.slice(0, 5).map(s =>
  `- ${s.type} at ${s.position}: "${s.content.slice(0, 100)}"`
).join('\n')}

**Urgency Patterns:**
${cp.urgencyPatterns.length > 0
  ? cp.urgencyPatterns.map(u => `- ${u.type}: "${u.content}"`).join('\n')
  : 'None detected (opportunity to add urgency copy)'}

**Trust Badges:** ${cp.trustBadges.length > 0 ? cp.trustBadges.join(', ') : 'None detected (opportunity to add trust copy)'}`;
  }
}
