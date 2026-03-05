# CI Intelligence Hub

Competitive Intelligence research library for the UX Design Scraper Chrome extension. This directory contains architecture plans, repo evaluations, integration patterns, and the 25x enhancement roadmap for transforming the scraper into a full CI platform.

---

## Quick Start

1. Read the **25x Architecture** to understand the six-layer target state: [25x-architecture.md](./25x-plan/25x-architecture.md)
2. Check the **Priority Table** for implementation order: [priority-table.md](./25x-plan/priority-table.md)
3. Review the **Gap Analysis** to see what exists vs. what we need: [gap-analysis.md](./25x-plan/gap-analysis.md)
4. Browse individual **Repo Evaluations** below for integration details

---

## Directory Index

### 25x-plan/
Strategic planning documents for the 25x enhancement initiative.

| File | Description |
|------|-------------|
| [25x-architecture.md](./25x-plan/25x-architecture.md) | Six-layer architecture from Data Ingestion to Closed-Loop Delivery |
| [priority-table.md](./25x-plan/priority-table.md) | Ranked implementation table with effort, dependencies, and impact scores |
| [gap-analysis.md](./25x-plan/gap-analysis.md) | Current state vs. target state comparison for every layer |

### repos/tier-1-must-have/
Critical repositories that provide core CI capabilities missing from the current extension.

| File | Key Pattern | Integration Layer |
|------|-------------|-------------------|
| [raym26-market-intelligence-skills.md](./repos/tier-1-must-have/raym26-market-intelligence-skills.md) | Skills packaging | Layer 0 + Layer 5 |
| [firecrawl.md](./repos/tier-1-must-have/firecrawl.md) | Structured web scraping | Layer 0 + Layer 1 |
| [exa-mcp-server.md](./repos/tier-1-must-have/exa-mcp-server.md) | Semantic search via MCP | Layer 0 + Layer 3 |
| [competitor-monitor-semantic-diffing.md](./repos/tier-1-must-have/competitor-monitor-semantic-diffing.md) | Embedding-based change detection | Layer 2 |
| [apify-mcp-server.md](./repos/tier-1-must-have/apify-mcp-server.md) | Actor-based web automation | Layer 0 + Layer 3 |

### repos/tier-2-high-value/
High-value repositories that add orchestration, automation, and multi-agent capabilities.

| File | Key Pattern | Integration Layer |
|------|-------------|-------------------|
| [ganesh153-n8n-ci-agent.md](./repos/tier-2-high-value/ganesh153-n8n-ci-agent.md) | Workflow orchestration | Layer 5 |
| [n8n-battlecard-generator.md](./repos/tier-2-high-value/n8n-battlecard-generator.md) | Automated deliverable generation | Layer 5 |
| [market-intelligence-agent-v2.md](./repos/tier-2-high-value/market-intelligence-agent-v2.md) | Multi-agent coordination | Layer 0 + Layer 5 |
| [taurus-bizflow-ci-platform.md](./repos/tier-2-high-value/taurus-bizflow-ci-platform.md) | Full CI platform architecture | Layer 4 + Layer 5 |
| [marketsense-producer-consumer.md](./repos/tier-2-high-value/marketsense-producer-consumer.md) | Event-driven intelligence pipeline | Layer 4 + Layer 5 |

### repos/mcp-servers/
MCP (Model Context Protocol) server evaluations for LLM-native tool integration.

| File | Description |
|------|-------------|
| [exa-mcp.md](./repos/mcp-servers/exa-mcp.md) | Exa semantic search MCP server deep-dive |
| [apify-mcp.md](./repos/mcp-servers/apify-mcp.md) | Apify web scraping actor MCP server deep-dive |
| [mcp-stack-overview.md](./repos/mcp-servers/mcp-stack-overview.md) | How all MCP servers compose into one CI tool layer |

### patterns/
Reusable technical patterns extracted from repo analysis, each with code examples.

| File | Pattern |
|------|---------|
| [semantic-diffing-pattern.md](./patterns/semantic-diffing-pattern.md) | Detect strategic design shifts via embedding comparison |
| [producer-consumer-pattern.md](./patterns/producer-consumer-pattern.md) | Decouple data collection from analysis via event queues |
| [multi-agent-pattern.md](./patterns/multi-agent-pattern.md) | Coordinate specialized AI agents for CI tasks |
| [closed-loop-pattern.md](./patterns/closed-loop-pattern.md) | Auto-trigger full pipeline on new URL input |
| [skills-packaging-pattern.md](./patterns/skills-packaging-pattern.md) | Bundle CI capabilities into composable skill modules |

---

## Current Extension Architecture (Baseline)

The UX Design Scraper currently implements:

- **Data Ingestion:** `BraveSearchClient` for web search, `WaybackClient` for historical snapshots
- **Visual Intelligence:** `ScreenshotManager` using CDP (Chrome DevTools Protocol) for multi-breakpoint captures
- **Content Extraction:** DOM-walking extractors for design tokens, typography, icons, grid layout, navigation, copy, accessibility
- **Scoring:** `ScoringEngine` with Claude API integration for industry fit, audience alignment, conversion optimization
- **Persistence:** `SupabaseSync` for cloud storage of all scraped data
- **Orchestration:** `PhaseOrchestrator` and `ScrapeOrchestrator` for the 7-phase pipeline
- **Generation:** Claude-powered generators for analysis reports, prompts, README files, token JSON

The 25x plan extends every layer with CI-specific capabilities while preserving the existing scraper as the core engine.

---

## Key Dependencies Already in package.json

| Package | Version | Used For |
|---------|---------|----------|
| `@mendable/firecrawl-js` | ^4.15.2 | Structured web scraping (Firecrawl SDK) |
| `@modelcontextprotocol/sdk` | ^1.27.1 | MCP client for tool integration |
| `exa-js` | ^2.7.0 | Exa semantic search API |
| `@supabase/supabase-js` | ^2.49.0 | Database persistence |

These dependencies confirm that Firecrawl, MCP, and Exa integration paths are already scaffolded.
