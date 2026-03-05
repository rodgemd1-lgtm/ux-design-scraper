# 25x Architecture: Six-Layer CI Intelligence Stack

This document defines the target architecture for transforming the UX Design Scraper from a single-site analysis tool into a full competitive intelligence platform. The architecture is organized into six layers, each building on the one below.

---

## Architecture Overview

```
+------------------------------------------------------------------+
|  Layer 5: Closed-Loop Delivery                                    |
|  Auto-trigger on new URL -> full 7-phase pipeline -> deliverables |
+------------------------------------------------------------------+
|  Layer 4: CI Database                                             |
|  Structured persistence of all scraped UX intelligence            |
+------------------------------------------------------------------+
|  Layer 3: MCP Integration                                         |
|  Exa semantic search, Playwright MCP, Apify actors via MCP       |
+------------------------------------------------------------------+
|  Layer 2: Semantic Diffing                                        |
|  Embed page snapshots, detect strategic design shifts over time   |
+------------------------------------------------------------------+
|  Layer 1: Visual Intelligence                                     |
|  CDP screenshots + Firecrawl screenshots + full-page renders      |
+------------------------------------------------------------------+
|  Layer 0: Data Ingestion                                          |
|  Brave (existing) + Firecrawl + Exa MCP + Apify MCP              |
+------------------------------------------------------------------+
```

---

## Layer 0: Data Ingestion

### Current State
- `BraveSearchClient` (`src/background/brave-search-client.ts`) handles keyword-based web search
- `WaybackClient` (`src/background/wayback-client.ts`) fetches historical snapshots from the Internet Archive
- DOM-walking extractors in `src/content-scripts/scraper/modules/` parse live page content

### Target State
- **Brave Search (existing):** Keyword discovery of competitor URLs, design inspiration searches
- **Firecrawl Integration:** Structured scraping of full pages as clean markdown, including dynamic SPA content that DOM walkers miss. Firecrawl handles JavaScript rendering, anti-bot measures, and returns structured data.
- **Exa MCP Server:** Semantic search for UX patterns by meaning rather than keywords. Query like "SaaS pricing page with toggle between monthly and annual" and get semantically relevant results.
- **Apify MCP Server:** Actor-based automation for complex scraping workflows -- paginated product catalogs, login-walled competitor dashboards (with user credentials), scheduled recurring scrapes.

### Integration Points
| Source | File to Modify | Method |
|--------|---------------|--------|
| Firecrawl | `src/background/scrape-orchestrator.ts` | Add `firecrawlScrape()` as Phase 0.5 before DOM extraction |
| Exa MCP | New: `src/background/exa-search-client.ts` | MCP tool call via `@modelcontextprotocol/sdk` |
| Apify MCP | New: `src/background/apify-actor-client.ts` | MCP tool call for actor invocation |

### Data Flow
```
User enters URL
    |
    v
+-- Brave Search -------> competitor URL discovery
|
+-- Firecrawl ----------> structured markdown + metadata
|
+-- Exa MCP ------------> semantic UX pattern matches
|
+-- Apify MCP ----------> deep scraping (pagination, auth walls)
|
+-- DOM Extractors -----> live page component extraction (existing)
    |
    v
Merged ingestion payload -> Layer 1
```

---

## Layer 1: Visual Intelligence

### Current State
- `ScreenshotManager` (`src/background/screenshot-manager.ts`) uses Chrome DevTools Protocol to capture screenshots at multiple breakpoints (mobile, tablet, desktop)
- Screenshots are stored as base64 PNG data URLs in `ScreenshotData` objects
- `MotionCapture` (`src/background/motion-capture.ts`) records animation and transition data

### Target State
- **CDP Screenshots (existing):** Multi-breakpoint viewport captures for the active tab
- **Firecrawl Screenshots:** Server-side rendered screenshots of competitor pages the user is not currently viewing. Enables side-by-side comparison without navigating.
- **Full-Page Renders:** Complete page captures (not just viewport) using `captureBeyondViewport: true` with scroll stitching for pages longer than 10,000px
- **Workflow Diagrams:** Auto-generated flow diagrams from navigation structure data showing user journey paths through competitor sites

### Integration Points
| Capability | File to Modify | Method |
|-----------|---------------|--------|
| Firecrawl screenshots | `src/background/screenshot-manager.ts` | Add `captureViaFirecrawl(url)` method |
| Full-page stitching | `src/background/screenshot-manager.ts` | Extend `captureAllBreakpoints()` with scroll-and-stitch |
| Workflow diagrams | New: `src/background/workflow-diagram-generator.ts` | Generate from `NavigationData.sitemapTree` |

### Visual Data Model
```typescript
interface VisualIntelligence {
  cdpScreenshots: ScreenshotData[];        // existing
  firecrawlScreenshots: ScreenshotData[];  // new: server-side renders
  fullPageCaptures: FullPageCapture[];     // new: stitched full-page
  workflowDiagrams: WorkflowDiagram[];    // new: auto-generated flows
  motionCapture: MotionData;              // existing
}
```

---

## Layer 2: Semantic Diffing

### Current State
- `WaybackClient` fetches historical snapshots but only stores URLs and timestamps
- No embedding or comparison logic exists
- No change detection between scrape sessions

### Target State
- **Page Embedding:** Convert each scraped page (HTML structure, visual layout, copy) into a vector embedding using a text embedding model
- **Temporal Comparison:** Compare embeddings across time to detect when competitors make strategic design shifts (not just text changes -- structural, visual, and UX pattern changes)
- **Change Classification:** Categorize detected changes as: cosmetic (color/font tweaks), structural (layout reorganization), strategic (new CTA patterns, pricing changes, feature additions), or content (copy updates)
- **Alert Generation:** Surface significant changes to the user with before/after visual diffs and natural language summaries

### Integration Points
| Capability | File to Modify | Method |
|-----------|---------------|--------|
| Page embedding | New: `src/background/semantic-embedder.ts` | Generate embeddings from scrape results |
| Diff engine | New: `src/background/semantic-diff-engine.ts` | Compare embeddings, classify changes |
| Alert system | `src/background/service-worker.ts` | Chrome notification API for significant changes |
| History store | `src/background/supabase-sync.ts` | New `page_embeddings` table for temporal data |

### Embedding Strategy
```
Page Scrape Result
    |
    +--> Structural features (DOM tree depth, component count, layout type)
    |
    +--> Visual features (color palette hash, typography fingerprint, spacing ratios)
    |
    +--> Content features (headline text, CTA copy, value propositions)
    |
    +--> Pattern features (conversion patterns, navigation structure, social proof)
    |
    v
Combined feature vector -> text-embedding-3-small -> 1536-dim embedding
    |
    v
Compare with previous embedding -> cosine similarity -> change score
```

---

## Layer 3: MCP Integration

### Current State
- `@modelcontextprotocol/sdk` is in `package.json` but no MCP client is implemented
- `exa-js` SDK is in `package.json` but no Exa client exists yet
- Claude API calls go through `ClaudeAPIClient` directly

### Target State
- **Exa MCP Server:** Semantic UX pattern search. Instead of keyword queries, search by meaning: "e-commerce checkout with progress indicator and trust badges" returns pages that match that UX pattern regardless of specific text.
- **Playwright MCP Server:** Live page interaction from the background script -- click through flows, fill forms, navigate multi-step processes to capture the complete user journey of competitor sites.
- **Apify MCP Server:** Invoke Apify actors as MCP tools for specialized scraping tasks -- social media monitoring, review aggregation, pricing page tracking.
- **Composable Tool Layer:** All MCP servers register their tools in a unified registry. The CI pipeline can invoke any tool by name without knowing which server provides it.

### Integration Points
| MCP Server | File to Modify | Tools Exposed |
|-----------|---------------|---------------|
| Exa | New: `src/background/mcp/exa-mcp-client.ts` | `exa_search`, `exa_find_similar`, `exa_get_contents` |
| Playwright | New: `src/background/mcp/playwright-mcp-client.ts` | `browser_navigate`, `browser_click`, `browser_screenshot`, `browser_fill` |
| Apify | New: `src/background/mcp/apify-mcp-client.ts` | `apify_run_actor`, `apify_get_dataset`, `apify_get_run_status` |
| Registry | New: `src/background/mcp/mcp-tool-registry.ts` | Unified tool dispatch |

### MCP Client Architecture
```typescript
// Unified MCP tool registry
class MCPToolRegistry {
  private servers: Map<string, MCPClient> = new Map();

  registerServer(name: string, client: MCPClient): void;
  async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown>;
  listTools(): ToolDefinition[];
}
```

---

## Layer 4: CI Database

### Current State
- `SupabaseSync` (`src/background/supabase-sync.ts`) persists all scrape data to Supabase across 12 tables: projects, design_tokens, typography, components, screenshots, accessibility_audits, lighthouse_results, navigation, third_party_stack, conversion_patterns, heatmaps, wayback_snapshots
- No CI-specific tables (competitor profiles, tracking schedules, intelligence reports)
- No temporal indexing for trend analysis

### Target State
- **Competitor Profiles Table:** Persistent competitor records with metadata, tracking frequency, last scrape timestamp, and relationship to the user's project
- **Intelligence Reports Table:** Generated CI reports (battlecards, trend analyses, opportunity maps) stored as structured documents
- **Embedding Store:** Vector embeddings for semantic diffing with temporal index
- **Scrape Schedule Table:** Cron-like schedule definitions for automated recurring scrapes
- **Change Log Table:** Every detected change with classification, severity, and before/after snapshots

### New Tables
```sql
-- Competitor tracking profiles
CREATE TABLE competitor_profiles (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  competitor_name TEXT NOT NULL,
  competitor_url TEXT NOT NULL,
  tracking_frequency TEXT DEFAULT 'weekly',
  last_scraped_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector embeddings for semantic diffing
CREATE TABLE page_embeddings (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  competitor_url TEXT NOT NULL,
  embedding VECTOR(1536),
  feature_hash TEXT,
  scraped_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Change detection log
CREATE TABLE change_log (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  competitor_url TEXT NOT NULL,
  change_type TEXT NOT NULL, -- cosmetic, structural, strategic, content
  severity FLOAT NOT NULL,  -- 0.0 to 1.0
  summary TEXT,
  before_snapshot_id UUID,
  after_snapshot_id UUID,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated intelligence reports
CREATE TABLE intelligence_reports (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  report_type TEXT NOT NULL, -- battlecard, trend_analysis, opportunity_map
  content JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated scrape schedules
CREATE TABLE scrape_schedules (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  competitor_url TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Integration Points
| Capability | File to Modify | Method |
|-----------|---------------|--------|
| Competitor profiles | `src/background/supabase-sync.ts` | Add `syncCompetitorProfile()` method |
| Embedding store | `src/background/supabase-sync.ts` | Add `storeEmbedding()` with pgvector |
| Change log | `src/background/supabase-sync.ts` | Add `logChange()` method |
| Reports | New: `src/background/report-store.ts` | CRUD for intelligence reports |
| Schedules | New: `src/background/schedule-manager.ts` | Chrome alarms API + schedule table |

---

## Layer 5: Closed-Loop Delivery

### Current State
- `PhaseOrchestrator` (`src/background/phase-orchestrator.ts`) runs a 7-phase pipeline triggered manually by the user clicking "Scrape" in the sidepanel
- `ScrapeOrchestrator` (`src/background/scrape-orchestrator.ts`) coordinates the overall scrape session
- Output is a `FullScrapeResult` object stored locally and synced to Supabase

### Target State
- **Auto-Trigger:** When a new competitor URL is added to a project, automatically run the full 7-phase pipeline without user intervention
- **Full Pipeline:** URL input -> ingestion (Layer 0) -> visual capture (Layer 1) -> embedding + diffing (Layer 2) -> MCP enrichment (Layer 3) -> database persistence (Layer 4) -> report generation
- **Deliverable Generation:** Automatically produce battlecards, design teardown reports, trend analysis documents, and opportunity maps after each scrape
- **Notification System:** Push Chrome notifications when significant competitor changes are detected
- **Scheduled Execution:** Use Chrome Alarms API to trigger scrapes on defined schedules (daily, weekly, custom cron)

### Integration Points
| Capability | File to Modify | Method |
|-----------|---------------|--------|
| Auto-trigger | `src/background/service-worker.ts` | Listen for `competitor_added` storage events |
| Full pipeline | `src/background/phase-orchestrator.ts` | New `runCIPipeline(url)` method wrapping all 6 layers |
| Battlecard gen | `src/generators/analysis-generator.ts` | Add `generateBattlecard()` template |
| Scheduled runs | `src/background/service-worker.ts` | Chrome alarms API handler |
| Notifications | `src/background/service-worker.ts` | `chrome.notifications.create()` for change alerts |

### Closed-Loop Data Flow
```
New competitor URL added to project
    |
    v
service-worker.ts detects storage change
    |
    v
phase-orchestrator.ts: runCIPipeline(url)
    |
    +---> Phase 0: Data Ingestion (Brave + Firecrawl + Exa + Apify)
    +---> Phase 1: Visual Capture (CDP + Firecrawl screenshots)
    +---> Phase 2: DOM Extraction (existing content-script extractors)
    +---> Phase 3: Analysis (Claude scoring + design critique)
    +---> Phase 4: Semantic Diffing (embed + compare with history)
    +---> Phase 5: Persistence (Supabase sync + embedding store)
    +---> Phase 6: Report Generation (battlecard + trend analysis)
    +---> Phase 7: Delivery (Chrome notification + sidepanel update)
    |
    v
User receives notification: "Competitor X redesigned their pricing page"
    |
    v
User opens sidepanel -> views battlecard + visual diff + recommendations
```

---

## Cross-Cutting Concerns

### Error Handling
Every layer implements graceful degradation. If Firecrawl is unavailable, fall back to DOM extraction only. If Exa MCP fails, fall back to Brave keyword search. The pipeline never fails completely due to a single layer failure.

### Rate Limiting
Each external API client implements token-bucket rate limiting via `src/background/batch-queue.ts`. MCP tool calls are queued through the same mechanism.

### Observability
All layers use the existing `createLogger()` from `src/shared/logger.ts` with layer-specific prefixes. A new `PipelineMetrics` class will track execution time, success/failure rates, and data volume per layer.

### Security
API keys are stored in `chrome.storage.local` under `STORAGE_KEYS.SETTINGS`, consistent with the existing pattern in `BraveSearchClient`. MCP server connections use stdio transport (local) or SSE transport (remote) with authentication tokens.
