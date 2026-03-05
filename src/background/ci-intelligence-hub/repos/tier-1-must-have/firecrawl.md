# Firecrawl

**GitHub:** https://github.com/mendableai/firecrawl
**Stars:** 24,800
**What It Does:** Turns any website into clean, structured markdown or JSON. Handles JavaScript rendering, dynamic content loading, anti-bot measures, and pagination. Provides three core operations: `scrape` (single URL to markdown), `crawl` (multi-page site crawl), and `map` (discover all URLs on a site). Also supports screenshot capture of rendered pages.
**Key Pattern:** Structured web scraping with LLM-ready output. Firecrawl renders pages in a headless browser, waits for dynamic content, extracts clean content, and returns structured data that can be directly consumed by language models. The `extract` mode uses LLM-powered structured extraction with user-defined schemas.
**Integration Point in UX Scraper:** `src/background/scrape-orchestrator.ts` -- Add Firecrawl as a data source in the scrape pipeline. Before DOM extraction, run Firecrawl on the target URL to get clean markdown + metadata. Also integrate into `src/background/screenshot-manager.ts` for remote screenshot capture.
**Dependencies:** `@mendable/firecrawl-js` (already installed ^4.15.2), `FIRECRAWL_API_KEY` environment variable
**Effort:** Low

---

## API Capabilities Relevant to UX Scraper

### 1. Scrape (Single URL)
```typescript
import FirecrawlApp from '@mendable/firecrawl-js';

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY });

// Get clean markdown from any URL
const result = await firecrawl.scrapeUrl('https://competitor.com', {
  formats: ['markdown', 'html', 'screenshot'],
  waitFor: 3000,  // wait for JS rendering
  includeTags: ['main', 'article', 'section'],
  excludeTags: ['nav', 'footer', 'aside'],
});

// result.markdown -- clean markdown content
// result.html -- cleaned HTML
// result.screenshot -- base64 screenshot
// result.metadata -- title, description, language, etc.
```

### 2. Crawl (Multi-Page)
```typescript
// Crawl entire competitor site
const crawlResult = await firecrawl.crawlUrl('https://competitor.com', {
  limit: 50,        // max pages
  maxDepth: 3,      // max link depth
  includePaths: ['/pricing', '/features', '/about'],
  excludePaths: ['/blog/*', '/docs/*'],
  scrapeOptions: {
    formats: ['markdown'],
  },
});

// Returns array of page results
for (const page of crawlResult.data) {
  console.log(page.url, page.markdown.length);
}
```

### 3. Map (URL Discovery)
```typescript
// Discover all URLs on a site without scraping content
const mapResult = await firecrawl.mapUrl('https://competitor.com', {
  limit: 100,
});

// Returns array of discovered URLs
// Useful for building competitor sitemap before targeted scraping
```

### 4. Extract (LLM-Powered Structured Extraction)
```typescript
// Extract structured data using an LLM with a schema
const extractResult = await firecrawl.scrapeUrl('https://competitor.com/pricing', {
  formats: ['extract'],
  extract: {
    schema: {
      type: 'object',
      properties: {
        plans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              price: { type: 'string' },
              features: { type: 'array', items: { type: 'string' } },
              cta_text: { type: 'string' },
            },
          },
        },
      },
    },
  },
});
```

## Integration Plan

### Phase 1: Basic Scraping Client
Create `src/background/firecrawl-client.ts`:
```typescript
import FirecrawlApp from '@mendable/firecrawl-js';
import { createLogger } from '@shared/logger';
import { STORAGE_KEYS } from '@shared/constants';

const log = createLogger('FirecrawlClient');

export class FirecrawlClient {
  private client: FirecrawlApp | null = null;

  private async ensureClient(): Promise<FirecrawlApp> {
    if (this.client) return this.client;
    const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = stored[STORAGE_KEYS.SETTINGS];
    if (!settings?.firecrawlApiKey) {
      throw new Error('Firecrawl API key not configured');
    }
    this.client = new FirecrawlApp({ apiKey: settings.firecrawlApiKey });
    return this.client;
  }

  async scrape(url: string): Promise<FirecrawlScrapeResult> {
    const client = await this.ensureClient();
    log.info('Scraping URL via Firecrawl', { url });
    return client.scrapeUrl(url, {
      formats: ['markdown', 'html', 'screenshot'],
      waitFor: 3000,
    });
  }

  async captureScreenshot(url: string): Promise<string> {
    const client = await this.ensureClient();
    const result = await client.scrapeUrl(url, {
      formats: ['screenshot'],
      waitFor: 3000,
    });
    return result.screenshot; // base64 PNG
  }
}
```

### Phase 2: Orchestrator Integration
Modify `src/background/scrape-orchestrator.ts` to call Firecrawl before DOM extraction:
- Add Firecrawl scrape as an optional Phase 0.5
- Merge Firecrawl markdown into the scrape result
- Use Firecrawl screenshots as fallback for CDP failures

### Phase 3: Competitor Scraping
Use Firecrawl for scraping competitor URLs that are not in the active tab:
- `multi-site-engine.ts` can use Firecrawl instead of opening new tabs
- Avoids the need for Chrome debugger attachment to non-active tabs

## Rate Limits and Pricing

| Plan | Scrapes/Month | Rate Limit | Cost |
|------|--------------|-----------|------|
| Free | 500 | 5 req/min | $0 |
| Hobby | 3,000 | 10 req/min | $19/mo |
| Standard | 100,000 | 50 req/min | $199/mo |
| Growth | 500,000 | 200 req/min | $999/mo |

For CI use cases, the Hobby plan (3,000 scrapes/month) should suffice for monitoring 10-20 competitors weekly.
