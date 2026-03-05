# Competitor Monitor with Semantic Diffing

**GitHub:** https://github.com/zeta-alpha/competitor-monitor-semantic-diffing
**Stars:** 287
**What It Does:** A Python-based competitor monitoring system that uses text embeddings to detect meaningful changes on competitor websites. Instead of simple text diffing (which triggers on every minor copy edit), it embeds page content into vector space and measures cosine distance between snapshots. Only surfaces changes that exceed a configurable semantic significance threshold, filtering out noise like footer date updates or cookie banner changes.
**Key Pattern:** Semantic Diffing -- embed page snapshots as vectors, compute cosine similarity between temporal snapshots, classify changes by magnitude and type. The core insight is that a 0.02 cosine distance is a minor copy edit, while a 0.15+ distance indicates a strategic redesign. Thresholds can be tuned per content zone (hero section changes matter more than footer changes).
**Integration Point in UX Scraper:** New files `src/background/semantic-embedder.ts` and `src/background/semantic-diff-engine.ts` -- Port the embedding and diffing logic from Python to TypeScript. Integrate with `src/background/supabase-sync.ts` for persisting embeddings in a new `page_embeddings` table with pgvector.
**Dependencies:** OpenAI API (`text-embedding-3-small`) or alternative embedding model, Supabase pgvector extension, cosine similarity computation
**Effort:** High

---

## Core Algorithm

### Step 1: Feature Extraction
Extract meaningful features from the scraped page before embedding:

```typescript
interface PageFeatures {
  // Structural features
  domDepth: number;
  componentCount: number;
  layoutType: 'grid' | 'flex' | 'traditional';
  navigationDepth: number;

  // Visual features
  colorPaletteHash: string;       // hash of sorted hex colors
  typographyFingerprint: string;  // font families + weight distribution
  spacingRatios: number[];        // spacing scale ratios

  // Content features
  headlines: string[];
  ctaCopy: string[];
  valuePropositions: string[];
  pricingInfo: string | null;

  // Pattern features
  conversionPatterns: string[];   // e.g., "social-proof-above-fold", "sticky-cta"
  navigationPattern: string;      // e.g., "mega-menu", "hamburger", "tab-bar"
  socialProofTypes: string[];     // e.g., "testimonials", "logos", "stats"
}
```

### Step 2: Feature-to-Text Serialization
Convert features to a text representation optimized for embedding:

```typescript
function serializeFeatures(features: PageFeatures): string {
  const sections = [
    `STRUCTURE: ${features.componentCount} components, ${features.layoutType} layout, depth ${features.domDepth}`,
    `COLORS: ${features.colorPaletteHash}`,
    `TYPOGRAPHY: ${features.typographyFingerprint}`,
    `HEADLINES: ${features.headlines.join(' | ')}`,
    `CTAS: ${features.ctaCopy.join(' | ')}`,
    `VALUE_PROPS: ${features.valuePropositions.join(' | ')}`,
    `PATTERNS: ${features.conversionPatterns.join(', ')}`,
    `NAV: ${features.navigationPattern}`,
    `SOCIAL_PROOF: ${features.socialProofTypes.join(', ')}`,
  ];

  if (features.pricingInfo) {
    sections.push(`PRICING: ${features.pricingInfo}`);
  }

  return sections.join('\n');
}
```

### Step 3: Embedding Generation
```typescript
async function embedPage(features: PageFeatures): Promise<number[]> {
  const text = serializeFeatures(features);

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  const data = await response.json();
  return data.data[0].embedding; // 1536-dimensional vector
}
```

### Step 4: Cosine Similarity Comparison
```typescript
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function classifyChange(similarity: number): ChangeClassification {
  const distance = 1 - similarity;

  if (distance < 0.02) return { type: 'none', severity: 0 };
  if (distance < 0.05) return { type: 'cosmetic', severity: 0.2 };
  if (distance < 0.10) return { type: 'content', severity: 0.5 };
  if (distance < 0.15) return { type: 'structural', severity: 0.7 };
  return { type: 'strategic', severity: 1.0 };
}
```

## Zone-Weighted Diffing

Not all page areas are equally important. The hero section changing is more significant than the footer changing. Apply zone weights:

```typescript
const ZONE_WEIGHTS: Record<string, number> = {
  hero: 2.0,        // above-the-fold hero section
  pricing: 2.0,     // pricing tables and plans
  cta: 1.8,         // call-to-action buttons and copy
  navigation: 1.5,  // primary navigation structure
  features: 1.3,    // feature lists and comparisons
  social_proof: 1.2, // testimonials, logos, stats
  content: 1.0,     // general body content
  footer: 0.5,      // footer (low significance)
  legal: 0.3,       // legal text, cookie banners
};
```

## Integration with Existing UX Scraper

The existing `FullScrapeResult` type already contains all the data needed to extract `PageFeatures`:

| Feature | Source in FullScrapeResult |
|---------|--------------------------|
| `componentCount` | `scrapeResult.components.length` |
| `colorPaletteHash` | `scrapeResult.designTokens.colors` |
| `typographyFingerprint` | `scrapeResult.typography.fontFamilies` |
| `headlines` | Extract from `scrapeResult.components` where type is heading |
| `ctaCopy` | `scrapeResult.conversionPatterns.ctas` |
| `conversionPatterns` | `scrapeResult.conversionPatterns` |
| `navigationPattern` | `scrapeResult.navigation` |
| `socialProofTypes` | `scrapeResult.conversionPatterns.socialProof` |

This means the semantic diffing layer can be built entirely on top of existing scrape data without modifying any extractors.

## What to Adapt from the Repo

**Adopt:**
- The embedding-based comparison approach (superior to text diffing)
- The threshold-based classification system
- The zone-weighted significance scoring

**Adapt:**
- Port from Python to TypeScript
- Replace their custom embedding model with OpenAI `text-embedding-3-small`
- Replace their file-based storage with Supabase pgvector
- Add visual diffing (screenshot comparison) alongside semantic diffing

**Skip:**
- Their web scraping code (we have our own comprehensive extractors)
- Their notification system (we will use Chrome notifications API)
- Their scheduling system (we will use Chrome Alarms API)
