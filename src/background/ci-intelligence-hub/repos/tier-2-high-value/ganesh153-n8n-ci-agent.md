# n8n CI Agent (ganesh153)

**GitHub:** https://github.com/ganesh153/n8n-competitive-intelligence-agent
**Stars:** 218
**What It Does:** A no-code/low-code competitive intelligence workflow built on n8n (workflow automation platform). Chains together web scraping, LLM analysis, and notification delivery into an automated CI pipeline. The agent monitors competitor websites on a schedule, extracts key changes, generates summaries using OpenAI, and delivers reports via Slack or email. Includes pre-built n8n workflow JSON that can be imported directly.
**Key Pattern:** Workflow orchestration -- uses n8n's node-based execution model where each step in the CI pipeline is a discrete node (HTTP request, code transform, AI analysis, notification) connected by data flow edges. The pattern separates concerns cleanly: data collection nodes, transformation nodes, analysis nodes, and delivery nodes.
**Integration Point in UX Scraper:** `src/background/phase-orchestrator.ts` -- Adopt the node-based pipeline composition pattern to make the existing 7-phase pipeline more modular and extensible. Each phase becomes a "node" that can be independently configured, skipped, or replaced.
**Dependencies:** n8n (not directly usable, but the workflow pattern is portable), OpenAI API
**Effort:** Medium

---

## Workflow Architecture

The n8n workflow follows this node chain:

```
[Schedule Trigger] --> [HTTP: Fetch URL] --> [Code: Extract Changes]
        |                                            |
        v                                            v
[Supabase: Load Previous]                   [OpenAI: Analyze Changes]
        |                                            |
        v                                            v
[Code: Compare Versions] ------------> [Code: Format Report]
                                                     |
                                          +----------+----------+
                                          |          |          |
                                          v          v          v
                                      [Slack]    [Email]   [Webhook]
```

## Key Concepts to Port

### 1. Node-Based Phase Definition
Instead of hardcoding phases, define them as configurable nodes:

```typescript
interface PipelineNode {
  id: string;
  name: string;
  type: 'ingestion' | 'transform' | 'analysis' | 'storage' | 'delivery';
  execute: (input: NodePayload) => Promise<NodePayload>;
  config: Record<string, unknown>;
  enabled: boolean;
  retryPolicy: { maxRetries: number; backoffMs: number };
}

interface Pipeline {
  nodes: PipelineNode[];
  edges: Array<{ from: string; to: string; condition?: string }>;
}
```

### 2. Conditional Execution
n8n supports conditional branching -- only run certain nodes if previous outputs meet criteria:

```typescript
// Example: Only run semantic diffing if a previous scrape exists
const edges = [
  { from: 'ingestion', to: 'diff-check', condition: 'always' },
  { from: 'diff-check', to: 'semantic-diff', condition: 'hasPreviousScrape' },
  { from: 'diff-check', to: 'first-scrape-store', condition: '!hasPreviousScrape' },
];
```

### 3. Parallel Branch Execution
Independent nodes can execute in parallel:

```typescript
// CDP screenshots and Firecrawl scraping can run simultaneously
const parallelNodes = [
  { id: 'cdp-screenshots', type: 'ingestion' },
  { id: 'firecrawl-scrape', type: 'ingestion' },
  { id: 'exa-semantic-search', type: 'ingestion' },
];
// All three run concurrently, results merge at the next node
```

## Integration Strategy

The UX Scraper's `PhaseOrchestrator` already runs phases sequentially. The n8n pattern enhances this with:

1. **Node registry:** Phases register themselves as nodes with metadata
2. **Edge-based flow:** Replace sequential execution with a graph where edges define data flow
3. **Conditional logic:** Skip nodes when their inputs are not available (e.g., skip Firecrawl if no API key)
4. **Parallel execution:** Run independent data collection phases simultaneously using `Promise.allSettled()`
5. **Retry logic:** Per-node retry policies instead of whole-pipeline failure

### Modified PhaseOrchestrator Concept
```typescript
class PipelineOrchestrator {
  private nodes: Map<string, PipelineNode> = new Map();
  private edges: PipelineEdge[] = [];

  registerNode(node: PipelineNode): void {
    this.nodes.set(node.id, node);
  }

  async execute(initialPayload: NodePayload): Promise<PipelineResult> {
    const executionOrder = this.topologicalSort();
    const results = new Map<string, NodePayload>();

    for (const nodeId of executionOrder) {
      const node = this.nodes.get(nodeId)!;
      if (!node.enabled) continue;

      const inputs = this.gatherInputs(nodeId, results);
      try {
        const output = await this.executeWithRetry(node, inputs);
        results.set(nodeId, output);
      } catch (err) {
        log.error(`Node ${nodeId} failed`, err);
        // Graceful degradation: continue pipeline without this node's output
      }
    }

    return this.aggregateResults(results);
  }
}
```

## What to Adopt vs. What to Skip

**Adopt:**
- The DAG-based pipeline composition model
- Conditional and parallel execution patterns
- Per-node retry policies
- The separation of ingestion/transform/analysis/delivery phases

**Skip:**
- n8n as a runtime dependency (too heavy, requires a server)
- The webhook-based trigger system (use Chrome Alarms API instead)
- The Slack/email delivery nodes (use Chrome notifications + sidepanel)
- The specific n8n node implementations (port concepts only)
