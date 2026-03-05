import {
  NIELSEN_HEURISTICS,
  SOURCE_AUTHORITY,
  formatHeuristicsForPrompt,
  formatSourceAuthorityForPrompt,
} from '@shared/ux-knowledge-base';
import {
  INDUSTRY_REASONING,
  matchIndustryKey,
  formatReasoningForPrompt,
} from '@shared/industry-design-data';

export const DISCOVER_PHASE_SYSTEM_PROMPT = `You are a UX Research Director executing Phase 01 DISCOVER of the Double Black Box Method. Your mission is to synthesize raw research data — deep search results, multi-site scrape data, trend analysis, and behavioral analytics — into a structured research synthesis that will drive all downstream design decisions.

You operate with extreme rigor. Every finding must be grounded in evidence from the provided data. You do not speculate without flagging it as a hypothesis. You organize findings by theme, prioritize by impact, and connect dots across data sources that others might miss.

Your synthesis process:
1. **Cross-reference** deep search results with scraped design data to validate or challenge assumptions
2. **Map the competitive landscape** by comparing design quality, accessibility, performance, and conversion across scraped sites
3. **Extract design trend insights** from trend research and cross-reference with what competitors are actually implementing
4. **Identify user behavior patterns** from heatmap data, flow analysis, and conversion funnel design
5. **Generate actionable recommendations** that are specific, evidence-based, and prioritized

## Output Format
Respond with a valid JSON object matching this schema:
{
  "keyFindings": [
    "string (evidence-based finding with specific data references)"
  ],
  "competitorLandscape": [
    {
      "url": "string",
      "strengths": ["string (specific strength with metric)"],
      "weaknesses": ["string (specific weakness with metric)"]
    }
  ],
  "designTrendInsights": [
    "string (trend observed with evidence of adoption or opportunity)"
  ],
  "userBehaviorPatterns": [
    "string (behavioral pattern inferred from design analysis, heatmaps, or flow data)"
  ],
  "recommendations": [
    "string (specific, actionable recommendation with priority and expected impact)"
  ]
}

Be thorough. A weak research synthesis will undermine every phase that follows.`;

export const buildDiscoverUserPrompt = (
  projectContext: {
    goal: string;
    industry: string;
    targetAudience: string;
    designStyle: string;
    competitors?: string[];
  },
  deepSearchResults: {
    queries: string[];
    results: Array<{ title: string; url: string; description: string }>;
  } | null,
  multiSiteScrapeData: {
    siteCount: number;
    sites: Array<{
      url: string;
      designQuality: number;
      accessibilityScore: number;
      performanceScore: number;
      conversionScore: number;
      strengths: string[];
      weaknesses: string[];
      componentTypes: string[];
      colorCount: number;
      fontFamilies: string[];
    }>;
    commonPatterns: string[];
    uniqueInnovations: Array<{ siteUrl: string; innovation: string }>;
  } | null,
  trendData: Array<{ title: string; url: string; description: string }> | null,
  heatmapSummary: string,
  enrichedKnowledge: { bestPractices: string[]; patterns: string[] } | null
): string => `Synthesize the following research data into a comprehensive research synthesis for the DISCOVER phase.

## Project Context
- Goal: ${projectContext.goal}
- Industry: ${projectContext.industry}
- Target Audience: ${projectContext.targetAudience}
- Design Style: ${projectContext.designStyle}
${projectContext.competitors?.length ? `- Competitors: ${projectContext.competitors.join(', ')}` : ''}

## Deep Search Results
${deepSearchResults
    ? `Searched ${deepSearchResults.queries.length} queries, found ${deepSearchResults.results.length} results.
Top results:
${deepSearchResults.results.slice(0, 15).map((r, i) => `${i + 1}. "${r.title}" (${r.url}) — ${r.description}`).join('\n')}`
    : 'No deep search results available.'}

## Multi-Site Scrape Data
${multiSiteScrapeData
    ? `Scraped ${multiSiteScrapeData.siteCount} sites.
${multiSiteScrapeData.sites.map(s => `
**${s.url}**
- Design Quality: ${s.designQuality}/100, Accessibility: ${s.accessibilityScore}/100, Performance: ${s.performanceScore}/100, Conversion: ${s.conversionScore}/100
- Strengths: ${s.strengths.join('; ')}
- Weaknesses: ${s.weaknesses.join('; ')}
- Components: ${s.componentTypes.join(', ')}
- Colors: ${s.colorCount} unique, Fonts: ${s.fontFamilies.join(', ')}`).join('\n')}

Common Patterns Across Sites: ${multiSiteScrapeData.commonPatterns.join('; ')}
Unique Innovations: ${multiSiteScrapeData.uniqueInnovations.map(u => `${u.siteUrl}: ${u.innovation}`).join('; ')}`
    : 'No multi-site scrape data available.'}

## Design Trend Research
${trendData && trendData.length > 0
    ? trendData.slice(0, 10).map((t, i) => `${i + 1}. "${t.title}" — ${t.description}`).join('\n')
    : 'No trend data available.'}

## Behavioral / Heatmap Data
${heatmapSummary || 'No behavioral data available. Infer patterns from conversion funnel design and flow analysis.'}

## Enriched Knowledge Base
${enrichedKnowledge
    ? `Best Practices: ${enrichedKnowledge.bestPractices.join('; ')}
Patterns: ${enrichedKnowledge.patterns.join('; ')}`
    : 'No enriched knowledge available.'}

## Nielsen Heuristics Evaluation Framework
Use these heuristics to evaluate competitor sites and identify usability gaps:
${formatHeuristicsForPrompt(NIELSEN_HEURISTICS)}

## Source Authority Hierarchy
Weight your findings based on source credibility:
${formatSourceAuthorityForPrompt(SOURCE_AUTHORITY)}

${(() => {
  const key = matchIndustryKey(projectContext.industry);
  if (!key || !INDUSTRY_REASONING[key]) return '';
  return `## Industry-Specific Reasoning (${projectContext.industry})
${formatReasoningForPrompt(key, INDUSTRY_REASONING[key])}`;
})()}

Synthesize ALL of this data into a structured research synthesis. Cross-reference across data sources. Identify convergent signals and contradictions. Prioritize recommendations by expected impact on the project goal. Evaluate competitors against Nielsen heuristics and weight findings by source authority tier.`;
