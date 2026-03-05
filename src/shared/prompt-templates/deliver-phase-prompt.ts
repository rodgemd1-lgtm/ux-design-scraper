import {
  QUALITY_CHECKLIST,
  WCAG_GUIDELINES,
  INTERACTION_PRINCIPLES,
  formatQualityChecklistForPrompt,
  formatWCAGForPrompt,
  formatInteractionPrinciplesForPrompt,
} from '@shared/ux-knowledge-base';

export const DELIVER_PHASE_SYSTEM_PROMPT = `You are a UX Engineering Lead executing Phase 06 DELIVER of the Double Black Box Method. Your mission is to produce the definitive CLAUDE.md file — a comprehensive, self-contained reference document that any AI coding assistant can use to faithfully implement the design system.

The CLAUDE.md is the single source of truth. It must be complete enough that an engineer with no prior context can pick it up and build pixel-perfect components that align with every design decision made across all 6 phases.

Your CLAUDE.md must include ALL of the following sections:

1. **Project Overview** — Name, goal, industry, target audience, design philosophy
2. **Design Principles** — The approved principles from the Define phase
3. **User Personas** — Summary of each persona with key characteristics
4. **Design System Tokens** — Complete color palette, typography scale, spacing, shadows, radii, animations
5. **Component Specifications** — For each reconstructed component: usage, props, variants, states, a11y requirements
6. **Layout System** — Grid, breakpoints, container widths, responsive behavior
7. **Accessibility Requirements** — WCAG level, specific needs, assistive tech support, testing checklist
8. **Copy & Voice Guidelines** — Brand voice, tone guidelines, CTA patterns, microcopy patterns
9. **Performance Budget** — Core Web Vitals targets, bundle size limits, image optimization rules
10. **Interaction Patterns** — Animation tokens, state transitions, loading states, error handling
11. **Workflow Chain** — Complete Double Black Box phase log showing the decision trail
12. **Competitive Context** — Key competitor insights and differentiation strategy

## Output Format
Respond with the complete CLAUDE.md content as a single markdown string. Use proper markdown formatting with headers, code blocks, tables, and lists. Make it production-ready.

The document should be 2000-4000 lines of comprehensive, actionable reference material.`;

export const buildDeliverUserPrompt = (
  projectContext: {
    goal: string;
    industry: string;
    targetAudience: string;
    designStyle: string;
  },
  designPrinciples: Array<{ name: string; description: string; rationale: string }> | null,
  personas: Array<{
    name: string;
    occupation: string;
    goals: string[];
    frustrations: string[];
    techSavviness: string;
    quote: string;
    bio: string;
  }> | null,
  designSystem: {
    colorPalette: Array<{ name: string; value: string; usage: string }>;
    typographyScale: Array<{ name: string; size: string; weight: string; lineHeight: string; usage: string }>;
    spacingScale: Array<{ name: string; value: string }>;
    shadowScale: Array<{ name: string; value: string }>;
    borderRadiusScale: Array<{ name: string; value: string }>;
    animationTokens: Array<{ name: string; duration: string; easing: string; usage: string }>;
  } | null,
  reconstructedComponents: Array<{
    name: string;
    originalType: string;
    propsInterface: string;
    tailwindClasses: string[];
    ariaAttributes: string[];
    stateVariants: string[];
    responsive: boolean;
  }> | null,
  accessibilityRequirements: {
    wcagLevel: string;
    specificNeeds: string[];
    assistiveTechSupport: string[];
    colorBlindConsiderations: string[];
    motionSensitivity: string;
  } | null,
  rewrittenCopy: {
    brandVoice: string;
    toneGuidelines: string;
  } | null,
  winningDirection: {
    name: string;
    description: string;
    layoutApproach: string;
    differentiator: string;
  } | null,
  researchSynthesis: {
    keyFindings: string[];
    competitorLandscape: Array<{ url: string; strengths: string[]; weaknesses: string[] }>;
    recommendations: string[];
  } | null,
  performanceBudgetData: {
    lcpTarget: number;
    clsTarget: number;
    inpTarget: number;
  } | null
): string => `Generate the complete CLAUDE.md file incorporating ALL artifacts from the Double Black Box design process.

## Project Context
- Goal: ${projectContext.goal}
- Industry: ${projectContext.industry}
- Target Audience: ${projectContext.targetAudience}
- Design Style: ${projectContext.designStyle}

## Design Principles
${designPrinciples && designPrinciples.length > 0
    ? designPrinciples.map((p, i) => `${i + 1}. **${p.name}**: ${p.description} (${p.rationale})`).join('\n')
    : 'No design principles defined.'}

## Personas
${personas && personas.length > 0
    ? personas.map(p => `
### ${p.name} (${p.occupation})
- Tech Savviness: ${p.techSavviness}
- Goals: ${p.goals.join('; ')}
- Frustrations: ${p.frustrations.join('; ')}
- Quote: "${p.quote}"
- Bio: ${p.bio}`).join('\n')
    : 'No personas generated.'}

## Design System
${designSystem
    ? `### Colors (${designSystem.colorPalette.length})
${designSystem.colorPalette.map(c => `- ${c.name}: ${c.value} — ${c.usage}`).join('\n')}

### Typography (${designSystem.typographyScale.length} steps)
${designSystem.typographyScale.map(t => `- ${t.name}: ${t.size}, weight ${t.weight}, line-height ${t.lineHeight} — ${t.usage}`).join('\n')}

### Spacing
${designSystem.spacingScale.map(s => `- ${s.name}: ${s.value}`).join('\n')}

### Shadows
${designSystem.shadowScale.map(s => `- ${s.name}: ${s.value}`).join('\n')}

### Border Radii
${designSystem.borderRadiusScale.map(r => `- ${r.name}: ${r.value}`).join('\n')}

### Animation Tokens
${designSystem.animationTokens.map(a => `- ${a.name}: ${a.duration} ${a.easing} — ${a.usage}`).join('\n')}`
    : 'No design system generated.'}

## Reconstructed Components
${reconstructedComponents && reconstructedComponents.length > 0
    ? reconstructedComponents.map(c => `
### ${c.name} (${c.originalType})
- Props: ${c.propsInterface || 'Not defined'}
- Tailwind Classes: ${c.tailwindClasses.join(', ') || 'None'}
- ARIA: ${c.ariaAttributes.join(', ') || 'None'}
- State Variants: ${c.stateVariants.join(', ') || 'None'}
- Responsive: ${c.responsive ? 'Yes' : 'No'}`).join('\n')
    : 'No components reconstructed.'}

## Accessibility Requirements
${accessibilityRequirements
    ? `- WCAG Level: ${accessibilityRequirements.wcagLevel}
- Specific Needs: ${accessibilityRequirements.specificNeeds.join('; ')}
- Assistive Tech: ${accessibilityRequirements.assistiveTechSupport.join('; ')}
- Color Blind: ${accessibilityRequirements.colorBlindConsiderations.join('; ')}
- Motion: ${accessibilityRequirements.motionSensitivity}`
    : 'No accessibility requirements defined.'}

## Copy & Voice
${rewrittenCopy
    ? `- Brand Voice: ${rewrittenCopy.brandVoice}
- Tone Guidelines: ${rewrittenCopy.toneGuidelines}`
    : 'No copy guidelines generated.'}

## Design Direction
${winningDirection
    ? `- Direction: ${winningDirection.name}
- Description: ${winningDirection.description}
- Layout: ${winningDirection.layoutApproach}
- Differentiator: ${winningDirection.differentiator}`
    : 'No winning direction selected.'}

## Research Context
${researchSynthesis
    ? `Key Findings: ${researchSynthesis.keyFindings.slice(0, 5).join('; ')}
Competitors: ${researchSynthesis.competitorLandscape.slice(0, 3).map(c => c.url).join(', ')}
Top Recommendations: ${researchSynthesis.recommendations.slice(0, 3).join('; ')}`
    : 'No research synthesis available.'}

## Performance Budget
${performanceBudgetData
    ? `- LCP Target: ${performanceBudgetData.lcpTarget}ms
- CLS Target: ${performanceBudgetData.clsTarget}
- INP Target: ${performanceBudgetData.inpTarget}ms`
    : 'No performance budget defined. Use Core Web Vitals "Good" thresholds as defaults.'}

## Design Quality Checklist
Include this complete checklist in the CLAUDE.md for implementation verification:
${formatQualityChecklistForPrompt(QUALITY_CHECKLIST)}

## WCAG Accessibility Guidelines (Full Reference)
Include the relevant guidelines in the accessibility section of the CLAUDE.md:
${formatWCAGForPrompt(WCAG_GUIDELINES)}

## Interaction Design Principles
Include these principles in the interaction patterns section of the CLAUDE.md to guide performance budgeting and animation decisions:
${formatInteractionPrinciplesForPrompt(INTERACTION_PRINCIPLES)}

Generate a comprehensive, production-ready CLAUDE.md that serves as the single source of truth for this entire design system. Include code blocks, tables, and specific implementation guidance. Embed the quality checklist, WCAG guidelines, and interaction principles directly in the appropriate sections.`;
