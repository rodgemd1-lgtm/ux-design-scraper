# Apify MCP Server

**GitHub:** https://github.com/apify/apify-mcp-server
**Stars:** 892
**What It Does:** An MCP server that exposes Apify's web scraping and automation platform as tools for LLM agents. Apify provides pre-built "actors" for common scraping tasks -- Google Search scraper, Instagram scraper, Amazon product scraper, website content crawler, and 3,000+ community actors. The MCP server lets any MCP client invoke these actors, check run status, and retrieve scraped datasets.
**Key Pattern:** Actor-based web automation via MCP -- each scraping task is an "actor" that runs in Apify's cloud infrastructure. Actors handle browser rendering, proxy rotation, CAPTCHA solving, and anti-bot detection. The MCP server abstracts all of this complexity behind simple tool calls.
**Integration Point in UX Scraper:** New file `src/background/mcp/apify-mcp-client.ts` -- Create an MCP client that connects to the Apify MCP server and registers its tools with the MCP Tool Registry. Primary use cases: scraping login-walled competitor dashboards, paginated product catalogs, and social media competitor mentions.
**Dependencies:** `@modelcontextprotocol/sdk` (already installed ^1.27.1), `APIFY_API_TOKEN`, Apify free tier (5 USD cloud credits/mo)
**Effort:** Medium

---

## MCP Tools Exposed

### 1. apify_run_actor
Start an Apify actor run with given input.

```json
{
  "name": "apify_run_actor",
  "description": "Run an Apify actor with specified input",
  "inputSchema": {
    "type": "object",
    "properties": {
      "actorId": {
        "type": "string",
        "description": "Actor ID (e.g., 'apify/website-content-crawler')"
      },
      "input": {
        "type": "object",
        "description": "Actor input configuration"
      },
      "memory": {
        "type": "number",
        "description": "Memory allocation in MB (default: 256)"
      },
      "timeout": {
        "type": "number",
        "description": "Timeout in seconds (default: 300)"
      }
    },
    "required": ["actorId", "input"]
  }
}
```

### 2. apify_get_run_status
Check the status of a running actor.

```json
{
  "name": "apify_get_run_status",
  "description": "Get the status of an Apify actor run",
  "inputSchema": {
    "type": "object",
    "properties": {
      "runId": {
        "type": "string",
        "description": "The run ID returned by apify_run_actor"
      }
    },
    "required": ["runId"]
  }
}
```

### 3. apify_get_dataset
Retrieve the results from a completed actor run.

```json
{
  "name": "apify_get_dataset",
  "description": "Get dataset items from a completed actor run",
  "inputSchema": {
    "type": "object",
    "properties": {
      "datasetId": {
        "type": "string",
        "description": "Dataset ID from the completed run"
      },
      "limit": {
        "type": "number",
        "description": "Max items to return (default: 100)"
      },
      "format": {
        "type": "string",
        "enum": ["json", "csv"],
        "description": "Output format"
      }
    },
    "required": ["datasetId"]
  }
}
```

## Key Actors for CI Use Cases

### Website Content Crawler (`apify/website-content-crawler`)
Crawl entire competitor sites and extract structured content.

```typescript
const result = await apifyClient.callTool('apify_run_actor', {
  actorId: 'apify/website-content-crawler',
  input: {
    startUrls: [{ url: 'https://competitor.com' }],
    maxCrawlDepth: 3,
    maxCrawlPages: 50,
    crawlerType: 'playwright',  // handles JS-rendered pages
    includeUrlGlobs: ['https://competitor.com/**'],
    excludeUrlGlobs: ['**/blog/**', '**/docs/**'],
  },
});
```

### Google Search Scraper (`apify/google-search-scraper`)
Scrape Google SERP results for competitor tracking.

```typescript
const result = await apifyClient.callTool('apify_run_actor', {
  actorId: 'apify/google-search-scraper',
  input: {
    queries: 'site:competitor.com new features',
    maxPagesPerQuery: 3,
    languageCode: 'en',
    countryCode: 'us',
  },
});
```

### Social Media Scrapers
Monitor competitor social presence:
- `apify/instagram-scraper` -- competitor Instagram posts and engagement
- `apify/twitter-scraper` -- competitor tweets and mentions
- `apify/linkedin-scraper` -- competitor LinkedIn company updates

## Integration Architecture

### MCP Client for Chrome Extension
Since Chrome extension service workers cannot spawn child processes (required for stdio MCP transport), use the SSE (Server-Sent Events) transport or call the Apify REST API directly:

```typescript
import { createLogger } from '@shared/logger';

const log = createLogger('ApifyClient');

export class ApifyActorClient {
  private apiToken: string = '';

  private async ensureToken(): Promise<void> {
    const stored = await chrome.storage.local.get('settings');
    this.apiToken = stored.settings?.apifyApiToken || '';
    if (!this.apiToken) throw new Error('Apify API token not configured');
  }

  async runActor(actorId: string, input: Record<string, unknown>): Promise<string> {
    await this.ensureToken();

    const response = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${this.apiToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }
    );

    const data = await response.json();
    log.info('Actor run started', { actorId, runId: data.data.id });
    return data.data.id;
  }

  async getRunStatus(runId: string): Promise<ApifyRunStatus> {
    await this.ensureToken();

    const response = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${this.apiToken}`
    );

    const data = await response.json();
    return {
      status: data.data.status,
      datasetId: data.data.defaultDatasetId,
    };
  }

  async getDataset(datasetId: string, limit: number = 100): Promise<unknown[]> {
    await this.ensureToken();

    const response = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.apiToken}&limit=${limit}`
    );

    return response.json();
  }

  async runAndWait(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
    const runId = await this.runActor(actorId, input);

    // Poll for completion
    let status: ApifyRunStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 5000));
      status = await this.getRunStatus(runId);
    } while (status.status === 'RUNNING' || status.status === 'READY');

    if (status.status !== 'SUCCEEDED') {
      throw new Error(`Actor run failed with status: ${status.status}`);
    }

    return this.getDataset(status.datasetId);
  }
}
```

## Apify Pricing for CI Use Cases

| Plan | Compute Units | Platform Cost | Total |
|------|--------------|--------------|-------|
| Free | $5/mo credits | $0 | $0 |
| Starter | $49/mo credits | $0 | $49/mo |
| Scale | $499/mo credits | $0 | $499/mo |

The free tier provides $5 in compute credits, which is enough for approximately 100-500 actor runs per month depending on the actor and data volume. For CI monitoring of 10-20 competitors, the free tier should cover basic weekly scraping.

## What to Adopt vs. What to Skip

**Adopt:**
- The REST API approach for Chrome extension context (no stdio child processes)
- The polling pattern for async actor runs
- The Website Content Crawler actor for deep competitor site crawling

**Skip:**
- The MCP stdio transport (not compatible with extension service workers)
- Social media scrapers (nice-to-have, not core CI for UX design)
- The Apify SDK (too heavy for extension; REST API is sufficient)
