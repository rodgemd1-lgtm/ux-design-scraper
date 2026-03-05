import {
  NIELSEN_HEURISTICS,
  UI_PATTERNS,
  formatHeuristicsForPrompt,
  formatUIPatternsForPrompt,
} from '@shared/ux-knowledge-base';

export const MEASURE_PHASE_SYSTEM_PROMPT = `You are a Growth/Analytics Lead executing Phase 07 MEASURE of the Double Black Box Method. Your mission is to create a data-driven iteration roadmap that will continuously improve the delivered design system based on measurable outcomes.

You think in hypotheses and experiments. Every recommendation must be:
1. **Testable** — Can be validated with an A/B test or measurable metric
2. **Prioritized** — Ranked by expected impact, weighted against implementation complexity
3. **Time-bound** — Each experiment has a clear duration and success criteria
4. **Connected to personas** — Tied to specific user segments and their jobs-to-be-done

Your iteration roadmap should cover:
- **Quick wins** (1-2 weeks, low complexity) — Copy changes, CTA optimization, color adjustments
- **Medium investments** (2-4 weeks, medium complexity) — Component redesigns, flow optimization, new interaction patterns
- **Strategic bets** (4-8 weeks, high complexity) — Major layout changes, new features, fundamental UX shifts

## Output Format
Respond with a valid JSON object:
{
  "iterationRoadmap": [
    {
      "priority": number (1 = highest priority),
      "experiment": "string (clear experiment name)",
      "hypothesis": "string (If we [change], then [metric] will [improve/decrease] by [amount] because [reasoning])",
      "expectedImpact": "string (specific metric improvement prediction)",
      "complexity": "low | medium | high",
      "metrics": ["string (specific metrics to track)"],
      "duration": "string (estimated experiment duration)",
      "targetPersona": "string (which persona this primarily affects)",
      "baselineData": "string (current state from scraped data that this improves upon)"
    }
  ],
  "measurementFramework": {
    "primaryKPIs": ["string (top-level KPIs to track)"],
    "secondaryMetrics": ["string (supporting metrics)"],
    "guardrailMetrics": ["string (metrics that should NOT degrade)"],
    "dataCollectionPlan": "string (how to collect the necessary data)"
  },
  "heatmapRecommendations": {
    "pagesToTrack": ["string (specific pages or flows to heatmap)"],
    "questionsToAnswer": ["string (specific behavioral questions)"],
    "toolSetup": "string (recommended heatmap tool configuration)"
  },
  "performanceMonitoring": {
    "metricsToTrack": ["string (web performance metrics)"],
    "alertThresholds": { "string (metric name)": number },
    "toolSetup": "string (recommended monitoring setup)",
    "dashboardConfig": "string (dashboard layout recommendation)"
  }
}

Ground every experiment in specific data from the design analysis. No generic recommendations.`;

export const buildMeasureUserPrompt = (
  designSystem: {
    colorCount: number;
    typographySteps: number;
    componentCount: number;
  } | null,
  personas: Array<{
    name: string;
    goals: string[];
    frustrations: string[];
    techSavviness: string;
  }> | null,
  conversionPatterns: {
    ctaCount: number;
    ctaLabels: string[];
    socialProofCount: number;
    formFieldCount: number;
    trustBadges: string[];
    urgencyPatterns: string[];
  } | null,
  flowAnalysis: {
    stepsToConversion: number;
    estimatedCognitiveLoad: number;
    frictionPoints: Array<{ step: number; description: string; severity: number }>;
  } | null,
  performanceData: {
    lighthouseScore: number;
    lcp: number;
    cls: number;
    inp: number;
  } | null,
  accessibilityData: {
    overallScore: number;
    wcagLevel: string;
    contrastIssues: number;
    missingAltText: number;
  } | null,
  abTestPlan: {
    summary: string;
    testCount: number;
    topTests: Array<{ name: string; hypothesis: string; expectedLift: string }>;
  } | null,
  researchRecommendations: string[]
): string => `Generate an iteration roadmap and measurement framework based on the delivered design system and all prior analysis.

## Design System Summary
${designSystem
    ? `- Colors: ${designSystem.colorCount} tokens
- Typography: ${designSystem.typographySteps} scale steps
- Components: ${designSystem.componentCount} reconstructed`
    : 'No design system summary available.'}

## Personas
${personas && personas.length > 0
    ? personas.map(p => `- **${p.name}** (${p.techSavviness}): Goals [${p.goals.slice(0, 3).join('; ')}], Frustrations [${p.frustrations.slice(0, 3).join('; ')}]`).join('\n')
    : 'No personas available.'}

## Conversion Patterns (Baseline)
${conversionPatterns
    ? `- CTAs: ${conversionPatterns.ctaCount} (labels: ${conversionPatterns.ctaLabels.slice(0, 5).join(', ')})
- Social Proof: ${conversionPatterns.socialProofCount} elements
- Form Fields: ${conversionPatterns.formFieldCount}
- Trust Badges: ${conversionPatterns.trustBadges.join(', ') || 'None'}
- Urgency Patterns: ${conversionPatterns.urgencyPatterns.join(', ') || 'None'}`
    : 'No conversion data available.'}

## Flow Analysis (Baseline)
${flowAnalysis
    ? `- Steps to Conversion: ${flowAnalysis.stepsToConversion}
- Cognitive Load: ${flowAnalysis.estimatedCognitiveLoad}/100
- Friction Points: ${flowAnalysis.frictionPoints.map(fp => `Step ${fp.step}: ${fp.description} (severity ${fp.severity}/10)`).join('; ')}`
    : 'No flow analysis available.'}

## Performance Baseline
${performanceData
    ? `- Lighthouse: ${performanceData.lighthouseScore}/100
- LCP: ${performanceData.lcp}ms
- CLS: ${performanceData.cls}
- INP: ${performanceData.inp}ms`
    : 'No performance data available.'}

## Accessibility Baseline
${accessibilityData
    ? `- Score: ${accessibilityData.overallScore}/100 (WCAG ${accessibilityData.wcagLevel})
- Contrast Issues: ${accessibilityData.contrastIssues}
- Missing Alt Text: ${accessibilityData.missingAltText}`
    : 'No accessibility data available.'}

## A/B Test Plan (from ABTestEngine)
${abTestPlan
    ? `Summary: ${abTestPlan.summary}
Top ${abTestPlan.topTests.length} Tests:
${abTestPlan.topTests.map((t, i) => `${i + 1}. ${t.name}: ${t.hypothesis} (Expected: ${t.expectedLift})`).join('\n')}`
    : 'No A/B test plan generated.'}

## Research Recommendations
${researchRecommendations.length > 0
    ? researchRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')
    : 'No specific research recommendations.'}

## Nielsen Heuristics for Usability Evaluation
Use these heuristics to identify usability gaps that can become experiment hypotheses:
${formatHeuristicsForPrompt(NIELSEN_HEURISTICS)}

## UI Patterns for A/B Test Variants
Reference these proven patterns when designing test variants and alternatives:
${formatUIPatternsForPrompt(UI_PATTERNS)}

Generate a prioritized iteration roadmap with 8-15 experiments ranked by impact/complexity ratio. Include quick wins, medium investments, and strategic bets. Ground every hypothesis in specific baseline data from the analysis. Use Nielsen heuristics to frame usability experiments and reference UI patterns for variant design.`;
