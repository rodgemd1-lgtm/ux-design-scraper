# Apify MCP Server -- Deep Dive

**GitHub:** https://github.com/apify/apify-mcp-server
**Stars:** 892
**What It Does:** An MCP server exposing Apify's actor-based web scraping platform. Allows MCP clients to run any of 3,000+ Apify actors (pre-built scraping tools), monitor run status, and retrieve scraped datasets. The server handles authentication, actor discovery, and result serialization.
**Key Pattern:** Actor-based automation via MCP tool protocol
**Integration Point in UX Scraper:** `src/background/mcp/apify-mcp-client.ts`
**Dependencies:** `@modelcontextprotocol/sdk` (^1.27.1 installed), `APIFY_API_TOKEN`
**Effort:** Medium

---

## Server Tool Catalog

### Core Tools

| Tool | Description | Use Case for UX Scraper |
|------|-------------|------------------------|
| `apify_run_actor` | Execute any Apify actor | Run website crawlers, scrapers, monitors |
| `apify_get_run_status` | Check if an actor run is complete | Poll for completion before fetching results |
| `apify_get_dataset` | Retrieve scraping results | Get structured data from completed runs |
| `apify_list_actors` | Browse available actors | Discover new scraping capabilities |
| `apify_get_actor_input_schema` | Get input schema for an actor | Build dynamic configuration UIs |

### UX-Relevant Actors

#### Website Content Crawler (`apify/website-content-crawler`)
The primary actor for CI use cases. Crawls entire competitor sites with JavaScript rendering.

```json
{
  "actorId": "apify/website-content-crawler",
  "input": {
    "startUrls": [{ "url": "https://competitor.com" }],
    "maxCrawlDepth": 3,
    "maxCrawlPages": 50,
    "crawlerType": "playwright",
    "includeUrlGlobs": ["https://competitor.com/**"],
    "excludeUrlGlobs": ["**/blog/**"],
    "saveMarkdown": true,
    "saveHtml": true,
    "saveScreenshots": true,
    "screenshotOptions": {
      "fullPage": true,
      "quality": 80
    }
  }
}
```

#### Web Scraper (`apify/web-scraper`)
Generic web scraper with custom page function support. Good for extracting specific data points.

```json
{
  "actorId": "apify/web-scraper",
  "input": {
    "startUrls": [{ "url": "https://competitor.com/pricing" }],
    "pageFunction": "async function pageFunction(context) { const { page } = context; const plans = await page.$$eval('.pricing-plan', plans => plans.map(p => ({ name: p.querySelector('h3')?.textContent, price: p.querySelector('.price')?.textContent, features: [...p.querySelectorAll('li')].map(li => li.textContent) }))); return plans; }"
  }
}
```

#### Google SERP Scraper (`apify/google-search-scraper`)
Track competitor search rankings and visibility.

```json
{
  "actorId": "apify/google-search-scraper",
  "input": {
    "queries": "site:competitor.com",
    "maxPagesPerQuery": 5,
    "languageCode": "en",
    "countryCode": "us",
    "mobileResults": false
  }
}
```

## REST API Integration for Chrome Extension

Since the extension service worker cannot use stdio transport, we call the Apify REST API directly:

### Client Implementation
```typescript
import { createLogger } from '@shared/logger';
import { STORAGE_KEYS } from '@shared/constants';

const log = createLogger('ApifyMCP');

const APIFY_BASE_URL = 'https://api.apify.com/v2';

interface ApifyRunResult {
  id: string;
  status: string;
  defaultDatasetId: string;
  startedAt: string;
  finishedAt: string | null;
}

export class ApifyMCPClient {
  private token: string = '';

  private async ensureToken(): Promise<string> {
    if (this.token) return this.token;
    const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    const settings = stored[STORAGE_KEYS.SETTINGS];
    if (!settings?.apifyApiToken) {
      throw new Error('Apify API token not configured. Set it in Settings.');
    }
    this.token = settings.apifyApiToken;
    return this.token;
  }

  async runActor(actorId: string, input: Record<string, unknown>): Promise<string> {
    const token = await this.ensureToken();
    log.info('Starting Apify actor', { actorId });

    const response = await fetch(`${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`Apify API error: ${response.status}`);
    }

    const data = await response.json();
    const runId = data.data.id;
    log.info('Actor run started', { actorId, runId });
    return runId;
  }

  async waitForRun(runId: string, timeoutMs: number = 300000): Promise<ApifyRunResult> {
    const token = await this.ensureToken();
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const response = await fetch(
        `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
      );
      const data = await response.json();
      const run = data.data as ApifyRunResult;

      if (run.status === 'SUCCEEDED') return run;
      if (run.status === 'FAILED' || run.status === 'ABORTED') {
        throw new Error(`Actor run ${run.status}: ${runId}`);
      }

      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error(`Actor run timeout after ${timeoutMs}ms`);
  }

  async getDataset<T = unknown>(datasetId: string, limit: number = 100): Promise<T[]> {
    const token = await this.ensureToken();

    const response = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=${limit}&format=json`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch dataset: ${response.status}`);
    }

    return response.json();
  }

  // Convenience method: run actor and wait for results
  async scrapeAndWait<T = unknown>(
    actorId: string,
    input: Record<string, unknown>,
    limit: number = 100
  ): Promise<T[]> {
    const runId = await this.runActor(actorId, input);
    const run = await this.waitForRun(runId);
    return this.getDataset<T>(run.defaultDatasetId, limit);
  }
}
```

### Usage in CI Pipeline
```typescript
const apify = new ApifyMCPClient();

// Deep crawl a competitor site
const crawlResults = await apify.scrapeAndWait(
  'apify/website-content-crawler',
  {
    startUrls: [{ url: competitorUrl }],
    maxCrawlDepth: 3,
    maxCrawlPages: 30,
    crawlerType: 'playwright',
    saveMarkdown: true,
  }
);

// Extract pricing data from a specific page
const pricingData = await apify.scrapeAndWait(
  'apify/web-scraper',
  {
    startUrls: [{ url: `${competitorUrl}/pricing` }],
    pageFunction: PRICING_EXTRACTION_FUNCTION,
  }
);
```

## MCP Registry Integration

When the MCP Tool Registry is built (Priority P3), register Apify tools:

```typescript
// In mcp-tool-registry.ts
registry.registerTools('apify', [
  {
    name: 'apify_run_actor',
    handler: (args) => apifyClient.runActor(args.actorId, args.input),
  },
  {
    name: 'apify_scrape_site',
    handler: (args) => apifyClient.scrapeAndWait(
      'apify/website-content-crawler', args.input
    ),
  },
  {
    name: 'apify_get_dataset',
    handler: (args) => apifyClient.getDataset(args.datasetId, args.limit),
  },
]);
```

## Cost Considerations

| Operation | Approximate Cost | Notes |
|-----------|-----------------|-------|
| Website Content Crawler (50 pages) | ~$0.50 | Depends on page complexity |
| Google SERP Scraper (10 queries) | ~$0.10 | Low compute |
| Web Scraper (single page) | ~$0.01 | Minimal resources |
| Free tier monthly budget | $5.00 | ~500-1000 simple scrapes |

For CI monitoring of 10 competitors with weekly deep crawls, expect approximately $20-40/month on the Starter plan.
