import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  DefineArtifacts,
  DiscoverArtifacts,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  DEFINE_PHASE_SYSTEM_PROMPT,
  DEFINE_JOURNEY_MAP_SYSTEM_PROMPT,
  buildDefineUserPrompt,
  buildJourneyMapUserPrompt,
} from '@shared/prompt-templates/define-phase-prompt';
import {
  PERSONA_SYSTEM_PROMPT,
  PERSONA_USER_TEMPLATE,
} from '@shared/prompt-templates/persona-prompt';
import { SPEC_REQUIREMENTS_SYSTEM_PROMPT, buildSpecRequirementsPrompt } from '@shared/prompt-templates/spec-artifacts-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { PersonaGenerator } from '../persona-generator';
import type { MultiSiteResult, FullScrapeResult, GeneratedPersona } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('DefinePhase');

export class DefinePhaseExecutor implements PhaseExecutor {
  constructor(
    private personaGenerator: PersonaGenerator,
    private claudeClient: ClaudeAPIClient,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: DefineArtifacts = {};
    const steps = PHASE_STEPS.define;

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
    current: DefineArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'personaGeneration': {
        log.info('Generating personas');
        const bestScrape = this.getBestScrapeResult(prior);
        if (!bestScrape) {
          throw new Error('No scrape data available for persona generation. Ensure Discover phase completed multi-site scrape.');
        }

        const multiSiteResult = prior.multiSiteResult as MultiSiteResult | undefined;
        const heatmaps = multiSiteResult
          ? multiSiteResult.sites.flatMap(s => s.scrapeResult.heatmaps)
          : [];

        const personas = await this.personaGenerator.generatePersonas(
          bestScrape,
          heatmaps.length > 0 ? heatmaps : undefined,
          ctx,
        );
        return personas;
      }

      case 'journeyMapping': {
        log.info('Generating journey maps');
        const personas = current.personas as GeneratedPersona[] | undefined;
        if (!personas || personas.length === 0) {
          throw new Error('No personas available for journey mapping. Persona generation must succeed first.');
        }

        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const bestScrape = this.getBestScrapeResult(prior);

        let scrapeData: Parameters<typeof buildJourneyMapUserPrompt>[2] = null;
        if (bestScrape) {
          scrapeData = {
            url: bestScrape.targetUrl,
            navigationDepth: bestScrape.navigation.menuDepth,
            stepsToConversion: bestScrape.flowAnalysis.stepsToConversion,
            frictionPoints: bestScrape.flowAnalysis.frictionPoints,
            ctaLabels: bestScrape.copyAnalysis.ctaLabels.map(c => c.text),
          };
        }

        const userPrompt = buildJourneyMapUserPrompt(
          personas.map(p => ({
            name: p.name,
            occupation: p.occupation,
            goals: p.goals,
            frustrations: p.frustrations,
            behavioralPatterns: p.behavioralPatterns,
          })),
          researchSynthesis || { keyFindings: [], userBehaviorPatterns: [] },
          scrapeData,
        );

        const response = await this.claudeClient.singleCall(DEFINE_JOURNEY_MAP_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return Array.isArray(parsed) ? parsed : (parsed.journeyMaps || [parsed]);
        } catch {
          log.warn('Failed to parse journey maps as JSON');
          const jsonMatch = response.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return [];
        }
      }

      case 'designPrinciples':
      case 'designBrief':
      case 'accessibilityRequirements': {
        log.info(`Generating ${engineCall}`);

        if (engineCall !== 'designPrinciples' && current.designPrinciples) {
          if (engineCall === 'designBrief' && current.designBrief) {
            return current.designBrief;
          }
          if (engineCall === 'accessibilityRequirements' && current.accessibilityRequirements) {
            return current.accessibilityRequirements;
          }
        }

        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        if (!researchSynthesis) {
          throw new Error('No research synthesis available. Discover phase must complete research synthesis step.');
        }

        const personas = current.personas as GeneratedPersona[] | undefined;
        const bestScrape = this.getBestScrapeResult(prior);

        let scrapeDataSummary: Parameters<typeof buildDefineUserPrompt>[2] = null;
        if (bestScrape) {
          scrapeDataSummary = {
            url: bestScrape.targetUrl,
            accessibilityScore: bestScrape.accessibility.overallScore,
            wcagLevel: bestScrape.accessibility.wcagLevel,
            contrastIssues: bestScrape.accessibility.contrastIssues.length,
            missingAltText: bestScrape.accessibility.missingAltText.length,
            componentCount: bestScrape.components.length,
            colorCount: bestScrape.designTokens.colors.length,
            fontFamilies: bestScrape.typography.fontFamilies.map(f => f.family),
            conversionPatternCount: bestScrape.conversionPatterns.ctas.length,
            performanceScore: bestScrape.lighthouse.performanceScore,
          };
        }

        const userPrompt = buildDefineUserPrompt(
          researchSynthesis,
          personas ? personas.map(p => ({
            name: p.name,
            occupation: p.occupation,
            goals: p.goals,
            frustrations: p.frustrations,
          })) : null,
          scrapeDataSummary,
        );

        const response = await this.claudeClient.singleCall(DEFINE_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);

          if (engineCall === 'designPrinciples') {
            current.designBrief = parsed.designBrief;
            current.accessibilityRequirements = parsed.accessibilityRequirements;
            return parsed.designPrinciples;
          }
          if (engineCall === 'designBrief') {
            return parsed.designBrief || current.designBrief;
          }
          return parsed.accessibilityRequirements || current.accessibilityRequirements;
        } catch {
          log.warn('Failed to parse define response as JSON');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (engineCall === 'designPrinciples') {
              current.designBrief = parsed.designBrief;
              current.accessibilityRequirements = parsed.accessibilityRequirements;
              return parsed.designPrinciples;
            }
            if (engineCall === 'designBrief') return parsed.designBrief;
            return parsed.accessibilityRequirements;
          }
          throw new Error(`Failed to parse ${engineCall} from Claude response`);
        }
      }

      case 'specRequirements': {
        log.info('Generating requirements specification');
        const prompt = buildSpecRequirementsPrompt({
          projectName: session.projectName,
          projectGoal: ctx.goal,
          industry: ctx.industry,
          targetAudience: ctx.targetAudience,
          researchSynthesis: prior.researchSynthesis,
          personas: current.personas as GeneratedPersona[] || [],
        });
        const response = await this.claudeClient.singleCall(SPEC_REQUIREMENTS_SYSTEM_PROMPT, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return jsonMatch ? { ...JSON.parse(jsonMatch[0]), generatedAt: Date.now() } : { generatedAt: Date.now() };
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
