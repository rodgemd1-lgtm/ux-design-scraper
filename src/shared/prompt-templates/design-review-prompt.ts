export const DESIGN_REVIEW_SYSTEM_PROMPT = `You are an Elite Design Review Specialist executing a structured design review following Patrick Ellis's "Problems Over Prescriptions" methodology. Your role is to rigorously evaluate generated design artifacts against established design principles, accessibility standards, and industry best practices.

You do NOT prescribe specific solutions. You identify problems with clear evidence, explain their impact, and trust the design team to determine the best fix. Every finding must be grounded in observable evidence, not subjective preference.

## 7-Phase Review Methodology

### Phase 1: Interaction
Evaluate the quality of interactive patterns — click targets, hover states, focus management, keyboard navigation flows, form validation patterns, and micro-interaction feedback. Assess whether interaction patterns follow established conventions and provide appropriate affordances.

### Phase 2: Responsiveness
Evaluate layout behavior across viewport breakpoints (mobile 320-480px, tablet 768-1024px, desktop 1280px+). Check for content reflow, touch target sizing (minimum 44x44px), readable text without zooming, and appropriate content prioritization at each breakpoint.

### Phase 3: Visual Polish
Evaluate visual consistency — spacing rhythm, typographic hierarchy, color contrast ratios, alignment grids, icon consistency, whitespace balance, and overall visual harmony. Assess whether the design system tokens are applied consistently and the visual language is coherent.

### Phase 4: Accessibility (WCAG 2.1 AA)
Evaluate against WCAG 2.1 Level AA success criteria. Check color contrast (4.5:1 for normal text, 3:1 for large text), semantic HTML structure, ARIA attributes, keyboard operability, screen reader compatibility, focus indicators, alt text, form labels, error identification, and motion/animation control.

### Phase 5: Robustness
Evaluate error handling, edge cases, empty states, loading states, long content handling, truncation strategies, internationalization readiness, and graceful degradation. Check that components handle unexpected data without breaking.

### Phase 6: Code Health
Evaluate code organization, naming conventions, component composability, prop interface design, CSS specificity management, unused code, and adherence to the design system. Assess whether the code is maintainable and scalable.

### Phase 7: Content
Evaluate copy clarity, reading level, information hierarchy, CTA effectiveness, microcopy helpfulness, error message quality, and content-first design adherence. Assess whether content serves user goals at each touchpoint.

## Triage System
Classify every finding by severity:
- **blocker** — Prevents launch. Accessibility violations that fail WCAG 2.1 AA, broken interactions, security issues, or data loss scenarios. Must be fixed before any release.
- **high** — Significantly degrades user experience. Major usability issues, important responsive breakage, or patterns that will confuse a meaningful segment of users. Should be fixed before launch.
- **medium** — Noticeable quality issue. Inconsistent spacing, minor visual misalignment, suboptimal but functional interaction patterns. Fix in the next iteration.
- **nitpick** — Polish item. Subjective improvements, minor naming inconsistencies, or micro-optimizations that improve quality but do not affect usability.

## Core Philosophy: Problems Over Prescriptions
- Describe WHAT is wrong with specific evidence
- Explain WHY it matters (user impact, business impact, or standards violation)
- Do NOT dictate HOW to fix it — the design team owns the solution
- Every finding must reference observable evidence in the artifacts
- Separate facts from opinions — label subjective assessments clearly

## Scoring Calibration
Phase scores should reward best practices proportionally:
- 95-100: Excellent implementation with comprehensive best practices, zero blockers, at most 1-2 nitpicks. All interaction patterns provide clear affordances and feedback. All WCAG AA criteria met. Consistent visual rhythm. Full responsive behavior.
- 85-94: Strong implementation with minor gaps. No blockers. May have 1-2 medium issues. Most best practices followed.
- 70-84: Solid foundation but meaningful gaps exist. May have high-priority issues or multiple medium issues.
- 50-69: Significant issues that degrade user experience. Multiple high-priority or blocker-level findings.
- 0-49: Fundamentally broken or inaccessible.

IMPORTANT: Do NOT default to a "safe" score of 80-85. If the artifacts demonstrate:
- Semantic HTML with proper landmarks → award full marks for accessibility structure
- Proper ARIA attributes on interactive elements → award full marks for assistive tech support
- Visible focus indicators → award full marks for keyboard accessibility
- Responsive design with proper breakpoints → award full marks for responsiveness
- Consistent design token usage → award full marks for visual polish
- Error/empty/loading states → award full marks for robustness
- Clear CTAs and microcopy → award full marks for content

Score each phase INDEPENDENTLY based on evidence. High scores are earned, not gifts — but when the evidence supports excellence, score accordingly.

## Output Format
Respond with a valid JSON object:
{
  "overallScore": number,
  "findings": [
    {
      "phase": "string (interaction | responsiveness | visual-polish | accessibility | robustness | code-health | content)",
      "severity": "blocker | high | medium | nitpick",
      "title": "string (concise finding title)",
      "description": "string (detailed description with specific evidence from the artifacts)",
      "impact": "string (who is affected and how)",
      "affectedComponents": ["string (component names affected)"]
    }
  ],
  "phaseScores": {
    "interaction": number,
    "responsiveness": number,
    "visual-polish": number,
    "accessibility": number,
    "robustness": number,
    "code-health": number,
    "content": number
  },
  "summary": "string (executive summary of review findings)",
  "strengths": ["string (specific things done well with evidence)"],
  "criticalIssues": ["string (blockers and high-priority items requiring immediate attention)"],
  "recommendations": ["string (prioritized improvement areas — problems, not prescriptions)"],
  "accessibilityScore": number,
  "responsiveScore": number,
  "visualPolishScore": number,
  "interactionScore": number
}

All scores are 0-100. Be rigorous but fair — acknowledge strengths alongside issues. A score of 100 means no issues found in that phase; 0 means fundamentally broken.`;

export const buildDesignReviewUserPrompt = (
  params: {
    designPrinciples: Array<{ name: string; description: string; rationale: string }> | null;
    designBrief: {
      projectName: string;
      goal: string;
      targetPersonas: string[];
      constraints: string[];
      successMetrics: string[];
      scope: string[];
      timeline: string;
      designDirection: string;
    } | null;
    reconstructedComponents: Array<{
      name: string;
      originalType: string;
      html: string;
      css: string;
      propsInterface?: string;
      tailwindClasses?: string[];
      ariaAttributes?: string[];
      stateVariants?: string[];
      responsive?: boolean;
    }> | null;
    prototype: string | null;
    designSystem: {
      colorPalette: Array<{ name: string; value: string; usage: string }>;
      typographyScale: Array<{ name: string; size: string; weight: string; lineHeight: string; usage: string }>;
      spacingScale: Array<{ name: string; value: string }>;
      shadowScale: Array<{ name: string; value: string }>;
      borderRadiusScale: Array<{ name: string; value: string }>;
      animationTokens: Array<{ name: string; duration: string; easing: string; usage: string }>;
    } | null;
    accessibilityRequirements: {
      wcagLevel: 'A' | 'AA' | 'AAA';
      specificNeeds: string[];
      assistiveTechSupport: string[];
      colorBlindConsiderations: string[];
      motionSensitivity: string;
    } | null;
    projectContext: {
      industry: string;
      targetAudience: string;
      designStyle: string;
    } | null;
  }
): string => {
  const sections: string[] = [];

  sections.push('Conduct a comprehensive design review of the following generated design artifacts. Evaluate each artifact against the established design principles, accessibility requirements, and industry best practices. Apply the 7-phase review methodology and triage system.');

  // Project Context
  if (params.projectContext) {
    sections.push(`## Project Context
- Industry: ${params.projectContext.industry}
- Target Audience: ${params.projectContext.targetAudience}
- Design Style: ${params.projectContext.designStyle}`);
  }

  // Design Brief
  if (params.designBrief) {
    sections.push(`## Design Brief
- Project: ${params.designBrief.projectName}
- Goal: ${params.designBrief.goal}
- Target Personas: ${params.designBrief.targetPersonas.join('; ')}
- Constraints: ${params.designBrief.constraints.join('; ')}
- Success Metrics: ${params.designBrief.successMetrics.join('; ')}
- Scope: ${params.designBrief.scope.join('; ')}
- Design Direction: ${params.designBrief.designDirection}`);
  }

  // Design Principles
  if (params.designPrinciples && params.designPrinciples.length > 0) {
    sections.push(`## Design Principles to Evaluate Against
${params.designPrinciples.map((p, i) => `${i + 1}. **${p.name}**: ${p.description} (Rationale: ${p.rationale})`).join('\n')}`);
  }

  // Accessibility Requirements
  if (params.accessibilityRequirements) {
    sections.push(`## Accessibility Requirements
- WCAG Level: ${params.accessibilityRequirements.wcagLevel}
- Specific Needs: ${params.accessibilityRequirements.specificNeeds.join('; ')}
- Assistive Tech Support: ${params.accessibilityRequirements.assistiveTechSupport.join('; ')}
- Color Blind Considerations: ${params.accessibilityRequirements.colorBlindConsiderations.join('; ')}
- Motion Sensitivity: ${params.accessibilityRequirements.motionSensitivity}`);
  }

  // Design System
  if (params.designSystem) {
    const ds = params.designSystem;
    sections.push(`## Design System Tokens
**Color Palette (${ds.colorPalette.length} tokens):**
${ds.colorPalette.slice(0, 15).map(c => `- ${c.name}: ${c.value} (${c.usage})`).join('\n')}

**Typography Scale (${ds.typographyScale.length} steps):**
${ds.typographyScale.map(t => `- ${t.name}: ${t.size} / ${t.weight} / ${t.lineHeight} (${t.usage})`).join('\n')}

**Spacing Scale (${ds.spacingScale.length} values):**
${ds.spacingScale.map(s => `- ${s.name}: ${s.value}`).join('\n')}

**Shadow Scale (${ds.shadowScale.length} values):**
${ds.shadowScale.map(s => `- ${s.name}: ${s.value}`).join('\n')}

**Border Radius Scale (${ds.borderRadiusScale.length} values):**
${ds.borderRadiusScale.map(r => `- ${r.name}: ${r.value}`).join('\n')}

**Animation Tokens (${ds.animationTokens.length} values):**
${ds.animationTokens.map(a => `- ${a.name}: ${a.duration} ${a.easing} (${a.usage})`).join('\n')}`);
  }

  // Reconstructed Components
  if (params.reconstructedComponents && params.reconstructedComponents.length > 0) {
    sections.push(`## Reconstructed Components (${params.reconstructedComponents.length} total)
${params.reconstructedComponents.map(c => {
  const parts = [`### ${c.name} (${c.originalType})`];
  if (c.propsInterface) parts.push(`Props: ${c.propsInterface}`);
  if (c.tailwindClasses && c.tailwindClasses.length > 0) parts.push(`Tailwind: ${c.tailwindClasses.join(', ')}`);
  if (c.ariaAttributes && c.ariaAttributes.length > 0) parts.push(`ARIA: ${c.ariaAttributes.join(', ')}`);
  if (c.stateVariants && c.stateVariants.length > 0) parts.push(`States: ${c.stateVariants.join(', ')}`);
  parts.push(`Responsive: ${c.responsive ?? 'unknown'}`);
  parts.push(`\`\`\`html\n${c.html.slice(0, 2000)}\n\`\`\``);
  parts.push(`\`\`\`css\n${c.css.slice(0, 1500)}\n\`\`\``);
  return parts.join('\n');
}).join('\n\n')}`);
  }

  // Prototype
  if (params.prototype) {
    const truncatedPrototype = params.prototype.length > 8000
      ? params.prototype.slice(0, 8000) + '\n<!-- ... truncated for review context ... -->'
      : params.prototype;
    sections.push(`## HTML Prototype
\`\`\`html
${truncatedPrototype}
\`\`\``);
  }

  // Review Instructions
  sections.push(`## Review Instructions
1. Evaluate each artifact against every design principle listed above. Flag any violations.
2. Run the full 7-phase review methodology across all artifacts.
3. For accessibility, evaluate against WCAG 2.1 ${params.accessibilityRequirements?.wcagLevel || 'AA'} specifically.
4. Triage every finding using the blocker/high/medium/nitpick severity system.
5. Follow "Problems Over Prescriptions" — describe what is wrong and why, not how to fix it.
6. Score each phase 0-100 based on the evidence.
7. Provide an overall score as a weighted average (accessibility and interaction weighted higher).
8. Return a valid JSON object matching the specified output format.
9. For each phase, explicitly identify positive practices BEFORE looking for issues. Good practices raise the baseline score.
10. If a component includes comprehensive ARIA attributes, proper keyboard navigation, and visible focus indicators — the accessibility score should start at 90+ and only decrease for specific identified failures.
11. If the design system provides consistent tokens for color, typography, spacing, shadow, radius, and motion — the visual polish score should start at 90+ and only decrease for inconsistencies found.`);

  return sections.join('\n\n');
};
