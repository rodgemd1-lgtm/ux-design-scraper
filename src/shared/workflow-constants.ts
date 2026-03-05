import type { WorkflowPhaseId, PhaseState } from './workflow-types';

// ===== Phase Definitions =====
export const WORKFLOW_PHASES: Record<WorkflowPhaseId, Pick<PhaseState, 'id' | 'name' | 'description' | 'blackBox'>> = {
  discover: {
    id: 'discover',
    name: 'Discover',
    description: 'BB1 Diverge — Research & data gathering. Brave deep search, multi-site scrape, trend analysis, knowledge enrichment.',
    blackBox: 1,
  },
  define: {
    id: 'define',
    name: 'Define',
    description: 'BB1 Converge — Personas, journey maps, design principles, design brief, accessibility requirements.',
    blackBox: 1,
  },
  gate: {
    id: 'gate',
    name: 'Gate',
    description: 'Review & approval checkpoint. All BB1 outputs reviewed before entering BB2.',
    blackBox: 'gate',
  },
  diverge: {
    id: 'diverge',
    name: 'Diverge',
    description: 'BB2 Diverge — Generate 3-5 design directions, moodboards, critique, competitive positioning.',
    blackBox: 2,
  },
  develop: {
    id: 'develop',
    name: 'Develop',
    description: 'BB2 Build — Component reconstruction, design system, copy rewriting, Storybook, prototype.',
    blackBox: 2,
  },
  deliver: {
    id: 'deliver',
    name: 'Deliver',
    description: 'BB2 Converge — CLAUDE.md, Figma tokens, performance budget, accessibility report, output folder.',
    blackBox: 2,
  },
  measure: {
    id: 'measure',
    name: 'Measure',
    description: 'Post-ship — A/B test plans, heatmap analysis, performance monitoring, iteration roadmap.',
    blackBox: 'measure',
  },
};

// ===== Phase Order =====
export const PHASE_ORDER: WorkflowPhaseId[] = [
  'discover', 'define', 'gate', 'diverge', 'develop', 'deliver', 'measure',
];

// ===== Phase Steps Definitions =====
export const PHASE_STEPS: Record<WorkflowPhaseId, Array<{ id: string; name: string; description: string; engineCall: string; outputKey: string }>> = {
  discover: [
    { id: 'deep-search', name: 'Deep Search', description: 'Multi-round Brave search for industry, competitors, and trends', engineCall: 'braveDeepSearch', outputKey: 'deepSearchResult' },
    { id: 'multi-site-scrape', name: 'Multi-Site Scrape', description: 'Scrape 3-5 target websites for design data', engineCall: 'multiSiteScrape', outputKey: 'multiSiteResult' },
    { id: 'heatmap-fetch', name: 'Heatmap Fetch', description: 'Fetch behavioral analytics from Hotjar/FullStory', engineCall: 'heatmapFetch', outputKey: 'heatmapData' },
    { id: 'trend-search', name: 'Trend Research', description: 'Search for industry design trends and innovations', engineCall: 'trendSearch', outputKey: 'trendData' },
    { id: 'knowledge-enrichment', name: 'Knowledge Enrichment', description: 'Enrich findings with best practices via Brave + Claude', engineCall: 'knowledgeEnrichment', outputKey: 'enrichedKnowledge' },
    { id: 'research-synthesis', name: 'Research Synthesis', description: 'Claude synthesizes all research into key findings', engineCall: 'researchSynthesis', outputKey: 'researchSynthesis' },
    { id: 'inspiration-analysis', name: 'Inspiration Analysis', description: 'Analyze scraped designs for patterns, trends, and differentiation opportunities', engineCall: 'inspirationAnalysis', outputKey: 'inspirationAnalysis' },
  ],
  define: [
    { id: 'persona-generation', name: 'Persona Generation', description: 'Generate 3-5 user personas from scraped data', engineCall: 'personaGeneration', outputKey: 'personas' },
    { id: 'journey-mapping', name: 'Journey Mapping', description: 'Create detailed user journey maps per persona', engineCall: 'journeyMapping', outputKey: 'journeyMaps' },
    { id: 'design-principles', name: 'Design Principles', description: 'Derive design principles from research synthesis', engineCall: 'designPrinciples', outputKey: 'designPrinciples' },
    { id: 'design-brief', name: 'Design Brief', description: 'Generate structured design brief with goals and constraints', engineCall: 'designBrief', outputKey: 'designBrief' },
    { id: 'accessibility-requirements', name: 'Accessibility Requirements', description: 'Define a11y requirements based on personas and audit data', engineCall: 'accessibilityRequirements', outputKey: 'accessibilityRequirements' },
    { id: 'spec-requirements', name: 'Requirements Specification', description: 'Generate structured requirements with user stories and acceptance criteria', engineCall: 'specRequirements', outputKey: 'specRequirements' },
  ],
  gate: [
    { id: 'compile-review-package', name: 'Compile Review Package', description: 'Assemble all Phase 1+2 outputs into a review format', engineCall: 'compileReviewPackage', outputKey: 'reviewPackage' },
    { id: 'quality-validation', name: 'Quality Validation', description: 'Automated quality checks on research and definitions', engineCall: 'qualityValidation', outputKey: 'qualityValidation' },
    { id: 'await-approval', name: 'Await Approval', description: 'Pause for user review and approval', engineCall: 'awaitApproval', outputKey: 'gateDecision' },
  ],
  diverge: [
    { id: 'design-directions', name: 'Design Directions', description: 'Generate 3-5 design direction concepts', engineCall: 'designDirections', outputKey: 'designDirections' },
    { id: 'moodboard-generation', name: 'Moodboard Generation', description: 'Create moodboards with AI image prompts per direction', engineCall: 'moodboardGeneration', outputKey: 'moodboards' },
    { id: 'design-critique', name: 'Design Critique', description: 'Critique the best scraped site against design brief', engineCall: 'designCritique', outputKey: 'designCritique' },
    { id: 'competitive-positioning', name: 'Competitive Positioning', description: 'Analyze market gaps and opportunities', engineCall: 'competitivePositioning', outputKey: 'competitivePositioning' },
    { id: 'direction-ranking', name: 'Direction Ranking', description: 'Rank design directions against approved brief', engineCall: 'directionRanking', outputKey: 'directionRankings' },
  ],
  develop: [
    { id: 'component-reconstruction', name: 'Component Reconstruction', description: 'Convert scraped HTML/CSS to React + Tailwind', engineCall: 'componentReconstruction', outputKey: 'reconstructedComponents' },
    { id: 'design-system-generation', name: 'Design System', description: 'Generate normalized design system from tokens', engineCall: 'designSystemGeneration', outputKey: 'designSystem' },
    { id: 'copy-rewriting', name: 'Copy Rewriting', description: 'Rewrite copy for brand voice alignment', engineCall: 'copyRewriting', outputKey: 'rewrittenCopy' },
    { id: 'storybook-generation', name: 'Storybook Stories', description: 'Generate CSF3 stories for each component', engineCall: 'storybookGeneration', outputKey: 'storybookStories' },
    { id: 'prototype-generation', name: 'Prototype', description: 'Generate interactive HTML prototype', engineCall: 'prototypeGeneration', outputKey: 'prototype' },
    { id: 'spec-design', name: 'Design Specification', description: 'Generate architecture and component design specification', engineCall: 'specDesign', outputKey: 'specDesign' },
    { id: 'spec-tasks', name: 'Task Decomposition', description: 'Decompose design into atomic implementation tasks', engineCall: 'specTasks', outputKey: 'specTasks' },
    { id: 'design-review', name: 'Design Review', description: 'AI self-review of generated components against design principles', engineCall: 'designReview', outputKey: 'designReview' },
  ],
  deliver: [
    { id: 'generate-claude-md', name: 'Generate CLAUDE.md', description: 'Create master CLAUDE.md with all artifacts', engineCall: 'generateClaudeMd', outputKey: 'claudeMd' },
    { id: 'generate-figma-tokens', name: 'Figma Tokens', description: 'Export Figma Tokens + Style Dictionary format', engineCall: 'generateFigmaTokens', outputKey: 'figmaTokens' },
    { id: 'generate-performance-budget', name: 'Performance Budget', description: 'Generate performance budget with Lighthouse CI config', engineCall: 'generatePerformanceBudget', outputKey: 'performanceBudget' },
    { id: 'generate-accessibility-report', name: 'Accessibility Report', description: 'Compile comprehensive accessibility audit report', engineCall: 'generateAccessibilityReport', outputKey: 'accessibilityReport' },
    { id: 'handoff-package', name: 'Developer Handoff', description: 'Generate comprehensive developer handoff package with specs, a11y guide, and testing requirements', engineCall: 'handoffPackage', outputKey: 'handoffPackage' },
    { id: 'final-design-review', name: 'Final Design Review', description: 'Comprehensive design review before final output generation', engineCall: 'finalDesignReview', outputKey: 'finalDesignReview' },
    { id: 'generate-output-folder', name: 'Output Folder', description: 'Generate complete folder structure on Desktop', engineCall: 'generateOutputFolder', outputKey: 'outputManifest' },
    { id: 'generate-analysis-docs', name: 'Analysis Docs', description: 'Generate all analysis markdown documents', engineCall: 'generateAnalysisDocs', outputKey: 'analysisDocs' },
  ],
  measure: [
    { id: 'ab-test-generation', name: 'A/B Test Plans', description: 'Generate prioritized A/B test experiments', engineCall: 'abTestGeneration', outputKey: 'abTestPlan' },
    { id: 'heatmap-analysis', name: 'Heatmap Analysis', description: 'Analyze behavioral data and produce insights', engineCall: 'heatmapAnalysis', outputKey: 'heatmapAnalysis' },
    { id: 'performance-monitoring', name: 'Performance Monitoring', description: 'Generate monitoring setup guide', engineCall: 'performanceMonitoring', outputKey: 'performanceMonitoring' },
    { id: 'iteration-roadmap', name: 'Iteration Roadmap', description: 'Generate prioritized iteration experiments', engineCall: 'iterationRoadmap', outputKey: 'iterationRoadmap' },
  ],
};

// ===== Storage Keys =====
export const STORAGE_KEYS_WORKFLOW = {
  WORKFLOW_SESSION: 'ux_scraper_workflow_session',
  WORKFLOW_HISTORY: 'ux_scraper_workflow_history',
} as const;

// ===== Timeouts =====
export const WORKFLOW_TIMEOUTS = {
  PHASE_STEP: 120000,       // 2 minutes per step
  PHASE_TOTAL: 600000,      // 10 minutes per phase
  GATE_REVIEW: 0,           // No timeout — user-driven
  CLAUDE_CALL: 90000,       // 90 seconds per Claude API call
} as const;
