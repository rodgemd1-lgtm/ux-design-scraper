import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  MeasureArtifacts,
  DiscoverArtifacts,
  DefineArtifacts,
  DevelopArtifacts,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  MEASURE_PHASE_SYSTEM_PROMPT,
  buildMeasureUserPrompt,
} from '@shared/prompt-templates/measure-phase-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { ABTestEngine } from '../ab-test-engine';
import type {
  MultiSiteResult,
  FullScrapeResult,
  GeneratedPersona,
  ReconstructedComponent,
} from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('MeasurePhase');

export class MeasurePhaseExecutor implements PhaseExecutor {
  constructor(
    private abTestEngine: ABTestEngine,
    private claudeClient: ClaudeAPIClient,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: MeasureArtifacts = {};
    const steps = PHASE_STEPS.measure;

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
    current: MeasureArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'abTestGeneration': {
        log.info('Generating A/B test plan');
        const bestScrape = this.getBestScrapeResult(prior);
        if (!bestScrape) {
          throw new Error('No scrape data available for A/B test plan generation.');
        }

        const testPlan = await this.abTestEngine.generateTestPlan(bestScrape, ctx);
        return testPlan;
      }

      case 'heatmapAnalysis': {
        log.info('Analyzing heatmap data');
        const bestScrape = this.getBestScrapeResult(prior);
        const heatmapData = prior.heatmapData;

        const systemPrompt = `You are a UX Analytics Specialist analyzing behavioral heatmap data. Identify patterns in user attention, click behavior, scroll depth, and engagement. Provide specific findings, hotspots, dead zones, and actionable recommendations.

Respond with valid JSON:
{
  "findings": ["string (specific behavioral finding with data reference)"],
  "hotspots": ["string (area with high engagement and why)"],
  "deadZones": ["string (area with low engagement and potential causes)"],
  "recommendations": ["string (specific recommendation based on behavioral data)"]
}`;

        const hasHeatmaps = heatmapData && Array.isArray(heatmapData) && heatmapData.length > 0;
        const userPrompt = `Analyze behavioral data for ${session.targetUrls[0] || session.projectName}.

${hasHeatmaps
  ? `Heatmap data available: ${(heatmapData as Array<{ type: string; source: string; pageUrl: string }>).map(h => `${h.type} from ${h.source} on ${h.pageUrl}`).join('; ')}`
  : 'No heatmap data available. Analyze based on design patterns and conversion funnel.'}

Flow Analysis:
${bestScrape
  ? `- Steps to conversion: ${bestScrape.flowAnalysis.stepsToConversion}
- Cognitive load: ${bestScrape.flowAnalysis.estimatedCognitiveLoad}/100
- Friction points: ${bestScrape.flowAnalysis.frictionPoints.map(fp => `Step ${fp.step}: ${fp.description} (severity ${fp.severity}/10)`).join('; ')}
- CTAs: ${bestScrape.conversionPatterns.ctas.map(c => `"${c.text}" at ${c.position}, prominence ${c.prominence}/10`).join('; ')}`
  : 'No scrape data available.'}

Navigation depth: ${bestScrape?.navigation.menuDepth || 'Unknown'}
Total pages: ${bestScrape?.navigation.totalPages || 'Unknown'}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return {
            findings: [response.slice(0, 500)],
            hotspots: [],
            deadZones: [],
            recommendations: [],
          };
        }
      }

      case 'performanceMonitoring': {
        log.info('Generating performance monitoring setup');
        const bestScrape = this.getBestScrapeResult(prior);
        const performanceBudget = prior.performanceBudget;

        const systemPrompt = `You are a Site Reliability Engineer specializing in frontend performance monitoring. Generate a monitoring setup guide including which metrics to track, tool recommendations, alert thresholds, and dashboard configuration.

Respond with valid JSON:
{
  "metricsToTrack": ["string"],
  "toolSetup": "string (recommended tool and setup instructions)",
  "alertThresholds": { "metricName": number },
  "dashboardConfig": "string (dashboard layout and widget recommendations)"
}`;

        const userPrompt = `Generate a performance monitoring plan for a ${ctx.industry} website.

Current Performance:
${bestScrape
  ? `- Lighthouse: ${bestScrape.lighthouse.performanceScore}/100
- LCP: ${bestScrape.lighthouse.lcp}ms
- CLS: ${bestScrape.lighthouse.cls}
- INP: ${bestScrape.lighthouse.inp}ms
- FCP: ${bestScrape.lighthouse.fcp}ms
- Speed Index: ${bestScrape.lighthouse.speedIndex}ms
- Total Blocking Time: ${bestScrape.lighthouse.totalBlockingTime}ms
- Images: ${bestScrape.imageAssets.images.length} total, ${bestScrape.imageAssets.lazyLoadPercentage}% lazy loaded
- Third-party scripts: ${Object.values(bestScrape.thirdPartyStack).reduce((sum, tools) => sum + tools.length, 0)} total`
  : 'No performance data available.'}

Performance Budget:
${performanceBudget ? JSON.stringify(performanceBudget, null, 2).slice(0, 500) : 'Not defined.'}

Target audience: ${ctx.targetAudience}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return {
            metricsToTrack: ['LCP', 'CLS', 'INP', 'FCP', 'TTFB'],
            toolSetup: 'Use Lighthouse CI with web-vitals library for RUM monitoring.',
            alertThresholds: { LCP: 2500, CLS: 0.1, INP: 200 },
            dashboardConfig: 'Create a Core Web Vitals dashboard with time-series charts.',
          };
        }
      }

      case 'iterationRoadmap': {
        log.info('Generating iteration roadmap');

        const personas = prior.personas as GeneratedPersona[] | undefined;
        const designSystem = prior.designSystem as DevelopArtifacts['designSystem'];
        const bestScrape = this.getBestScrapeResult(prior);
        const abTestPlan = current.abTestPlan as MeasureArtifacts['abTestPlan'];
        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const reconstructedComponents = prior.reconstructedComponents as ReconstructedComponent[] | undefined;

        const userPrompt = buildMeasureUserPrompt(
          designSystem ? {
            colorCount: designSystem.colorPalette.length,
            typographySteps: designSystem.typographyScale.length,
            componentCount: reconstructedComponents?.length || 0,
          } : null,
          personas ? personas.map(p => ({
            name: p.name,
            goals: p.goals,
            frustrations: p.frustrations,
            techSavviness: p.techSavviness,
          })) : null,
          bestScrape ? {
            ctaCount: bestScrape.conversionPatterns.ctas.length,
            ctaLabels: bestScrape.conversionPatterns.ctas.map(c => c.text),
            socialProofCount: bestScrape.conversionPatterns.socialProof.length,
            formFieldCount: bestScrape.conversionPatterns.formFields.length,
            trustBadges: bestScrape.conversionPatterns.trustBadges,
            urgencyPatterns: bestScrape.conversionPatterns.urgencyPatterns.map(u => u.content),
          } : null,
          bestScrape ? {
            stepsToConversion: bestScrape.flowAnalysis.stepsToConversion,
            estimatedCognitiveLoad: bestScrape.flowAnalysis.estimatedCognitiveLoad,
            frictionPoints: bestScrape.flowAnalysis.frictionPoints,
          } : null,
          bestScrape ? {
            lighthouseScore: bestScrape.lighthouse.performanceScore,
            lcp: bestScrape.lighthouse.lcp,
            cls: bestScrape.lighthouse.cls,
            inp: bestScrape.lighthouse.inp,
          } : null,
          bestScrape ? {
            overallScore: bestScrape.accessibility.overallScore,
            wcagLevel: bestScrape.accessibility.wcagLevel,
            contrastIssues: bestScrape.accessibility.contrastIssues.length,
            missingAltText: bestScrape.accessibility.missingAltText.length,
          } : null,
          abTestPlan ? {
            summary: abTestPlan.summary,
            testCount: abTestPlan.prioritizedTests.length,
            topTests: abTestPlan.prioritizedTests.slice(0, 5).map(t => ({
              name: t.name,
              hypothesis: t.hypothesis,
              expectedLift: t.expectedLift,
            })),
          } : null,
          researchSynthesis?.recommendations || [],
        );

        const response = await this.claudeClient.singleCall(MEASURE_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return parsed.iterationRoadmap || parsed;
        } catch {
          log.warn('Failed to parse iteration roadmap as JSON');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.iterationRoadmap || parsed;
          }
          return [];
        }
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
