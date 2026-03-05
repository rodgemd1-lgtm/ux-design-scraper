# Priority Table: 25x Implementation Order

Modules are ranked by implementation order, balancing immediate impact against dependency chains and effort. Each module builds on the layers defined in [25x-architecture.md](./25x-architecture.md).

---

## Priority Rankings

| Priority | Module | Layer | Effort | Dependencies | Impact | Status |
|----------|--------|-------|--------|-------------|--------|--------|
| **P0** | Firecrawl Structured Scraping | Layer 0 | Low | `@mendable/firecrawl-js` (installed), `FIRECRAWL_API_KEY` | Critical -- enables structured data from any URL without DOM walking | Not started |
| **P1** | Exa Semantic Search Client | Layer 0 + Layer 3 | Low | `exa-js` (installed), `EXA_API_KEY` | Critical -- semantic UX pattern discovery by meaning, not keywords | Not started |
| **P2** | Firecrawl Screenshot Integration | Layer 1 | Low | Firecrawl client from P0 | High -- server-side screenshots of competitor pages user is not viewing | Not started |
| **P3** | MCP Tool Registry | Layer 3 | Medium | `@modelcontextprotocol/sdk` (installed) | High -- unified tool dispatch for all MCP servers | Not started |
| **P4** | Exa MCP Server Connection | Layer 3 | Low | MCP Registry from P3, `EXA_API_KEY` | High -- exposes Exa as composable MCP tool | Not started |
| **P5** | Apify MCP Server Connection | Layer 3 | Medium | MCP Registry from P3, `APIFY_API_TOKEN` | High -- actor-based automation for complex scraping | Not started |
| **P6** | Semantic Embedder | Layer 2 | Medium | OpenAI `text-embedding-3-small` or Claude embeddings, Supabase pgvector | Critical -- foundation for all change detection | Not started |
| **P7** | Semantic Diff Engine | Layer 2 | High | Semantic Embedder from P6 | Critical -- detects strategic competitor design shifts | Not started |
| **P8** | Competitor Profiles Table | Layer 4 | Low | Supabase (existing) | Medium -- structured competitor tracking persistence | Not started |
| **P9** | Page Embeddings Table (pgvector) | Layer 4 | Medium | Supabase pgvector extension | High -- temporal embedding storage for diffing | Not started |
| **P10** | Change Log Table | Layer 4 | Low | Supabase (existing) | Medium -- records all detected changes | Not started |
| **P11** | Auto-Trigger on New URL | Layer 5 | Medium | Competitor Profiles from P8 | High -- removes manual trigger requirement | Not started |
| **P12** | Closed-Loop Pipeline Orchestration | Layer 5 | High | All Layer 0-4 modules | Critical -- full end-to-end automation | Not started |
| **P13** | Battlecard Generator | Layer 5 | Medium | Claude API (existing), CI Database from P8-P10 | High -- automated competitive deliverable | Not started |
| **P14** | Scheduled Scrape Execution | Layer 5 | Medium | Chrome Alarms API, Schedule table | Medium -- recurring automated intelligence gathering | Not started |
| **P15** | Full-Page Scroll Stitching | Layer 1 | Medium | CDP (existing) | Medium -- complete page captures for long pages | Not started |
| **P16** | Workflow Diagram Generation | Layer 1 | High | Navigation data (existing), diagram rendering lib | Low -- nice-to-have visual for user journeys | Not started |
| **P17** | Change Notification System | Layer 5 | Low | Change Log from P10 | Medium -- Chrome push notifications for significant changes | Not started |
| **P18** | Playwright MCP Server | Layer 3 | High | MCP Registry from P3, Playwright runtime | Medium -- live page interaction from background | Not started |
| **P19** | Intelligence Reports Table | Layer 4 | Low | Supabase (existing) | Low -- persistence for generated reports | Not started |
| **P20** | Trend Analysis Generator | Layer 5 | High | Temporal embedding data from P9, Claude API | Medium -- long-term competitive trend reports | Not started |

---

## Implementation Phases

### Phase A: Foundation (P0 - P2) -- Estimated 1-2 weeks
Bootstrap the extended data ingestion and visual capture capabilities. These modules have the lowest effort because the npm packages are already installed.

**Deliverable:** The extension can scrape any URL via Firecrawl, search for UX patterns via Exa, and capture server-side screenshots of competitor pages.

### Phase B: MCP Layer (P3 - P5) -- Estimated 2-3 weeks
Stand up the MCP tool registry and connect the first two MCP servers (Exa and Apify). This creates the composable tool layer that all future integrations build on.

**Deliverable:** MCP tool registry dispatching calls to Exa and Apify servers. Any future MCP server can be added by registering with the registry.

### Phase C: Semantic Intelligence (P6 - P7) -- Estimated 2-3 weeks
Build the embedding and diffing engine. This is the highest-complexity work but also the highest-value capability -- detecting when competitors make strategic design changes.

**Deliverable:** The extension can embed any scraped page and compare it against historical snapshots to detect and classify design changes.

### Phase D: CI Database (P8 - P10) -- Estimated 1 week
Extend the Supabase schema with CI-specific tables. Low effort because it builds on the existing `SupabaseSync` patterns.

**Deliverable:** Persistent competitor profiles, embedding history, and change logs stored in Supabase.

### Phase E: Closed-Loop Delivery (P11 - P14) -- Estimated 3-4 weeks
Wire everything together into the automated pipeline. Auto-trigger on new URLs, run the full pipeline, generate battlecards, and schedule recurring scrapes.

**Deliverable:** Fully automated CI pipeline that runs end-to-end when a competitor URL is added to a project.

### Phase F: Polish (P15 - P20) -- Estimated 2-3 weeks
Full-page stitching, workflow diagrams, notification system, Playwright MCP, and trend analysis. These are valuable but not blocking for the core CI workflow.

**Deliverable:** Complete 25x CI platform with all six layers operational.

---

## Effort Definitions

| Level | Hours | Description |
|-------|-------|-------------|
| **Low** | 4-8h | Single file addition or modification, clear API, minimal testing surface |
| **Medium** | 8-24h | Multiple files, new abstractions, moderate testing, possible Supabase schema changes |
| **High** | 24-40h | New subsystem, complex logic, extensive testing, cross-cutting integration |

---

## Dependency Graph

```
P0 (Firecrawl) -----> P2 (Firecrawl Screenshots)
                  |
P1 (Exa Client)  |
                  |
P3 (MCP Registry) --> P4 (Exa MCP) --> P12 (Closed-Loop)
                  |-> P5 (Apify MCP) --|
                  |-> P18 (Playwright)  |
                                        |
P6 (Embedder) --> P7 (Diff Engine) --> P12
                                        |
P8 (Profiles) --> P11 (Auto-Trigger) -> P12 --> P13 (Battlecard)
P9 (Embeddings)                                 P14 (Scheduled)
P10 (Change Log) -> P17 (Notifications)         P20 (Trends)
```
