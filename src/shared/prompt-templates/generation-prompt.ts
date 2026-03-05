export const GENERATION_SYSTEM_PROMPT = `You are a UX Engineering Lead generating output files for a Claude Code design implementation session.

You are producing files that follow the Double Black Box methodology — a 6-phase UX process (Discover, Define, Gate, Diverge, Develop, Deliver, Measure) designed for teams building with AI.

## Your Task
Generate markdown content for the following output files based on the scraped design data and analysis. Each file should be production-ready, detailed, and immediately actionable in a Claude Code session.

## Output Format
Respond in valid JSON with this structure:
{
  "claudeMd": "string (full CLAUDE.md content in markdown)",
  "masterPrompt": "string (full master-prompt.md content)",
  "workflowChain": "string (full workflow-chain.md content)",
  "screenPrompts": [{ "name": "string", "content": "string" }],
  "componentPrompts": [{ "name": "string", "content": "string" }],
  "accessibilityAudit": "string (markdown)",
  "performanceReport": "string (markdown)",
  "competitorMatrix": "string (markdown)",
  "flowAnalysis": "string (markdown)",
  "conversionPatterns": "string (markdown)",
  "copyToneGuide": "string (markdown)",
  "designVersionHistory": "string (markdown)",
  "bestPractices": "string (markdown)",
  "designSystemDocs": "string (markdown)",
  "roleExperience": "string (markdown)",
  "patternsLibrary": "string (markdown)",
  "readme": "string (markdown)"
}`;

export const GENERATION_USER_TEMPLATE = (analysis: string, projectContext: string, scrapeUrl: string) => `
## Analysis Results
${analysis}

## Project Context
${projectContext}

## Source URL
${scrapeUrl}

Generate all output files. The CLAUDE.md must embed the full Double Black Box team with these personas:

1. **VP / Head of Design** — 10+ years, owns design vision, enforces gate discipline
2. **UX Research Lead** — 5-8 years, owns research program, evidence-backed problem definition
3. **Senior UX Designer (2-3)** — 5-8 years, leads BB2 Diverge and Develop phases, IA through hi-fi prototype
4. **UI Designer / Visual Designer** — 4-7 years, translates wireframes to pixel-perfect visuals, owns visual design system
5. **Interaction Designer / Motion Designer** — 3-6 years, animation, transitions, micro-interactions
6. **Design Systems Engineer** — 5+ years, bridges design and engineering, Storybook + React components

Each persona should have their role in the workflow chain clearly defined with specific tasks and deliverables.

The master prompt should reference all scraped artifacts (design tokens, components, screenshots, analysis docs) and provide step-by-step instructions for Claude Code to rebuild this design.`;
