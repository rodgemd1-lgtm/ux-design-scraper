import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  GateArtifacts,
  DiscoverArtifacts,
  DefineArtifacts,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  GATE_PHASE_SYSTEM_PROMPT,
  buildGateUserPrompt,
} from '@shared/prompt-templates/gate-phase-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { GeneratedPersona } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('GatePhase');

export class GatePhaseExecutor implements PhaseExecutor {
  constructor(
    private claudeClient: ClaudeAPIClient,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: GateArtifacts = {};
    const steps = PHASE_STEPS.gate;

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
    current: GateArtifacts,
  ): Promise<unknown> {
    switch (engineCall) {
      case 'compileReviewPackage': {
        log.info('Compiling review package');

        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const personas = prior.personas as GeneratedPersona[] | undefined;
        const designBrief = prior.designBrief as DefineArtifacts['designBrief'];
        const designPrinciples = prior.designPrinciples as DefineArtifacts['designPrinciples'];
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'];
        const journeyMaps = prior.journeyMaps as DefineArtifacts['journeyMaps'];

        const qualityChecks: Array<{ check: string; passed: boolean; details: string }> = [];

        qualityChecks.push({
          check: 'Research Synthesis Present',
          passed: !!researchSynthesis,
          details: researchSynthesis
            ? `${researchSynthesis.keyFindings.length} findings, ${researchSynthesis.competitorLandscape.length} competitors analyzed`
            : 'Missing research synthesis',
        });

        qualityChecks.push({
          check: 'Personas Generated',
          passed: !!personas && personas.length >= 3,
          details: personas
            ? `${personas.length} personas: ${personas.map(p => p.name).join(', ')}`
            : 'No personas generated',
        });

        qualityChecks.push({
          check: 'Design Brief Complete',
          passed: !!designBrief && !!designBrief.goal && designBrief.successMetrics.length > 0,
          details: designBrief
            ? `Goal: ${designBrief.goal}, ${designBrief.successMetrics.length} success metrics, ${designBrief.constraints.length} constraints`
            : 'Missing design brief',
        });

        qualityChecks.push({
          check: 'Design Principles Defined',
          passed: !!designPrinciples && designPrinciples.length >= 3,
          details: designPrinciples
            ? `${designPrinciples.length} principles: ${designPrinciples.map(p => p.name).join(', ')}`
            : 'No design principles defined',
        });

        qualityChecks.push({
          check: 'Accessibility Requirements Set',
          passed: !!accessibilityRequirements && !!accessibilityRequirements.wcagLevel,
          details: accessibilityRequirements
            ? `WCAG ${accessibilityRequirements.wcagLevel}, ${accessibilityRequirements.specificNeeds.length} specific needs`
            : 'No accessibility requirements',
        });

        qualityChecks.push({
          check: 'Journey Maps Created',
          passed: !!journeyMaps && journeyMaps.length > 0,
          details: journeyMaps
            ? `${journeyMaps.length} journey maps for: ${journeyMaps.map(j => j.personaName).join(', ')}`
            : 'No journey maps created',
        });

        return {
          researchSummary: researchSynthesis
            ? `${researchSynthesis.keyFindings.length} findings across ${researchSynthesis.competitorLandscape.length} competitors`
            : 'Not available',
          personaSummary: personas
            ? `${personas.length} personas generated`
            : 'Not available',
          briefSummary: designBrief
            ? `Goal: ${designBrief.goal}`
            : 'Not available',
          qualityChecks,
        };
      }

      case 'qualityValidation': {
        log.info('Running quality validation via Claude');

        const researchSynthesis = prior.researchSynthesis as DiscoverArtifacts['researchSynthesis'];
        const personas = prior.personas as GeneratedPersona[] | undefined;
        const journeyMaps = prior.journeyMaps as DefineArtifacts['journeyMaps'];
        const designPrinciples = prior.designPrinciples as DefineArtifacts['designPrinciples'];
        const designBrief = prior.designBrief as DefineArtifacts['designBrief'];
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'];

        const userPrompt = buildGateUserPrompt(
          researchSynthesis || null,
          personas ? personas.map(p => ({
            name: p.name,
            occupation: p.occupation,
            goals: p.goals,
            frustrations: p.frustrations,
            techSavviness: p.techSavviness,
            accessibilityNeeds: p.accessibilityNeeds,
            quote: p.quote,
          })) : null,
          journeyMaps ? journeyMaps.map(jm => ({
            personaName: jm.personaName,
            phases: jm.phases.map(p => ({
              name: p.name,
              touchpoints: p.touchpoints,
              painPoints: p.painPoints,
              opportunities: p.opportunities,
            })),
          })) : null,
          designPrinciples || null,
          designBrief || null,
          accessibilityRequirements || null,
        );

        const response = await this.claudeClient.singleCall(GATE_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          const parsed = JSON.parse(response);
          return {
            readinessScore: parsed.readinessScore ?? 0,
            missingElements: parsed.missingElements || [],
            warnings: parsed.warnings || [],
            qualityScores: parsed.qualityScores || {},
          };
        } catch {
          log.warn('Failed to parse gate validation as JSON');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
              readinessScore: parsed.readinessScore ?? 0,
              missingElements: parsed.missingElements || [],
              warnings: parsed.warnings || [],
              qualityScores: parsed.qualityScores || {},
            };
          }
          return {
            readinessScore: 0,
            missingElements: ['Failed to parse quality validation response'],
            warnings: [],
            qualityScores: {},
          };
        }
      }

      case 'awaitApproval': {
        log.info('Gate entering review state — awaiting user approval');
        const validation = current.qualityValidation as GateArtifacts['qualityValidation'];
        const readinessScore = validation?.readinessScore ?? 0;

        if (readinessScore >= 80) {
          return 'approved';
        } else if (readinessScore >= 60) {
          return 'revision-needed';
        } else {
          return 'revision-needed';
        }
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }
}
