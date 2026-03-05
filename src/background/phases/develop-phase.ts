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

        const systemPrompt = `You are a Senior Frontend Prototyping Engineer specializing in production-grade, accessible HTML prototypes that score 95+ on design reviews. Generate a single-page, self-contained interactive HTML prototype. Every requirement below is MANDATORY — omitting any item will lower the design review score.

## Output Format
Output the complete HTML string only, no markdown wrapping, no code fences.

## Document Structure & Accessibility (WCAG 2.1 AA)
1. Include a skip-to-content link as the FIRST focusable element: <a href="#main-content" class="skip-link">Skip to main content</a>, visually hidden until focused.
2. Use semantic HTML5 landmarks throughout: <header>, <nav>, <main id="main-content">, <footer>, <section>, <article>. Never use generic <div> where a semantic element applies.
3. Enforce strict heading hierarchy: exactly one <h1>, then <h2> sections, then <h3> subsections. NEVER skip heading levels.
4. Apply visible focus indicators on ALL interactive elements: outline: 3px solid with a high-contrast color (e.g., #2563EB on light, #60A5FA on dark), outline-offset: 2px. Use :focus-visible to avoid showing outlines on mouse click.
5. Meet WCAG AA contrast ratios: 4.5:1 minimum for normal text (<18px/14px bold), 3:1 minimum for large text (>=18px/>=14px bold). Verify every foreground/background pair.
6. Ensure all touch/click targets are minimum 44x44px (use min-width/min-height on buttons, links, and form controls).
7. Add prefers-reduced-motion media query: wrap ALL animations and transitions in @media (prefers-reduced-motion: no-preference) { ... }. Provide zero-motion fallback.
8. Add prefers-color-scheme support: include a complete @media (prefers-color-scheme: dark) { ... } block with proper dark-mode token overrides for backgrounds, text, borders, and shadows.
9. Apply correct ARIA roles, labels, and states on ALL interactive elements: aria-label or aria-labelledby on icon buttons, aria-expanded on toggles, aria-current="page" on active nav items, role="alert" on error messages, aria-live="polite" on dynamic content.
10. Implement full keyboard navigation: Tab/Shift+Tab through all focusable elements in logical order. Escape to close modals/dropdowns. Arrow keys for tab panels, menus, and radio groups. Enter/Space to activate buttons and links.

## Component States & Interaction Patterns
11. Demonstrate three states for every data section: loading skeleton (pulse animation), empty state (illustration placeholder + helpful message), and populated state. Use a <script> block to toggle between them.
12. Form elements must have: visible <label> elements with for/id association, required attribute where appropriate, inline validation with aria-describedby pointing to error <span>, error messages styled in the error semantic color.
13. Show micro-interaction feedback on ALL interactive elements: hover state (subtle background/shadow shift, 150ms ease-out), focus state (3px outline), active/pressed state (slight scale or inset shadow, 100ms), and disabled state (reduced opacity, cursor: not-allowed).

## Responsive Design
14. Include <meta name="viewport" content="width=device-width, initial-scale=1"> in <head>.
15. Use fluid typography: clamp() for font sizes (e.g., clamp(1rem, 2.5vw, 1.25rem) for body text).
16. Define responsive breakpoints with content reflow at: 320px (mobile), 768px (tablet), 1024px (desktop), 1440px (wide). Use CSS Grid or Flexbox layouts that gracefully reflow at each breakpoint.
17. Use container queries (@container) where supported for component-level responsive behavior, with @supports fallback.

## Visual Quality & Design Tokens
18. All images must have descriptive alt text. Use placeholder boxes with background-color and a text label (e.g., "Hero Image: Product showcase") — never leave alt="" on meaningful images.
19. Apply a consistent spacing grid using the design system spacing tokens. Every margin and padding must reference a token value — no arbitrary pixel values.
20. Apply consistent border-radius and shadow tokens from the design system. Every border-radius and box-shadow must use a token — no magic numbers.
21. Implement status color semantics consistently: success (green), warning (amber), error (red), info (blue). Use these in alerts, badges, form validation, and toast notifications.
22. Transition durations must be 150-300ms with ease-out or cubic-bezier timing for a polished feel. Never exceed 300ms for micro-interactions.

## Prototype Structure
The prototype must include these sections in order:
- Skip link (hidden until focused)
- <header> with <nav> containing logo area, navigation links (one marked aria-current="page"), and a CTA button
- <main id="main-content"> containing:
  - Hero section with headline (h1), subheadline, primary CTA, and image placeholder
  - Features/cards section (grid of 3+ cards, responsive)
  - Form section with labeled inputs, validation states, and submit button
  - Stats or testimonial section
  - Alert/notification examples (success, warning, error, info)
- <footer> with navigation links, copyright, and legal links

## CSS Custom Properties
Define all design tokens as CSS custom properties on :root and override in the dark mode media query. Example structure:
:root { --color-primary: ...; --color-surface: ...; --space-xs: ...; --radius-md: ...; --shadow-sm: ...; --font-body: ...; }
@media (prefers-color-scheme: dark) { :root { --color-primary: ...; --color-surface: ...; } }`;

        const componentList = reconstructed
          ? reconstructed.slice(0, 8).map(c => {
              const states = c.stateVariants.length > 0 ? ` | States: ${c.stateVariants.join(', ')}` : '';
              const aria = c.ariaAttributes.length > 0 ? ` | ARIA: ${c.ariaAttributes.join(', ')}` : '';
              return `- ${c.name} (${c.originalType}): Tailwind[${c.tailwindClasses.slice(0, 5).join(', ')}]${states}${aria} | Responsive: ${c.responsive}`;
            }).join('\n')
          : 'No components available — generate representative components based on the design direction.';

        const tokenSummary = designSystem
          ? `Color Palette:
${designSystem.colorPalette.map(c => `  --color-${c.name}: ${c.value}; /* ${c.usage} */`).join('\n')}

Typography Scale:
${designSystem.typographyScale.map(t => `  --font-${t.name}: ${t.size}/${t.lineHeight} ${t.weight}; /* ${t.usage} */`).join('\n')}

Spacing Scale:
${designSystem.spacingScale.map(s => `  --space-${s.name}: ${s.value};`).join('\n')}

Shadow Scale:
${designSystem.shadowScale.map(s => `  --shadow-${s.name}: ${s.value};`).join('\n')}

Border Radius Scale:
${designSystem.borderRadiusScale.map(r => `  --radius-${r.name}: ${r.value};`).join('\n')}

Animation Tokens:
${designSystem.animationTokens.map(a => `  --anim-${a.name}: ${a.duration} ${a.easing}; /* ${a.usage} */`).join('\n')}`
          : 'No design system tokens available — infer a professional token set from the design direction.';

        const userPrompt = `Generate a 95/100 design-review-quality HTML prototype for "${winningDirection?.name || 'Design System Demo'}".

## Design Tokens (use these as CSS custom properties)
${tokenSummary}

## Components to Showcase
${componentList}

## Design Direction
Name: ${winningDirection?.name || 'Modern Design System'}
Description: ${winningDirection?.description || 'Modern, clean design with strong visual hierarchy'}
Color Direction: ${winningDirection?.colorDirection || 'Professional and balanced palette'}
Typography Direction: ${winningDirection?.typographyDirection || 'Clean sans-serif type scale'}
Layout Approach: ${winningDirection?.layoutApproach || 'Responsive grid layout with clear content hierarchy'}

## Quality Checklist (the design review will verify ALL of these)
- [ ] Skip-to-content link present and functional
- [ ] All semantic landmarks used correctly (<main>, <nav>, <header>, <footer>, <section>)
- [ ] Heading hierarchy h1 > h2 > h3 with no skipped levels
- [ ] Visible :focus-visible outlines (3px+) on every interactive element
- [ ] WCAG AA contrast on all text
- [ ] Touch targets >= 44x44px
- [ ] prefers-reduced-motion media query wrapping all animations
- [ ] prefers-color-scheme dark mode with full token overrides
- [ ] ARIA roles/labels/states on all interactive elements
- [ ] Keyboard navigation (Tab, Escape, Enter, Arrow keys)
- [ ] Loading, empty, and error states demonstrated
- [ ] Form labels, validation, and error messages
- [ ] Responsive viewport meta tag
- [ ] Fluid typography with clamp()
- [ ] Content reflow at 320px, 768px, 1024px, 1440px
- [ ] Image placeholders with descriptive alt text
- [ ] Spacing uses design token custom properties only
- [ ] Border-radius and shadows use tokens only
- [ ] Hover/focus/active transitions 150-300ms
- [ ] Status colors: success green, warning amber, error red, info blue

Generate the complete, self-contained HTML file now.`;

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
