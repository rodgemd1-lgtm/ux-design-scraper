import {
  WCAG_GUIDELINES,
  INTERACTION_PRINCIPLES,
  COMPONENT_BLUEPRINTS,
  formatWCAGForPrompt,
  formatInteractionPrinciplesForPrompt,
  formatBlueprintsForPrompt,
} from '@shared/ux-knowledge-base';

export const DEFINE_PHASE_SYSTEM_PROMPT = `You are a UX Research Lead executing Phase 02 DEFINE of the Double Black Box Method. Your role is to converge the research synthesis into actionable design artifacts: design principles, a structured design brief, and accessibility requirements.

You transform raw research findings into the constraints and guardrails that will guide all design decisions in Black Box 2. Your outputs must be specific enough to evaluate design work against, yet broad enough to allow creative exploration.

Your methodology:
1. **Design Principles** — Derive 4-6 principles directly from research evidence. Each principle should be falsifiable (you can tell when a design violates it) and actionable (it guides specific decisions).
2. **Design Brief** — Create a structured brief that locks the problem space. Include clear goals, target personas, constraints, success metrics, scope boundaries, timeline, and design direction.
3. **Accessibility Requirements** — Define specific WCAG level targets and accessibility needs based on persona analysis and audit data. Go beyond generic compliance to address the actual needs of the identified user segments.

## Output Format
Respond with a valid JSON object matching this schema:
{
  "designPrinciples": [
    {
      "name": "string (short, memorable principle name)",
      "description": "string (what this principle means in practice)",
      "rationale": "string (specific research evidence supporting this principle)"
    }
  ],
  "designBrief": {
    "projectName": "string",
    "goal": "string (specific, measurable goal)",
    "targetPersonas": ["string (persona name and key characteristic)"],
    "constraints": ["string (hard constraint that cannot be violated)"],
    "successMetrics": ["string (measurable metric with target value)"],
    "scope": ["string (what is in scope for this design phase)"],
    "timeline": "string (estimated timeline with milestones)",
    "designDirection": "string (high-level stylistic direction based on research)"
  },
  "accessibilityRequirements": {
    "wcagLevel": "A" | "AA" | "AAA",
    "specificNeeds": ["string (specific accessibility need from persona analysis)"],
    "assistiveTechSupport": ["string (assistive technology to support)"],
    "colorBlindConsiderations": ["string (specific color blind accommodation)"],
    "motionSensitivity": "string (motion/animation policy)"
  }
}

Every element must trace back to specific research data. No generic principles.`;

export const DEFINE_JOURNEY_MAP_SYSTEM_PROMPT = `You are a UX Researcher specializing in journey mapping. Given a set of user personas and research data, create detailed journey maps that trace each persona's experience across discovery, evaluation, conversion, and retention phases.

Each journey map must include concrete touchpoints, realistic emotional arcs, specific pain points grounded in the design analysis, and actionable opportunities that align with the design direction.

## Output Format
Respond with a valid JSON array of journey maps:
[
  {
    "personaName": "string",
    "phases": [
      {
        "name": "string (discover | evaluate | convert | retain)",
        "touchpoints": ["string (specific touchpoint)"],
        "thoughts": ["string (what the persona is thinking)"],
        "emotions": "string (emotional state description)",
        "painPoints": ["string (specific pain point from design analysis)"],
        "opportunities": ["string (specific design opportunity)"]
      }
    ]
  }
]`;

export const buildDefineUserPrompt = (
  researchSynthesis: {
    keyFindings: string[];
    competitorLandscape: Array<{ url: string; strengths: string[]; weaknesses: string[] }>;
    designTrendInsights: string[];
    userBehaviorPatterns: string[];
    recommendations: string[];
  },
  personas: Array<{ name: string; occupation: string; goals: string[]; frustrations: string[] }> | null,
  scrapeData: {
    url: string;
    accessibilityScore: number;
    wcagLevel: string;
    contrastIssues: number;
    missingAltText: number;
    componentCount: number;
    colorCount: number;
    fontFamilies: string[];
    conversionPatternCount: number;
    performanceScore: number;
  } | null
): string => `Generate design principles, a design brief, and accessibility requirements based on the following research and data.

## Research Synthesis
**Key Findings:**
${researchSynthesis.keyFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}

**Competitor Landscape:**
${researchSynthesis.competitorLandscape.map(c => `- ${c.url}: Strengths [${c.strengths.join('; ')}], Weaknesses [${c.weaknesses.join('; ')}]`).join('\n')}

**Design Trend Insights:**
${researchSynthesis.designTrendInsights.map((t, i) => `${i + 1}. ${t}`).join('\n')}

**User Behavior Patterns:**
${researchSynthesis.userBehaviorPatterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

**Research Recommendations:**
${researchSynthesis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Personas
${personas && personas.length > 0
    ? personas.map(p => `- **${p.name}** (${p.occupation}): Goals [${p.goals.join('; ')}], Frustrations [${p.frustrations.join('; ')}]`).join('\n')
    : 'Personas will be generated in a prior step. Use research data to infer target user segments.'}

## Design Data from Primary Site
${scrapeData
    ? `- URL: ${scrapeData.url}
- Accessibility: ${scrapeData.accessibilityScore}/100 (WCAG ${scrapeData.wcagLevel}), ${scrapeData.contrastIssues} contrast issues, ${scrapeData.missingAltText} missing alt texts
- Components: ${scrapeData.componentCount} total
- Visual: ${scrapeData.colorCount} colors, fonts: ${scrapeData.fontFamilies.join(', ')}
- Conversion: ${scrapeData.conversionPatternCount} patterns detected
- Performance: Lighthouse ${scrapeData.performanceScore}/100`
    : 'No primary site data available.'}

## WCAG Accessibility Guidelines Reference
Use these guidelines to define specific, measurable accessibility requirements:
${formatWCAGForPrompt(WCAG_GUIDELINES, 'AA')}

## Component Blueprints for Design Brief
Reference these component patterns when defining the design brief scope and constraints:
${formatBlueprintsForPrompt(COMPONENT_BLUEPRINTS)}

Derive design principles that are specific and testable. Create a design brief that locks the problem space. Define accessibility requirements that go beyond generic compliance to address actual user needs identified in the research. Reference specific WCAG criteria and component blueprints in your outputs.`;

export const buildJourneyMapUserPrompt = (
  personas: Array<{ name: string; occupation: string; goals: string[]; frustrations: string[]; behavioralPatterns: string[] }>,
  researchSynthesis: {
    keyFindings: string[];
    userBehaviorPatterns: string[];
  },
  scrapeData: {
    url: string;
    navigationDepth: number;
    stepsToConversion: number;
    frictionPoints: Array<{ step: number; description: string; severity: number }>;
    ctaLabels: string[];
  } | null
): string => `Create detailed journey maps for each persona based on the research data and design analysis.

## Personas
${personas.map(p => `
**${p.name}** (${p.occupation})
- Goals: ${p.goals.join('; ')}
- Frustrations: ${p.frustrations.join('; ')}
- Behavioral Patterns: ${p.behavioralPatterns.join('; ')}`).join('\n')}

## Key Research Findings
${researchSynthesis.keyFindings.slice(0, 5).map((f, i) => `${i + 1}. ${f}`).join('\n')}

## User Behavior Patterns
${researchSynthesis.userBehaviorPatterns.slice(0, 5).map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Design Analysis
${scrapeData
    ? `- URL: ${scrapeData.url}
- Navigation Depth: ${scrapeData.navigationDepth} levels
- Steps to Conversion: ${scrapeData.stepsToConversion}
- Friction Points: ${scrapeData.frictionPoints.map(fp => `Step ${fp.step}: ${fp.description} (severity ${fp.severity}/10)`).join('; ')}
- CTA Labels: ${scrapeData.ctaLabels.join(', ')}`
    : 'No design analysis data available.'}

## Interaction Design Principles
Apply these principles when mapping touchpoints and identifying opportunities:
${formatInteractionPrinciplesForPrompt(INTERACTION_PRINCIPLES)}

Map each persona through discover, evaluate, convert, and retain phases. Ground touchpoints and pain points in the actual design data. Apply interaction design principles when identifying opportunities for improvement.`;
