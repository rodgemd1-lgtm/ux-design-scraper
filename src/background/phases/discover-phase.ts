import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  DiscoverArtifacts,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  DISCOVER_PHASE_SYSTEM_PROMPT,
  buildDiscoverUserPrompt,
} from '@shared/prompt-templates/discover-phase-prompt';
import { INSPIRATION_SYSTEM_PROMPT, buildInspirationPrompt } from '@shared/prompt-templates/inspiration-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { BraveDeepSearchClient } from '../brave-deep-search';
import type { MultiSiteEngine } from '../multi-site-engine';
import type { KnowledgeEnrichmentEngine } from '../knowledge-enrichment';
import type { DeepSearchResult, MultiSiteResult } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('DiscoverPhase');

export class DiscoverPhaseExecutor implements PhaseExecutor {
  constructor(
    private braveDeepSearch: BraveDeepSearchClient,
    private multiSiteEngine: MultiSiteEngine,
    private claudeClient: ClaudeAPIClient,
    private knowledgeEnrichment: KnowledgeEnrichmentEngine,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: DiscoverArtifacts = {};
    const steps = PHASE_STEPS.discover;
    const ctx = session.projectContext;

    for (const stepDef of steps) {
      const step: PhaseStep = {
        ...stepDef,
        status: 'active',
        progress: 0,
        startedAt: Date.now(),
      };
      onStepProgress(step);

      try {
        const result = await this.executeStep(stepDef.engineCall, session, priorArtifacts, artifacts);
        artifacts[stepDef.outputKey] = result;
        step.status = 'completed';
        step.progress = 100;
        step.completedAt = Date.now();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log.error(`Step ${stepDef.id} failed`, { error: errorMessage });
        step.status = 'failed';
        step.error = errorMessage;
      }
      onStepProgress(step);
    }

    return artifacts;
  }

  private async executeStep(
    engineCall: string,
    session: WorkflowSession,
    prior: PhaseArtifacts,
    current: DiscoverArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'braveDeepSearch': {
        log.info('Running deep search', { industry: ctx.industry });
        const deepResult: DeepSearchResult = await this.braveDeepSearch.deepSearch(
          ctx.goal,
          ctx.industry,
          ctx.designStyle,
          ctx.targetAudience,
        );
        return {
          queries: deepResult.rounds.map(r => r.query),
          results: [
            ...deepResult.categorized.inspiration,
            ...deepResult.categorized.competitors,
            ...deepResult.categorized.patterns,
            ...deepResult.categorized.blogs,
            ...deepResult.categorized.trends,
          ].slice(0, 50),
        };
      }

      case 'multiSiteScrape': {
        const urls = [
          ...session.targetUrls,
          ...(ctx.competitors || []),
        ].filter(Boolean);

        if (urls.length === 0) {
          throw new Error('No target URLs configured for multi-site scrape');
        }

        log.info('Running multi-site scrape', { urlCount: urls.length });
        const multiResult: MultiSiteResult = await this.multiSiteEngine.scrapeMultipleSites({
          urls,
          projectContext: ctx,
          projectName: session.projectName,
        });
        return multiResult;
      }

      case 'heatmapFetch': {
        log.info('Fetching heatmap data');
        const multiSiteResult = current.multiSiteResult as MultiSiteResult | undefined;
        if (multiSiteResult && multiSiteResult.sites.length > 0) {
          const primarySite = multiSiteResult.sites[0];
          const heatmaps = primarySite.scrapeResult.heatmaps;
          if (heatmaps && heatmaps.length > 0) {
            return heatmaps;
          }
        }
        return null;
      }

      case 'trendSearch': {
        log.info('Running trend search');
        const trendResult = await this.braveDeepSearch.deepSearch(
          `${ctx.industry} UX design trends 2025 2026`,
          ctx.industry,
          ctx.designStyle,
          ctx.targetAudience,
        );
        return [
          ...trendResult.categorized.trends,
          ...trendResult.categorized.blogs,
        ].slice(0, 15);
      }

      case 'knowledgeEnrichment': {
        log.info('Running knowledge enrichment');
        const multiSiteResult = current.multiSiteResult as MultiSiteResult | undefined;
        const componentTypes: string[] = [];
        if (multiSiteResult) {
          for (const site of multiSiteResult.sites) {
            const types = [...new Set(site.scrapeResult.components.map(c => c.type))];
            for (const t of types) {
              if (!componentTypes.includes(t)) {
                componentTypes.push(t);
              }
            }
          }
        }

        if (componentTypes.length === 0) {
          return { bestPractices: [], patterns: [] };
        }

        const enrichments = await this.knowledgeEnrichment.enrichWithBestPractices(
          ctx.industry,
          componentTypes.slice(0, 8),
        );

        return {
          bestPractices: enrichments.flatMap(e => e.bestPractices.flatMap(bp => bp.guidelines)).slice(0, 20),
          patterns: enrichments.flatMap(e => e.patternVariations.map(pv => `${pv.name}: ${pv.description}`)).slice(0, 15),
        };
      }

      case 'inspirationAnalysis': {
        log.info('Running inspiration analysis');
        const multiSiteResult = (current.multiSiteResult || prior.multiSiteResult) as MultiSiteResult | undefined;
        const prompt = buildInspirationPrompt({
          projectName: session.projectName,
          industry: ctx.industry,
          designStyle: ctx.designStyle,
          targetAudience: ctx.targetAudience,
          scrapedSites: (multiSiteResult as MultiSiteResult)?.sites || [],
          competitorAnalysis: current.researchSynthesis || prior.researchSynthesis,
        });
        const response = await this.claudeClient.singleCall(INSPIRATION_SYSTEM_PROMPT, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return jsonMatch ? { ...JSON.parse(jsonMatch[0]), generatedAt: Date.now() } : { generatedAt: Date.now() };
      }

      case 'researchSynthesis': {
        log.info('Synthesizing research with Claude');
        const deepSearch = current.deepSearchResult as DiscoverArtifacts['deepSearchResult'];
        const multiSiteResult = current.multiSiteResult as MultiSiteResult | undefined;
        const trendData = current.trendData as Array<{ title: string; url: string; description: string }> | undefined;
        const enriched = current.enrichedKnowledge as DiscoverArtifacts['enrichedKnowledge'];
        const heatmapData = current.heatmapData;

        let multiSiteSummary: Parameters<typeof buildDiscoverUserPrompt>[2] = null;
        if (multiSiteResult) {
          multiSiteSummary = {
            siteCount: multiSiteResult.sites.length,
            sites: multiSiteResult.sites.map(s => ({
              url: s.url,
              designQuality: s.quality.designQuality,
              accessibilityScore: s.quality.accessibilityScore,
              performanceScore: s.quality.performanceScore,
              conversionScore: s.quality.conversionScore,
              strengths: s.quality.strengths,
              weaknesses: s.quality.weaknesses,
              componentTypes: [...new Set(s.scrapeResult.components.map(c => c.type))],
              colorCount: s.scrapeResult.designTokens.colors.length,
              fontFamilies: s.scrapeResult.typography.fontFamilies.map(f => f.family),
            })),
            commonPatterns: multiSiteResult.synthesis.commonPatterns,
            uniqueInnovations: multiSiteResult.synthesis.uniqueInnovations,
          };
        }

        let heatmapSummary = '';
        if (heatmapData && Array.isArray(heatmapData) && heatmapData.length > 0) {
          heatmapSummary = `${heatmapData.length} heatmap datasets available covering ${[...new Set((heatmapData as Array<{ pageUrl: string }>).map(h => h.pageUrl))].join(', ')}`;
        }

        const userPrompt = buildDiscoverUserPrompt(
          ctx,
          deepSearch || null,
          multiSiteSummary,
          trendData || null,
          heatmapSummary,
          enriched || null,
        );

        const response = await this.claudeClient.singleCall(DISCOVER_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          log.warn('Failed to parse research synthesis as JSON, extracting');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return {
            keyFindings: [response.slice(0, 500)],
            competitorLandscape: [],
            designTrendInsights: [],
            userBehaviorPatterns: [],
            recommendations: [],
          };
        }
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
