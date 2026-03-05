# Gap Analysis: Current State vs. Target State

This document compares the existing UX Design Scraper capabilities against the 25x target state for each architecture layer. Each section identifies what exists, what is missing, and the specific work required to close the gap.

---

## Layer 0: Data Ingestion

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| Keyword web search | `src/background/brave-search-client.ts` | Fully implemented |
| Design inspiration search | `BraveSearchClient.searchDesignInspiration()` | Fully implemented |
| Competitor URL discovery | `BraveSearchClient.searchCompetitors()` | Fully implemented |
| Historical snapshot retrieval | `src/background/wayback-client.ts` | Fully implemented |
| DOM-based content extraction | `src/content-scripts/scraper/modules/*.ts` | Fully implemented (7 extractors) |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| Structured page scraping via Firecrawl | `@mendable/firecrawl-js` is installed but no client class exists | Create `FirecrawlClient` class wrapping the SDK, add `firecrawlScrape()` to `scrape-orchestrator.ts` |
| Semantic search via Exa | `exa-js` is installed but no client class exists | Create `ExaSearchClient` class, implement `semanticSearch()` and `findSimilar()` methods |
| Actor-based scraping via Apify | No Apify dependency installed | Install `apify-client` or use Apify MCP server via `@modelcontextprotocol/sdk` |
| JavaScript-rendered content | Firecrawl handles this, but no integration path exists | Wire Firecrawl output into the existing `FullScrapeResult` type |
| Anti-bot bypass | BraveSearchClient does not handle protected pages | Firecrawl and Apify both handle this; need to route protected URLs through them |

### Gap Score: 40% complete
The foundation exists (Brave + Wayback + DOM extractors). The two critical packages (Firecrawl and Exa) are already installed but unwired. Apify requires either a new dependency or MCP-based access.

---

## Layer 1: Visual Intelligence

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| Multi-breakpoint screenshots | `src/background/screenshot-manager.ts` | Fully implemented via CDP |
| Animation/motion capture | `src/background/motion-capture.ts` | Fully implemented |
| Screenshot storage | `src/background/supabase-sync.ts` | Uploads to Supabase Storage |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| Server-side competitor screenshots | Cannot screenshot pages not in the active tab | Add `captureViaFirecrawl(url)` to `ScreenshotManager` using Firecrawl screenshot API |
| Full-page scroll stitching | Current captures limited to viewport height (812-900px) | Implement scroll-capture-stitch loop in `captureAllBreakpoints()` for pages > viewport |
| Workflow diagram generation | Navigation data exists (`NavigationData.sitemapTree`) but no visual output | New `WorkflowDiagramGenerator` class that converts sitemap trees to SVG/PNG diagrams |
| Side-by-side visual comparison | No capability to show before/after or competitor vs. competitor visuals | New `VisualComparisonEngine` that aligns and diffs two screenshot sets |

### Gap Score: 50% complete
Core screenshot infrastructure is solid. The primary gap is remote screenshot capability (Firecrawl) and post-capture analysis (diffing, diagramming).

---

## Layer 2: Semantic Diffing

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| Historical URL tracking | `src/background/wayback-client.ts` | Fetches Wayback timestamps |
| Design trend scoring | `src/background/scoring-engine.ts` | Claude-based trend assessment (basic) |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| Page embedding generation | No embedding capability exists | New `SemanticEmbedder` class using OpenAI `text-embedding-3-small` or similar |
| Feature vector extraction | Scrape results are not converted to comparable features | Extract structural, visual, content, and pattern features from `FullScrapeResult` |
| Temporal embedding comparison | No historical embedding storage or comparison logic | New `SemanticDiffEngine` with cosine similarity, change threshold detection |
| Change classification | No categorization of detected changes | Classifier that labels changes as cosmetic/structural/strategic/content |
| Before/after visual diffs | No visual diff generation | Pixel-level diff overlay on screenshot pairs |
| Natural language change summaries | No automated explanation of what changed | Claude API call to summarize detected changes in business context |

### Gap Score: 10% complete
This is the largest gap. Wayback snapshot tracking provides minimal historical context, but there is no embedding, diffing, or classification capability. This layer requires entirely new subsystems.

---

## Layer 3: MCP Integration

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| MCP SDK available | `package.json`: `@modelcontextprotocol/sdk ^1.27.1` | Installed, not used |
| Exa SDK available | `package.json`: `exa-js ^2.7.0` | Installed, not used |
| Claude API direct calls | `src/background/claude-api-client.ts` | Fully implemented |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| MCP tool registry | No unified tool dispatch layer | New `MCPToolRegistry` class managing server connections and tool routing |
| Exa MCP client | MCP SDK exists but no Exa MCP connection | New `ExaMCPClient` connecting to `@anthropic/exa-mcp-server` |
| Apify MCP client | No Apify MCP integration | New `ApifyMCPClient` connecting to `@anthropic/apify-mcp-server` |
| Playwright MCP client | No live page interaction from background | New `PlaywrightMCPClient` for automated competitor site navigation |
| Tool composition | No way to chain MCP tool calls into workflows | Pipeline logic in `MCPToolRegistry` for multi-step tool sequences |

### Gap Score: 5% complete
The SDK is installed but nothing is wired. This is a green-field layer that needs to be built from scratch, though the foundation (MCP SDK) is solid.

---

## Layer 4: CI Database

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| Project records | `SupabaseSync.syncProject()` | Full CRUD |
| Design tokens | `SupabaseSync` | Upsert with conflict resolution |
| Typography | `SupabaseSync` | Upsert with conflict resolution |
| Components | `SupabaseSync` | Batch insert (chunks of 50) |
| Screenshots | `SupabaseSync` | Supabase Storage upload |
| Accessibility audits | `SupabaseSync` | Upsert with conflict resolution |
| Lighthouse results | `SupabaseSync` | Upsert with conflict resolution |
| Navigation | `SupabaseSync` | Upsert with conflict resolution |
| Third-party stack | `SupabaseSync` | Upsert with conflict resolution |
| Conversion patterns | `SupabaseSync` | Upsert with conflict resolution |
| Heatmaps | `SupabaseSync` | Batch insert |
| Wayback snapshots | `SupabaseSync` | Batch insert |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| Competitor profiles table | No persistent competitor tracking entities | New Supabase table + `syncCompetitorProfile()` method |
| Page embeddings table | No vector storage for semantic diffing | New table with pgvector extension, `storeEmbedding()` method |
| Change log table | No historical record of detected changes | New table + `logChange()` method |
| Intelligence reports table | No persistence for generated CI deliverables | New table + CRUD methods |
| Scrape schedule table | No schedule persistence | New table + `syncSchedule()` method |
| Temporal indexing | Existing tables lack time-series query support | Add indexes on `created_at` / `updated_at` columns, add `scraped_at` to component tables |

### Gap Score: 70% complete
The database layer is the most mature. The existing 12-table schema covers all current scrape data. The gap is CI-specific tables (competitor profiles, embeddings, change logs, reports, schedules) -- all of which follow the same patterns already established in `SupabaseSync`.

---

## Layer 5: Closed-Loop Delivery

### Current Capabilities
| Capability | File | Status |
|-----------|------|--------|
| 7-phase pipeline | `src/background/phase-orchestrator.ts` | Fully implemented (manual trigger) |
| Scrape session coordination | `src/background/scrape-orchestrator.ts` | Fully implemented |
| Analysis report generation | `src/generators/analysis-generator.ts` | Fully implemented |
| Prompt generation | `src/generators/prompt-generator.ts` | Fully implemented |
| Design critique | `src/background/design-critique-engine.ts` | Fully implemented |
| Persona generation | `src/background/persona-generator.ts` | Fully implemented |
| Copy rewriting | `src/background/copy-rewriter.ts` | Fully implemented |
| Multi-site analysis | `src/background/multi-site-engine.ts` | Fully implemented |
| Knowledge enrichment | `src/background/knowledge-enrichment.ts` | Fully implemented |
| A/B test engine | `src/background/ab-test-engine.ts` | Fully implemented |

### Missing Capabilities
| Capability | Gap Description | Required Work |
|-----------|----------------|---------------|
| Auto-trigger on new URL | Pipeline requires manual "Scrape" button click | Storage event listener in `service-worker.ts` to detect new competitor URLs |
| Full CI pipeline orchestration | No unified method running all 6 layers in sequence | New `runCIPipeline(url)` in `phase-orchestrator.ts` wrapping Layers 0-5 |
| Battlecard generation | No competitive battlecard template | New template in `analysis-generator.ts` using Claude API |
| Scheduled execution | No recurring scrape capability | Chrome Alarms API handler in `service-worker.ts` + schedule table |
| Change notifications | No push notification on competitor changes | `chrome.notifications.create()` triggered by change log entries |
| Trend analysis reports | No long-term trend synthesis | New generator consuming temporal embedding data |
| Sidepanel CI dashboard | Sidepanel shows scrape results but no CI overview | New React components in `src/sidepanel/` for competitor tracking |

### Gap Score: 55% complete
The pipeline orchestration and generation infrastructure is strong. The gap is CI-specific automation (auto-trigger, scheduling, notifications) and CI-specific deliverables (battlecards, trend reports).

---

## Summary Gap Scorecard

| Layer | Current Score | Critical Gaps | Estimated Effort |
|-------|--------------|---------------|-----------------|
| Layer 0: Data Ingestion | 40% | Firecrawl + Exa clients | 1-2 weeks |
| Layer 1: Visual Intelligence | 50% | Remote screenshots, full-page stitching | 1-2 weeks |
| Layer 2: Semantic Diffing | 10% | Entire subsystem missing | 2-3 weeks |
| Layer 3: MCP Integration | 5% | Entire subsystem missing (SDK installed) | 2-3 weeks |
| Layer 4: CI Database | 70% | 5 new tables following existing patterns | 1 week |
| Layer 5: Closed-Loop Delivery | 55% | Auto-trigger, scheduling, CI deliverables | 3-4 weeks |
| **Overall** | **38%** | | **10-15 weeks** |

The extension is approximately 38% of the way to the full 25x CI platform. The strongest area is database persistence (70%), and the weakest areas are semantic diffing (10%) and MCP integration (5%). Both weak areas have their foundational dependencies already installed in `package.json`, which significantly reduces the bootstrapping effort.
