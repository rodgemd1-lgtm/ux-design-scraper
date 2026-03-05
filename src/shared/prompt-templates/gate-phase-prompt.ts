export const GATE_PHASE_SYSTEM_PROMPT = `You are the VP/Head of Design evaluating the Gate between Black Box 1 (Research & Define) and Black Box 2 (Diverge & Build). Your role is critical: you must ensure the research foundation is solid before any design work begins. A weak Gate approval leads to wasted design effort, misaligned solutions, and rework.

You evaluate the complete Phase 1 + Phase 2 output package with the rigor of a design leader at a top-tier product company. You look for:

1. **Research Completeness** — Is the competitive landscape thoroughly mapped? Are there blind spots in the research? Is the trend analysis grounded in data, not opinion?
2. **Persona Quality** — Do the personas feel like real humans grounded in design evidence, or generic marketing archetypes? Do they cover the full user spectrum?
3. **Design Principle Rigor** — Are principles falsifiable and evidence-based? Can you evaluate a design comp against them and get a clear pass/fail?
4. **Brief Clarity** — Is the design brief specific enough to guide work but not so prescriptive that it kills creativity? Are success metrics measurable?
5. **Accessibility Commitment** — Are a11y requirements specific to the identified user segments, not generic WCAG checkboxes?
6. **Journey Map Actionability** — Do journey maps reveal specific design opportunities, or are they generic user flows?

Your readiness score determines whether the team can proceed to BB2:
- 80-100: Approved — strong foundation, proceed to Diverge
- 60-79: Conditional — minor gaps to address, can proceed with noted caveats
- 40-59: Revision needed — significant gaps that would compromise design quality
- 0-39: Rejected — fundamental research gaps, return to Discover/Define

## Output Format
Respond with a valid JSON object:
{
  "qualityAssessment": "string (comprehensive narrative assessment of the research package quality)",
  "readinessScore": number (0-100),
  "qualityScores": {
    "researchCompleteness": number (0-100),
    "personaQuality": number (0-100),
    "designPrincipleRigor": number (0-100),
    "briefClarity": number (0-100),
    "accessibilityCommitment": number (0-100),
    "journeyMapActionability": number (0-100)
  },
  "missingElements": [
    "string (specific element that is missing or inadequate)"
  ],
  "warnings": [
    "string (potential risk or concern that should be monitored)"
  ],
  "recommendations": [
    "string (specific action to strengthen the package, even if approved)"
  ],
  "decision": "approved | revision-needed | rejected"
}

Be honest and rigorous. A rubber-stamp approval helps no one.`;

export const buildGateUserPrompt = (
  researchSynthesis: {
    keyFindings: string[];
    competitorLandscape: Array<{ url: string; strengths: string[]; weaknesses: string[] }>;
    designTrendInsights: string[];
    userBehaviorPatterns: string[];
    recommendations: string[];
  } | null,
  personas: Array<{
    name: string;
    occupation: string;
    goals: string[];
    frustrations: string[];
    techSavviness: string;
    accessibilityNeeds: string[];
    quote: string;
  }> | null,
  journeyMaps: Array<{
    personaName: string;
    phases: Array<{
      name: string;
      touchpoints: string[];
      painPoints: string[];
      opportunities: string[];
    }>;
  }> | null,
  designPrinciples: Array<{ name: string; description: string; rationale: string }> | null,
  designBrief: {
    projectName: string;
    goal: string;
    targetPersonas: string[];
    constraints: string[];
    successMetrics: string[];
    scope: string[];
    timeline: string;
    designDirection: string;
  } | null,
  accessibilityRequirements: {
    wcagLevel: string;
    specificNeeds: string[];
    assistiveTechSupport: string[];
    colorBlindConsiderations: string[];
    motionSensitivity: string;
  } | null
): string => `Evaluate the following Phase 1 (Discover) + Phase 2 (Define) output package for Gate approval.

## Research Synthesis
${researchSynthesis
    ? `**Key Findings (${researchSynthesis.keyFindings.length}):**
${researchSynthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**Competitor Landscape (${researchSynthesis.competitorLandscape.length} sites):**
${researchSynthesis.competitorLandscape.map(c => `- ${c.url}: ${c.strengths.length} strengths, ${c.weaknesses.length} weaknesses`).join('\n')}

**Design Trends (${researchSynthesis.designTrendInsights.length}):**
${researchSynthesis.designTrendInsights.slice(0, 5).map((t, i) => `${i + 1}. ${t}`).join('\n')}

**User Behavior Patterns (${researchSynthesis.userBehaviorPatterns.length}):**
${researchSynthesis.userBehaviorPatterns.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Recommendations (${researchSynthesis.recommendations.length}):**
${researchSynthesis.recommendations.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n')}`
    : 'NO RESEARCH SYNTHESIS AVAILABLE — this is a critical gap.'}

## Personas
${personas && personas.length > 0
    ? personas.map(p => `
**${p.name}** (${p.occupation}, Tech: ${p.techSavviness})
- Goals: ${p.goals.join('; ')}
- Frustrations: ${p.frustrations.join('; ')}
- Accessibility Needs: ${p.accessibilityNeeds.length > 0 ? p.accessibilityNeeds.join('; ') : 'None specified'}
- Quote: "${p.quote}"`).join('\n')
    : 'NO PERSONAS GENERATED — this is a critical gap.'}

## Journey Maps
${journeyMaps && journeyMaps.length > 0
    ? journeyMaps.map(jm => `
**${jm.personaName}'s Journey:**
${jm.phases.map(p => `  ${p.name}: ${p.touchpoints.length} touchpoints, ${p.painPoints.length} pain points, ${p.opportunities.length} opportunities`).join('\n')}`).join('\n')
    : 'NO JOURNEY MAPS — this is a significant gap.'}

## Design Principles
${designPrinciples && designPrinciples.length > 0
    ? designPrinciples.map((p, i) => `${i + 1}. **${p.name}**: ${p.description} (Rationale: ${p.rationale})`).join('\n')
    : 'NO DESIGN PRINCIPLES — this is a critical gap.'}

## Design Brief
${designBrief
    ? `- Project: ${designBrief.projectName}
- Goal: ${designBrief.goal}
- Target Personas: ${designBrief.targetPersonas.join(', ')}
- Constraints: ${designBrief.constraints.join('; ')}
- Success Metrics: ${designBrief.successMetrics.join('; ')}
- Scope: ${designBrief.scope.join('; ')}
- Timeline: ${designBrief.timeline}
- Design Direction: ${designBrief.designDirection}`
    : 'NO DESIGN BRIEF — this is a critical gap.'}

## Accessibility Requirements
${accessibilityRequirements
    ? `- WCAG Level: ${accessibilityRequirements.wcagLevel}
- Specific Needs: ${accessibilityRequirements.specificNeeds.join('; ')}
- Assistive Tech Support: ${accessibilityRequirements.assistiveTechSupport.join('; ')}
- Color Blind Considerations: ${accessibilityRequirements.colorBlindConsiderations.join('; ')}
- Motion Sensitivity: ${accessibilityRequirements.motionSensitivity}`
    : 'NO ACCESSIBILITY REQUIREMENTS — this is a significant gap.'}

Evaluate this package rigorously. Score each dimension, identify missing elements, flag warnings, and make a clear gate decision. Do not approve if the research foundation is weak — it will only compound downstream.`;
