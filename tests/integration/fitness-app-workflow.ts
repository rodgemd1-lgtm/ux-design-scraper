/**
 * Integration Test: Full 7-Phase Fitness App Workflow
 *
 * Runs the complete Double Black Box design workflow:
 * Phase 1 (BB1): Discover -> Define -> Gate
 * Phase 2 (BB2): Diverge -> Develop -> Deliver -> Measure
 *
 * Uses "fitness apps" (Nike NTC, Strava, MyFitnessPal) as design focus.
 * Validates artifact shape at each phase checkpoint.
 *
 * Run with: npx tsx tests/integration/fitness-app-workflow.ts
 *
 * Requires:
 *   CLAUDE_API_KEY env var set (Anthropic API key)
 *   Brave API key is hardcoded (same as fitness-app-scrape.ts)
 */

import { chromium, type Page, type Browser } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Configuration
// ============================================================
const BRAVE_API_KEY = 'BSAMzAwCT-JDvUqAecBy6006SLqLqp9';
const PROJECT_NAME = 'fitness-app-workflow';
const OUTPUT_DIR = path.join(process.env.HOME || '~', 'Desktop', PROJECT_NAME);
const TARGET_URLS = [
  'https://www.nike.com/ntc-app',
  'https://www.myfitnesspal.com',
  'https://www.strava.com',
];

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
const STEP_TIMEOUT = 120_000; // 120s per step

// ============================================================
// Inline Types (avoid import path issues with @shared aliases)
// ============================================================
interface TokenEntry { value: string; count: number; contexts: string[]; }
interface DesignTokens {
  colors: TokenEntry[];
  spacing: TokenEntry[];
  shadows: TokenEntry[];
  borderRadii: TokenEntry[];
  zIndices: TokenEntry[];
  opacities: TokenEntry[];
}
interface FontEntry { family: string; count: number; }
interface FontSizeEntry { size: string; element: string; count: number; }
interface FontWeightEntry { weight: string; count: number; }
interface LineHeightEntry { value: string; count: number; }
interface TypographySystem {
  fontFamilies: FontEntry[];
  fontSizes: FontSizeEntry[];
  fontWeights: FontWeightEntry[];
  lineHeights: LineHeightEntry[];
  letterSpacings: { value: string; count: number }[];
}
interface ComponentData {
  componentName: string;
  componentType: string;
  htmlCode: string;
  cssCode: string;
  selector: string;
  stateVariants: Record<string, unknown>;
  accessibilityData: Record<string, unknown>;
  scores: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
interface AccessibilityAudit {
  overallScore: number;
  wcagLevel: string;
  contrastIssues: { element: string; foreground: string; background: string; ratio: number; level: string; }[];
  missingAltText: { element: string; src: string; }[];
  missingAriaLabels: string[];
  tabOrderIssues: string[];
  semanticIssues: string[];
  focusIndicatorsMissing: string[];
}
interface BraveResult { title: string; url: string; description: string; }

interface ProjectContext {
  goal: string;
  industry: string;
  targetAudience: string;
  designStyle: string;
  competitors?: string[];
  specificComponents?: string[];
}

// Phase artifact shapes (simplified for validation)
interface PhaseResult {
  artifacts: Record<string, unknown>;
  stepsCompleted: number;
  stepsFailed: number;
  stepsTotal: number;
  duration: number;
  errors: string[];
}

// ============================================================
// Phase definitions (mirroring workflow-constants.ts)
// ============================================================
const PHASE_ORDER = ['discover', 'define', 'gate', 'diverge', 'develop', 'deliver', 'measure'] as const;
type PhaseId = typeof PHASE_ORDER[number];

const PHASE_STEPS: Record<PhaseId, Array<{ id: string; name: string; engineCall: string; outputKey: string }>> = {
  discover: [
    { id: 'deep-search', name: 'Deep Search', engineCall: 'braveDeepSearch', outputKey: 'deepSearchResult' },
    { id: 'multi-site-scrape', name: 'Multi-Site Scrape', engineCall: 'multiSiteScrape', outputKey: 'multiSiteResult' },
    { id: 'heatmap-fetch', name: 'Heatmap Fetch', engineCall: 'heatmapFetch', outputKey: 'heatmapData' },
    { id: 'trend-search', name: 'Trend Research', engineCall: 'trendSearch', outputKey: 'trendData' },
    { id: 'knowledge-enrichment', name: 'Knowledge Enrichment', engineCall: 'knowledgeEnrichment', outputKey: 'enrichedKnowledge' },
    { id: 'research-synthesis', name: 'Research Synthesis', engineCall: 'researchSynthesis', outputKey: 'researchSynthesis' },
    { id: 'inspiration-analysis', name: 'Inspiration Analysis', engineCall: 'inspirationAnalysis', outputKey: 'inspirationAnalysis' },
  ],
  define: [
    { id: 'persona-generation', name: 'Persona Generation', engineCall: 'personaGeneration', outputKey: 'personas' },
    { id: 'journey-mapping', name: 'Journey Mapping', engineCall: 'journeyMapping', outputKey: 'journeyMaps' },
    { id: 'design-principles', name: 'Design Principles', engineCall: 'designPrinciples', outputKey: 'designPrinciples' },
    { id: 'design-brief', name: 'Design Brief', engineCall: 'designBrief', outputKey: 'designBrief' },
    { id: 'accessibility-requirements', name: 'Accessibility Requirements', engineCall: 'accessibilityRequirements', outputKey: 'accessibilityRequirements' },
    { id: 'spec-requirements', name: 'Requirements Specification', engineCall: 'specRequirements', outputKey: 'specRequirements' },
  ],
  gate: [
    { id: 'compile-review-package', name: 'Compile Review Package', engineCall: 'compileReviewPackage', outputKey: 'reviewPackage' },
    { id: 'quality-validation', name: 'Quality Validation', engineCall: 'qualityValidation', outputKey: 'qualityValidation' },
    { id: 'await-approval', name: 'Await Approval', engineCall: 'awaitApproval', outputKey: 'gateDecision' },
  ],
  diverge: [
    { id: 'design-directions', name: 'Design Directions', engineCall: 'designDirections', outputKey: 'designDirections' },
    { id: 'moodboard-generation', name: 'Moodboard Generation', engineCall: 'moodboardGeneration', outputKey: 'moodboards' },
    { id: 'design-critique', name: 'Design Critique', engineCall: 'designCritique', outputKey: 'designCritique' },
    { id: 'competitive-positioning', name: 'Competitive Positioning', engineCall: 'competitivePositioning', outputKey: 'competitivePositioning' },
    { id: 'direction-ranking', name: 'Direction Ranking', engineCall: 'directionRanking', outputKey: 'directionRankings' },
  ],
  develop: [
    { id: 'component-reconstruction', name: 'Component Reconstruction', engineCall: 'componentReconstruction', outputKey: 'reconstructedComponents' },
    { id: 'design-system-generation', name: 'Design System', engineCall: 'designSystemGeneration', outputKey: 'designSystem' },
    { id: 'copy-rewriting', name: 'Copy Rewriting', engineCall: 'copyRewriting', outputKey: 'rewrittenCopy' },
    { id: 'storybook-generation', name: 'Storybook Stories', engineCall: 'storybookGeneration', outputKey: 'storybookStories' },
    { id: 'prototype-generation', name: 'Prototype', engineCall: 'prototypeGeneration', outputKey: 'prototype' },
    { id: 'spec-design', name: 'Design Specification', engineCall: 'specDesign', outputKey: 'specDesign' },
    { id: 'spec-tasks', name: 'Task Decomposition', engineCall: 'specTasks', outputKey: 'specTasks' },
    { id: 'design-review', name: 'Design Review', engineCall: 'designReview', outputKey: 'designReview' },
  ],
  deliver: [
    { id: 'generate-claude-md', name: 'Generate CLAUDE.md', engineCall: 'generateClaudeMd', outputKey: 'claudeMd' },
    { id: 'generate-figma-tokens', name: 'Figma Tokens', engineCall: 'generateFigmaTokens', outputKey: 'figmaTokens' },
    { id: 'generate-performance-budget', name: 'Performance Budget', engineCall: 'generatePerformanceBudget', outputKey: 'performanceBudget' },
    { id: 'generate-accessibility-report', name: 'Accessibility Report', engineCall: 'generateAccessibilityReport', outputKey: 'accessibilityReport' },
    { id: 'handoff-package', name: 'Developer Handoff', engineCall: 'handoffPackage', outputKey: 'handoffPackage' },
    { id: 'final-design-review', name: 'Final Design Review', engineCall: 'finalDesignReview', outputKey: 'finalDesignReview' },
    { id: 'generate-output-folder', name: 'Output Folder', engineCall: 'generateOutputFolder', outputKey: 'outputManifest' },
    { id: 'generate-analysis-docs', name: 'Analysis Docs', engineCall: 'generateAnalysisDocs', outputKey: 'analysisDocs' },
  ],
  measure: [
    { id: 'ab-test-generation', name: 'A/B Test Plans', engineCall: 'abTestGeneration', outputKey: 'abTestPlan' },
    { id: 'heatmap-analysis', name: 'Heatmap Analysis', engineCall: 'heatmapAnalysis', outputKey: 'heatmapAnalysis' },
    { id: 'performance-monitoring', name: 'Performance Monitoring', engineCall: 'performanceMonitoring', outputKey: 'performanceMonitoring' },
    { id: 'iteration-roadmap', name: 'Iteration Roadmap', engineCall: 'iterationRoadmap', outputKey: 'iterationRoadmap' },
  ],
};

// ============================================================
// Utility: Claude API Client
// ============================================================
let structuralMode = false; // Will be set in main()

const callClaude = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  if (structuralMode) {
    // Return mock JSON that matches expected output shapes based on prompt context
    console.log('        [mock] Claude call (structural mode)');
    const sp = systemPrompt.toLowerCase();
    if (sp.includes('research') && sp.includes('synthesis')) {
      return JSON.stringify({ keyFindings: ['Mock finding 1: Fitness apps prioritize onboarding', 'Mock finding 2: Gamification drives engagement', 'Mock finding 3: Social features increase retention'], competitorLandscape: [{ url: 'https://nike.com', strengths: ['Brand recognition'], weaknesses: ['Limited free content'] }], designTrendInsights: ['Dark mode preference', 'Micro-interactions'], userBehaviorPatterns: ['Quick session preference'], recommendations: ['Focus on quick-start UX'] });
    }
    if (sp.includes('persona')) {
      return JSON.stringify([
        { name: 'Sarah Chen', ageRange: '25-34', occupation: 'Software Engineer', goals: ['Stay fit', 'Track progress'], frustrations: ['Complex apps'], techSavviness: 'high', behavioralPatterns: ['Uses app daily'], journeyMap: { phases: [] }, jobsToBeDone: ['Quick workouts'], keyScenarios: [] },
        { name: 'Mike Rivera', ageRange: '35-44', occupation: 'Marketing Manager', goals: ['Lose weight'], frustrations: ['Lack of motivation'], techSavviness: 'medium', behavioralPatterns: ['Weekend warrior'], journeyMap: { phases: [] }, jobsToBeDone: ['Meal planning'], keyScenarios: [] },
        { name: 'Lisa Park', ageRange: '18-24', occupation: 'College Student', goals: ['Build muscle'], frustrations: ['Cost'], techSavviness: 'high', behavioralPatterns: ['Social sharer'], journeyMap: { phases: [] }, jobsToBeDone: ['Find routines'], keyScenarios: [] },
        { name: 'James Wilson', ageRange: '45-54', occupation: 'Teacher', goals: ['Heart health'], frustrations: ['Intimidating gyms'], techSavviness: 'low', behavioralPatterns: ['Morning routine'], journeyMap: { phases: [] }, jobsToBeDone: ['Track vitals'], keyScenarios: [] },
      ]);
    }
    if (sp.includes('journey') && sp.includes('map')) {
      return JSON.stringify([{ personaName: 'Sarah Chen', phases: [{ name: 'Awareness', touchpoints: ['Social media'], thoughts: ['Need fitness app'], emotions: 'Curious', painPoints: ['Too many options'], opportunities: ['Simplify choice'] }] }]);
    }
    if (sp.includes('design principles') || sp.includes('design brief')) {
      return JSON.stringify({ designPrinciples: [{ name: 'Motion First', description: 'Prioritize movement', rationale: 'Core value' }, { name: 'Simple Progress', description: 'Clear metrics', rationale: 'Motivation driver' }, { name: 'Social Accountability', description: 'Community features', rationale: 'Retention' }], designBrief: { projectName: PROJECT_NAME, goal: 'Create the best fitness app experience', targetPersonas: ['Sarah Chen', 'Mike Rivera'], constraints: ['Mobile-first', 'WCAG AA'], successMetrics: ['DAU increase', 'Session length'], scope: ['Workout tracking', 'Meal planning'], timeline: '8 weeks', designDirection: 'Energetic and motivating' }, accessibilityRequirements: { wcagLevel: 'AA', specificNeeds: ['High contrast', 'Large touch targets'], assistiveTechSupport: ['VoiceOver', 'TalkBack'], colorBlindConsiderations: ['Deuteranopia-safe palette'], motionSensitivity: 'Reduced motion support' } });
    }
    if (sp.includes('gate') || sp.includes('review package')) {
      return JSON.stringify({ researchSummary: 'Comprehensive research completed across 3 fitness apps', personaSummary: '4 personas generated covering key user segments', briefSummary: 'Design brief targets mobile-first fitness experience', qualityChecks: [{ check: 'Research depth', passed: true, details: '30+ search results' }, { check: 'Persona coverage', passed: true, details: '4 personas' }], readinessScore: 92, missingElements: [], warnings: ['Consider adding more competitive analysis'] });
    }
    if (sp.includes('design direction')) {
      return JSON.stringify([
        { name: 'Energetic Pulse', description: 'Bold colors and dynamic animations', moodKeywords: ['vibrant', 'dynamic'], colorDirection: { primary: '#FF4500', secondary: '#1A1A2E', accent: '#00D4FF', rationale: 'Energy + contrast' }, typographyDirection: { headingFont: 'Montserrat', bodyFont: 'Inter', rationale: 'Modern and readable' }, layoutApproach: 'Card-based with hero sections', differentiator: 'Animated progress rings', riskAssessment: 'May feel overwhelming', score: 88 },
        { name: 'Zen Flow', description: 'Minimal, calm, breathing room', moodKeywords: ['serene', 'focused'], colorDirection: { primary: '#2D5016', secondary: '#F5F1EB', accent: '#C49B66', rationale: 'Natural calm' }, typographyDirection: { headingFont: 'Playfair Display', bodyFont: 'Lato', rationale: 'Elegant readability' }, layoutApproach: 'Whitespace-heavy single column', differentiator: 'Breathing exercises integrated', riskAssessment: 'May feel too sparse', score: 75 },
        { name: 'Social Surge', description: 'Community-first with gamification', moodKeywords: ['social', 'competitive'], colorDirection: { primary: '#6C5CE7', secondary: '#FFEAA7', accent: '#FD79A8', rationale: 'Playful energy' }, typographyDirection: { headingFont: 'Poppins', bodyFont: 'Nunito', rationale: 'Friendly and approachable' }, layoutApproach: 'Feed-based with leaderboards', differentiator: 'Team challenges', riskAssessment: 'Privacy concerns', score: 82 },
      ]);
    }
    if (sp.includes('moodboard')) {
      return JSON.stringify([{ directionName: 'Energetic Pulse', imagePrompts: ['Dynamic fitness app hero'], styleDescription: 'Bold and energetic', colorPalette: ['#FF4500', '#1A1A2E', '#00D4FF'], referenceUrls: ['https://dribbble.com'] }]);
    }
    if (sp.includes('critique') || sp.includes('design critique')) {
      return JSON.stringify({ overallScore: 92, categories: { visualDesign: 94, usability: 92, accessibility: 93, performance: 91, content: 92 }, strengths: ['Clean layout', 'Good CTA placement'], weaknesses: ['Contrast issues in footer', 'Missing alt text on some images'], recommendations: ['Improve color contrast ratio', 'Add descriptive alt text'] });
    }
    if (sp.includes('competitive positioning')) {
      return JSON.stringify({ marketGaps: ['No app combines workout + meal + sleep tracking well'], uniqueOpportunities: ['AI-powered workout suggestions'], riskAreas: ['Saturated market'], positioningStatement: 'The all-in-one fitness companion that adapts to your lifestyle' });
    }
    if (sp.includes('ranking') || sp.includes('rank')) {
      return JSON.stringify([{ name: 'Energetic Pulse', rank: 1, score: 88, rationale: 'Best alignment with brief' }, { name: 'Social Surge', rank: 2, score: 82, rationale: 'Strong differentiation' }, { name: 'Zen Flow', rank: 3, score: 75, rationale: 'Niche but compelling' }]);
    }
    if (sp.includes('component') && (sp.includes('reconstruct') || sp.includes('converting'))) {
      return JSON.stringify([{ name: 'HeroSection', originalType: 'hero', tsx: '<div className="hero" role="banner" aria-label="Hero section" aria-describedby="hero-subtitle">Hero</div>', tailwindClasses: ['bg-gradient-to-r', 'from-orange-500', 'to-red-600', 'p-8', 'md:p-16'], propsInterface: 'interface HeroProps { title: string; subtitle: string; ctaText: string; backgroundImage?: string; }', ariaAttributes: ['role="banner"', 'aria-label="Hero section"', 'aria-describedby="hero-subtitle"'], stateVariants: ['hover', 'focus', 'active', 'disabled', 'loading'], responsive: true, storybookStory: 'import type { Meta, StoryObj } from "@storybook/react"; import { HeroSection } from "./HeroSection"; const meta: Meta<typeof HeroSection> = { title: "Components/HeroSection", component: HeroSection, tags: ["autodocs"] }; export default meta; type Story = StoryObj<typeof HeroSection>; export const Default: Story = { args: { title: "FitPulse", subtitle: "Your AI-powered fitness companion", ctaText: "Start Free Trial" } }; export const Loading: Story = { args: { ...Default.args }, parameters: { loading: true } };', variants: { default: true, dark: true, loading: true }, props: ['title', 'subtitle', 'ctaText', 'backgroundImage'] }, { name: 'WorkoutCard', originalType: 'card', tsx: '<div className="workout-card" role="article" aria-label="Workout card" aria-describedby="workout-details">Card</div>', tailwindClasses: ['rounded-xl', 'shadow-md', 'p-6', 'hover:shadow-lg', 'transition-shadow'], propsInterface: 'interface WorkoutCardProps { name: string; duration: number; difficulty: string; imageUrl?: string; onStart?: () => void; }', ariaAttributes: ['role="article"', 'aria-label="Workout card"', 'aria-describedby="workout-details"'], stateVariants: ['hover', 'focus', 'active', 'disabled', 'loading'], responsive: true, storybookStory: 'import type { Meta, StoryObj } from "@storybook/react"; import { WorkoutCard } from "./WorkoutCard"; const meta: Meta<typeof WorkoutCard> = { title: "Components/WorkoutCard", component: WorkoutCard, tags: ["autodocs"] }; export default meta; type Story = StoryObj<typeof WorkoutCard>; export const Default: Story = { args: { name: "Full Body HIIT", duration: 30, difficulty: "intermediate" } }; export const Loading: Story = { args: { ...Default.args }, parameters: { loading: true } };', variants: { default: true, loading: true, disabled: true }, props: ['name', 'duration', 'difficulty', 'imageUrl', 'onStart'] }, { name: 'ProgressRing', originalType: 'visualization', tsx: '<svg className="progress-ring" role="progressbar" aria-label="Progress indicator" aria-describedby="progress-value" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">Ring</svg>', tailwindClasses: ['animate-spin', 'w-24', 'h-24', 'md:w-32', 'md:h-32'], propsInterface: 'interface ProgressRingProps { progress: number; size: number; color: string; label?: string; }', ariaAttributes: ['role="progressbar"', 'aria-label="Progress indicator"', 'aria-describedby="progress-value"', 'aria-valuenow="0"', 'aria-valuemin="0"', 'aria-valuemax="100"'], stateVariants: ['hover', 'focus', 'active', 'disabled', 'loading'], responsive: true, storybookStory: 'import type { Meta, StoryObj } from "@storybook/react"; import { ProgressRing } from "./ProgressRing"; const meta: Meta<typeof ProgressRing> = { title: "Components/ProgressRing", component: ProgressRing, tags: ["autodocs"] }; export default meta; type Story = StoryObj<typeof ProgressRing>; export const Default: Story = { args: { progress: 75, size: 120, color: "#FF4500" } }; export const Complete: Story = { args: { progress: 100, size: 120, color: "#00D4FF" } };', variants: { default: true, complete: true, loading: true }, props: ['progress', 'size', 'color', 'label'] }]);
    }
    if (sp.includes('design system')) {
      return JSON.stringify({ colorPalette: [{ name: 'primary-500', value: '#FF4500', usage: 'Primary actions' }, { name: 'neutral-900', value: '#1A1A2E', usage: 'Dark backgrounds' }, { name: 'accent-400', value: '#00D4FF', usage: 'Highlights' }], typographyScale: [{ name: 'h1', size: '2.5rem', weight: '700', lineHeight: '1.2', usage: 'Page titles' }, { name: 'body', size: '1rem', weight: '400', lineHeight: '1.5', usage: 'Body text' }], spacingScale: [{ name: 'xs', value: '4px' }, { name: 'sm', value: '8px' }, { name: 'md', value: '16px' }, { name: 'lg', value: '24px' }], shadowScale: [{ name: 'sm', value: '0 1px 2px rgba(0,0,0,0.1)' }], borderRadiusScale: [{ name: 'sm', value: '4px' }, { name: 'md', value: '8px' }, { name: 'lg', value: '16px' }], animationTokens: [{ name: 'fast', duration: '150ms', easing: 'ease-out', usage: 'Micro-interactions' }] });
    }
    if (sp.includes('copy') && sp.includes('rewrit')) {
      return JSON.stringify({ variants: [{ tone: 'energetic', ctas: ['Start Your Journey', 'Crush Your Goals'], headlines: ['Transform Your Fitness'], microcopy: ['Join 10M+ athletes'] }], brandVoice: 'Motivational and empowering', toneGuidelines: 'Direct, action-oriented, inclusive' });
    }
    if (sp.includes('storybook')) {
      return JSON.stringify([{ componentName: 'HeroSection', storyCode: 'export default { title: "HeroSection" }; export const Default = () => <HeroSection />;' }]);
    }
    if (sp.includes('prototype')) {
      return '<!DOCTYPE html><html><head><title>Fitness App Prototype</title><style>body{font-family:Inter,sans-serif;margin:0;background:#1A1A2E;color:white}.hero{padding:4rem 2rem;text-align:center;background:linear-gradient(135deg,#FF4500,#FF6B35)}.card{background:#2A2A3E;border-radius:16px;padding:1.5rem;margin:1rem}</style></head><body><div class="hero"><h1>FitPulse</h1><p>Your AI-powered fitness companion</p><button style="background:#00D4FF;color:#1A1A2E;padding:12px 32px;border:none;border-radius:8px;font-weight:600;cursor:pointer">Start Free Trial</button></div><div style="padding:2rem"><div class="card"><h2>Today\'s Workout</h2><p>Full Body HIIT - 30 min</p></div></div></body></html>';
    }
    if (sp.includes('design review') || sp.includes('review specialist')) {
      return JSON.stringify({ overallScore: 95, findings: [{ phase: 'content', severity: 'nitpick', title: 'Minor copy inconsistency in footer', description: 'Footer microcopy uses "Log In" while header uses "Sign In" — inconsistent terminology.', impact: 'Minor confusion for users scanning between header and footer navigation.', affectedComponents: ['FooterNav'] }], phaseScores: { interaction: 96, responsiveness: 95, 'visual-polish': 94, accessibility: 95, robustness: 93, 'code-health': 96, content: 94 }, summary: 'Excellent design implementation with comprehensive accessibility support, consistent design token usage, and polished interaction patterns. Only minor content inconsistency identified.', strengths: ['Comprehensive ARIA attributes on all interactive elements', 'Consistent 4px spacing grid throughout', 'WCAG AA contrast ratios met across all color combinations', 'Responsive behavior tested at 4 breakpoints with proper content reflow', 'All components handle loading, empty, and error states', 'Keyboard navigation fully implemented with visible focus indicators'], criticalIssues: [], recommendations: ['Standardize login/sign-in terminology across all touchpoints', 'Consider adding prefers-contrast support for high-contrast mode'], accessibilityScore: 95, responsiveScore: 95, visualPolishScore: 94, interactionScore: 96, reviewedAt: Date.now() });
    }
    if (sp.includes('claude.md') || sp.includes('CLAUDE.md')) {
      return '# CLAUDE.md - FitPulse Fitness App\n\n## Design System\nPrimary: #FF4500\nFont: Inter/Montserrat\nSpacing: 8px grid\n\n## Components\n- HeroSection\n- WorkoutCard\n- ProgressRing\n\n## Accessibility\nWCAG AA compliance required\n\n## Architecture\nReact + Tailwind CSS\nMobile-first responsive\n';
    }
    if (sp.includes('figma') && sp.includes('token')) {
      return JSON.stringify({ global: { color: { primary: { 500: { value: '#FF4500', type: 'color' } } }, spacing: { md: { value: '16px', type: 'spacing' } } } });
    }
    if (sp.includes('performance') && sp.includes('budget')) {
      return JSON.stringify({ lcp: { target: 2500, unit: 'ms' }, fid: { target: 100, unit: 'ms' }, cls: { target: 0.1, unit: 'score' }, totalBundleSize: { target: 250, unit: 'KB' } });
    }
    if (sp.includes('accessibility') && sp.includes('report')) {
      return '# Accessibility Audit Report\n\n## Summary\nWCAG AA compliance: 78%\n\n## Issues Found\n1. Contrast ratio on footer text: 3.2:1 (needs 4.5:1)\n2. Missing skip-to-content link\n\n## Recommendations\n- Add skip navigation\n- Increase footer text contrast\n- Add aria-labels to icon buttons\n';
    }
    if (sp.includes('handoff')) {
      return JSON.stringify({ componentSpecs: [{ name: 'HeroSection', props: 'title, subtitle, ctaText', states: 'default, loading', events: 'onCtaClick', ariaAttributes: 'role=banner', keyboardInteractions: 'Enter activates CTA' }], accessibilityGuide: 'WCAG AA compliance required', responsiveSpecs: '375px, 768px, 1024px, 1440px breakpoints', tokenMapping: 'See design-system.json', testingRequirements: 'Unit + visual regression', performanceBudget: 'LCP < 2.5s', contentRequirements: 'All text must be i18n-ready', generatedAt: Date.now() });
    }
    if (sp.includes('a/b') || sp.includes('ab test') || sp.includes('test plan')) {
      return JSON.stringify({ experiments: [{ name: 'CTA Color Test', hypothesis: 'Orange CTA outperforms blue', variants: ['#FF4500', '#0066FF'], metric: 'Click-through rate', duration: '2 weeks' }], prioritization: 'Impact vs effort matrix', overallStrategy: 'Sequential testing with 95% confidence' });
    }
    if (sp.includes('heatmap')) {
      return JSON.stringify({ findings: ['Users focus on hero section first', 'CTA button gets high engagement'], hotspots: ['Hero CTA', 'Navigation menu'], deadZones: ['Footer links', 'Secondary content'], recommendations: ['Move key content above fold', 'Reduce footer complexity'] });
    }
    if (sp.includes('monitoring') || sp.includes('performance monitoring')) {
      return JSON.stringify({ metricsToTrack: ['LCP', 'FID', 'CLS', 'TTFB', 'INP'], toolSetup: 'Use Web Vitals library + custom analytics', alertThresholds: { LCP: 2500, FID: 100, CLS: 0.1 }, dashboardConfig: 'Grafana dashboard with Core Web Vitals panels' });
    }
    if (sp.includes('roadmap') || sp.includes('iteration')) {
      return JSON.stringify([{ priority: 1, experiment: 'Onboarding flow optimization', hypothesis: 'Simplified onboarding increases completion by 20%', expectedImpact: 'High', complexity: 'medium', metrics: ['Completion rate', 'Time to first workout'], duration: '2 weeks' }, { priority: 2, experiment: 'Social features rollout', hypothesis: 'Team challenges increase retention by 15%', expectedImpact: 'High', complexity: 'high', metrics: ['30-day retention', 'DAU'], duration: '4 weeks' }]);
    }
    // Default mock
    return JSON.stringify({ mock: true, generatedAt: Date.now() });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STEP_TIMEOUT);

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Claude API ${res.status}: ${errText.slice(0, 300)}`);
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> };
    return data.content?.[0]?.text || '';
  } finally {
    clearTimeout(timer);
  }
};

const parseJsonResponse = (response: string): unknown => {
  try {
    return JSON.parse(response);
  } catch {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    const arrayMatch = response.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      return JSON.parse(arrayMatch[0]);
    }
    return null;
  }
};

// ============================================================
// Utility: Brave Search
// ============================================================
const braveSearch = async (query: string): Promise<BraveResult[]> => {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': BRAVE_API_KEY,
      },
      signal: controller.signal,
    });
    const data = await res.json() as { web?: { results?: BraveResult[] } };
    return data.web?.results || [];
  } finally {
    clearTimeout(timer);
  }
};

// ============================================================
// Utility: Brave Deep Search (multi-round)
// ============================================================
const braveDeepSearch = async (goal: string, industry: string, designStyle: string, targetAudience: string): Promise<{ queries: string[]; results: BraveResult[] }> => {
  const queries = [
    `${industry} ${designStyle} design inspiration`,
    `${industry} UX design best practices ${targetAudience}`,
    `${industry} app competitor analysis design`,
  ];
  const allResults: BraveResult[] = [];
  for (const q of queries) {
    try {
      const results = await braveSearch(q);
      allResults.push(...results);
    } catch (e) {
      console.log(`    [warn] Brave search failed for "${q}": ${e}`);
    }
  }
  return { queries, results: allResults.slice(0, 50) };
};

// ============================================================
// DOM Extractors (run inside Playwright page context)
// ============================================================
const extractDesignTokensScript = (): DesignTokens => {
  const colorMap = new Map<string, { count: number; contexts: string[] }>();
  const spacingMap = new Map<string, { count: number; contexts: string[] }>();
  const shadowMap = new Map<string, { count: number; contexts: string[] }>();
  const radiusMap = new Map<string, { count: number; contexts: string[] }>();
  const zIndexMap = new Map<string, { count: number; contexts: string[] }>();
  const opacityMap = new Map<string, { count: number; contexts: string[] }>();

  const elements = document.querySelectorAll('*');
  const limit = Math.min(elements.length, 500);

  for (let i = 0; i < limit; i++) {
    const el = elements[i] as HTMLElement;
    let style: CSSStyleDeclaration;
    try { style = window.getComputedStyle(el); } catch { continue; }

    const tag = el.tagName.toLowerCase();
    const cls = el.className?.toString?.()?.slice(0, 30) || '';
    const desc = `${tag}.${cls}`;

    const colorProps = ['color', 'backgroundColor', 'borderColor'];
    for (const prop of colorProps) {
      const val = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
        const entry = colorMap.get(val);
        if (entry) { entry.count++; entry.contexts.push(desc); }
        else colorMap.set(val, { count: 1, contexts: [desc] });
      }
    }

    const spacingProps = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'];
    for (const prop of spacingProps) {
      const val = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (val && val !== '0px' && val !== 'auto' && val !== 'normal') {
        const entry = spacingMap.get(val);
        if (entry) { entry.count++; } else spacingMap.set(val, { count: 1, contexts: [desc] });
      }
    }

    const shadow = style.boxShadow;
    if (shadow && shadow !== 'none') {
      const entry = shadowMap.get(shadow);
      if (entry) entry.count++; else shadowMap.set(shadow, { count: 1, contexts: [desc] });
    }

    const radius = style.borderRadius;
    if (radius && radius !== '0px') {
      const entry = radiusMap.get(radius);
      if (entry) entry.count++; else radiusMap.set(radius, { count: 1, contexts: [desc] });
    }

    const zIndex = style.zIndex;
    if (zIndex && zIndex !== 'auto' && zIndex !== '0') {
      const entry = zIndexMap.get(zIndex);
      if (entry) entry.count++; else zIndexMap.set(zIndex, { count: 1, contexts: [desc] });
    }

    const opacity = style.opacity;
    if (opacity && opacity !== '1') {
      const entry = opacityMap.get(opacity);
      if (entry) entry.count++; else opacityMap.set(opacity, { count: 1, contexts: [desc] });
    }
  }

  const mapToArray = (map: Map<string, { count: number; contexts: string[] }>): TokenEntry[] => {
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([value, data]) => ({ value, count: data.count, contexts: data.contexts.slice(0, 5) }));
  };

  return {
    colors: mapToArray(colorMap),
    spacing: mapToArray(spacingMap),
    shadows: mapToArray(shadowMap),
    borderRadii: mapToArray(radiusMap),
    zIndices: mapToArray(zIndexMap),
    opacities: mapToArray(opacityMap),
  };
};

const extractTypographyScript = (): TypographySystem => {
  const familyMap = new Map<string, number>();
  const sizeMap = new Map<string, { element: string; count: number }>();
  const weightMap = new Map<string, number>();
  const lineHeightMap = new Map<string, number>();
  const letterSpacingMap = new Map<string, number>();

  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, button, label, input');
  const limit = Math.min(textElements.length, 300);

  for (let i = 0; i < limit; i++) {
    const el = textElements[i];
    let style: CSSStyleDeclaration;
    try { style = window.getComputedStyle(el); } catch { continue; }

    const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    familyMap.set(family, (familyMap.get(family) || 0) + 1);

    const size = style.fontSize;
    if (size) {
      const existing = sizeMap.get(size);
      if (existing) existing.count++;
      else sizeMap.set(size, { element: el.tagName.toLowerCase(), count: 1 });
    }

    const weight = style.fontWeight;
    weightMap.set(weight, (weightMap.get(weight) || 0) + 1);

    const lh = style.lineHeight;
    if (lh && lh !== 'normal') lineHeightMap.set(lh, (lineHeightMap.get(lh) || 0) + 1);

    const ls = style.letterSpacing;
    if (ls && ls !== 'normal' && ls !== '0px') letterSpacingMap.set(ls, (letterSpacingMap.get(ls) || 0) + 1);
  }

  return {
    fontFamilies: [...familyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([family, count]) => ({ family, count })),
    fontSizes: [...sizeMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15).map(([size, data]) => ({ size, element: data.element, count: data.count })),
    fontWeights: [...weightMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([weight, count]) => ({ weight, count })),
    lineHeights: [...lineHeightMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count })),
    letterSpacings: [...letterSpacingMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count })),
  };
};

const extractComponentsScript = (): ComponentData[] => {
  const components: ComponentData[] = [];
  const selectors = [
    'nav', 'header', 'footer', 'main', 'section', 'article',
    '[class*="card"]', '[class*="hero"]', '[class*="banner"]', '[class*="cta"]',
    '[class*="button"]', '[class*="nav"]', '[class*="menu"]',
    'form', '.container', '[role="banner"]', '[role="navigation"]', '[role="main"]',
    '[class*="workout"]', '[class*="exercise"]', '[class*="fitness"]', '[class*="progress"]',
  ];
  const seen = new Set<string>();
  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    for (let i = 0; i < Math.min(els.length, 3); i++) {
      const el = els[i] as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const cls = el.className?.toString?.() || '';
      const id = el.id || '';
      const uniqueKey = `${tag}${id}${cls.slice(0, 50)}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 20) continue;
      const componentName = id || cls.split(' ')[0]?.replace(/[^a-zA-Z0-9-_]/g, '') || `${tag}-component`;
      const componentType = tag === 'nav' ? 'Navigation' :
        tag === 'header' ? 'Header' :
        tag === 'footer' ? 'Footer' :
        tag === 'form' ? 'Form' :
        cls.includes('card') ? 'Card' :
        cls.includes('hero') ? 'Hero' :
        cls.includes('button') || cls.includes('btn') ? 'Button' :
        'Section';
      components.push({
        componentName: componentName.slice(0, 60),
        componentType,
        htmlCode: el.outerHTML.slice(0, 3000),
        cssCode: `background: ${style.backgroundColor}; color: ${style.color}; padding: ${style.padding};`,
        selector: id ? `#${id}` : `.${cls.split(' ')[0]}`,
        stateVariants: {},
        accessibilityData: {
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          tabIndex: el.tabIndex,
        },
        scores: {},
        metadata: { width: rect.width, height: rect.height },
      });
      if (components.length >= 30) return components;
    }
  }
  return components;
};

const extractAccessibilityScript = (): AccessibilityAudit => {
  const contrastIssues: AccessibilityAudit['contrastIssues'] = [];
  const missingAltText: AccessibilityAudit['missingAltText'] = [];
  const missingAriaLabels: string[] = [];
  const semanticIssues: string[] = [];
  document.querySelectorAll('img').forEach(img => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      missingAltText.push({ element: 'img', src: img.src?.slice(0, 100) || '' });
    }
  });
  document.querySelectorAll('button, a, input, select, textarea, [role]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const hasLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent?.trim();
    if (!hasLabel) missingAriaLabels.push(`${tag}${el.id ? '#' + el.id : ''}`);
  });
  if (!document.querySelector('main, [role="main"]')) semanticIssues.push('No <main> or role="main" element');
  if (!document.querySelector('nav, [role="navigation"]')) semanticIssues.push('No <nav> or role="navigation" element');
  const score = Math.max(0, 100 - contrastIssues.length * 3 - missingAltText.length * 5 - missingAriaLabels.length * 2 - semanticIssues.length * 4);
  return {
    overallScore: Math.min(100, score),
    wcagLevel: score > 80 ? 'AA' : score > 50 ? 'A' : 'Non-conformant',
    contrastIssues: contrastIssues.slice(0, 20),
    missingAltText: missingAltText.slice(0, 10),
    missingAriaLabels: missingAriaLabels.slice(0, 15),
    tabOrderIssues: [],
    semanticIssues,
    focusIndicatorsMissing: [],
  };
};

const extractCopyScript = () => {
  const ctaLabels: { text: string; element: string; count: number }[] = [];
  const toneKeywords: string[] = [];
  const buttons = document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], [role="button"], input[type="submit"]');
  const ctaMap = new Map<string, { element: string; count: number }>();
  buttons.forEach(btn => {
    const text = btn.textContent?.trim()?.slice(0, 60);
    if (text && text.length > 1 && text.length < 60) {
      const existing = ctaMap.get(text);
      if (existing) existing.count++;
      else ctaMap.set(text, { element: btn.tagName.toLowerCase(), count: 1 });
    }
  });
  ctaMap.forEach((val, key) => ctaLabels.push({ text: key, ...val }));
  document.querySelectorAll('h1, h2, h3').forEach(el => {
    const text = el.textContent?.trim();
    if (text) toneKeywords.push(...text.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5));
  });
  return { ctaLabels: ctaLabels.slice(0, 15), toneKeywords: [...new Set(toneKeywords)].slice(0, 20) };
};

// ============================================================
// Phase Validators
// ============================================================
interface ValidationResult {
  passed: boolean;
  checks: Array<{ name: string; passed: boolean; detail: string }>;
}

const validateDiscover = (artifacts: Record<string, unknown>): ValidationResult => {
  const checks = [
    {
      name: 'deepSearchResult exists',
      passed: !!artifacts.deepSearchResult,
      detail: artifacts.deepSearchResult
        ? `${(artifacts.deepSearchResult as any).results?.length || 0} results`
        : 'missing',
    },
    {
      name: 'multiSiteResult exists',
      passed: !!artifacts.multiSiteResult,
      detail: artifacts.multiSiteResult ? 'present' : 'missing',
    },
    {
      name: 'researchSynthesis exists',
      passed: !!artifacts.researchSynthesis,
      detail: artifacts.researchSynthesis
        ? `${(artifacts.researchSynthesis as any).keyFindings?.length || 0} findings`
        : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateDefine = (artifacts: Record<string, unknown>): ValidationResult => {
  const personas = artifacts.personas as any[] | undefined;
  const checks = [
    {
      name: 'personas (3+)',
      passed: !!personas && personas.length >= 3,
      detail: personas ? `${personas.length} personas` : 'missing',
    },
    {
      name: 'journeyMaps exist',
      passed: !!artifacts.journeyMaps,
      detail: artifacts.journeyMaps
        ? `${(artifacts.journeyMaps as any[]).length} maps`
        : 'missing',
    },
    {
      name: 'designBrief exists',
      passed: !!artifacts.designBrief,
      detail: artifacts.designBrief ? 'present' : 'missing',
    },
    {
      name: 'accessibilityRequirements exists',
      passed: !!artifacts.accessibilityRequirements,
      detail: artifacts.accessibilityRequirements ? 'present' : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateGate = (artifacts: Record<string, unknown>): ValidationResult => {
  const validation = artifacts.qualityValidation as any;
  const checks = [
    {
      name: 'reviewPackage exists',
      passed: !!artifacts.reviewPackage,
      detail: artifacts.reviewPackage ? 'present' : 'missing',
    },
    {
      name: 'qualityValidation.readinessScore >= 50',
      passed: !!validation && (validation.readinessScore ?? 0) >= 50,
      detail: validation ? `score: ${validation.readinessScore}` : 'missing',
    },
    {
      name: 'gateDecision set',
      passed: !!artifacts.gateDecision,
      detail: artifacts.gateDecision ? String(artifacts.gateDecision) : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateDiverge = (artifacts: Record<string, unknown>): ValidationResult => {
  const directions = artifacts.designDirections as any[] | undefined;
  const checks = [
    {
      name: 'designDirections (3+)',
      passed: !!directions && directions.length >= 3,
      detail: directions ? `${directions.length} directions` : 'missing',
    },
    {
      name: 'moodboards exist',
      passed: !!artifacts.moodboards,
      detail: artifacts.moodboards
        ? `${(artifacts.moodboards as any[]).length} moodboards`
        : 'missing',
    },
    {
      name: 'directionRankings exist',
      passed: !!artifacts.directionRankings,
      detail: artifacts.directionRankings
        ? `${(artifacts.directionRankings as any[]).length} rankings`
        : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateDevelop = (artifacts: Record<string, unknown>): ValidationResult => {
  const review = artifacts.designReview as any;
  const checks = [
    {
      name: 'reconstructedComponents exist',
      passed: !!artifacts.reconstructedComponents,
      detail: artifacts.reconstructedComponents
        ? `${(artifacts.reconstructedComponents as any[]).length} components`
        : 'missing',
    },
    {
      name: 'designSystem exists',
      passed: !!artifacts.designSystem,
      detail: artifacts.designSystem ? 'present' : 'missing',
    },
    {
      name: 'prototype exists',
      passed: !!artifacts.prototype,
      detail: artifacts.prototype ? `${(artifacts.prototype as string).length} chars` : 'missing',
    },
    {
      name: 'designReview score > 0',
      passed: !!review && (review.overallScore ?? 0) > 0,
      detail: review ? `score: ${review.overallScore}` : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateDeliver = (artifacts: Record<string, unknown>): ValidationResult => {
  const checks = [
    {
      name: 'claudeMd exists',
      passed: !!artifacts.claudeMd,
      detail: artifacts.claudeMd ? `${(artifacts.claudeMd as string).length} chars` : 'missing',
    },
    {
      name: 'handoffPackage exists',
      passed: !!artifacts.handoffPackage,
      detail: artifacts.handoffPackage ? 'present' : 'missing',
    },
    {
      name: 'finalDesignReview exists',
      passed: !!artifacts.finalDesignReview,
      detail: artifacts.finalDesignReview
        ? `score: ${(artifacts.finalDesignReview as any).overallScore}`
        : 'missing',
    },
    {
      name: 'outputManifest exists',
      passed: !!artifacts.outputManifest,
      detail: artifacts.outputManifest ? 'present' : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const validateMeasure = (artifacts: Record<string, unknown>): ValidationResult => {
  const checks = [
    {
      name: 'abTestPlan exists',
      passed: !!artifacts.abTestPlan,
      detail: artifacts.abTestPlan ? 'present' : 'missing',
    },
    {
      name: 'iterationRoadmap exists',
      passed: !!artifacts.iterationRoadmap,
      detail: artifacts.iterationRoadmap ? 'present' : 'missing',
    },
  ];
  return { passed: checks.every(c => c.passed), checks };
};

const VALIDATORS: Record<PhaseId, (a: Record<string, unknown>) => ValidationResult> = {
  discover: validateDiscover,
  define: validateDefine,
  gate: validateGate,
  diverge: validateDiverge,
  develop: validateDevelop,
  deliver: validateDeliver,
  measure: validateMeasure,
};

// ============================================================
// Phase Executors (standalone, call APIs directly)
// ============================================================

const PROJECT_CONTEXT: ProjectContext = {
  goal: 'Build a world-class fitness app UX/UI',
  industry: 'Health & Fitness',
  targetAudience: 'Fitness enthusiasts, gym-goers, beginners',
  designStyle: 'Modern, energetic, motivational',
  competitors: TARGET_URLS,
};

// Accumulated artifacts across all phases
const cumulativeArtifacts: Record<string, unknown> = {};

// Scrape state shared between phases
let scrapedTokens: DesignTokens | null = null;
let scrapedTypography: TypographySystem | null = null;
let scrapedComponents: ComponentData[] = [];
let scrapedAccessibility: AccessibilityAudit | null = null;
let scrapedCopy: { ctaLabels: { text: string; element: string; count: number }[]; toneKeywords: string[] } | null = null;

// ============================================================
// Discover Phase Executor
// ============================================================
const executeDiscover = async (browser: Browser): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.discover;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'braveDeepSearch': {
          const result = await braveDeepSearch(
            PROJECT_CONTEXT.goal,
            PROJECT_CONTEXT.industry,
            PROJECT_CONTEXT.designStyle,
            PROJECT_CONTEXT.targetAudience,
          );
          artifacts[step.outputKey] = result;
          console.log(`        -> ${result.results.length} results from ${result.queries.length} queries`);
          break;
        }

        case 'multiSiteScrape': {
          // Scrape target sites using Playwright
          const allTokens: DesignTokens = { colors: [], spacing: [], shadows: [], borderRadii: [], zIndices: [], opacities: [] };
          const allTypo: TypographySystem = { fontFamilies: [], fontSizes: [], fontWeights: [], lineHeights: [], letterSpacings: [] };
          const allComps: ComponentData[] = [];
          let bestA11y: AccessibilityAudit = { overallScore: 0, wcagLevel: 'Non-conformant', contrastIssues: [], missingAltText: [], missingAriaLabels: [], tabOrderIssues: [], semanticIssues: [], focusIndicatorsMissing: [] };
          let copyScrape: any = null;
          const siteResults: any[] = [];

          for (const url of TARGET_URLS) {
            const page = await browser.newPage();
            try {
              await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
              await page.waitForTimeout(2000);
              await page.evaluate('if(typeof __name==="undefined"){window.__name=(fn)=>fn}');

              const tokens = await page.evaluate(extractDesignTokensScript);
              allTokens.colors.push(...tokens.colors);
              allTokens.spacing.push(...tokens.spacing);
              allTokens.shadows.push(...tokens.shadows);
              allTokens.borderRadii.push(...tokens.borderRadii);

              const typo = await page.evaluate(extractTypographyScript);
              allTypo.fontFamilies.push(...typo.fontFamilies);
              allTypo.fontSizes.push(...typo.fontSizes);
              allTypo.fontWeights.push(...typo.fontWeights);
              allTypo.lineHeights.push(...typo.lineHeights);

              const comps = await page.evaluate(extractComponentsScript);
              allComps.push(...comps);

              const a11y = await page.evaluate(extractAccessibilityScript);
              if (a11y.overallScore > bestA11y.overallScore) bestA11y = a11y;

              const copy = await page.evaluate(extractCopyScript);
              if (!copyScrape) copyScrape = copy;
              else {
                copyScrape.ctaLabels.push(...copy.ctaLabels);
                copyScrape.toneKeywords.push(...copy.toneKeywords);
              }

              siteResults.push({
                url,
                scrapeResult: {
                  targetUrl: url,
                  designTokens: tokens,
                  typography: typo,
                  components: comps,
                  accessibility: a11y,
                  copyAnalysis: { ctaLabels: copy.ctaLabels },
                  heatmaps: [],
                  navigation: { menuDepth: 2, totalPages: 5 },
                  flowAnalysis: {
                    stepsToConversion: 3,
                    estimatedCognitiveLoad: 45,
                    frictionPoints: [{ step: 1, description: 'Complex form', severity: 5 }],
                  },
                  conversionPatterns: {
                    ctas: copy.ctaLabels.map((c: any) => ({ text: c.text, position: 'header', prominence: 7 })),
                    socialProof: [],
                    formFields: [],
                    trustBadges: [],
                    urgencyPatterns: [],
                  },
                  gridLayout: { layoutType: 'responsive', containerMaxWidth: '1200px' },
                  lighthouse: {
                    performanceScore: 75,
                    lcp: 2500,
                    cls: 0.1,
                    inp: 200,
                    fcp: 1800,
                    speedIndex: 3000,
                    totalBlockingTime: 300,
                  },
                  imageAssets: { images: [], lazyLoadPercentage: 60 },
                  thirdPartyStack: {},
                },
                quality: {
                  overallScore: a11y.overallScore,
                  designQuality: 75,
                  accessibilityScore: a11y.overallScore,
                  performanceScore: 75,
                  conversionScore: 70,
                  strengths: ['Clean layout', 'Mobile responsive'],
                  weaknesses: ['Some contrast issues'],
                },
              });

              console.log(`          Scraped: ${url} (${tokens.colors.length} colors, ${comps.length} components, a11y: ${a11y.overallScore})`);
            } catch (e: any) {
              console.log(`          [warn] Failed to scrape ${url}: ${e.message?.slice(0, 100)}`);
            } finally {
              await page.close();
            }
          }

          // Store for later phases
          scrapedTokens = allTokens;
          scrapedTypography = allTypo;
          scrapedComponents = allComps;
          scrapedAccessibility = bestA11y;
          scrapedCopy = copyScrape;

          const multiSiteResult = {
            sites: siteResults,
            synthesis: {
              commonPatterns: ['Responsive layout', 'Dark mode support', 'CTA-driven design'],
              uniqueInnovations: ['Progress gamification', 'Social workout sharing'],
            },
            compositeDesignSystem: {
              tokens: allTokens,
              typography: allTypo,
              bestComponents: allComps.slice(0, 10),
            },
          };

          artifacts[step.outputKey] = multiSiteResult;
          console.log(`        -> ${siteResults.length} sites scraped, ${allComps.length} total components`);
          break;
        }

        case 'heatmapFetch': {
          // No real heatmap API -- return null (matches real behavior)
          artifacts[step.outputKey] = null;
          console.log(`        -> No heatmap data available (expected)`);
          break;
        }

        case 'trendSearch': {
          const trendResult = await braveDeepSearch(
            `${PROJECT_CONTEXT.industry} UX design trends 2025 2026`,
            PROJECT_CONTEXT.industry,
            PROJECT_CONTEXT.designStyle,
            PROJECT_CONTEXT.targetAudience,
          );
          artifacts[step.outputKey] = trendResult.results.slice(0, 15);
          console.log(`        -> ${trendResult.results.slice(0, 15).length} trend results`);
          break;
        }

        case 'knowledgeEnrichment': {
          const componentTypes = [...new Set(scrapedComponents.map(c => c.componentType))];
          if (componentTypes.length === 0) {
            artifacts[step.outputKey] = { bestPractices: [], patterns: [] };
            console.log(`        -> No component types to enrich`);
          } else {
            const enrichResponse = await callClaude(
              'You are a UX knowledge expert. Given component types, provide best practices and pattern variations. Respond with JSON: { "bestPractices": ["string"], "patterns": ["string"] }',
              `Provide UX best practices for these ${PROJECT_CONTEXT.industry} component types: ${componentTypes.slice(0, 8).join(', ')}`,
            );
            const parsed = parseJsonResponse(enrichResponse) as any;
            artifacts[step.outputKey] = parsed || { bestPractices: [], patterns: [] };
            console.log(`        -> ${(parsed?.bestPractices?.length || 0)} best practices, ${(parsed?.patterns?.length || 0)} patterns`);
          }
          break;
        }

        case 'researchSynthesis': {
          const deepSearch = artifacts.deepSearchResult as any;
          const multiSite = artifacts.multiSiteResult as any;
          const trendData = artifacts.trendData as any;
          const enriched = artifacts.enrichedKnowledge as any;

          const synthesisPrompt = `Synthesize UX research for a ${PROJECT_CONTEXT.industry} app targeting "${PROJECT_CONTEXT.targetAudience}".

Research data:
- Deep search: ${deepSearch?.results?.length || 0} results from queries: ${deepSearch?.queries?.join(', ') || 'none'}
- Sites scraped: ${multiSite?.sites?.length || 0} sites
- Common patterns: ${multiSite?.synthesis?.commonPatterns?.join(', ') || 'none'}
- Trends: ${trendData ? `${trendData.length} trend articles` : 'none'}
- Enrichment: ${enriched?.bestPractices?.length || 0} best practices

Top search results:
${(deepSearch?.results || []).slice(0, 5).map((r: any) => `- ${r.title}: ${r.description?.slice(0, 100)}`).join('\n')}

Respond with valid JSON:
{
  "keyFindings": ["string (at least 5 findings)"],
  "competitorLandscape": [{ "url": "string", "strengths": ["string"], "weaknesses": ["string"] }],
  "designTrendInsights": ["string"],
  "userBehaviorPatterns": ["string"],
  "recommendations": ["string"]
}`;

          const response = await callClaude(
            'You are a Senior UX Researcher synthesizing research data into actionable findings for a fitness app design project. Respond with valid JSON only.',
            synthesisPrompt,
          );
          const parsed = parseJsonResponse(response) as any;
          artifacts[step.outputKey] = parsed || {
            keyFindings: ['Research synthesis failed to parse'],
            competitorLandscape: [],
            designTrendInsights: [],
            userBehaviorPatterns: [],
            recommendations: [],
          };
          console.log(`        -> ${parsed?.keyFindings?.length || 0} findings, ${parsed?.competitorLandscape?.length || 0} competitors`);
          break;
        }

        case 'inspirationAnalysis': {
          const response = await callClaude(
            'You are a Design Inspiration Analyst. Analyze fitness app design patterns and generate an inspiration analysis. Respond with valid JSON: { "visualThemes": ["string"], "colorStrategy": "string", "typographyStrategy": "string", "layoutPatterns": ["string"], "interactionPatterns": ["string"], "componentPatterns": ["string"], "accessibilityApproaches": ["string"], "differentiationOpportunities": ["string"] }',
            `Analyze design inspiration for ${PROJECT_CONTEXT.industry} apps targeting ${PROJECT_CONTEXT.targetAudience}. Style: ${PROJECT_CONTEXT.designStyle}. Sites analyzed: ${TARGET_URLS.join(', ')}. Components found: ${scrapedComponents.length}. Colors: ${scrapedTokens?.colors.length || 0}. Font families: ${scrapedTypography?.fontFamilies.map(f => f.family).join(', ') || 'unknown'}.`,
          );
          const parsed = parseJsonResponse(response) as any;
          artifacts[step.outputKey] = { ...(parsed || {}), generatedAt: Date.now() };
          console.log(`        -> Inspiration analysis generated`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    const elapsed = ((Date.now() - stepStart) / 1000).toFixed(1);
    console.log(`        (${elapsed}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Define Phase Executor
// ============================================================
const executeDefine = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.define;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'personaGeneration': {
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;
          const response = await callClaude(
            'You are a UX Research Lead generating user personas for a fitness app. Create exactly 4 distinct personas. Respond with a JSON array of personas.',
            `Generate 4 user personas for a ${PROJECT_CONTEXT.industry} app targeting "${PROJECT_CONTEXT.targetAudience}".

Research findings: ${researchSynthesis?.keyFindings?.slice(0, 3).join('; ') || 'General fitness app users'}
Design style: ${PROJECT_CONTEXT.designStyle}

Each persona must have this exact JSON shape:
[{
  "name": "string",
  "age": number,
  "occupation": "string",
  "bio": "string (2-3 sentences)",
  "goals": ["string"],
  "frustrations": ["string"],
  "behavioralPatterns": ["string"],
  "techSavviness": "low" | "medium" | "high",
  "accessibilityNeeds": ["string (empty array if none)"],
  "quote": "string (motivational quote from this persona)",
  "fitnessLevel": "beginner" | "intermediate" | "advanced"
}]`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = Array.isArray(parsed) ? parsed : (parsed as any)?.personas || [];
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} personas generated`);
          break;
        }

        case 'journeyMapping': {
          const personas = artifacts.personas as any[];
          if (!personas || personas.length === 0) throw new Error('No personas available');

          const response = await callClaude(
            'You are a UX Designer creating user journey maps. Respond with a JSON array of journey maps.',
            `Create journey maps for these personas using a fitness app:
${personas.slice(0, 3).map((p: any) => `- ${p.name} (${p.occupation}): Goals: ${p.goals?.join(', ')}`).join('\n')}

Each journey map must have this JSON shape:
[{
  "personaName": "string",
  "phases": [{
    "name": "string (e.g. Awareness, Onboarding, Active Use, Mastery)",
    "touchpoints": ["string"],
    "thoughts": ["string"],
    "emotions": "string",
    "painPoints": ["string"],
    "opportunities": ["string"]
  }]
}]`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = Array.isArray(parsed) ? parsed : (parsed as any)?.journeyMaps || [parsed];
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} journey maps`);
          break;
        }

        case 'designPrinciples': {
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;
          const personas = artifacts.personas as any[];
          const response = await callClaude(
            'You are a Design Director defining design principles, a design brief, and accessibility requirements. Respond with valid JSON containing all three.',
            `Define design principles, brief, and accessibility requirements for a ${PROJECT_CONTEXT.industry} app.

Research findings: ${researchSynthesis?.keyFindings?.slice(0, 3).join('; ') || 'N/A'}
Personas: ${personas?.slice(0, 3).map((p: any) => p.name).join(', ') || 'N/A'}
Target: ${PROJECT_CONTEXT.targetAudience}
Style: ${PROJECT_CONTEXT.designStyle}

Respond with this JSON:
{
  "designPrinciples": [{ "name": "string", "description": "string", "rationale": "string" }],
  "designBrief": {
    "projectName": "${PROJECT_NAME}",
    "goal": "string",
    "targetPersonas": ["string"],
    "constraints": ["string"],
    "successMetrics": ["string"],
    "scope": ["string"],
    "timeline": "string",
    "designDirection": "string"
  },
  "accessibilityRequirements": {
    "wcagLevel": "AA",
    "specificNeeds": ["string"],
    "assistiveTechSupport": ["string"],
    "colorBlindConsiderations": ["string"],
    "motionSensitivity": "string"
  }
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          if (parsed) {
            artifacts[step.outputKey] = parsed.designPrinciples || [];
            artifacts.designBrief = parsed.designBrief || {};
            artifacts.accessibilityRequirements = parsed.accessibilityRequirements || {};
          }
          console.log(`        -> ${(artifacts[step.outputKey] as any[])?.length || 0} principles`);
          break;
        }

        case 'designBrief': {
          // Already populated by designPrinciples step (they share a Claude call)
          if (artifacts.designBrief) {
            console.log(`        -> Already generated with design principles`);
          } else {
            artifacts[step.outputKey] = {
              projectName: PROJECT_NAME,
              goal: PROJECT_CONTEXT.goal,
              targetPersonas: [],
              constraints: [],
              successMetrics: ['User engagement increase'],
              scope: ['Mobile app UX/UI'],
              timeline: '8 weeks',
              designDirection: PROJECT_CONTEXT.designStyle,
            };
            console.log(`        -> Fallback brief generated`);
          }
          break;
        }

        case 'accessibilityRequirements': {
          // Already populated by designPrinciples step
          if (artifacts.accessibilityRequirements) {
            console.log(`        -> Already generated with design principles`);
          } else {
            artifacts[step.outputKey] = {
              wcagLevel: 'AA',
              specificNeeds: ['Color contrast compliance'],
              assistiveTechSupport: ['Screen readers', 'Voice control'],
              colorBlindConsiderations: ['Deuteranopia-safe palette'],
              motionSensitivity: 'Respect prefers-reduced-motion',
            };
            console.log(`        -> Fallback requirements generated`);
          }
          break;
        }

        case 'specRequirements': {
          const response = await callClaude(
            'You are a Product Manager creating requirements specifications. Respond with valid JSON.',
            `Generate requirements specification for ${PROJECT_NAME} - a ${PROJECT_CONTEXT.industry} app.
Goal: ${PROJECT_CONTEXT.goal}
Target: ${PROJECT_CONTEXT.targetAudience}

Respond with JSON:
{
  "userStories": [{ "role": "string", "want": "string", "benefit": "string", "acceptanceCriteria": ["string"] }],
  "nonFunctional": { "performance": ["string"], "security": ["string"], "reliability": ["string"], "usability": ["string"] },
  "generatedAt": ${Date.now()}
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { userStories: [], nonFunctional: {}, generatedAt: Date.now() };
          console.log(`        -> Requirements spec generated`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Gate Phase Executor
// ============================================================
const executeGate = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.gate;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'compileReviewPackage': {
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;
          const personas = cumulativeArtifacts.personas as any[];
          const designBrief = cumulativeArtifacts.designBrief as any;
          const designPrinciples = cumulativeArtifacts.designPrinciples as any[];
          const accessibilityRequirements = cumulativeArtifacts.accessibilityRequirements as any;
          const journeyMaps = cumulativeArtifacts.journeyMaps as any[];

          const qualityChecks = [
            { check: 'Research Synthesis Present', passed: !!researchSynthesis, details: researchSynthesis ? `${researchSynthesis.keyFindings?.length || 0} findings` : 'Missing' },
            { check: 'Personas Generated', passed: !!personas && personas.length >= 3, details: personas ? `${personas.length} personas` : 'Missing' },
            { check: 'Design Brief Complete', passed: !!designBrief && !!designBrief.goal, details: designBrief ? `Goal: ${designBrief.goal}` : 'Missing' },
            { check: 'Design Principles Defined', passed: !!designPrinciples && designPrinciples.length >= 3, details: designPrinciples ? `${designPrinciples.length} principles` : 'Missing' },
            { check: 'Accessibility Requirements Set', passed: !!accessibilityRequirements, details: accessibilityRequirements ? `WCAG ${accessibilityRequirements.wcagLevel}` : 'Missing' },
            { check: 'Journey Maps Created', passed: !!journeyMaps && journeyMaps.length > 0, details: journeyMaps ? `${journeyMaps.length} maps` : 'Missing' },
          ];

          artifacts[step.outputKey] = {
            researchSummary: researchSynthesis ? `${researchSynthesis.keyFindings?.length || 0} findings` : 'Not available',
            personaSummary: personas ? `${personas.length} personas` : 'Not available',
            briefSummary: designBrief ? `Goal: ${designBrief.goal}` : 'Not available',
            qualityChecks,
          };
          console.log(`        -> Review package compiled (${qualityChecks.filter(c => c.passed).length}/${qualityChecks.length} checks passed)`);
          break;
        }

        case 'qualityValidation': {
          const response = await callClaude(
            'You are a Quality Assurance Lead validating readiness of a design project to proceed from research (BB1) to design execution (BB2). Respond with valid JSON.',
            `Validate the quality of these BB1 artifacts for a ${PROJECT_CONTEXT.industry} app:

Research: ${(cumulativeArtifacts.researchSynthesis as any)?.keyFindings?.length || 0} findings
Personas: ${(cumulativeArtifacts.personas as any[])?.length || 0} personas
Design Brief: ${(cumulativeArtifacts.designBrief as any)?.goal || 'Missing'}
Principles: ${(cumulativeArtifacts.designPrinciples as any[])?.length || 0} principles
Journey Maps: ${(cumulativeArtifacts.journeyMaps as any[])?.length || 0} maps
Accessibility: ${(cumulativeArtifacts.accessibilityRequirements as any)?.wcagLevel || 'Not set'}

Respond with JSON:
{
  "readinessScore": number (0-100),
  "missingElements": ["string"],
  "warnings": ["string"],
  "qualityScores": { "research": number, "personas": number, "brief": number, "principles": number }
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          artifacts[step.outputKey] = {
            readinessScore: parsed?.readinessScore ?? 75,
            missingElements: parsed?.missingElements || [],
            warnings: parsed?.warnings || [],
            qualityScores: parsed?.qualityScores || {},
          };
          console.log(`        -> Readiness score: ${(artifacts[step.outputKey] as any).readinessScore}/100`);
          break;
        }

        case 'awaitApproval': {
          const validation = artifacts.qualityValidation as any;
          const readinessScore = validation?.readinessScore ?? 0;
          // Auto-approve for integration test (in real usage, the UI blocks here)
          artifacts[step.outputKey] = readinessScore >= 50 ? 'approved' : 'revision-needed';
          console.log(`        -> Gate decision: ${artifacts[step.outputKey]} (auto-approved for test)`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Diverge Phase Executor
// ============================================================
const executeDiverge = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.diverge;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'designDirections': {
          const designBrief = cumulativeArtifacts.designBrief as any;
          const personas = cumulativeArtifacts.personas as any[];
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;

          const response = await callClaude(
            'You are a Creative Director generating diverse design directions. Respond with valid JSON.',
            `Generate 4 distinct design directions for a ${PROJECT_CONTEXT.industry} app.

Design Brief: ${designBrief?.goal || PROJECT_CONTEXT.goal}
Personas: ${personas?.map((p: any) => p.name).join(', ') || 'General fitness users'}
Research: ${researchSynthesis?.keyFindings?.slice(0, 3).join('; ') || 'N/A'}
Scraped colors: ${scrapedTokens?.colors.slice(0, 5).map(c => c.value).join(', ') || 'N/A'}
Font families: ${scrapedTypography?.fontFamilies.map(f => f.family).join(', ') || 'N/A'}

Respond with JSON:
{
  "directions": [{
    "name": "string",
    "description": "string",
    "moodKeywords": ["string"],
    "colorDirection": { "primary": "string (hex)", "secondary": "string (hex)", "accent": "string (hex)", "rationale": "string" },
    "typographyDirection": { "headingFont": "string", "bodyFont": "string", "rationale": "string" },
    "layoutApproach": "string",
    "differentiator": "string",
    "riskAssessment": "string"
  }]
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          artifacts[step.outputKey] = parsed?.directions || (Array.isArray(parsed) ? parsed : []);
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} design directions`);
          break;
        }

        case 'moodboardGeneration': {
          const directions = artifacts.designDirections as any[];
          if (!directions || directions.length === 0) throw new Error('No design directions available');

          const response = await callClaude(
            'You are a Visual Designer creating moodboards. Respond with a JSON array.',
            `Create moodboards for these design directions:
${directions.map((d: any) => `- ${d.name}: ${d.description}. Keywords: ${d.moodKeywords?.join(', ')}`).join('\n')}
Industry: ${PROJECT_CONTEXT.industry}

Respond with JSON array:
[{
  "directionName": "string",
  "imagePrompts": ["string (3-5 AI image generation prompts)"],
  "styleDescription": "string",
  "colorPalette": ["string (hex codes)"],
  "referenceUrls": ["string"]
}]`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = Array.isArray(parsed) ? parsed : (parsed as any)?.moodboards || [];
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} moodboards`);
          break;
        }

        case 'designCritique': {
          const response = await callClaude(
            'You are a Design Critic. Critique the scraped fitness app designs. Respond with valid JSON.',
            `Critique the design quality of the scraped fitness app websites (${TARGET_URLS.join(', ')}).

Scraped data:
- Colors: ${scrapedTokens?.colors.length || 0} unique colors
- Font families: ${scrapedTypography?.fontFamilies.map(f => f.family).join(', ') || 'unknown'}
- Components: ${scrapedComponents.length} components found
- Accessibility: ${scrapedAccessibility?.overallScore || 0}/100

Respond with JSON:
{
  "overallScore": number (0-10),
  "innovationScore": number (0-10),
  "executiveSummary": "string",
  "strengths": [{ "title": "string", "evidence": "string", "impact": "string" }],
  "weaknesses": [{ "title": "string", "severity": "low"|"medium"|"high", "evidence": "string", "recommendation": "string", "estimatedEffort": "string" }]
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { overallScore: 5, innovationScore: 5, executiveSummary: '', strengths: [], weaknesses: [] };
          console.log(`        -> Critique score: ${(artifacts[step.outputKey] as any).overallScore}/10`);
          break;
        }

        case 'competitivePositioning': {
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;
          const directions = artifacts.designDirections as any[];

          const response = await callClaude(
            'You are a Brand Strategist analyzing competitive positioning. Respond with valid JSON.',
            `Analyze competitive positioning for ${PROJECT_NAME}.

Competitor Landscape:
${researchSynthesis?.competitorLandscape?.map((c: any) => `- ${c.url}: Strengths [${c.strengths?.slice(0, 3).join('; ')}], Weaknesses [${c.weaknesses?.slice(0, 3).join('; ')}]`).join('\n') || 'No competitor data.'}

Design Directions:
${directions?.map((d: any) => `- ${d.name}: ${d.differentiator}`).join('\n') || 'No directions yet.'}

Industry: ${PROJECT_CONTEXT.industry}

Respond with JSON:
{
  "marketGaps": ["string"],
  "uniqueOpportunities": ["string"],
  "riskAreas": ["string"],
  "positioningStatement": "string"
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { marketGaps: [], uniqueOpportunities: [], riskAreas: [], positioningStatement: '' };
          console.log(`        -> Competitive positioning generated`);
          break;
        }

        case 'directionRanking': {
          const directions = artifacts.designDirections as any[];
          const designBrief = cumulativeArtifacts.designBrief as any;
          if (!directions || directions.length === 0) throw new Error('No design directions to rank');

          const response = await callClaude(
            'You are a Design Director ranking design directions. Respond with a JSON array.',
            `Rank these design directions against the design brief.

Brief: Goal: ${designBrief?.goal || 'N/A'}, Metrics: ${designBrief?.successMetrics?.join('; ') || 'N/A'}

Directions:
${directions.map((d: any, i: number) => `${i + 1}. ${d.name}: ${d.description}. Differentiator: ${d.differentiator}`).join('\n')}

Respond with JSON array:
[{ "name": "string", "rank": number (1=best), "score": number (0-100), "rationale": "string" }]`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = Array.isArray(parsed) ? parsed : (parsed as any)?.rankings || [];
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} rankings`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Develop Phase Executor
// ============================================================
const executeDevelop = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.develop;

  // Determine winning direction
  const rankings = cumulativeArtifacts.directionRankings as any[];
  const directions = cumulativeArtifacts.designDirections as any[];
  let winningDirection: any = null;
  if (directions && directions.length > 0) {
    if (rankings && rankings.length > 0) {
      const sorted = [...rankings].sort((a: any, b: any) => a.rank - b.rank);
      winningDirection = directions.find((d: any) => d.name === sorted[0].name) || directions[0];
    } else {
      winningDirection = directions[0];
    }
  }

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'componentReconstruction': {
          // Reconstruct scraped components into React+Tailwind via Claude
          const bestComponents = scrapedComponents.slice(0, 5);
          if (bestComponents.length === 0) throw new Error('No scraped components available');

          const response = await callClaude(
            'You are a Frontend Engineer converting scraped HTML/CSS components to React + Tailwind. Respond with a JSON array.',
            `Convert these scraped components to React + Tailwind:
${bestComponents.map((c, i) => `${i + 1}. ${c.componentName} (${c.componentType}): CSS: ${c.cssCode.slice(0, 200)}`).join('\n')}

Respond with JSON array:
[{
  "name": "string (PascalCase)",
  "originalType": "string",
  "tsx": "string (React component code)",
  "tailwindClasses": ["string"],
  "propsInterface": "string (TypeScript interface)",
  "ariaAttributes": ["string"],
  "stateVariants": ["string (e.g. hover, focus, active)"],
  "responsive": true,
  "storybookStory": "string (CSF3 story code)"
}]`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = Array.isArray(parsed) ? parsed : [];
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} components reconstructed`);
          break;
        }

        case 'designSystemGeneration': {
          if (!winningDirection) throw new Error('No winning design direction');

          const response = await callClaude(
            'You are a Design Systems Engineer generating a normalized design system. Respond with valid JSON.',
            `Generate a design system based on:

Winning direction: ${winningDirection.name} - ${winningDirection.description}
Colors: ${winningDirection.colorDirection?.primary}, ${winningDirection.colorDirection?.secondary}, ${winningDirection.colorDirection?.accent}
Typography: ${winningDirection.typographyDirection?.headingFont} / ${winningDirection.typographyDirection?.bodyFont}
Layout: ${winningDirection.layoutApproach}

Scraped tokens: ${scrapedTokens?.colors.length || 0} colors, ${scrapedTokens?.spacing.length || 0} spacing values
Scraped typography: ${scrapedTypography?.fontFamilies.map(f => f.family).join(', ') || 'N/A'}

Respond with JSON:
{
  "colorPalette": [{ "name": "string", "value": "string (hex)", "usage": "string" }],
  "typographyScale": [{ "name": "string", "size": "string", "weight": "string", "lineHeight": "string", "usage": "string" }],
  "spacingScale": [{ "name": "string", "value": "string" }],
  "shadowScale": [{ "name": "string", "value": "string" }],
  "borderRadiusScale": [{ "name": "string", "value": "string" }],
  "animationTokens": [{ "name": "string", "duration": "string", "easing": "string", "usage": "string" }]
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || {};
          console.log(`        -> Design system generated`);
          break;
        }

        case 'copyRewriting': {
          const brandVoice = winningDirection
            ? `${winningDirection.name} aesthetic -- ${winningDirection.moodKeywords?.join(', ')}`
            : PROJECT_CONTEXT.designStyle;

          const ctaLabels = scrapedCopy?.ctaLabels?.slice(0, 8) || [];

          const response = await callClaude(
            'You are a UX Copywriter rewriting copy for brand voice alignment. Respond with valid JSON.',
            `Rewrite these fitness app CTA labels and generate copy variants for the "${brandVoice}" brand voice.

Original CTAs: ${ctaLabels.map((c: any) => `"${c.text}"`).join(', ') || 'Start Workout, Track Progress, Join Now'}
Industry: ${PROJECT_CONTEXT.industry}

Respond with JSON:
{
  "variants": [{ "tone": "string", "ctas": ["string"], "headlines": ["string"], "microcopy": ["string"] }],
  "brandVoice": "string",
  "toneGuidelines": "string"
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { variants: [], brandVoice, toneGuidelines: '' };
          console.log(`        -> Copy rewritten`);
          break;
        }

        case 'storybookGeneration': {
          const reconstructed = artifacts.reconstructedComponents as any[];
          if (!reconstructed || reconstructed.length === 0) throw new Error('No reconstructed components');
          artifacts[step.outputKey] = reconstructed.map((comp: any) => ({
            componentName: comp.name,
            storyCode: comp.storybookStory || `// Default story for ${comp.name}`,
          }));
          console.log(`        -> ${(artifacts[step.outputKey] as any[]).length} Storybook stories`);
          break;
        }

        case 'prototypeGeneration': {
          const designSystem = artifacts.designSystem as any;
          const reconstructed = artifacts.reconstructedComponents as any[];

          const response = await callClaude(
            'You are a Frontend Prototyping Engineer. Generate a single-page interactive HTML prototype. Output the complete HTML string only, no markdown wrapping.',
            `Generate an HTML prototype for "${winningDirection?.name || 'Fitness App'}".

Design System Colors: ${designSystem?.colorPalette?.slice(0, 4).map((c: any) => `${c.name}: ${c.value}`).join(', ') || 'use modern dark theme'}
Components: ${reconstructed?.slice(0, 3).map((c: any) => c.name).join(', ') || 'Hero, Navigation, WorkoutCard'}
Layout: ${winningDirection?.layoutApproach || 'Responsive grid layout'}
Style: ${PROJECT_CONTEXT.designStyle}

Include: Hero section, navigation, workout cards, CTA button, footer. Make it responsive with inline CSS.`,
          );
          artifacts[step.outputKey] = response;
          console.log(`        -> Prototype: ${response.length} chars`);
          break;
        }

        case 'specDesign': {
          const response = await callClaude(
            'You are a Software Architect creating a design specification. Respond with valid JSON.',
            `Generate architecture and component design spec for ${PROJECT_NAME}.
Requirements: ${JSON.stringify((cumulativeArtifacts.specRequirements as any)?.userStories?.slice(0, 3) || []).slice(0, 500)}
Design Brief: ${(cumulativeArtifacts.designBrief as any)?.goal || PROJECT_CONTEXT.goal}
Principles: ${(cumulativeArtifacts.designPrinciples as any[])?.map((p: any) => p.name).join(', ') || 'N/A'}

Respond with JSON:
{
  "architecture": "string",
  "components": [{ "name": "string", "purpose": "string", "interfaces": "string", "dependencies": ["string"] }],
  "dataModels": "string",
  "errorHandling": [{ "scenario": "string", "detection": "string", "handling": "string", "userImpact": "string" }],
  "testingStrategy": { "unit": ["string"], "integration": ["string"], "e2e": ["string"] },
  "generatedAt": ${Date.now()}
}`,
          );
          artifacts[step.outputKey] = parseJsonResponse(response) || { generatedAt: Date.now() };
          console.log(`        -> Design specification generated`);
          break;
        }

        case 'specTasks': {
          const response = await callClaude(
            'You are a Tech Lead decomposing a design into implementation tasks. Respond with valid JSON.',
            `Decompose the design for ${PROJECT_NAME} into implementation tasks.
Design system: ${(artifacts.designSystem as any)?.colorPalette?.length || 0} colors, ${(artifacts.designSystem as any)?.typographyScale?.length || 0} type steps
Components: ${(artifacts.reconstructedComponents as any[])?.map((c: any) => c.name).join(', ') || 'N/A'}

Respond with JSON:
{
  "tasks": [{ "id": "string", "title": "string", "files": ["string"], "description": "string", "requirements": ["string"], "estimatedMinutes": number }],
  "generatedAt": ${Date.now()}
}`,
          );
          artifacts[step.outputKey] = parseJsonResponse(response) || { tasks: [], generatedAt: Date.now() };
          console.log(`        -> ${((artifacts[step.outputKey] as any)?.tasks?.length || 0)} tasks generated`);
          break;
        }

        case 'designReview': {
          const designPrinciples = cumulativeArtifacts.designPrinciples as any[];
          const designBrief = cumulativeArtifacts.designBrief as any;
          const reconstructed = artifacts.reconstructedComponents as any[];
          const designSystem = artifacts.designSystem as any;

          const response = await callClaude(
            'You are a Design Review Board conducting a comprehensive review. Respond with valid JSON.',
            `Review the generated design artifacts for ${PROJECT_NAME}.

Design Principles: ${designPrinciples?.map((p: any) => p.name).join(', ') || 'N/A'}
Design Brief Goal: ${designBrief?.goal || 'N/A'}
Components: ${reconstructed?.length || 0} reconstructed
Design System: ${designSystem?.colorPalette?.length || 0} colors, ${designSystem?.typographyScale?.length || 0} type steps
Prototype: ${artifacts.prototype ? 'Generated' : 'Missing'}

Respond with JSON:
{
  "overallScore": number (0-100),
  "findings": [{ "phase": "string", "severity": "blocker"|"high"|"medium"|"nitpick", "title": "string", "description": "string", "impact": "string", "affectedComponents": ["string"] }],
  "phaseScores": { "visual": number, "interaction": number, "accessibility": number },
  "summary": "string",
  "strengths": ["string"],
  "criticalIssues": ["string"],
  "recommendations": ["string"],
  "accessibilityScore": number (0-100),
  "responsiveScore": number (0-100),
  "visualPolishScore": number (0-100),
  "interactionScore": number (0-100),
  "reviewedAt": ${Date.now()}
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          if (parsed) parsed.reviewedAt = Date.now();
          artifacts[step.outputKey] = parsed || { overallScore: 0, findings: [], reviewedAt: Date.now() };
          console.log(`        -> Design review score: ${(artifacts[step.outputKey] as any).overallScore}/100`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Deliver Phase Executor
// ============================================================
const executeDeliver = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.deliver;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'generateClaudeMd': {
          const designPrinciples = cumulativeArtifacts.designPrinciples as any[];
          const personas = cumulativeArtifacts.personas as any[];
          const designSystem = cumulativeArtifacts.designSystem as any;
          const winningDirection = (() => {
            const rankings = cumulativeArtifacts.directionRankings as any[];
            const directions = cumulativeArtifacts.designDirections as any[];
            if (!directions || directions.length === 0) return null;
            if (rankings && rankings.length > 0) {
              const sorted = [...rankings].sort((a: any, b: any) => a.rank - b.rank);
              return directions.find((d: any) => d.name === sorted[0].name) || directions[0];
            }
            return directions[0];
          })();

          const response = await callClaude(
            'You are a Technical Writer creating a comprehensive CLAUDE.md file for a design intelligence package. This file will be read by Claude Code to implement the design. Generate the complete markdown document.',
            `Generate CLAUDE.md for "${PROJECT_NAME}" - a ${PROJECT_CONTEXT.industry} app.

Design Principles: ${designPrinciples?.map((p: any) => `${p.name}: ${p.description}`).join('; ') || 'N/A'}
Personas: ${personas?.map((p: any) => `${p.name} (${p.occupation})`).join(', ') || 'N/A'}
Design System: ${designSystem ? `${designSystem.colorPalette?.length} colors, ${designSystem.typographyScale?.length} type steps` : 'N/A'}
Direction: ${winningDirection?.name || 'N/A'} - ${winningDirection?.description || 'N/A'}
Accessibility: WCAG ${(cumulativeArtifacts.accessibilityRequirements as any)?.wcagLevel || 'AA'}
Goal: ${PROJECT_CONTEXT.goal}

Include: Project overview, design team personas, methodology, design tokens reference, component library, workflow prompts, file reference.`,
          );
          artifacts[step.outputKey] = response;
          console.log(`        -> CLAUDE.md: ${response.length} chars`);
          break;
        }

        case 'generateFigmaTokens': {
          const designSystem = cumulativeArtifacts.designSystem as any;
          if (!designSystem) throw new Error('No design system available');

          const figmaTokens: Record<string, unknown> = {
            color: {} as Record<string, unknown>,
            typography: {} as Record<string, unknown>,
            spacing: {} as Record<string, unknown>,
            _metadata: { generatedAt: new Date().toISOString(), source: 'Double Black Box Method', version: '1.0.0' },
          };

          const colorTokens = figmaTokens.color as Record<string, unknown>;
          for (const color of (designSystem.colorPalette || [])) {
            colorTokens[color.name] = { value: color.value, type: 'color', description: color.usage };
          }

          const typographyTokens = figmaTokens.typography as Record<string, unknown>;
          for (const typo of (designSystem.typographyScale || [])) {
            typographyTokens[typo.name] = { value: { fontSize: typo.size, fontWeight: typo.weight, lineHeight: typo.lineHeight }, type: 'typography' };
          }

          const spacingTokens = figmaTokens.spacing as Record<string, unknown>;
          for (const space of (designSystem.spacingScale || [])) {
            spacingTokens[space.name] = { value: space.value, type: 'spacing' };
          }

          artifacts[step.outputKey] = figmaTokens;
          console.log(`        -> Figma tokens: ${Object.keys(colorTokens).length} colors, ${Object.keys(typographyTokens).length} type, ${Object.keys(spacingTokens).length} spacing`);
          break;
        }

        case 'generatePerformanceBudget': {
          const response = await callClaude(
            'You are a Web Performance Engineer. Generate a performance budget. Respond with valid JSON.',
            `Generate performance budget for a ${PROJECT_CONTEXT.industry} website.
Design system: ${(cumulativeArtifacts.designSystem as any)?.colorPalette?.length || 0} colors
Components: ${(cumulativeArtifacts.reconstructedComponents as any[])?.length || 0}
Target audience: ${PROJECT_CONTEXT.targetAudience}

Respond with JSON:
{
  "coreWebVitals": { "lcpTarget": number, "clsTarget": number, "inpTarget": number, "fcpTarget": number },
  "images": { "totalBudgetKB": number, "perImageMaxKB": number },
  "javascript": { "totalBudgetKB": number },
  "css": { "totalBudgetKB": number },
  "fonts": { "maxFamilies": number, "totalBudgetKB": number }
}`,
          );
          artifacts[step.outputKey] = parseJsonResponse(response) || {
            coreWebVitals: { lcpTarget: 2500, clsTarget: 0.1, inpTarget: 200, fcpTarget: 1800 },
          };
          console.log(`        -> Performance budget generated`);
          break;
        }

        case 'generateAccessibilityReport': {
          const accessibilityRequirements = cumulativeArtifacts.accessibilityRequirements as any;
          const personas = cumulativeArtifacts.personas as any[];

          const response = await callClaude(
            'You are an Accessibility Specialist. Generate a comprehensive accessibility audit report in markdown format.',
            `Generate accessibility report.

Requirements:
- WCAG Level: ${accessibilityRequirements?.wcagLevel || 'AA'}
- Specific Needs: ${accessibilityRequirements?.specificNeeds?.join('; ') || 'Default'}
- Assistive Tech: ${accessibilityRequirements?.assistiveTechSupport?.join('; ') || 'Default'}

Personas with accessibility needs:
${personas?.filter((p: any) => p.accessibilityNeeds?.length > 0).map((p: any) => `- ${p.name}: ${p.accessibilityNeeds.join(', ')}`).join('\n') || 'No specific needs identified.'}

Scraped accessibility score: ${scrapedAccessibility?.overallScore || 0}/100
Issues: ${scrapedAccessibility?.missingAltText?.length || 0} missing alt text, ${scrapedAccessibility?.missingAriaLabels?.length || 0} missing ARIA labels`,
          );
          artifacts[step.outputKey] = response;
          console.log(`        -> Accessibility report: ${response.length} chars`);
          break;
        }

        case 'handoffPackage': {
          const response = await callClaude(
            'You are a Design-Engineering Liaison creating a developer handoff package. Respond with valid JSON.',
            `Generate developer handoff package for ${PROJECT_NAME}.
Design system: ${JSON.stringify((cumulativeArtifacts.designSystem as any)?.colorPalette?.slice(0, 3) || []).slice(0, 300)}
Components: ${(cumulativeArtifacts.reconstructedComponents as any[])?.map((c: any) => c.name).join(', ') || 'N/A'}
Brief: ${(cumulativeArtifacts.designBrief as any)?.goal || 'N/A'}
Accessibility: WCAG ${(cumulativeArtifacts.accessibilityRequirements as any)?.wcagLevel || 'AA'}

Respond with JSON:
{
  "componentSpecs": [{ "name": "string", "props": "string", "states": "string", "events": "string", "ariaAttributes": "string", "keyboardInteractions": "string" }],
  "accessibilityGuide": "string",
  "responsiveSpecs": "string",
  "tokenMapping": "string",
  "testingRequirements": "string",
  "performanceBudget": "string",
  "contentRequirements": "string",
  "generatedAt": ${Date.now()}
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          if (parsed) parsed.generatedAt = Date.now();
          artifacts[step.outputKey] = parsed || { generatedAt: Date.now() };
          console.log(`        -> Handoff package generated`);
          break;
        }

        case 'finalDesignReview': {
          const response = await callClaude(
            'You are a Design Review Board conducting a final comprehensive review before delivery. Respond with valid JSON.',
            `Final design review for ${PROJECT_NAME}.

All artifacts generated:
- CLAUDE.md: ${artifacts.claudeMd ? 'Yes' : 'No'}
- Figma tokens: ${artifacts.figmaTokens ? 'Yes' : 'No'}
- Performance budget: ${artifacts.performanceBudget ? 'Yes' : 'No'}
- Accessibility report: ${artifacts.accessibilityReport ? 'Yes' : 'No'}
- Handoff package: ${artifacts.handoffPackage ? 'Yes' : 'No'}
- Components: ${(cumulativeArtifacts.reconstructedComponents as any[])?.length || 0}
- Design system: ${(cumulativeArtifacts.designSystem as any)?.colorPalette?.length || 0} colors
- Prototype: ${cumulativeArtifacts.prototype ? 'Generated' : 'Missing'}

Respond with JSON:
{
  "overallScore": number (0-100),
  "findings": [{ "phase": "string", "severity": "medium", "title": "string", "description": "string", "impact": "string", "affectedComponents": [] }],
  "phaseScores": {},
  "summary": "string",
  "strengths": ["string"],
  "criticalIssues": ["string"],
  "recommendations": ["string"],
  "accessibilityScore": number (0-100),
  "responsiveScore": number (0-100),
  "visualPolishScore": number (0-100),
  "interactionScore": number (0-100),
  "reviewedAt": ${Date.now()}
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          if (parsed) parsed.reviewedAt = Date.now();
          artifacts[step.outputKey] = parsed || { overallScore: 0, findings: [], reviewedAt: Date.now() };
          console.log(`        -> Final review score: ${(artifacts[step.outputKey] as any).overallScore}/100`);
          break;
        }

        case 'generateOutputFolder': {
          // Write output files to disk
          const files: string[] = [];
          const outputDir = OUTPUT_DIR;

          // Create directories
          const dirs = ['', 'tokens', 'performance', 'accessibility', 'analysis', 'components', 'prototype'];
          for (const dir of dirs) {
            fs.mkdirSync(path.join(outputDir, dir), { recursive: true });
          }

          // CLAUDE.md
          if (artifacts.claudeMd) {
            fs.writeFileSync(path.join(outputDir, 'CLAUDE.md'), artifacts.claudeMd as string);
            files.push('CLAUDE.md');
          }

          // Figma tokens
          if (artifacts.figmaTokens) {
            fs.writeFileSync(path.join(outputDir, 'tokens', 'figma-tokens.json'), JSON.stringify(artifacts.figmaTokens, null, 2));
            files.push('tokens/figma-tokens.json');
          }

          // Design system
          if (cumulativeArtifacts.designSystem) {
            fs.writeFileSync(path.join(outputDir, 'tokens', 'design-system.json'), JSON.stringify(cumulativeArtifacts.designSystem, null, 2));
            files.push('tokens/design-system.json');
          }

          // Performance budget
          if (artifacts.performanceBudget) {
            fs.writeFileSync(path.join(outputDir, 'performance', 'budget.json'), JSON.stringify(artifacts.performanceBudget, null, 2));
            files.push('performance/budget.json');
          }

          // Accessibility report
          if (artifacts.accessibilityReport) {
            fs.writeFileSync(path.join(outputDir, 'accessibility', 'audit-report.md'), artifacts.accessibilityReport as string);
            files.push('accessibility/audit-report.md');
          }

          // Handoff package
          if (artifacts.handoffPackage) {
            fs.writeFileSync(path.join(outputDir, 'handoff-package.json'), JSON.stringify(artifacts.handoffPackage, null, 2));
            files.push('handoff-package.json');
          }

          // Prototype
          if (cumulativeArtifacts.prototype) {
            fs.writeFileSync(path.join(outputDir, 'prototype', 'index.html'), cumulativeArtifacts.prototype as string);
            files.push('prototype/index.html');
          }

          // Reconstructed components
          const reconstructed = cumulativeArtifacts.reconstructedComponents as any[];
          if (reconstructed) {
            for (const comp of reconstructed) {
              const safeName = (comp.name || 'component').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
              if (comp.tsx) {
                fs.writeFileSync(path.join(outputDir, 'components', `${safeName}.tsx`), comp.tsx);
                files.push(`components/${safeName}.tsx`);
              }
            }
          }

          artifacts[step.outputKey] = {
            totalFiles: files.length,
            outputPath: outputDir,
            files,
          };
          console.log(`        -> ${files.length} files written to ${outputDir}`);
          break;
        }

        case 'generateAnalysisDocs': {
          const docs: Record<string, string> = {};
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;
          const designCritique = cumulativeArtifacts.designCritique as any;
          const competitivePositioning = cumulativeArtifacts.competitivePositioning as any;

          if (researchSynthesis) {
            docs['research-synthesis'] = `# Research Synthesis\n\n## Key Findings\n${researchSynthesis.keyFindings?.map((f: string, i: number) => `${i + 1}. ${f}`).join('\n') || 'None'}\n\n## Recommendations\n${researchSynthesis.recommendations?.map((r: string, i: number) => `${i + 1}. ${r}`).join('\n') || 'None'}`;
          }
          if (designCritique) {
            docs['design-critique'] = `# Design Critique\n\n**Overall Score:** ${designCritique.overallScore}/10\n\n## Summary\n${designCritique.executiveSummary || 'N/A'}`;
          }
          if (competitivePositioning) {
            docs['competitive-positioning'] = `# Competitive Positioning\n\n## Statement\n${competitivePositioning.positioningStatement || 'N/A'}\n\n## Market Gaps\n${competitivePositioning.marketGaps?.map((g: string, i: number) => `${i + 1}. ${g}`).join('\n') || 'None'}`;
          }

          // Write analysis docs to disk
          const analysisDir = path.join(OUTPUT_DIR, 'analysis');
          fs.mkdirSync(analysisDir, { recursive: true });
          for (const [key, content] of Object.entries(docs)) {
            fs.writeFileSync(path.join(analysisDir, `${key}.md`), content);
          }

          artifacts[step.outputKey] = docs;
          console.log(`        -> ${Object.keys(docs).length} analysis docs generated`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Measure Phase Executor
// ============================================================
const executeMeasure = async (): Promise<PhaseResult> => {
  const artifacts: Record<string, unknown> = {};
  const errors: string[] = [];
  let stepsCompleted = 0;
  let stepsFailed = 0;
  const start = Date.now();
  const steps = PHASE_STEPS.measure;

  for (const step of steps) {
    const stepStart = Date.now();
    console.log(`      [${step.id}] ${step.name}...`);

    try {
      switch (step.engineCall) {
        case 'abTestGeneration': {
          const response = await callClaude(
            'You are a Growth Engineering Lead generating an A/B test plan. Respond with valid JSON.',
            `Generate A/B test plan for a ${PROJECT_CONTEXT.industry} app.

CTAs: ${scrapedCopy?.ctaLabels?.map((c: any) => `"${c.text}"`).join(', ') || 'Start Workout, Track Progress'}
Components: ${(cumulativeArtifacts.reconstructedComponents as any[])?.map((c: any) => c.name).join(', ') || 'N/A'}
Accessibility score: ${scrapedAccessibility?.overallScore || 0}/100
Design directions: ${(cumulativeArtifacts.designDirections as any[])?.map((d: any) => d.name).join(', ') || 'N/A'}

Respond with JSON:
{
  "summary": "string",
  "prioritizedTests": [{
    "name": "string",
    "hypothesis": "string",
    "control": "string",
    "variant": "string",
    "metric": "string",
    "expectedLift": "string",
    "sampleSize": number,
    "duration": "string"
  }]
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { summary: '', prioritizedTests: [] };
          console.log(`        -> ${(artifacts[step.outputKey] as any).prioritizedTests?.length || 0} A/B tests planned`);
          break;
        }

        case 'heatmapAnalysis': {
          const response = await callClaude(
            'You are a UX Analytics Specialist analyzing behavioral heatmap data. Respond with valid JSON.',
            `Analyze behavioral patterns for ${PROJECT_NAME}.

No real heatmap data available -- analyze based on the design patterns and conversion funnel.
CTAs: ${scrapedCopy?.ctaLabels?.map((c: any) => `"${c.text}"`).join(', ') || 'N/A'}
Components: ${scrapedComponents.length} scraped components
Accessibility: ${scrapedAccessibility?.overallScore || 0}/100

Respond with JSON:
{
  "findings": ["string"],
  "hotspots": ["string"],
  "deadZones": ["string"],
  "recommendations": ["string"]
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || { findings: [], hotspots: [], deadZones: [], recommendations: [] };
          console.log(`        -> ${(artifacts[step.outputKey] as any).findings?.length || 0} findings`);
          break;
        }

        case 'performanceMonitoring': {
          const response = await callClaude(
            'You are a Site Reliability Engineer. Generate a performance monitoring setup. Respond with valid JSON.',
            `Generate performance monitoring plan for a ${PROJECT_CONTEXT.industry} website.
Target audience: ${PROJECT_CONTEXT.targetAudience}

Respond with JSON:
{
  "metricsToTrack": ["string"],
  "toolSetup": "string",
  "alertThresholds": { "LCP": number, "CLS": number, "INP": number },
  "dashboardConfig": "string"
}`,
          );
          const parsed = parseJsonResponse(response);
          artifacts[step.outputKey] = parsed || {
            metricsToTrack: ['LCP', 'CLS', 'INP', 'FCP'],
            toolSetup: 'Lighthouse CI',
            alertThresholds: { LCP: 2500, CLS: 0.1, INP: 200 },
            dashboardConfig: 'Core Web Vitals dashboard',
          };
          console.log(`        -> Monitoring plan generated`);
          break;
        }

        case 'iterationRoadmap': {
          const abTestPlan = artifacts.abTestPlan as any;
          const researchSynthesis = cumulativeArtifacts.researchSynthesis as any;

          const response = await callClaude(
            'You are a Product Strategist creating an iteration roadmap. Respond with valid JSON.',
            `Generate iteration roadmap for ${PROJECT_NAME}.

A/B Tests: ${abTestPlan?.prioritizedTests?.length || 0} planned
Research recommendations: ${researchSynthesis?.recommendations?.join('; ') || 'N/A'}
Design system: ${(cumulativeArtifacts.designSystem as any)?.colorPalette?.length || 0} colors
Components: ${(cumulativeArtifacts.reconstructedComponents as any[])?.length || 0}

Respond with JSON:
{
  "iterationRoadmap": [{
    "priority": number (1=highest),
    "experiment": "string",
    "hypothesis": "string",
    "expectedImpact": "string",
    "complexity": "low"|"medium"|"high",
    "metrics": ["string"],
    "duration": "string"
  }]
}`,
          );
          const parsed = parseJsonResponse(response) as any;
          artifacts[step.outputKey] = parsed?.iterationRoadmap || parsed || [];
          console.log(`        -> ${Array.isArray(artifacts[step.outputKey]) ? (artifacts[step.outputKey] as any[]).length : 0} iterations planned`);
          break;
        }

        default:
          throw new Error(`Unknown engine call: ${step.engineCall}`);
      }

      stepsCompleted++;
    } catch (err: any) {
      stepsFailed++;
      const errorMsg = `${step.id}: ${err.message?.slice(0, 200)}`;
      errors.push(errorMsg);
      console.log(`        [FAILED] ${errorMsg}`);
    }

    console.log(`        (${((Date.now() - stepStart) / 1000).toFixed(1)}s)`);
  }

  return { artifacts, stepsCompleted, stepsFailed, stepsTotal: steps.length, duration: Date.now() - start, errors };
};

// ============================================================
// Phase Executor Registry
// ============================================================
const EXECUTORS: Record<PhaseId, (browser: Browser) => Promise<PhaseResult>> = {
  discover: (browser) => executeDiscover(browser),
  define: () => executeDefine(),
  gate: () => executeGate(),
  diverge: () => executeDiverge(),
  develop: () => executeDevelop(),
  deliver: () => executeDeliver(),
  measure: () => executeMeasure(),
};

// ============================================================
// Main Pipeline
// ============================================================
async function main() {
  const totalStart = Date.now();

  console.log('='.repeat(70));
  console.log('  INTEGRATION TEST: Full 7-Phase Fitness App Workflow');
  console.log('  Double Black Box Method -- End-to-End Pipeline');
  console.log('='.repeat(70));

  // ---- Pre-flight checks ----
  structuralMode = !CLAUDE_API_KEY;
  if (structuralMode) {
    console.log('\n[MODE] STRUCTURAL TEST — No CLAUDE_API_KEY set.');
    console.log('  Running with real Brave search + Playwright scraping.');
    console.log('  Claude-dependent steps will use mock artifacts.');
    console.log('  Set CLAUDE_API_KEY for full live test.\n');
  } else {
    console.log('\n[OK] Claude API key found — running LIVE mode');
  }

  // Validate Brave API key with a quick test
  try {
    const testResults = await braveSearch('test');
    console.log(`[OK] Brave API key valid (test returned ${testResults.length} results)`);
  } catch (e: any) {
    console.error(`[WARN] Brave API key may be invalid: ${e.message}`);
    console.error('  Continuing anyway -- search steps may fail.');
  }

  // ---- Clean output directory ----
  if (fs.existsSync(OUTPUT_DIR)) {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    console.log(`[OK] Cleaned existing output: ${OUTPUT_DIR}`);
  }
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`[OK] Created output directory: ${OUTPUT_DIR}`);

  // ---- Launch browser ----
  console.log('\n[SETUP] Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  console.log('[OK] Browser launched');

  // ---- Execute all 7 phases ----
  const phaseResults: Record<PhaseId, PhaseResult> = {} as any;
  const phaseValidations: Record<PhaseId, ValidationResult> = {} as any;
  let allPassed = true;
  let gateBlocked = false;

  for (const phaseId of PHASE_ORDER) {
    const phaseName = phaseId.charAt(0).toUpperCase() + phaseId.slice(1);
    console.log(`\n${'='.repeat(70)}`);
    console.log(`  PHASE: ${phaseName.toUpperCase()} (${PHASE_STEPS[phaseId].length} steps)`);
    console.log('='.repeat(70));

    // Gate check: verify Gate approved before entering BB2
    if (phaseId === 'diverge' && cumulativeArtifacts.gateDecision !== 'approved') {
      console.log(`\n  [GATE BLOCKED] Gate decision was "${cumulativeArtifacts.gateDecision}" -- cannot enter BB2.`);
      gateBlocked = true;
      allPassed = false;
      break;
    }

    try {
      const executor = EXECUTORS[phaseId];
      const result = await executor(browser);
      phaseResults[phaseId] = result;

      // Accumulate artifacts
      for (const [key, value] of Object.entries(result.artifacts)) {
        if (value !== undefined && value !== null) {
          cumulativeArtifacts[key] = value;
        }
      }

      // Validate
      const validation = VALIDATORS[phaseId](result.artifacts);
      phaseValidations[phaseId] = validation;

      const statusIcon = validation.passed ? 'PASS' : 'WARN';
      console.log(`\n  [${statusIcon}] ${phaseName}: ${result.stepsCompleted}/${result.stepsTotal} steps, ${(result.duration / 1000).toFixed(1)}s`);

      for (const check of validation.checks) {
        console.log(`    ${check.passed ? '[ok]' : '[!!]'} ${check.name}: ${check.detail}`);
      }

      if (result.errors.length > 0) {
        console.log(`  Errors (${result.errors.length}):`);
        for (const err of result.errors) {
          console.log(`    - ${err}`);
        }
      }

      if (!validation.passed) {
        allPassed = false;
      }
    } catch (err: any) {
      console.log(`\n  [FAIL] ${phaseName} crashed: ${err.message?.slice(0, 300)}`);
      allPassed = false;
      phaseResults[phaseId] = {
        artifacts: {},
        stepsCompleted: 0,
        stepsFailed: PHASE_STEPS[phaseId].length,
        stepsTotal: PHASE_STEPS[phaseId].length,
        duration: 0,
        errors: [err.message],
      };
    }
  }

  // ---- Close browser ----
  await browser.close();
  console.log('\n[OK] Browser closed');

  // ---- Cross-phase artifact validation ----
  console.log('\n' + '='.repeat(70));
  console.log('  CROSS-PHASE ARTIFACT VALIDATION');
  console.log('='.repeat(70));

  const crossChecks = [
    {
      name: 'Cumulative artifacts pass through phases',
      passed: !!cumulativeArtifacts.deepSearchResult && !!cumulativeArtifacts.researchSynthesis && !!cumulativeArtifacts.personas,
      detail: `${Object.keys(cumulativeArtifacts).length} total artifact keys accumulated`,
    },
    {
      name: 'Gate blocks BB2 until approval',
      passed: !gateBlocked,
      detail: gateBlocked ? 'Gate blocked execution (expected behavior)' : `Gate decision: ${cumulativeArtifacts.gateDecision}`,
    },
    {
      name: 'Design review scores are > 0',
      passed: ((cumulativeArtifacts.designReview as any)?.overallScore ?? 0) > 0 || ((cumulativeArtifacts.finalDesignReview as any)?.overallScore ?? 0) > 0,
      detail: `Develop review: ${(cumulativeArtifacts.designReview as any)?.overallScore || 'N/A'}, Final review: ${(cumulativeArtifacts.finalDesignReview as any)?.overallScore || 'N/A'}`,
    },
  ];

  for (const check of crossChecks) {
    console.log(`  ${check.passed ? '[ok]' : '[!!]'} ${check.name}: ${check.detail}`);
    if (!check.passed) allPassed = false;
  }

  // ---- Output verification ----
  console.log('\n' + '='.repeat(70));
  console.log('  OUTPUT VERIFICATION');
  console.log('='.repeat(70));

  const outputExists = fs.existsSync(OUTPUT_DIR);
  console.log(`  ${outputExists ? '[ok]' : '[!!]'} Output directory exists: ${OUTPUT_DIR}`);

  let outputFileCount = 0;
  if (outputExists) {
    const countFiles = (dir: string): number => {
      let count = 0;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) count++;
        else if (entry.isDirectory()) count += countFiles(path.join(dir, entry.name));
      }
      return count;
    };
    outputFileCount = countFiles(OUTPUT_DIR);
  }

  console.log(`  ${outputFileCount > 0 ? '[ok]' : '[!!]'} Output files: ${outputFileCount}`);

  const keyFiles = [
    'CLAUDE.md',
    'tokens/figma-tokens.json',
    'tokens/design-system.json',
    'performance/budget.json',
    'accessibility/audit-report.md',
    'handoff-package.json',
    'prototype/index.html',
  ];

  for (const file of keyFiles) {
    const exists = fs.existsSync(path.join(OUTPUT_DIR, file));
    console.log(`  ${exists ? '[ok]' : '[!!]'} ${file}`);
  }

  // ---- Summary report ----
  const totalDuration = Date.now() - totalStart;

  console.log('\n' + '='.repeat(70));
  console.log('  FITNESS APP WORKFLOW COMPLETE');
  console.log('='.repeat(70));

  console.log('\n  Phase     | Status | Steps     | Duration | Key Artifacts');
  console.log('  ' + '-'.repeat(65));

  for (const phaseId of PHASE_ORDER) {
    const result = phaseResults[phaseId];
    const validation = phaseValidations[phaseId];
    if (!result) {
      console.log(`  ${phaseId.padEnd(10)} | SKIP   | --        | --       | --`);
      continue;
    }

    const statusStr = validation?.passed ? 'PASS' : 'WARN';
    const stepsStr = `${result.stepsCompleted}/${result.stepsTotal}`;
    const durationStr = `${(result.duration / 1000).toFixed(0)}s`;

    let artifactSummary = '';
    switch (phaseId) {
      case 'discover': {
        const ds = result.artifacts.deepSearchResult as any;
        const ms = result.artifacts.multiSiteResult as any;
        const rs = result.artifacts.researchSynthesis as any;
        artifactSummary = `${rs?.keyFindings?.length || 0} findings, ${ms?.sites?.length || 0} sites scraped`;
        break;
      }
      case 'define': {
        const p = result.artifacts.personas as any[];
        const dp = result.artifacts.designPrinciples as any[];
        artifactSummary = `${p?.length || 0} personas, ${dp?.length || 0} principles`;
        break;
      }
      case 'gate': {
        const qv = result.artifacts.qualityValidation as any;
        artifactSummary = `Score: ${qv?.readinessScore || 0}/100`;
        break;
      }
      case 'diverge': {
        const dd = result.artifacts.designDirections as any[];
        artifactSummary = `${dd?.length || 0} directions`;
        break;
      }
      case 'develop': {
        const rc = result.artifacts.reconstructedComponents as any[];
        const dr = result.artifacts.designReview as any;
        artifactSummary = `${rc?.length || 0} components, review: ${dr?.overallScore || 0}/100`;
        break;
      }
      case 'deliver': {
        const om = result.artifacts.outputManifest as any;
        const fdr = result.artifacts.finalDesignReview as any;
        artifactSummary = `${om?.totalFiles || 0} files, review: ${fdr?.overallScore || 0}/100`;
        break;
      }
      case 'measure': {
        const abt = result.artifacts.abTestPlan as any;
        artifactSummary = `${abt?.prioritizedTests?.length || 0} experiments`;
        break;
      }
    }

    console.log(`  ${phaseId.padEnd(10)} | ${statusStr.padEnd(6)} | ${stepsStr.padEnd(9)} | ${durationStr.padEnd(8)} | ${artifactSummary}`);
  }

  const totalSteps = Object.values(phaseResults).reduce((sum, r) => sum + (r?.stepsCompleted || 0), 0);
  const totalStepsAll = Object.values(phaseResults).reduce((sum, r) => sum + (r?.stepsTotal || 0), 0);
  const finalReviewScore = (cumulativeArtifacts.finalDesignReview as any)?.overallScore || (cumulativeArtifacts.designReview as any)?.overallScore || 0;

  console.log('\n  ' + '-'.repeat(65));
  console.log(`  Total: ${(totalDuration / 1000).toFixed(0)}s | ${totalSteps}/${totalStepsAll} steps | ${outputFileCount} files | Design Review: ${finalReviewScore}/100`);
  console.log(`  Output: ${OUTPUT_DIR}`);
  console.log(`  Cumulative artifacts: ${Object.keys(cumulativeArtifacts).length} keys`);

  // ---- Exit code ----
  if (allPassed) {
    console.log('\n  RESULT: ALL PHASES PASSED');
    process.exit(0);
  } else {
    console.log('\n  RESULT: SOME PHASES HAD WARNINGS OR FAILURES (see above)');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\n[FATAL] Unhandled error:', err);
  process.exit(1);
});
