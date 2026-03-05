import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  DeliverArtifacts,
  DiscoverArtifacts,
  DefineArtifacts,
  DevelopArtifacts,
  DivergeArtifacts,
  DesignDirection,
  DesignReviewResult,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  DELIVER_PHASE_SYSTEM_PROMPT,
  buildDeliverUserPrompt,
} from '@shared/prompt-templates/deliver-phase-prompt';
import {
  DESIGN_REVIEW_SYSTEM_PROMPT,
  buildDesignReviewUserPrompt,
} from '@shared/prompt-templates/design-review-prompt';
import { HANDOFF_SYSTEM_PROMPT, buildHandoffPrompt } from '@shared/prompt-templates/handoff-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { FileOutputManager } from '../file-output-manager';
import type { GeneratedPersona, ReconstructedComponent } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('DeliverPhase');

export class DeliverPhaseExecutor implements PhaseExecutor {
  constructor(
    private claudeClient: ClaudeAPIClient,
    private fileOutputManager: FileOutputManager,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: DeliverArtifacts = {};
    const steps = PHASE_STEPS.deliver;

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

  private getWinningDirection(priorArtifacts: PhaseArtifacts): DesignDirection | null {
    const rankings = priorArtifacts.directionRankings as DivergeArtifacts['directionRankings'];
    const directions = priorArtifacts.designDirections as DesignDirection[] | undefined;

    if (!directions || directions.length === 0) return null;

    if (rankings && rankings.length > 0) {
      const sorted = [...rankings].sort((a, b) => a.rank - b.rank);
      const winnerName = sorted[0].name;
      return directions.find(d => d.name === winnerName) || directions[0];
    }

    return directions[0];
  }

  private async executeStep(
    engineCall: string,
    session: WorkflowSession,
    prior: PhaseArtifacts,
    current: DeliverArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'generateClaudeMd': {
        log.info('Generating CLAUDE.md');

        const designPrinciples = prior.designPrinciples as DefineArtifacts['designPrinciples'];
        const personas = prior.personas as GeneratedPersona[] | undefined;
        const designSystem = prior.designSystem as DevelopArtifacts['designSystem'];
        const reconstructedComponents = prior.reconstructedComponents as ReconstructedComponent[] | undefined;
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'];
        const rewrittenCopy = prior.rewrittenCopy as DevelopArtifacts['rewrittenCopy'];
        const winningDirection = this.getWinningDirection(prior);
        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];

        const userPrompt = buildDeliverUserPrompt(
          ctx,
          designPrinciples || null,
          personas ? personas.map(p => ({
            name: p.name,
            occupation: p.occupation,
            goals: p.goals,
            frustrations: p.frustrations,
            techSavviness: p.techSavviness,
            quote: p.quote,
            bio: p.bio,
          })) : null,
          designSystem || null,
          reconstructedComponents ? reconstructedComponents.map(c => ({
            name: c.name,
            originalType: c.originalType,
            propsInterface: c.propsInterface,
            tailwindClasses: c.tailwindClasses,
            ariaAttributes: c.ariaAttributes,
            stateVariants: c.stateVariants,
            responsive: c.responsive,
          })) : null,
          accessibilityRequirements || null,
          rewrittenCopy ? {
            brandVoice: rewrittenCopy.brandVoice as string,
            toneGuidelines: rewrittenCopy.toneGuidelines as string,
          } : null,
          winningDirection ? {
            name: winningDirection.name,
            description: winningDirection.description,
            layoutApproach: winningDirection.layoutApproach,
            differentiator: winningDirection.differentiator,
          } : null,
          researchSynthesis || null,
          null,
        );

        const response = await this.claudeClient.singleCall(DELIVER_PHASE_SYSTEM_PROMPT, userPrompt);
        return response;
      }

      case 'generateFigmaTokens': {
        log.info('Generating Figma tokens');
        const designSystem = prior.designSystem as DevelopArtifacts['designSystem'];
        if (!designSystem) {
          throw new Error('No design system available for Figma token generation.');
        }

        const figmaTokens: Record<string, unknown> = {
          color: {} as Record<string, unknown>,
          typography: {} as Record<string, unknown>,
          spacing: {} as Record<string, unknown>,
          boxShadow: {} as Record<string, unknown>,
          borderRadius: {} as Record<string, unknown>,
          motion: {} as Record<string, unknown>,
          _metadata: {
            generatedAt: new Date().toISOString(),
            source: 'Double Black Box Method',
            version: '1.0.0',
          },
        };

        const colorTokens = figmaTokens.color as Record<string, unknown>;
        for (const color of designSystem.colorPalette) {
          colorTokens[color.name] = {
            value: color.value,
            type: 'color',
            description: color.usage,
          };
        }

        const typographyTokens = figmaTokens.typography as Record<string, unknown>;
        for (const typo of designSystem.typographyScale) {
          typographyTokens[typo.name] = {
            value: {
              fontSize: typo.size,
              fontWeight: typo.weight,
              lineHeight: typo.lineHeight,
            },
            type: 'typography',
            description: typo.usage,
          };
        }

        const spacingTokens = figmaTokens.spacing as Record<string, unknown>;
        for (const space of designSystem.spacingScale) {
          spacingTokens[space.name] = {
            value: space.value,
            type: 'spacing',
          };
        }

        const shadowTokens = figmaTokens.boxShadow as Record<string, unknown>;
        for (const shadow of designSystem.shadowScale) {
          shadowTokens[shadow.name] = {
            value: shadow.value,
            type: 'boxShadow',
          };
        }

        const radiusTokens = figmaTokens.borderRadius as Record<string, unknown>;
        for (const radius of designSystem.borderRadiusScale) {
          radiusTokens[radius.name] = {
            value: radius.value,
            type: 'borderRadius',
          };
        }

        const motionTokens = figmaTokens.motion as Record<string, unknown>;
        for (const anim of designSystem.animationTokens) {
          motionTokens[anim.name] = {
            value: {
              duration: anim.duration,
              easing: anim.easing,
            },
            type: 'motion',
            description: anim.usage,
          };
        }

        return figmaTokens;
      }

      case 'generatePerformanceBudget': {
        log.info('Generating performance budget');
        const systemPrompt = `You are a Web Performance Engineer. Generate a performance budget based on the design system complexity and industry benchmarks.

Respond with valid JSON:
{
  "images": { "totalBudgetKB": number, "perImageMaxKB": number, "requiredFormats": ["string"], "currentTotalKB": 0 },
  "javascript": { "totalBudgetKB": number, "perBundleMaxKB": number, "currentTotalKB": 0 },
  "css": { "totalBudgetKB": number, "currentTotalKB": 0 },
  "fonts": { "maxFamilies": number, "totalBudgetKB": number, "currentFamilies": 0, "currentTotalKB": 0 },
  "thirdParty": { "maxCount": number, "categoriesToKeep": ["string"], "currentCount": 0 },
  "coreWebVitals": { "lcpTarget": number, "clsTarget": number, "inpTarget": number, "fcpTarget": number, "currentLCP": 0, "currentCLS": 0, "currentINP": 0, "currentFCP": 0 },
  "lighthouseCIConfig": {},
  "budgetJson": {}
}`;

        const designSystem = prior.designSystem as DevelopArtifacts['designSystem'];
        const componentCount = (prior.reconstructedComponents as ReconstructedComponent[] | undefined)?.length || 0;

        const userPrompt = `Generate a performance budget for a ${ctx.industry} website.
Design system: ${designSystem ? `${designSystem.colorPalette.length} colors, ${designSystem.typographyScale.length} type steps` : 'Not available'}
Components: ${componentCount}
Target audience: ${ctx.targetAudience}
Design style: ${ctx.designStyle}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          return {
            coreWebVitals: { lcpTarget: 2500, clsTarget: 0.1, inpTarget: 200, fcpTarget: 1800 },
          };
        }
      }

      case 'generateAccessibilityReport': {
        log.info('Generating accessibility report');
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'];
        const personas = prior.personas as GeneratedPersona[] | undefined;

        const systemPrompt = `You are an Accessibility Specialist. Generate a comprehensive accessibility audit report in markdown format. Include specific WCAG success criteria, testing procedures, and remediation guidance.

Output the complete markdown report as a single string.`;

        const userPrompt = `Generate an accessibility report.

Requirements:
${accessibilityRequirements
  ? `- WCAG Level: ${accessibilityRequirements.wcagLevel}
- Specific Needs: ${accessibilityRequirements.specificNeeds.join('; ')}
- Assistive Tech: ${accessibilityRequirements.assistiveTechSupport.join('; ')}
- Color Blind: ${accessibilityRequirements.colorBlindConsiderations.join('; ')}
- Motion: ${accessibilityRequirements.motionSensitivity}`
  : 'Default WCAG AA compliance required.'}

Personas with accessibility needs:
${personas
  ? personas
      .filter(p => p.accessibilityNeeds.length > 0)
      .map(p => `- ${p.name}: ${p.accessibilityNeeds.join(', ')}`)
      .join('\n') || 'No specific accessibility needs identified in personas.'
  : 'No personas available.'}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);
        return response;
      }

      case 'handoffPackage': {
        log.info('Generating developer handoff package');
        const prompt = buildHandoffPrompt({
          projectName: session.projectName,
          designSystem: prior.designSystem,
          reconstructedComponents: prior.reconstructedComponents as ReconstructedComponent[] || [],
          designBrief: prior.designBrief,
          prototype: prior.prototype,
          personas: prior.personas as GeneratedPersona[] || [],
          accessibilityRequirements: prior.accessibilityRequirements,
          rewrittenCopy: prior.rewrittenCopy,
          claudeMd: current.claudeMd,
        });
        const response = await this.claudeClient.singleCall(HANDOFF_SYSTEM_PROMPT, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return jsonMatch ? { ...JSON.parse(jsonMatch[0]), generatedAt: Date.now() } : { generatedAt: Date.now() };
      }

      case 'finalDesignReview': {
        log.info('Running final comprehensive design review');
        const designPrinciples = prior.designPrinciples as DefineArtifacts['designPrinciples'] ?? null;
        const designBrief = prior.designBrief as DefineArtifacts['designBrief'] ?? null;
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'] ?? null;
        const reconstructedComponents = prior.reconstructedComponents as ReconstructedComponent[] | undefined;
        const designSystem = prior.designSystem as DevelopArtifacts['designSystem'] ?? null;
        const prototype = prior.prototype as string | undefined ?? null;

        const reviewUserPrompt = buildDesignReviewUserPrompt({
          designPrinciples: designPrinciples || null,
          designBrief: designBrief || null,
          reconstructedComponents: reconstructedComponents
            ? reconstructedComponents.map(c => ({
                name: c.name,
                originalType: c.originalType,
                html: c.tsx,
                css: c.tailwindClasses.join(' '),
                propsInterface: c.propsInterface,
                tailwindClasses: c.tailwindClasses,
                ariaAttributes: c.ariaAttributes,
                stateVariants: c.stateVariants,
                responsive: c.responsive,
              }))
            : null,
          prototype,
          designSystem,
          accessibilityRequirements: accessibilityRequirements || null,
          projectContext: {
            industry: ctx.industry,
            targetAudience: ctx.targetAudience,
            designStyle: ctx.designStyle,
          },
        });

        const reviewResponse = await this.claudeClient.singleCall(DESIGN_REVIEW_SYSTEM_PROMPT, reviewUserPrompt);

        try {
          const parsed = JSON.parse(reviewResponse) as DesignReviewResult;
          parsed.reviewedAt = Date.now();
          return parsed;
        } catch {
          log.warn('Failed to parse final design review as JSON, attempting regex extraction');
          const jsonMatch = reviewResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as DesignReviewResult;
            parsed.reviewedAt = Date.now();
            return parsed;
          }
          throw new Error('Failed to parse final design review from Claude response');
        }
      }

      case 'generateOutputFolder': {
        log.info('Generating output folder');
        const claudeMd = current.claudeMd as string | undefined;
        const figmaTokens = current.figmaTokens;
        const performanceBudget = current.performanceBudget;
        const accessibilityReport = current.accessibilityReport as string | undefined;
        const analysisDocs = current.analysisDocs as Record<string, string> | undefined;

        const files: string[] = [];

        if (claudeMd) files.push('CLAUDE.md');
        if (figmaTokens) files.push('tokens/figma-tokens.json');
        if (performanceBudget) files.push('performance/budget.json');
        if (accessibilityReport) files.push('accessibility/audit-report.md');
        if (analysisDocs) {
          for (const key of Object.keys(analysisDocs)) {
            files.push(`analysis/${key}.md`);
          }
        }

        return {
          totalFiles: files.length,
          outputPath: session.projectName,
          files,
        };
      }

      case 'generateAnalysisDocs': {
        log.info('Generating analysis documents');
        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const designCritique = prior.designCritique as DivergeArtifacts['designCritique'];
        const competitivePositioning = prior.competitivePositioning as DivergeArtifacts['competitivePositioning'];

        const docs: Record<string, string> = {};

        if (researchSynthesis) {
          docs['research-synthesis'] = `# Research Synthesis

## Key Findings
${researchSynthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

## Competitor Landscape
${researchSynthesis.competitorLandscape.map(c => `### ${c.url}
- **Strengths:** ${c.strengths.join('; ')}
- **Weaknesses:** ${c.weaknesses.join('; ')}`).join('\n\n')}

## Design Trend Insights
${researchSynthesis.designTrendInsights.map((t, i) => `${i + 1}. ${t}`).join('\n')}

## Recommendations
${researchSynthesis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
        }

        if (designCritique) {
          docs['design-critique'] = `# Design Critique

**Overall Score:** ${designCritique.overallScore}/10
**Innovation Score:** ${designCritique.innovationScore}/10

## Executive Summary
${designCritique.executiveSummary}

## Strengths
${designCritique.strengths.map(s => `- **${s.title}**: ${s.evidence} (Impact: ${s.impact})`).join('\n')}

## Weaknesses
${designCritique.weaknesses.map(w => `- **${w.title}** [${w.severity}]: ${w.evidence} — ${w.recommendation} (Effort: ${w.estimatedEffort})`).join('\n')}`;
        }

        if (competitivePositioning) {
          docs['competitive-positioning'] = `# Competitive Positioning

## Positioning Statement
${competitivePositioning.positioningStatement}

## Market Gaps
${competitivePositioning.marketGaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## Unique Opportunities
${competitivePositioning.uniqueOpportunities.map((o, i) => `${i + 1}. ${o}`).join('\n')}

## Risk Areas
${competitivePositioning.riskAreas.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
        }

        return docs;
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
