import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  DivergeArtifacts,
  DiscoverArtifacts,
  DefineArtifacts,
  DesignDirection,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  DIVERGE_PHASE_SYSTEM_PROMPT,
  DIVERGE_MOODBOARD_SYSTEM_PROMPT,
  buildDivergeUserPrompt,
  buildMoodboardUserPrompt,
} from '@shared/prompt-templates/diverge-phase-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { DesignCritiqueEngine } from '../design-critique-engine';
import type { BraveDeepSearchClient } from '../brave-deep-search';
import type { MultiSiteResult, FullScrapeResult, GeneratedPersona } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('DivergePhase');

export class DivergePhaseExecutor implements PhaseExecutor {
  constructor(
    private designCritiqueEngine: DesignCritiqueEngine,
    private claudeClient: ClaudeAPIClient,
    private braveDeepSearch: BraveDeepSearchClient,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: DivergeArtifacts = {};
    const steps = PHASE_STEPS.diverge;

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

  private getBestScrapeResult(priorArtifacts: PhaseArtifacts): FullScrapeResult | null {
    const multiSiteResult = priorArtifacts.multiSiteResult as MultiSiteResult | undefined;
    if (!multiSiteResult || multiSiteResult.sites.length === 0) {
      return null;
    }
    const sorted = [...multiSiteResult.sites].sort(
      (a, b) => b.quality.overallScore - a.quality.overallScore,
    );
    return sorted[0].scrapeResult;
  }

  private async executeStep(
    engineCall: string,
    session: WorkflowSession,
    prior: PhaseArtifacts,
    current: DivergeArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'designDirections': {
        log.info('Generating design directions');

        const designBrief = prior.designBrief as DefineArtifacts['designBrief'];
        if (!designBrief) {
          throw new Error('No design brief available. Gate phase must have approved prior artifacts.');
        }

        const personas = prior.personas as GeneratedPersona[] | undefined;
        if (!personas || personas.length === 0) {
          throw new Error('No personas available for design direction generation.');
        }

        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        if (!researchSynthesis) {
          throw new Error('No research synthesis available.');
        }

        const bestScrape = this.getBestScrapeResult(prior);
        let scrapedDesignData: Parameters<typeof buildDivergeUserPrompt>[3] = null;

        if (bestScrape) {
          scrapedDesignData = {
            colorCount: bestScrape.designTokens.colors.length,
            topColors: bestScrape.designTokens.colors.slice(0, 5).map(c => c.value),
            fontFamilies: bestScrape.typography.fontFamilies.map(f => f.family),
            componentTypes: [...new Set(bestScrape.components.map(c => c.type))],
            layoutType: bestScrape.gridLayout.layoutType,
            containerMaxWidth: bestScrape.gridLayout.containerMaxWidth,
            accessibilityScore: bestScrape.accessibility.overallScore,
            performanceScore: bestScrape.lighthouse.performanceScore,
          };
        }

        const userPrompt = buildDivergeUserPrompt(
          designBrief,
          personas.map(p => ({
            name: p.name,
            occupation: p.occupation,
            goals: p.goals,
            frustrations: p.frustrations,
            techSavviness: p.techSavviness,
          })),
          researchSynthesis,
          scrapedDesignData,
        );

        const response = await this.claudeClient.singleCall(DIVERGE_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return parsed.directions || parsed;
        } catch {
          log.warn('Failed to parse design directions as JSON');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.directions || [parsed];
          }
          throw new Error('Failed to parse design directions from Claude response');
        }
      }

      case 'moodboardGeneration': {
        log.info('Generating moodboards');
        const directions = current.designDirections as DesignDirection[] | undefined;
        if (!directions || directions.length === 0) {
          throw new Error('No design directions available for moodboard generation.');
        }

        const userPrompt = buildMoodboardUserPrompt(
          directions.map(d => ({
            name: d.name,
            description: d.description,
            moodKeywords: d.moodKeywords,
            colorDirection: d.colorDirection,
            typographyDirection: d.typographyDirection,
          })),
          ctx.industry,
        );

        const response = await this.claudeClient.singleCall(DIVERGE_MOODBOARD_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return Array.isArray(parsed) ? parsed : (parsed.moodboards || [parsed]);
        } catch {
          log.warn('Failed to parse moodboards as JSON');
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return [];
        }
      }

      case 'designCritique': {
        log.info('Running design critique on best scraped site');
        const bestScrape = this.getBestScrapeResult(prior);
        if (!bestScrape) {
          throw new Error('No scrape data available for design critique.');
        }

        return this.designCritiqueEngine.critiqueDesign(bestScrape, ctx);
      }

      case 'competitivePositioning': {
        log.info('Analyzing competitive positioning');
        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const directions = current.designDirections as DesignDirection[] | undefined;

        const systemPrompt = `You are a Brand Strategist analyzing competitive positioning. Given the competitive landscape and proposed design directions, identify market gaps, unique opportunities, risk areas, and craft a positioning statement.

Respond with valid JSON:
{
  "marketGaps": ["string"],
  "uniqueOpportunities": ["string"],
  "riskAreas": ["string"],
  "positioningStatement": "string"
}`;

        const userPrompt = `Analyze competitive positioning for ${session.projectName}.

Competitor Landscape:
${researchSynthesis
  ? researchSynthesis.competitorLandscape.map(c => `- ${c.url}: Strengths [${c.strengths.slice(0, 3).join('; ')}], Weaknesses [${c.weaknesses.slice(0, 3).join('; ')}]`).join('\n')
  : 'No competitor data available.'}

Proposed Design Directions:
${directions
  ? directions.map(d => `- ${d.name}: ${d.differentiator}`).join('\n')
  : 'No design directions yet.'}

Industry: ${ctx.industry}
Target Audience: ${ctx.targetAudience}
Goal: ${ctx.goal}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return {
            marketGaps: [],
            uniqueOpportunities: [],
            riskAreas: [],
            positioningStatement: response.slice(0, 500),
          };
        }
      }

      case 'directionRanking': {
        log.info('Ranking design directions');
        const directions = current.designDirections as DesignDirection[] | undefined;
        const designBrief = prior.designBrief as DefineArtifacts['designBrief'];

        if (!directions || directions.length === 0) {
          throw new Error('No design directions to rank.');
        }

        const systemPrompt = `You are a Design Director ranking design directions against the approved design brief. Score each direction 0-100 based on how well it satisfies the brief's goals, constraints, and success metrics. Rank them from best to worst.

Respond with valid JSON array:
[
  {
    "name": "string",
    "rank": number (1 = best),
    "score": number (0-100),
    "rationale": "string (why this ranking)"
  }
]`;

        const userPrompt = `Rank these design directions against the design brief.

Design Brief:
- Goal: ${designBrief?.goal || 'Not defined'}
- Success Metrics: ${designBrief?.successMetrics?.join('; ') || 'Not defined'}
- Constraints: ${designBrief?.constraints?.join('; ') || 'Not defined'}
- Design Direction: ${designBrief?.designDirection || 'Not defined'}

Directions to Rank:
${directions.map((d, i) => `
${i + 1}. **${d.name}**: ${d.description}
   Colors: ${d.colorDirection.primary}, ${d.colorDirection.secondary}, ${d.colorDirection.accent}
   Typography: ${d.typographyDirection.headingFont} / ${d.typographyDirection.bodyFont}
   Layout: ${d.layoutApproach}
   Differentiator: ${d.differentiator}
   Risk: ${d.riskAssessment}`).join('\n')}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return Array.isArray(parsed) ? parsed : (parsed.rankings || [parsed]);
        } catch {
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return directions.map((d, i) => ({
            name: d.name,
            rank: i + 1,
            score: 50,
            rationale: 'Ranking could not be parsed from Claude response',
          }));
        }
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
