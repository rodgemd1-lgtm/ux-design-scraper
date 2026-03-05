# n8n Battlecard Generator

**GitHub:** https://github.com/n8n-io/n8n-templates/tree/main/competitive-battlecard-generator
**Stars:** 156 (n8n templates repo)
**What It Does:** An n8n workflow template that automatically generates competitive battlecards by scraping competitor websites, extracting key differentiators, and formatting the output into a structured battlecard document. Uses LLM analysis to identify strengths, weaknesses, pricing positioning, and recommended counter-arguments. Outputs to Google Docs, Notion, or markdown.
**Key Pattern:** Automated deliverable generation -- takes raw scraped data as input, runs it through a multi-step LLM analysis pipeline, and produces a formatted business document. The key insight is structuring the LLM prompts to extract specific battlecard sections independently, then assembling them into a coherent deliverable.
**Integration Point in UX Scraper:** `src/generators/analysis-generator.ts` -- Add a `generateBattlecard()` method that uses the existing Claude API integration to produce competitive battlecards from `FullScrapeResult` data. Also create a new battlecard template in `src/shared/prompt-templates/`.
**Dependencies:** Claude API (existing via `ClaudeAPIClient`), no additional packages
**Effort:** Medium

---

## Battlecard Structure

The generator produces documents with these sections:

### 1. Competitor Overview
- Company name, URL, industry position
- Target audience and market segment
- Key value proposition (extracted from hero section)

### 2. Product/Design Comparison
| Feature | Us | Competitor | Advantage |
|---------|-----|-----------|-----------|
| (auto-populated from scrape data) |

### 3. UX/Design Strengths
- Design patterns that work well
- Conversion optimization tactics
- Accessibility compliance level
- Performance metrics

### 4. UX/Design Weaknesses
- Missing patterns or poor implementations
- Accessibility gaps
- Performance issues
- Mobile responsiveness problems

### 5. Pricing Analysis
- Pricing tiers (if pricing page was scraped)
- Positioning relative to market
- Feature/price ratio

### 6. Counter-Arguments
- For each competitor strength, a recommended counter-argument
- Talking points for sales/product teams

### 7. Recommendations
- Design elements to adopt
- Patterns to differentiate on
- Quick wins vs. long-term improvements

## Implementation for UX Scraper

### Battlecard Prompt Template
Create `src/shared/prompt-templates/battlecard-prompt.ts`:

```typescript
export function buildBattlecardPrompt(
  competitorData: FullScrapeResult,
  projectContext: ProjectContext
): string {
  return `You are a competitive intelligence analyst specializing in UX/UI design.

Generate a competitive battlecard comparing the competitor site against our project.

## Our Project Context
- Industry: ${projectContext.industry}
- Target Audience: ${projectContext.targetAudience}
- Design Style: ${projectContext.designStyle}
- Goal: ${projectContext.goal}

## Competitor Data
- URL: ${competitorData.targetUrl}
- Components Found: ${competitorData.components.length}
- Design Tokens: ${JSON.stringify(competitorData.designTokens.colors.slice(0, 10))}
- Typography: ${competitorData.typography.fontFamilies.join(', ')}
- Accessibility Score: ${competitorData.accessibility.overallScore}
- Performance Score: ${competitorData.lighthouse.performanceScore}
- LCP: ${competitorData.lighthouse.lcp}ms
- CLS: ${competitorData.lighthouse.cls}
- Navigation Depth: ${competitorData.navigation.menuDepth}
- CTAs Found: ${competitorData.conversionPatterns.ctas.length}
- Social Proof Elements: ${competitorData.conversionPatterns.socialProof.length}
- Trust Badges: ${competitorData.conversionPatterns.trustBadges.length}
- Dark Mode: ${competitorData.darkMode.hasDarkMode ? 'Yes' : 'No'}
- Frameworks: ${Object.values(competitorData.thirdPartyStack.frameworks).map(f => f.name).join(', ')}

## Output Format
Generate a JSON battlecard with this exact structure:
{
  "overview": {
    "companyName": "string",
    "url": "string",
    "valueProposition": "string",
    "targetAudience": "string",
    "marketPosition": "string"
  },
  "designStrengths": ["string"],
  "designWeaknesses": ["string"],
  "uxPatterns": {
    "effective": ["string"],
    "missing": ["string"]
  },
  "performanceComparison": {
    "accessibility": { "score": number, "assessment": "string" },
    "performance": { "score": number, "assessment": "string" },
    "mobile": { "assessment": "string" }
  },
  "counterArguments": [
    { "theirStrength": "string", "ourCounter": "string" }
  ],
  "recommendations": {
    "adopt": ["string"],
    "differentiate": ["string"],
    "quickWins": ["string"]
  }
}`;
}
```

### Generator Method
Add to `src/generators/analysis-generator.ts`:

```typescript
async generateBattlecard(
  competitorData: FullScrapeResult,
  projectContext: ProjectContext
): Promise<Battlecard> {
  const prompt = buildBattlecardPrompt(competitorData, projectContext);

  const response = await this.claudeClient.singleCall(
    'You are a competitive intelligence analyst. Return only valid JSON.',
    prompt
  );

  return JSON.parse(response) as Battlecard;
}
```

### Storage
Persist generated battlecards via `SupabaseSync` to the new `intelligence_reports` table:

```typescript
await supabase.from('intelligence_reports').insert({
  id: generateId(),
  project_id: projectId,
  report_type: 'battlecard',
  content: battlecardData,
  generated_at: new Date().toISOString(),
});
```

## What to Adopt vs. What to Skip

**Adopt:**
- The structured battlecard schema (sections, comparison tables)
- The multi-prompt approach (generate each section independently for quality)
- The JSON output format for structured storage

**Skip:**
- n8n as the orchestration layer (use existing `PhaseOrchestrator`)
- Google Docs/Notion output (store in Supabase, render in sidepanel)
- The specific n8n node configurations
