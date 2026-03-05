# MCP Stack Overview

How all MCP servers compose into a unified CI tool layer for the UX Design Scraper.

---

## What is MCP?

Model Context Protocol (MCP) is an open standard by Anthropic for connecting AI applications to external tools and data sources. An MCP "server" exposes tools (functions) that an MCP "client" can discover and invoke. The protocol handles tool listing, parameter validation, and result serialization.

The UX Design Scraper already has `@modelcontextprotocol/sdk` (^1.27.1) in its dependencies, providing both client and server implementations.

---

## MCP Servers in the CI Stack

```
+-----------------------------------------------------------------------+
|                        MCP Tool Registry                               |
|                  src/background/mcp/mcp-tool-registry.ts               |
+-----------------------------------------------------------------------+
|  Unified tool dispatch: callTool(name, args) -> routes to server      |
+----+----------+----------+----------+----------+----------------------+
     |          |          |          |          |
     v          v          v          v          v
+--------+ +--------+ +--------+ +---------+ +---------+
|  Exa   | | Apify  | |Playwrt | | Custom  | | Future  |
|  MCP   | |  MCP   | |  MCP   | |  Tools  | | Servers |
+--------+ +--------+ +--------+ +---------+ +---------+
| search | | actors | | browse | | embed   | |  ...    |
| similar| | crawl  | | click  | | diff    | |         |
| content| | data   | | fill   | | score   | |         |
+--------+ +--------+ +--------+ +---------+ +---------+
```

### Server Inventory

| Server | Transport | Tools | Priority | Status |
|--------|-----------|-------|----------|--------|
| **Exa MCP** | Direct SDK (Phase A) / SSE (Phase B) | `exa_search`, `exa_find_similar`, `exa_get_contents` | P4 | Not started |
| **Apify MCP** | REST API | `apify_run_actor`, `apify_get_run_status`, `apify_get_dataset` | P5 | Not started |
| **Playwright MCP** | Offscreen Document + stdio | `browser_navigate`, `browser_click`, `browser_screenshot`, `browser_fill` | P18 | Not started |
| **Custom Tools** | Internal (no transport) | `embed_page`, `diff_embeddings`, `score_components` | P6-P7 | Not started |

---

## MCP Tool Registry Architecture

The registry provides a single interface for the CI pipeline to invoke any tool without knowing which server provides it.

### Core Interface
```typescript
interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  serverName: string;
}

interface MCPToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

class MCPToolRegistry {
  private tools: Map<string, {
    definition: MCPToolDefinition;
    handler: (args: Record<string, unknown>) => Promise<MCPToolResult>;
  }> = new Map();

  registerTool(definition: MCPToolDefinition, handler: Function): void {
    this.tools.set(definition.name, { definition, handler });
    log.info('Tool registered', { name: definition.name, server: definition.serverName });
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);

    log.info('Calling tool', { name, args: Object.keys(args) });
    const startTime = Date.now();

    try {
      const result = await tool.handler(args);
      log.info('Tool call complete', { name, durationMs: Date.now() - startTime });
      return result;
    } catch (err) {
      log.error('Tool call failed', { name, error: err });
      return {
        content: [{ type: 'text', text: `Tool error: ${err}` }],
        isError: true,
      };
    }
  }

  listTools(): MCPToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }

  hasTools(serverName: string): boolean {
    return Array.from(this.tools.values()).some(t => t.definition.serverName === serverName);
  }
}
```

### Registration Example
```typescript
// In service-worker.ts or a dedicated init module
const registry = new MCPToolRegistry();

// Register Exa tools (direct SDK approach)
const exaClient = new ExaSearchClient();
registry.registerTool(
  {
    name: 'exa_search',
    description: 'Semantic web search via Exa',
    inputSchema: { query: 'string', numResults: 'number' },
    serverName: 'exa',
  },
  async (args) => {
    const results = await exaClient.semanticSearch(args.query, args);
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  }
);

// Register Apify tools (REST API approach)
const apifyClient = new ApifyMCPClient();
registry.registerTool(
  {
    name: 'apify_scrape_site',
    description: 'Deep crawl a website via Apify',
    inputSchema: { url: 'string', maxPages: 'number' },
    serverName: 'apify',
  },
  async (args) => {
    const results = await apifyClient.scrapeAndWait(
      'apify/website-content-crawler',
      { startUrls: [{ url: args.url }], maxCrawlPages: args.maxPages || 30 }
    );
    return { content: [{ type: 'text', text: JSON.stringify(results) }] };
  }
);

// Register internal tools
registry.registerTool(
  {
    name: 'embed_page',
    description: 'Generate embedding for a scraped page',
    inputSchema: { scrapeResult: 'object' },
    serverName: 'internal',
  },
  async (args) => {
    const embedding = await semanticEmbedder.embed(args.scrapeResult);
    return { content: [{ type: 'text', text: JSON.stringify(embedding) }] };
  }
);
```

---

## Transport Challenges in Chrome Extensions

### The Problem
MCP servers typically use stdio transport (spawning a child process). Chrome extension service workers cannot:
1. Spawn child processes
2. Access the file system
3. Run long-lived background tasks (service workers are ephemeral)

### Solutions by Server Type

| Server | Challenge | Solution |
|--------|-----------|----------|
| **Exa** | Cannot spawn `npx exa-mcp-server` | Use `exa-js` SDK directly (REST calls) |
| **Apify** | Cannot spawn stdio server | Use Apify REST API directly |
| **Playwright** | Cannot spawn browser instance | Use Chrome's existing tab via CDP (existing `ScreenshotManager` pattern) or Offscreen Document API |
| **Custom** | No transport needed | Internal function calls |

### Offscreen Document Pattern (Advanced)
For servers that truly require stdio transport:

```typescript
// service-worker.ts
async function initMCPViaOffscreen(): Promise<void> {
  // Create an offscreen document that can run Node.js-style code
  await chrome.offscreen.createDocument({
    url: 'offscreen/mcp-bridge.html',
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: 'Run MCP server connections',
  });

  // Communicate with offscreen document via messaging
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'mcp_tool_result') {
      // Route result back to the registry
    }
  });
}
```

---

## Tool Composition Patterns

### Sequential Chaining
```typescript
// Search for competitors, then scrape them
async function discoverAndScrape(query: string): Promise<void> {
  const searchResults = await registry.callTool('exa_search', {
    query: `${query} website`,
    numResults: 5,
  });

  const urls = JSON.parse(searchResults.content[0].text).results.map(r => r.url);

  for (const url of urls) {
    await registry.callTool('apify_scrape_site', { url, maxPages: 20 });
  }
}
```

### Parallel Fan-Out
```typescript
// Scrape multiple competitors simultaneously
async function scrapeAllCompetitors(urls: string[]): Promise<MCPToolResult[]> {
  const promises = urls.map(url =>
    registry.callTool('apify_scrape_site', { url, maxPages: 20 })
  );
  return Promise.allSettled(promises);
}
```

### Conditional Routing
```typescript
// Use Exa for semantic search, fall back to Brave for keyword search
async function intelligentSearch(query: string): Promise<MCPToolResult> {
  if (registry.hasTools('exa')) {
    return registry.callTool('exa_search', { query });
  }
  // Fall back to existing BraveSearchClient
  const braveResults = await braveClient.search(query);
  return { content: [{ type: 'text', text: JSON.stringify(braveResults) }] };
}
```

---

## Future MCP Server Candidates

| Server | Use Case | Priority |
|--------|----------|----------|
| `@anthropic/github-mcp-server` | Track competitor open-source repos | Low |
| `@anthropic/slack-mcp-server` | Deliver CI reports to Slack channels | Low |
| `@anthropic/google-drive-mcp-server` | Export reports to Google Docs | Low |
| Custom RSS MCP Server | Monitor competitor blog/news feeds | Medium |
| Custom Social MCP Server | Track competitor social media activity | Medium |

The composable MCP registry makes adding new servers a matter of registration, not architecture changes.
