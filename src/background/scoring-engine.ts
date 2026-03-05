import { createLogger } from '@shared/logger';
import { STORAGE_KEYS, DEFAULT_SCORING_WEIGHTS } from '@shared/constants';
import type {
  AppSettings,
  ScoringWeights,
  ComponentScore,
  FullScrapeResult,
  ProjectContext,
  ComponentData,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('ScoringEngine');

interface ScoringInput {
  scrapeResult: FullScrapeResult;
  projectContext: ProjectContext;
  weights?: ScoringWeights;
}

interface ClaudeScoreResponse {
  scores: {
    componentName: string;
    industryFit: number;
    audienceAlignment: number;
    designTrend: number;
  }[];
}

export class ScoringEngine {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async scoreAll(data: ScoringInput): Promise<ComponentScore[]> {
    const { scrapeResult, projectContext, weights } = data;

    log.info('Starting component scoring', {
      componentCount: scrapeResult.components.length,
      projectName: scrapeResult.projectName,
    });

    const effectiveWeights = weights || await this.loadWeights();

    // Calculate data-driven scores from scrape results
    const accessibilityScores = this.calculateAccessibilityScores(scrapeResult);
    const performanceScore = this.calculatePerformanceScore(scrapeResult);
    const conversionScores = this.calculateConversionScores(scrapeResult);
    const trendScores = this.calculateDesignTrendScores(scrapeResult);

    // Use Claude to evaluate industry fit and audience alignment in a batch call
    let claudeScores: Map<string, { industryFit: number; audienceAlignment: number; designTrend: number }> = new Map();
    try {
      claudeScores = await this.batchClaudeScoring(scrapeResult.components, projectContext);
    } catch (err) {
      log.warn('Claude scoring failed, using defaults', err);
    }

    const componentScores: ComponentScore[] = scrapeResult.components.map((component, index) => {
      const claudeScore = claudeScores.get(component.name) || {
        industryFit: 50,
        audienceAlignment: 50,
        designTrend: trendScores[index] || 50,
      };

      const scores = {
        componentName: component.name,
        industryFit: claudeScore.industryFit,
        audienceAlignment: claudeScore.audienceAlignment,
        conversionOptimization: conversionScores[index] || 50,
        accessibilityCompliance: accessibilityScores[index] || 50,
        performance: performanceScore,
        designTrend: claudeScore.designTrend,
        composite: 0,
      };

      scores.composite = this.calculateComposite(scores, effectiveWeights);

      return scores;
    });

    log.info('Scoring complete', { componentCount: componentScores.length });
    return componentScores;
  }

  private async loadWeights(): Promise<ScoringWeights> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.scoringWeights) {
        return settings.scoringWeights;
      }
    } catch (err) {
      log.warn('Failed to load scoring weights, using defaults', err);
    }
    return { ...DEFAULT_SCORING_WEIGHTS };
  }

  private async batchClaudeScoring(
    components: ComponentData[],
    context: ProjectContext
  ): Promise<Map<string, { industryFit: number; audienceAlignment: number; designTrend: number }>> {
    const map = new Map<string, { industryFit: number; audienceAlignment: number; designTrend: number }>();

    if (components.length === 0) return map;

    // Prepare a batch description of all components for a single Claude call
    const componentSummaries = components.map((c, i) => ({
      index: i,
      name: c.name,
      type: c.type,
      hasStates: Object.keys(c.stateVariants).length > 0,
      cssLength: c.css.length,
      htmlLength: c.html.length,
    }));

    const systemPrompt = `You are a UX design scoring expert. Score each component for industry fit, audience alignment, and design trend relevance.

Return a JSON object with this exact schema:
{
  "scores": [
    {
      "componentName": "<name>",
      "industryFit": <0-100>,
      "audienceAlignment": <0-100>,
      "designTrend": <0-100>
    }
  ]
}

Industry fit: How well does this component pattern match what's expected in the ${context.industry} industry?
Audience alignment: How well does this component serve the target audience (${context.targetAudience})?
Design trend: How current and modern is this component's design pattern?

Score on a 0-100 scale where:
- 0-25: Poor fit / outdated
- 26-50: Below average
- 51-75: Good / meets expectations
- 76-100: Excellent / industry-leading`;

    const userMessage = `Score these ${components.length} components for a ${context.designStyle} ${context.industry} project targeting ${context.targetAudience}:

Project Goal: ${context.goal}

Components:
${componentSummaries.map(c => `- ${c.name} (type: ${c.type}, states: ${c.hasStates ? 'yes' : 'no'}, CSS size: ${c.cssLength} chars)`).join('\n')}`;

    try {
      const result = await this.claudeClient.singleCall(systemPrompt, userMessage);
      const parsed: ClaudeScoreResponse = JSON.parse(result);

      for (const score of parsed.scores) {
        map.set(score.componentName, {
          industryFit: this.clampScore(score.industryFit),
          audienceAlignment: this.clampScore(score.audienceAlignment),
          designTrend: this.clampScore(score.designTrend),
        });
      }
    } catch (err) {
      log.error('Failed to parse Claude scoring response', err);
    }

    return map;
  }

  private calculateAccessibilityScores(scrapeResult: FullScrapeResult): number[] {
    const a11y = scrapeResult.accessibility;
    const baseScore = a11y.overallScore;

    // Per-component: check if the component has contrast issues or missing aria
    return scrapeResult.components.map(component => {
      let score = baseScore;

      // Penalize if the component's selector appears in contrast issues
      const hasContrastIssue = a11y.contrastIssues.some(issue =>
        issue.element.includes(component.selector) || component.selector.includes(issue.element)
      );
      if (hasContrastIssue) score -= 15;

      // Penalize if the component is missing ARIA labels
      const hasMissingAria = a11y.missingAriaLabels.some(label =>
        label.includes(component.selector) || component.selector.includes(label)
      );
      if (hasMissingAria) score -= 10;

      // Bonus for having interactive states (suggests focus states exist)
      if (Object.keys(component.stateVariants).some(s => s.includes('focus') || s.includes('active'))) {
        score += 5;
      }

      return this.clampScore(score);
    });
  }

  private calculatePerformanceScore(scrapeResult: FullScrapeResult): number {
    const lh = scrapeResult.lighthouse;
    // Combine lighthouse performance with accessibility score
    return this.clampScore(Math.round((lh.performanceScore + lh.accessibilityScore) / 2));
  }

  private calculateConversionScores(scrapeResult: FullScrapeResult): number[] {
    const conversion = scrapeResult.conversionPatterns;

    return scrapeResult.components.map(component => {
      let score = 50; // baseline

      // CTA components get higher scores
      if (component.type === 'button' || component.type === 'form') {
        const hasCTA = conversion.ctas.some(cta =>
          cta.text.toLowerCase().includes(component.name.toLowerCase()) ||
          component.html.toLowerCase().includes(cta.text.toLowerCase())
        );
        if (hasCTA) score += 20;
      }

      // Components with social proof elements get bonus
      if (conversion.socialProof.some(sp =>
        component.html.includes(sp.content.substring(0, 30))
      )) {
        score += 10;
      }

      // Trust badge components get bonus
      if (conversion.trustBadges.some(badge =>
        component.html.toLowerCase().includes(badge.toLowerCase())
      )) {
        score += 10;
      }

      // High prominence CTAs get extra points
      if (conversion.ctas.some(cta => cta.prominence > 0.7 &&
        component.html.toLowerCase().includes(cta.text.toLowerCase())
      )) {
        score += 10;
      }

      return this.clampScore(score);
    });
  }

  private calculateDesignTrendScores(scrapeResult: FullScrapeResult): number[] {
    const waybackCount = scrapeResult.waybackSnapshots.length;
    const hasAnimations = scrapeResult.animations.cssAnimations.length > 0 ||
                          scrapeResult.animations.scrollTriggered.length > 0;
    const hasDarkMode = scrapeResult.darkMode.hasDarkMode;
    const hasModernFramework = Object.values(scrapeResult.thirdPartyStack.frameworks)
      .some(f => ['React', 'Next.js', 'Vue.js', 'Svelte', 'Nuxt'].includes(f.name));

    return scrapeResult.components.map(() => {
      let score = 50;

      // Sites with many snapshots are established, giving trend context
      if (waybackCount > 5) score += 5;

      // Modern design indicators
      if (hasAnimations) score += 10;
      if (hasDarkMode) score += 10;
      if (hasModernFramework) score += 10;

      // Modern CSS features in the component
      // (Since this is a baseline, all components get the same trend boost)
      return this.clampScore(score);
    });
  }

  private calculateComposite(
    scores: Omit<ComponentScore, 'composite'>,
    weights: ScoringWeights
  ): number {
    const totalWeight =
      weights.industryFit +
      weights.audienceAlignment +
      weights.conversionOptimization +
      weights.accessibilityCompliance +
      weights.performance +
      weights.designTrend;

    if (totalWeight === 0) return 0;

    const weighted =
      (scores.industryFit * weights.industryFit +
       scores.audienceAlignment * weights.audienceAlignment +
       scores.conversionOptimization * weights.conversionOptimization +
       scores.accessibilityCompliance * weights.accessibilityCompliance +
       scores.performance * weights.performance +
       scores.designTrend * weights.designTrend) / totalWeight;

    return Math.round(weighted * 100) / 100;
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}
