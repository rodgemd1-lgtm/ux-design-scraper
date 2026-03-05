import {
  DESIGN_STYLES,
  INDUSTRY_PALETTES,
  TYPOGRAPHY_PAIRINGS,
  LANDING_PATTERNS,
  INDUSTRY_REASONING,
  matchIndustryKey,
  formatStyleForPrompt,
  formatTypographyForPrompt,
  formatPaletteForPrompt,
} from '@shared/industry-design-data';

export const DIVERGE_PHASE_SYSTEM_PROMPT = `You are a team of Senior UX Designers executing Phase 04 DIVERGE of the Double Black Box Method. Your mission is to generate 3-5 distinct, viable design directions that each solve the design brief in a fundamentally different way.

This is the creative exploration phase. You are NOT converging yet — you are expanding the solution space as wide as possible while staying within the constraints defined in the approved design brief. Each direction should be a legitimate candidate for the final design, not a strawman.

Your design direction generation process:
1. **Analyze the design brief** — Extract the core constraints, goals, and success metrics that each direction must satisfy
2. **Study the competitive landscape** — Identify gaps and opportunities. Where is the market converging? Where can you diverge?
3. **Consider the personas** — Each direction should resonate with the primary personas, but may emphasize different aspects of their needs
4. **Explore different design philosophies** — One direction might be minimal and content-focused, another might be interactive and engagement-driven, a third might prioritize accessibility and universal design
5. **Ground in real design decisions** — Each direction should specify concrete color, typography, and layout choices, not abstract mood words

## Output Format
Respond with a valid JSON object:
{
  "directions": [
    {
      "name": "string (memorable 2-3 word direction name)",
      "description": "string (1-2 paragraph narrative describing this direction's design philosophy and how it solves the brief)",
      "moodKeywords": ["string (5-8 mood/aesthetic keywords)"],
      "colorDirection": {
        "primary": "string (hex color with rationale)",
        "secondary": "string (hex color with rationale)",
        "accent": "string (hex color with rationale)",
        "rationale": "string (why this color palette serves the brief)"
      },
      "typographyDirection": {
        "headingFont": "string (specific font name with rationale)",
        "bodyFont": "string (specific font name with rationale)",
        "rationale": "string (why this type pairing serves the brief)"
      },
      "layoutApproach": "string (specific layout strategy: grid density, whitespace philosophy, content hierarchy approach)",
      "differentiator": "string (what makes this direction unique compared to competitors)",
      "riskAssessment": "string (potential risks or challenges with this direction)"
    }
  ]
}

Generate 3-5 directions. Each must be distinct enough that you could immediately tell which direction a design comp belongs to. Avoid generic directions — be specific and opinionated.`;

export const buildDivergeUserPrompt = (
  designBrief: {
    projectName: string;
    goal: string;
    targetPersonas: string[];
    constraints: string[];
    successMetrics: string[];
    designDirection: string;
  },
  personas: Array<{
    name: string;
    occupation: string;
    goals: string[];
    frustrations: string[];
    techSavviness: string;
  }>,
  researchSynthesis: {
    keyFindings: string[];
    competitorLandscape: Array<{ url: string; strengths: string[]; weaknesses: string[] }>;
    designTrendInsights: string[];
    recommendations: string[];
  },
  scrapedDesignData: {
    colorCount: number;
    topColors: string[];
    fontFamilies: string[];
    componentTypes: string[];
    layoutType: string;
    containerMaxWidth: string;
    accessibilityScore: number;
    performanceScore: number;
  } | null,
  industry?: string
): string => `Generate 3-5 distinct design directions based on the approved design brief, personas, and research.

## Approved Design Brief
- Project: ${designBrief.projectName}
- Goal: ${designBrief.goal}
- Target Personas: ${designBrief.targetPersonas.join(', ')}
- Constraints: ${designBrief.constraints.join('; ')}
- Success Metrics: ${designBrief.successMetrics.join('; ')}
- Design Direction Guidance: ${designBrief.designDirection}

## Personas
${personas.map(p => `
**${p.name}** (${p.occupation}, Tech: ${p.techSavviness})
- Goals: ${p.goals.join('; ')}
- Frustrations: ${p.frustrations.join('; ')}`).join('\n')}

## Research Synthesis
**Key Findings:** ${researchSynthesis.keyFindings.slice(0, 5).join('; ')}

**Competitor Landscape:**
${researchSynthesis.competitorLandscape.slice(0, 5).map(c => `- ${c.url}: Strengths [${c.strengths.slice(0, 3).join('; ')}], Weaknesses [${c.weaknesses.slice(0, 3).join('; ')}]`).join('\n')}

**Design Trends:** ${researchSynthesis.designTrendInsights.slice(0, 5).join('; ')}
**Top Recommendations:** ${researchSynthesis.recommendations.slice(0, 3).join('; ')}

## Current Design Data (Baseline)
${scrapedDesignData
    ? `- Colors: ${scrapedDesignData.colorCount} unique (top: ${scrapedDesignData.topColors.join(', ')})
- Fonts: ${scrapedDesignData.fontFamilies.join(', ')}
- Components: ${scrapedDesignData.componentTypes.join(', ')}
- Layout: ${scrapedDesignData.layoutType}, max-width ${scrapedDesignData.containerMaxWidth}
- Accessibility: ${scrapedDesignData.accessibilityScore}/100
- Performance: ${scrapedDesignData.performanceScore}/100`
    : 'No baseline design data available.'}

## Industry-Matched Design Styles
${(() => {
  const key = matchIndustryKey(industry || designBrief.designDirection || 'general');
  if (!key || !INDUSTRY_REASONING[key]) return 'No specific industry style matches. Explore diverse approaches.';
  const reasoning = INDUSTRY_REASONING[key];
  const styles = reasoning.recommendedStyles
    .map(s => DESIGN_STYLES[s.toLowerCase().replace(/\s+/g, '-')])
    .filter(Boolean)
    .slice(0, 4);
  if (styles.length === 0) return 'No specific industry style matches. Explore diverse approaches.';
  return `Consider these design style approaches:\n${styles.map(s => formatStyleForPrompt(s)).join('\n\n')}`;
})()}

## Industry Typography Pairings
${(() => {
  const key = matchIndustryKey(industry || designBrief.designDirection || '');
  const matched = key ? TYPOGRAPHY_PAIRINGS.filter(p => p.useCases.some(u => u.toLowerCase().includes(key.toLowerCase()))).slice(0, 3) : [];
  if (matched.length === 0) return 'No specific industry typography match. Choose pairings that align with the design direction mood.';
  return `Recommended pairings for this industry:\n${matched.map(p => formatTypographyForPrompt(p)).join('\n\n')}`;
})()}

## Industry Color Palettes
${(() => {
  const key = matchIndustryKey(industry || designBrief.designDirection || '');
  if (!key || !INDUSTRY_PALETTES[key]) return 'No specific industry palette match. Build palettes from the design direction rationale.';
  return `Recommended palette for this industry:\n${formatPaletteForPrompt(key, INDUSTRY_PALETTES[key])}`;
})()}

## Landing Page Patterns Reference
Use these proven patterns to inform layout approaches for each direction:
${LANDING_PATTERNS.slice(0, 3).map(p => `**${p.name}**: ${p.description}\n  Layout: ${p.layout}\n  CTA: ${p.ctaStrategy}\n  Components: ${p.components.join(', ')}`).join('\n\n')}

Generate distinct design directions. Each should take a different creative approach while satisfying all brief constraints. Be specific about colors (provide hex values), typography (name real fonts), and layout strategy. Use the industry-matched data above as starting points but differentiate each direction.`;

export const DIVERGE_MOODBOARD_SYSTEM_PROMPT = `You are a Visual Design Director creating moodboards for design directions. For each direction, generate a set of image prompts (for AI image generation), style descriptions, color palettes, and reference URLs that capture the aesthetic vision.

## Output Format
Respond with a valid JSON array:
[
  {
    "directionName": "string",
    "imagePrompts": ["string (detailed AI image generation prompt for the aesthetic)"],
    "styleDescription": "string (narrative description of the visual style)",
    "colorPalette": ["string (hex colors)"],
    "referenceUrls": ["string (real website URLs that exemplify this aesthetic)"]
  }
]`;

export const buildMoodboardUserPrompt = (
  directions: Array<{
    name: string;
    description: string;
    moodKeywords: string[];
    colorDirection: { primary: string; secondary: string; accent: string };
    typographyDirection: { headingFont: string; bodyFont: string };
  }>,
  industry: string
): string => `Create moodboards for the following design directions in the ${industry} space.

${directions.map((d, i) => `
## Direction ${i + 1}: ${d.name}
${d.description}
Mood: ${d.moodKeywords.join(', ')}
Colors: ${d.colorDirection.primary}, ${d.colorDirection.secondary}, ${d.colorDirection.accent}
Typography: ${d.typographyDirection.headingFont} / ${d.typographyDirection.bodyFont}`).join('\n')}

For each direction, generate 3-4 AI image prompts that capture the aesthetic, a style description, a full color palette (5-7 colors), and 2-3 real website URLs that exemplify the visual approach.`;
