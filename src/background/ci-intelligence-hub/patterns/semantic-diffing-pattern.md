# Pattern: Semantic Diffing

Detect strategic design shifts on competitor websites using embedding-based comparison rather than text diffing.

---

## Problem

Traditional text diffing (comparing HTML or rendered text line-by-line) generates excessive noise for competitive intelligence. A footer copyright year change, a cookie banner update, or a minor CSS tweak all trigger alerts. Meanwhile, a competitor subtly repositioning their value proposition or adding a new pricing tier -- genuinely strategic changes -- gets buried in the noise.

The UX Design Scraper already captures comprehensive page data via DOM extractors, but has no way to detect meaningful changes between scrape sessions. The `WaybackClient` tracks historical snapshots but only stores timestamps and URLs, not comparable content representations.

## Solution

Embed each scraped page as a high-dimensional vector that captures its structural, visual, and semantic properties. Compare embeddings across time using cosine similarity. Changes below a threshold are noise; changes above the threshold are strategic and worth surfacing to the user.

The key insight: embedding the page captures the *meaning* of the design, not its literal text. A competitor can rewrite their entire hero section copy while keeping the same strategic message, and the embedding distance will be small. But if they change from "Free trial" to "Request a demo" (a strategic shift from product-led to sales-led growth), the distance will be significant.

## Implementation

### Step 1: Feature Extraction from FullScrapeResult

```typescript
// src/background/semantic-embedder.ts
import { createLogger } from '@shared/logger';
import type { FullScrapeResult } from '@shared/types';

const log = createLogger('SemanticEmbedder');

interface PageFeatureVector {
  structuralText: string;
  visualText: string;
  contentText: string;
  patternText: string;
}

export function extractFeatures(scrapeResult: FullScrapeResult): PageFeatureVector {
  // Structural features
  const structuralText = [
    `components:${scrapeResult.components.length}`,
    `nav-depth:${scrapeResult.navigation.menuDepth}`,
    `pages:${scrapeResult.navigation.totalPages}`,
    `component-types:${[...new Set(scrapeResult.components.map(c => c.type))].join(',')}`,
    `has-dark-mode:${scrapeResult.darkMode.hasDarkMode}`,
    `frameworks:${Object.values(scrapeResult.thirdPartyStack.frameworks).map(f => f.name).join(',')}`,
  ].join(' | ');

  // Visual features
  const visualText = [
    `colors:${scrapeResult.designTokens.colors.slice(0, 8).join(',')}`,
    `fonts:${scrapeResult.typography.fontFamilies.join(',')}`,
    `font-sizes:${scrapeResult.typography.fontSizes.slice(0, 5).join(',')}`,
    `spacing:${scrapeResult.designTokens.spacing.slice(0, 5).join(',')}`,
    `border-radii:${scrapeResult.designTokens.borderRadii.slice(0, 3).join(',')}`,
  ].join(' | ');

  // Content features
  const headlines = scrapeResult.components
    .filter(c => c.type === 'heading' || c.name.toLowerCase().includes('hero'))
    .map(c => c.html.replace(/<[^>]*>/g, '').trim())
    .slice(0, 5);

  const ctaCopy = scrapeResult.conversionPatterns.ctas
    .map(cta => cta.text)
    .slice(0, 10);

  const contentText = [
    `headlines:${headlines.join(' | ')}`,
    `ctas:${ctaCopy.join(' | ')}`,
    `social-proof-count:${scrapeResult.conversionPatterns.socialProof.length}`,
    `trust-badges:${scrapeResult.conversionPatterns.trustBadges.slice(0, 5).join(',')}`,
    `form-fields:${scrapeResult.conversionPatterns.formFields.length}`,
  ].join(' | ');

  // Pattern features
  const patternText = [
    `urgency:${scrapeResult.conversionPatterns.urgencyPatterns.length > 0}`,
    `a11y-score:${scrapeResult.accessibility.overallScore}`,
    `perf-score:${scrapeResult.lighthouse.performanceScore}`,
    `lcp:${scrapeResult.lighthouse.lcp}`,
    `animations:${scrapeResult.animations.cssAnimations.length}`,
    `scroll-triggered:${scrapeResult.animations.scrollTriggered.length}`,
  ].join(' | ');

  return { structuralText, visualText, contentText, patternText };
}
```

### Step 2: Embedding Generation

```typescript
export class SemanticEmbedder {
  private apiKey: string = '';

  async embed(scrapeResult: FullScrapeResult): Promise<number[]> {
    const features = extractFeatures(scrapeResult);
    const text = [
      features.structuralText,
      features.visualText,
      features.contentText,
      features.patternText,
    ].join('\n');

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 1536,
      }),
    });

    const data = await response.json();
    return data.data[0].embedding;
  }
}
```

### Step 3: Comparison and Classification

```typescript
// src/background/semantic-diff-engine.ts
export class SemanticDiffEngine {
  compare(current: number[], previous: number[]): DiffResult {
    const similarity = this.cosineSimilarity(current, previous);
    const distance = 1 - similarity;

    return {
      similarity,
      distance,
      classification: this.classify(distance),
      isSignificant: distance >= 0.05,
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private classify(distance: number): ChangeClassification {
    if (distance < 0.02) return { type: 'none', severity: 0, label: 'No meaningful change' };
    if (distance < 0.05) return { type: 'cosmetic', severity: 0.2, label: 'Minor visual tweaks' };
    if (distance < 0.10) return { type: 'content', severity: 0.5, label: 'Content or copy update' };
    if (distance < 0.15) return { type: 'structural', severity: 0.7, label: 'Layout or navigation change' };
    return { type: 'strategic', severity: 1.0, label: 'Major strategic redesign' };
  }
}
```

## Code Example: Full Pipeline Integration

```typescript
// In phase-orchestrator.ts, after scrape completes:

async function runSemanticDiffPhase(
  scrapeResult: FullScrapeResult,
  competitorUrl: string,
  projectId: string
): Promise<DiffResult | null> {
  const embedder = new SemanticEmbedder();
  const diffEngine = new SemanticDiffEngine();

  // Generate embedding for current scrape
  const currentEmbedding = await embedder.embed(scrapeResult);

  // Load previous embedding from Supabase
  const { data: previousRecord } = await supabase
    .from('page_embeddings')
    .select('embedding')
    .eq('competitor_url', competitorUrl)
    .order('scraped_at', { ascending: false })
    .limit(1)
    .single();

  // Store current embedding
  await supabase.from('page_embeddings').insert({
    id: generateId(),
    project_id: projectId,
    competitor_url: competitorUrl,
    embedding: currentEmbedding,
    scraped_at: new Date().toISOString(),
  });

  // Compare if we have a previous embedding
  if (!previousRecord?.embedding) {
    log.info('First scrape for this competitor, no comparison available');
    return null;
  }

  const diff = diffEngine.compare(currentEmbedding, previousRecord.embedding);

  if (diff.isSignificant) {
    // Log the change
    await supabase.from('change_log').insert({
      id: generateId(),
      project_id: projectId,
      competitor_url: competitorUrl,
      change_type: diff.classification.type,
      severity: diff.classification.severity,
      summary: diff.classification.label,
      detected_at: new Date().toISOString(),
    });

    // Send Chrome notification for significant changes
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'assets/icon-128.png',
      title: 'Competitor Change Detected',
      message: `${competitorUrl}: ${diff.classification.label} (${Math.round(diff.distance * 100)}% different)`,
    });
  }

  return diff;
}
```

## Integration Point

The semantic diffing phase inserts between the existing analysis phase and the persistence phase in the CI pipeline:

```
Phase 3: Analysis (scoring, critique)  -- existing
    |
    v
Phase 4: Semantic Diffing              -- NEW (this pattern)
    |
    v
Phase 5: Persistence (Supabase sync)   -- existing (extended with embedding storage)
```

Modify `src/background/phase-orchestrator.ts` to add `runSemanticDiffPhase()` as Phase 4. The existing `ScrapeOrchestrator` already produces the `FullScrapeResult` object that the embedder consumes.
