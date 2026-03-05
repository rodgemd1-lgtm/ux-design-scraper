# Exa MCP Server

**GitHub:** https://github.com/exa-labs/exa-mcp-server
**Stars:** 1,280
**What It Does:** An MCP (Model Context Protocol) server that exposes Exa's semantic search API as tools that any MCP-compatible client can invoke. Exa searches the web by meaning rather than keywords -- you describe what you are looking for in natural language, and Exa returns pages that match semantically. The MCP server wraps `exa_search`, `exa_find_similar`, and `exa_get_contents` as callable tools.
**Key Pattern:** MCP tool exposure -- wraps an existing API (Exa) as MCP tools with JSON Schema parameter definitions. The server runs as a stdio process that any MCP client can connect to. This pattern is directly applicable to exposing other CI tools via MCP.
**Integration Point in UX Scraper:** New file `src/background/mcp/exa-mcp-client.ts` -- Create an MCP client that connects to the Exa MCP server process and exposes semantic search to the CI pipeline. Also integrates with the MCP Tool Registry (`src/background/mcp/mcp-tool-registry.ts`).
**Dependencies:** `@modelcontextprotocol/sdk` (already installed ^1.27.1), `exa-js` (already installed ^2.7.0), `EXA_API_KEY`
**Effort:** Low

---

## MCP Tools Exposed

### 1. exa_search
Perform a semantic search across the web.

```json
{
  "name": "exa_search",
  "description": "Search the web using Exa's semantic search engine",
  "inputSchema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Natural language search query"
      },
      "numResults": {
        "type": "number",
        "description": "Number of results (default: 10, max: 100)"
      },
      "startPublishedDate": {
        "type": "string",
        "description": "ISO date string for filtering by publish date"
      },
      "category": {
        "type": "string",
        "enum": ["company", "research_paper", "news", "pdf", "github", "tweet"]
      }
    },
    "required": ["query"]
  }
}
```

**UX Scraper use case:** Search for pages by UX pattern instead of keyword. Example queries:
- "SaaS pricing page with toggle between monthly and annual billing"
- "e-commerce product page with sticky add-to-cart button"
- "dark mode toggle in header navigation for fintech dashboard"
- "mobile hamburger menu with slide-out animation"

### 2. exa_find_similar
Find pages similar to a given URL.

```json
{
  "name": "exa_find_similar",
  "description": "Find pages similar to a given URL",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "description": "The URL to find similar pages for"
      },
      "numResults": {
        "type": "number",
        "description": "Number of results (default: 10)"
      },
      "excludeDomains": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Domains to exclude from results"
      }
    },
    "required": ["url"]
  }
}
```

**UX Scraper use case:** Given a competitor URL, find all similar competitors automatically. This replaces manual competitor discovery with semantic similarity matching.

### 3. exa_get_contents
Retrieve the full content of specific URLs.

```json
{
  "name": "exa_get_contents",
  "description": "Get full contents of URLs from search results",
  "inputSchema": {
    "type": "object",
    "properties": {
      "ids": {
        "type": "array",
        "items": { "type": "string" },
        "description": "Array of Exa result IDs to get content for"
      }
    },
    "required": ["ids"]
  }
}
```

## Integration Architecture

### Option A: Direct SDK Usage (Simpler)
Use the `exa-js` SDK directly without the MCP server:

```typescript
import Exa from 'exa-js';

export class ExaSearchClient {
  private client: Exa;

  constructor(apiKey: string) {
    this.client = new Exa(apiKey);
  }

  async semanticSearch(query: string, numResults: number = 10) {
    return this.client.searchAndContents(query, {
      numResults,
      text: true,
      highlights: true,
    });
  }

  async findSimilarSites(url: string, numResults: number = 10) {
    return this.client.findSimilarAndContents(url, {
      numResults,
      text: true,
    });
  }
}
```

### Option B: MCP Server Integration (Composable)
Connect to the Exa MCP server via the MCP SDK for unified tool dispatch:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class ExaMCPClient {
  private client: Client;

  async connect(): Promise<void> {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@anthropic/exa-mcp-server'],
      env: { EXA_API_KEY: await this.getApiKey() },
    });

    this.client = new Client({ name: 'ux-scraper', version: '1.0.0' });
    await this.client.connect(transport);
  }

  async search(query: string): Promise<ExaSearchResult[]> {
    const result = await this.client.callTool('exa_search', { query });
    return JSON.parse(result.content[0].text);
  }
}
```

### Recommended Approach
Use **Option A** (direct SDK) for the initial integration because it is simpler and avoids the complexity of managing a child process in a Chrome extension service worker. Migrate to **Option B** (MCP) when the MCP Tool Registry (P3) is built, to gain composability with other MCP servers.

## Exa vs. Brave Search Comparison

| Feature | Brave Search | Exa |
|---------|-------------|-----|
| Query type | Keyword-based | Semantic / natural language |
| Result quality | Traditional web index | Neural search, meaning-based matching |
| Find similar | Not supported | `findSimilar(url)` returns semantically similar pages |
| Content retrieval | Snippets only | Full page text with highlights |
| UX pattern search | Requires precise keywords | Describe the pattern you want in plain English |
| Cost | Free tier: 2,000 queries/mo | Free tier: 1,000 searches/mo |

Both should be used: Brave for broad keyword discovery, Exa for semantic UX pattern matching.
