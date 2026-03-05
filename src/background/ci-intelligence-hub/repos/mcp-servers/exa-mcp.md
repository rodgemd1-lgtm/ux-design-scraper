# Exa MCP Server -- Deep Dive

**GitHub:** https://github.com/exa-labs/exa-mcp-server
**Stars:** 1,280
**What It Does:** Wraps the Exa semantic search API as an MCP (Model Context Protocol) server, exposing three tools: `exa_search` (semantic web search), `exa_find_similar` (find pages similar to a URL), and `exa_get_contents` (retrieve full page content). The server runs as a stdio process that MCP clients connect to via the standard MCP transport protocol.
**Key Pattern:** MCP tool server -- standardized tool exposure via the Model Context Protocol
**Integration Point in UX Scraper:** `src/background/mcp/exa-mcp-client.ts`
**Dependencies:** `@modelcontextprotocol/sdk` (^1.27.1 installed), `exa-js` (^2.7.0 installed), `EXA_API_KEY`
**Effort:** Low

---

## Server Implementation Analysis

### Tool Definitions
The Exa MCP server registers three tools with the MCP protocol:

```typescript
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'exa_search',
      description: 'Search the web using Exa semantic search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Natural language search query' },
          numResults: { type: 'number', description: 'Number of results (1-100)' },
          startPublishedDate: { type: 'string', description: 'Filter: published after this ISO date' },
          endPublishedDate: { type: 'string', description: 'Filter: published before this ISO date' },
          includeDomains: { type: 'array', items: { type: 'string' } },
          excludeDomains: { type: 'array', items: { type: 'string' } },
          category: { type: 'string', enum: ['company', 'research_paper', 'news', 'pdf', 'github', 'tweet'] },
        },
        required: ['query'],
      },
    },
    {
      name: 'exa_find_similar',
      description: 'Find pages similar to a given URL',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'URL to find similar pages for' },
          numResults: { type: 'number' },
          excludeDomains: { type: 'array', items: { type: 'string' } },
        },
        required: ['url'],
      },
    },
    {
      name: 'exa_get_contents',
      description: 'Get full contents of URLs from Exa results',
      inputSchema: {
        type: 'object',
        properties: {
          ids: { type: 'array', items: { type: 'string' }, description: 'Exa result IDs' },
        },
        required: ['ids'],
      },
    },
  ],
}));
```

### Tool Handler
```typescript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'exa_search': {
      const results = await exa.searchAndContents(args.query, {
        numResults: args.numResults || 10,
        startPublishedDate: args.startPublishedDate,
        endPublishedDate: args.endPublishedDate,
        includeDomains: args.includeDomains,
        excludeDomains: args.excludeDomains,
        category: args.category,
        text: true,
        highlights: true,
      });
      return { content: [{ type: 'text', text: JSON.stringify(results) }] };
    }
    // ... other handlers
  }
});
```

## UX Scraper-Specific Search Queries

### Competitor Discovery
```typescript
// Find competitors similar to a known competitor
const similar = await exaClient.findSimilar('https://stripe.com/payments', {
  numResults: 10,
  excludeDomains: ['stripe.com'],
});
```

### UX Pattern Search
```typescript
// Search for specific UX patterns by description
const patterns = [
  'SaaS pricing page with toggle between monthly and annual billing',
  'e-commerce product page with sticky add-to-cart and trust badges',
  'dashboard with dark mode toggle in the top navigation bar',
  'onboarding wizard with progress steps and skip option',
  'hero section with animated background and dual CTA buttons',
  'mobile-first navigation with bottom tab bar',
  'comparison table with feature checkmarks and recommended plan highlight',
];

for (const query of patterns) {
  const results = await exaClient.search(query, { numResults: 5 });
  // Each result includes URL, title, text content, and highlights
}
```

### Design Trend Research
```typescript
// Search for current design trends in a specific industry
const trends = await exaClient.search(
  'latest web design trends 2025 fintech banking dashboard', {
    numResults: 15,
    startPublishedDate: '2025-01-01',
    category: 'company',
  }
);
```

## Chrome Extension Integration Strategy

### Challenge: Stdio Transport
The standard MCP server uses stdio transport, which requires spawning a child process. Chrome extension service workers cannot spawn child processes.

### Solution Options

**Option 1: Direct SDK (Recommended for Phase A)**
Use the `exa-js` SDK directly, bypassing the MCP server:
```typescript
import Exa from 'exa-js';

export class ExaSearchClient {
  private client: Exa | null = null;

  private async ensureClient(): Promise<Exa> {
    if (this.client) return this.client;
    const settings = await chrome.storage.local.get('settings');
    const apiKey = settings.settings?.exaApiKey;
    if (!apiKey) throw new Error('Exa API key not configured');
    this.client = new Exa(apiKey);
    return this.client;
  }

  async semanticSearch(query: string, options?: ExaSearchOptions) {
    const client = await this.ensureClient();
    return client.searchAndContents(query, {
      numResults: options?.numResults || 10,
      text: true,
      highlights: true,
      ...options,
    });
  }

  async findSimilar(url: string, numResults: number = 10) {
    const client = await this.ensureClient();
    return client.findSimilarAndContents(url, {
      numResults,
      text: true,
    });
  }
}
```

**Option 2: SSE Transport (For Phase B MCP Registry)**
If Exa provides an SSE-based MCP endpoint, connect via HTTP:
```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

const transport = new SSEClientTransport(new URL('https://mcp.exa.ai/sse'));
const client = new Client({ name: 'ux-scraper', version: '1.0.0' });
await client.connect(transport);
```

**Option 3: Offscreen Document (Advanced)**
Use Chrome's offscreen document API to run a Node.js-compatible environment that can use stdio transport:
```typescript
// In service-worker.ts
await chrome.offscreen.createDocument({
  url: 'offscreen.html',
  reasons: ['WORKERS'],
  justification: 'Run MCP server connections via stdio transport',
});
```

### Recommended Path
Start with Option 1 (direct SDK) because it works immediately with no infrastructure changes. Migrate to Option 2 or 3 when the MCP Tool Registry is built, gaining the composability benefit of MCP.

## Rate Limits

| Tier | Searches/Month | Rate Limit |
|------|---------------|-----------|
| Free | 1,000 | 10 req/min |
| Basic | 10,000 | 100 req/min |
| Pro | 100,000 | 500 req/min |

The free tier supports approximately 30 searches per day, sufficient for initial CI integration with a small number of tracked competitors.
