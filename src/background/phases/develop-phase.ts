import type {
  WorkflowSession,
  PhaseArtifacts,
  PhaseStep,
  PhaseExecutor,
  DevelopArtifacts,
  DiscoverArtifacts,
  DefineArtifacts,
  DivergeArtifacts,
  DesignDirection,
  DesignReviewResult,
} from '@shared/workflow-types';
import { PHASE_STEPS } from '@shared/workflow-constants';
import {
  DEVELOP_PHASE_SYSTEM_PROMPT,
  buildDevelopUserPrompt,
} from '@shared/prompt-templates/develop-phase-prompt';
import {
  DESIGN_REVIEW_SYSTEM_PROMPT,
  buildDesignReviewUserPrompt,
} from '@shared/prompt-templates/design-review-prompt';
import { SPEC_DESIGN_SYSTEM_PROMPT, buildSpecDesignPrompt, SPEC_TASKS_SYSTEM_PROMPT, buildSpecTasksPrompt } from '@shared/prompt-templates/spec-artifacts-prompt';
import type { ClaudeAPIClient } from '../claude-api-client';
import type { ComponentReconstructor } from '../component-reconstructor';
import type { CopyRewriter } from '../copy-rewriter';
import type { MultiSiteResult, FullScrapeResult, ReconstructedComponent } from '@shared/types';
import { createLogger } from '@shared/logger';

const log = createLogger('DevelopPhase');

export class DevelopPhaseExecutor implements PhaseExecutor {
  constructor(
    private componentReconstructor: ComponentReconstructor,
    private copyRewriter: CopyRewriter,
    private claudeClient: ClaudeAPIClient,
  ) {}

  async execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts> {
    const artifacts: DevelopArtifacts = {};
    const steps = PHASE_STEPS.develop;

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

  private getWinningDirection(priorArtifacts: PhaseArtifacts): DesignDirection | null {
    const rankings = priorArtifacts.directionRankings as DivergeArtifacts['directionRankings'];
    const directions = priorArtifacts.designDirections as DesignDirection[] | undefined;

    if (!directions || directions.length === 0) {
      return null;
    }

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
    current: DevelopArtifacts,
  ): Promise<unknown> {
    const ctx = session.projectContext;

    switch (engineCall) {
      case 'componentReconstruction': {
        log.info('Reconstructing best components');
        const bestScrape = this.getBestScrapeResult(prior);
        if (!bestScrape) {
          throw new Error('No scrape data available for component reconstruction.');
        }

        const multiSiteResult = prior.multiSiteResult as MultiSiteResult | undefined;
        const bestComponents = multiSiteResult?.compositeDesignSystem?.bestComponents
          || bestScrape.components;

        const componentsToReconstruct = bestComponents.slice(0, 10);
        if (componentsToReconstruct.length === 0) {
          throw new Error('No components found to reconstruct.');
        }

        log.info('Reconstructing components', { count: componentsToReconstruct.length });
        const reconstructed = await this.componentReconstructor.reconstructAll(
          componentsToReconstruct,
          bestScrape.designTokens,
        );

        return reconstructed;
      }

      case 'designSystemGeneration': {
        log.info('Generating normalized design system');
        const winningDirection = this.getWinningDirection(prior);
        if (!winningDirection) {
          throw new Error('No winning design direction available. Diverge phase must complete direction ranking.');
        }

        const bestScrape = this.getBestScrapeResult(prior);
        const multiSiteResult = prior.multiSiteResult as MultiSiteResult | undefined;

        const scrapedTokens = bestScrape
          ? bestScrape.designTokens
          : multiSiteResult?.compositeDesignSystem?.tokens;

        const scrapedTypography = bestScrape
          ? bestScrape.typography
          : multiSiteResult?.compositeDesignSystem?.typography;

        if (!scrapedTokens || !scrapedTypography) {
          throw new Error('No design tokens or typography data available for design system generation.');
        }

        const reconstructed = current.reconstructedComponents as ReconstructedComponent[] | undefined;
        const componentSummary = reconstructed
          ? reconstructed.map(c => `- ${c.name} (${c.originalType}): ${c.tailwindClasses.length} Tailwind classes, ${c.stateVariants.length} states, responsive: ${c.responsive}`).join('\n')
          : 'No reconstructed components yet.';

        const userPrompt = buildDevelopUserPrompt(
          {
            name: winningDirection.name,
            description: winningDirection.description,
            colorDirection: winningDirection.colorDirection,
            typographyDirection: winningDirection.typographyDirection,
            layoutApproach: winningDirection.layoutApproach,
          },
          {
            colors: scrapedTokens.colors.slice(0, 25),
            spacing: scrapedTokens.spacing.slice(0, 15),
            shadows: scrapedTokens.shadows.slice(0, 10),
            borderRadii: scrapedTokens.borderRadii.slice(0, 10),
          },
          {
            fontFamilies: scrapedTypography.fontFamilies,
            fontSizes: scrapedTypography.fontSizes.slice(0, 15),
            fontWeights: scrapedTypography.fontWeights,
            lineHeights: scrapedTypography.lineHeights,
          },
          componentSummary,
        );

        const response = await this.claudeClient.singleCall(DEVELOP_PHASE_SYSTEM_PROMPT, userPrompt);

        try {
          return JSON.parse(response);
        } catch {
          log.warn('Failed to parse design system as JSON');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
          throw new Error('Failed to parse design system from Claude response');
        }
      }

      case 'copyRewriting': {
        log.info('Rewriting copy');
        const bestScrape = this.getBestScrapeResult(prior);
        if (!bestScrape) {
          throw new Error('No scrape data available for copy rewriting.');
        }

        const winningDirection = this.getWinningDirection(prior);
        const brandVoice = winningDirection
          ? `${winningDirection.name} aesthetic — ${winningDirection.moodKeywords.join(', ')}`
          : ctx.designStyle;

        const rewrittenCopy = await this.copyRewriter.rewriteCopy(
          bestScrape,
          brandVoice,
          ctx.industry,
        );

        return {
          variants: [{
            tone: rewrittenCopy.brandVoice,
            ctas: rewrittenCopy.ctaRewrites.map(c => c.variants.casual),
            headlines: rewrittenCopy.headlineRewrites.map(h => h.variants.casual),
            microcopy: rewrittenCopy.microcopyRewrites.map(m => m.variants.casual),
          }],
          brandVoice: rewrittenCopy.brandVoice,
          toneGuidelines: rewrittenCopy.toneGuidelines.join('; '),
        };
      }

      case 'storybookGeneration': {
        log.info('Generating Storybook stories');
        const reconstructed = current.reconstructedComponents as ReconstructedComponent[] | undefined;
        if (!reconstructed || reconstructed.length === 0) {
          throw new Error('No reconstructed components available for Storybook generation.');
        }

        return reconstructed.map(comp => ({
          componentName: comp.name,
          storyCode: comp.storybookStory || this.generateFallbackStory(comp),
        }));
      }

      case 'prototypeGeneration': {
        log.info('Generating HTML prototype');
        const reconstructed = current.reconstructedComponents as ReconstructedComponent[] | undefined;
        const designSystem = current.designSystem as DevelopArtifacts['designSystem'];
        const winningDirection = this.getWinningDirection(prior);

        const systemPrompt = `You are a Frontend Prototyping Engineer. Generate a single-page interactive HTML prototype that demonstrates the design system and key components. The prototype should:
1. Use inline CSS with the design system tokens
2. Be a self-contained HTML file
3. Show key components in context (hero, navigation, cards, CTAs)
4. Be responsive
5. Include basic interactive states (hover, focus)

Output the complete HTML string only, no markdown wrapping.`;

        const componentList = reconstructed
          ? reconstructed.slice(0, 5).map(c => `- ${c.name}: ${c.originalType}`).join('\n')
          : 'No components available';

        const tokenSummary = designSystem
          ? `Colors: ${designSystem.colorPalette.slice(0, 6).map(c => `${c.name}: ${c.value}`).join(', ')}
Typography: ${designSystem.typographyScale.slice(0, 4).map(t => `${t.name}: ${t.size}`).join(', ')}
Spacing: ${designSystem.spacingScale.slice(0, 4).map(s => `${s.name}: ${s.value}`).join(', ')}`
          : 'No design system tokens available';

        const userPrompt = `Generate an HTML prototype for "${winningDirection?.name || 'Design System Demo'}".

Design Tokens:
${tokenSummary}

Components to showcase:
${componentList}

Design direction: ${winningDirection?.description || 'Modern, clean design'}
Layout: ${winningDirection?.layoutApproach || 'Responsive grid layout'}`;

        const response = await this.claudeClient.singleCall(systemPrompt, userPrompt);
        return response;
      }

      case 'specDesign': {
        log.info('Generating design specification');
        const prompt = buildSpecDesignPrompt({
          projectName: session.projectName,
          requirements: prior.specRequirements,
          designBrief: prior.designBrief,
          designPrinciples: prior.designPrinciples,
        });
        const response = await this.claudeClient.singleCall(SPEC_DESIGN_SYSTEM_PROMPT, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return jsonMatch ? { ...JSON.parse(jsonMatch[0]), generatedAt: Date.now() } : { generatedAt: Date.now() };
      }

      case 'specTasks': {
        log.info('Generating task decomposition');
        const prompt = buildSpecTasksPrompt({
          projectName: session.projectName,
          designSpec: current.specDesign,
          designSystem: current.designSystem,
          reconstructedComponents: current.reconstructedComponents as ReconstructedComponent[] || [],
        });
        const response = await this.claudeClient.singleCall(SPEC_TASKS_SYSTEM_PROMPT, prompt);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return jsonMatch ? { ...JSON.parse(jsonMatch[0]), generatedAt: Date.now() } : { generatedAt: Date.now() };
      }

      case 'designReview': {
        log.info('Running design review of generated artifacts');
        const designPrinciples = prior.designPrinciples as DefineArtifacts['designPrinciples'] ?? null;
        const designBrief = prior.designBrief as DefineArtifacts['designBrief'] ?? null;
        const accessibilityRequirements = prior.accessibilityRequirements as DefineArtifacts['accessibilityRequirements'] ?? null;
        const reconstructed = current.reconstructedComponents as ReconstructedComponent[] | undefined;
        const designSystem = current.designSystem as DevelopArtifacts['designSystem'] ?? null;
        const prototype = current.prototype as string | undefined ?? null;

        const reviewUserPrompt = buildDesignReviewUserPrompt({
          designPrinciples: designPrinciples || null,
          designBrief: designBrief || null,
          reconstructedComponents: reconstructed
            ? reconstructed.map(c => ({
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

        const response = await this.claudeClient.singleCall(DESIGN_REVIEW_SYSTEM_PROMPT, reviewUserPrompt);

        try {
          const parsed = JSON.parse(response) as DesignReviewResult;
          parsed.reviewedAt = Date.now();
          return parsed;
        } catch {
          log.warn('Failed to parse design review as JSON, attempting regex extraction');
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]) as DesignReviewResult;
            parsed.reviewedAt = Date.now();
            return parsed;
          }
          throw new Error('Failed to parse design review from Claude response');
        }
      }

      default:
        throw new Error(`Unknown engine call: ${engineCall}`);
    }
  }

  private generateFallbackStory(comp: ReconstructedComponent): string {
    return `import type { Meta, StoryObj } from '@storybook/react';
import { ${comp.name} } from './${comp.name}';

const meta: Meta<typeof ${comp.name}> = {
  title: 'Components/${comp.name}',
  component: ${comp.name},
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ${comp.name}>;

export const Default: Story = {
  args: {},
};

export const Hover: Story = {
  parameters: { pseudo: { hover: true } },
};
`;
  }
}
