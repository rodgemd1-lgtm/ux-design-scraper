# Market Intelligence Agent v2

**GitHub:** https://github.com/langchain-ai/market-intelligence-agent-v2
**Stars:** 1,540
**What It Does:** A LangChain-based multi-agent system for market intelligence gathering. Uses specialized agents for different CI tasks: a Research Agent for web scraping and data collection, an Analysis Agent for competitive positioning, a Synthesis Agent for report generation, and a Monitoring Agent for change detection. Agents communicate through a shared memory store and can delegate tasks to each other.
**Key Pattern:** Multi-agent coordination -- instead of a single monolithic pipeline, divide CI tasks among specialized agents. Each agent has its own tools, system prompt, and memory. A coordinator agent routes tasks to the appropriate specialist. This allows for complex reasoning chains where one agent's output triggers another agent's work.
**Integration Point in UX Scraper:** `src/background/phase-orchestrator.ts` and `src/background/claude-api-client.ts` -- Introduce agent specialization where different phases use different Claude system prompts optimized for their specific task. The existing `ScoringEngine`, `DesignCritiqueEngine`, and `PersonaGenerator` already follow this pattern loosely.
**Dependencies:** LangChain (not directly applicable -- port the pattern to Claude API), shared memory store
**Effort:** High

---

## Agent Architecture

### Agent Types

#### 1. Research Agent
Responsible for data collection and initial processing.

```typescript
const RESEARCH_AGENT_PROMPT = `You are a UX Research Agent specializing in competitive intelligence.
Your job is to analyze raw scraped data from competitor websites and extract:
- Design patterns and their implementation quality
- Conversion optimization tactics
- Content strategy and messaging
- Technical implementation choices

Output structured findings as JSON for the Analysis Agent.`;
```

**Tools:** BraveSearch, Firecrawl, Exa semantic search, DOM extractors
**Mapped to UX Scraper:** `ScrapeOrchestrator` + data collection phases

#### 2. Analysis Agent
Performs competitive analysis on collected data.

```typescript
const ANALYSIS_AGENT_PROMPT = `You are a UX Analysis Agent specializing in competitive positioning.
Given research findings from one or more competitor websites, determine:
- Relative strengths and weaknesses vs. our project
- Industry fit scores and trend alignment
- Opportunities for differentiation
- Risks and threats from competitor design choices

Output structured analysis as JSON for the Synthesis Agent.`;
```

**Tools:** Scoring engine, design critique, Claude analysis
**Mapped to UX Scraper:** `ScoringEngine` + `DesignCritiqueEngine`

#### 3. Synthesis Agent
Generates deliverable documents from analysis results.

```typescript
const SYNTHESIS_AGENT_PROMPT = `You are a UX Synthesis Agent specializing in competitive deliverables.
Given analysis results, generate:
- Competitive battlecards
- Design recommendations
- Trend reports
- A/B test hypotheses

Format output as professional documents ready for stakeholder consumption.`;
```

**Tools:** Prompt generator, analysis generator, report templates
**Mapped to UX Scraper:** `AnalysisGenerator` + `PromptGenerator` + `ReadmeGenerator`

#### 4. Monitoring Agent
Watches for changes and triggers re-analysis.

```typescript
const MONITORING_AGENT_PROMPT = `You are a UX Monitoring Agent specializing in change detection.
Compare current scrape data against historical data to detect:
- New design patterns or removed patterns
- Pricing changes
- Navigation structure changes
- Performance improvements or degradation

Flag changes by significance: cosmetic, structural, or strategic.`;
```

**Tools:** Semantic diff engine, wayback client, embedding comparison
**Mapped to UX Scraper:** New `SemanticDiffEngine` + `WaybackClient` (existing)

### Coordinator Pattern

```typescript
class CICoordinator {
  private agents: Map<string, CIAgent> = new Map();

  constructor(claudeClient: ClaudeAPIClient) {
    this.agents.set('research', new ResearchAgent(claudeClient));
    this.agents.set('analysis', new AnalysisAgent(claudeClient));
    this.agents.set('synthesis', new SynthesisAgent(claudeClient));
    this.agents.set('monitoring', new MonitoringAgent(claudeClient));
  }

  async runFullPipeline(url: string, context: ProjectContext): Promise<CIResult> {
    // Research phase: collect data
    const researchOutput = await this.agents.get('research')!.execute({
      targetUrl: url,
      context,
    });

    // Analysis phase: evaluate findings
    const analysisOutput = await this.agents.get('analysis')!.execute({
      researchData: researchOutput,
      context,
    });

    // Monitoring phase: compare with history (runs in parallel with analysis)
    const monitoringOutput = await this.agents.get('monitoring')!.execute({
      currentData: researchOutput,
      historicalData: await this.loadHistory(url),
    });

    // Synthesis phase: generate deliverables
    const synthesisOutput = await this.agents.get('synthesis')!.execute({
      analysis: analysisOutput,
      changes: monitoringOutput,
      context,
    });

    return { research: researchOutput, analysis: analysisOutput,
             monitoring: monitoringOutput, synthesis: synthesisOutput };
  }
}
```

### Shared Memory
Agents share context through a structured memory store:

```typescript
interface AgentMemory {
  shortTerm: Map<string, unknown>;    // current pipeline execution
  longTerm: Map<string, unknown>;     // persisted across sessions (Supabase)
  episodic: Array<{                   // history of past analyses
    timestamp: number;
    agent: string;
    action: string;
    result: unknown;
  }>;
}
```

## Integration Strategy for UX Scraper

### Phase 1: Specialize Existing Claude Calls
The UX Scraper already makes multiple Claude API calls with different system prompts:
- `ScoringEngine` uses a scoring-focused prompt
- `DesignCritiqueEngine` uses a critique-focused prompt
- `PersonaGenerator` uses a persona-focused prompt

Formalize these as "agents" with a common interface:

```typescript
interface CIAgent {
  name: string;
  systemPrompt: string;
  execute(input: AgentInput): Promise<AgentOutput>;
}
```

### Phase 2: Add Coordinator
Replace the sequential phase orchestration with a coordinator that:
- Routes tasks to the appropriate agent
- Manages parallel execution where possible
- Passes results between agents

### Phase 3: Add Monitoring Agent
This is the only truly new agent -- the others are refactors of existing code. The Monitoring Agent implements semantic diffing and change detection.

## What to Adopt vs. What to Skip

**Adopt:**
- The agent specialization pattern (different prompts for different tasks)
- The coordinator pattern for routing and orchestration
- The shared memory model for inter-agent communication
- Parallel execution of independent agents

**Skip:**
- LangChain as a dependency (unnecessary complexity, use Claude API directly)
- The LLM-based routing (hardcode routing logic for deterministic behavior)
- The conversational memory (not needed for batch CI pipeline)
- The ReAct-style agent loops (too slow for extension context)
