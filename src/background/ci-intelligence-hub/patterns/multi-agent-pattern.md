# Pattern: Multi-Agent Coordination

Coordinate specialized AI agents for different CI tasks instead of using a single monolithic LLM pipeline.

---

## Problem

The UX Design Scraper currently uses the Claude API for multiple distinct tasks: scoring components, generating design critiques, creating personas, rewriting copy, and producing analysis reports. Each task uses a different system prompt but the same `ClaudeAPIClient.singleCall()` method. There is no coordination between these calls -- they run sequentially, and the output of one does not inform the input of another.

As CI capabilities grow (battlecard generation, trend analysis, change summarization), the number of distinct LLM tasks will multiply. Without a structured agent model, the pipeline becomes a spaghetti of independent Claude calls with no shared context.

## Solution

Define specialized "agents" -- each with its own system prompt, tools, and memory. A coordinator routes tasks to the appropriate agent and manages data flow between them. Agents can:
- Operate on different aspects of the same data (research vs. analysis vs. synthesis)
- Share findings through a structured context object
- Execute in parallel when independent
- Pass results to downstream agents when there are dependencies

## Implementation

### Agent Interface

```typescript
// src/background/agents/base-agent.ts
import { ClaudeAPIClient } from '../claude-api-client';
import { createLogger } from '@shared/logger';

const log = createLogger('CIAgent');

export interface AgentInput {
  data: Record<string, unknown>;
  context: AgentContext;
}

export interface AgentOutput {
  result: Record<string, unknown>;
  confidence: number;
  metadata: {
    agentName: string;
    durationMs: number;
    tokensUsed: number;
  };
}

export interface AgentContext {
  projectId: string;
  competitorUrl: string;
  projectContext: ProjectContext;
  previousResults: Map<string, AgentOutput>;  // results from upstream agents
}

export abstract class CIAgent {
  abstract name: string;
  abstract systemPrompt: string;

  constructor(protected claudeClient: ClaudeAPIClient) {}

  async execute(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    log.info(`Agent ${this.name} executing`, {
      dataKeys: Object.keys(input.data),
    });

    const userMessage = this.buildUserMessage(input);
    const response = await this.claudeClient.singleCall(
      this.systemPrompt,
      userMessage
    );

    const result = this.parseResponse(response);
    const output: AgentOutput = {
      result,
      confidence: this.assessConfidence(result),
      metadata: {
        agentName: this.name,
        durationMs: Date.now() - startTime,
        tokensUsed: 0, // populated by Claude API response
      },
    };

    log.info(`Agent ${this.name} complete`, {
      confidence: output.confidence,
      durationMs: output.metadata.durationMs,
    });

    return output;
  }

  protected abstract buildUserMessage(input: AgentInput): string;
  protected abstract parseResponse(response: string): Record<string, unknown>;
  protected abstract assessConfidence(result: Record<string, unknown>): number;
}
```

### Specialized Agents

```typescript
// src/background/agents/research-agent.ts
export class ResearchAgent extends CIAgent {
  name = 'research';
  systemPrompt = `You are a UX Research Agent. Analyze raw scraped website data and extract:
1. Design patterns and their implementation quality (scale 1-10)
2. Conversion optimization tactics with specific examples
3. Content strategy signals (messaging tone, value proposition clarity)
4. Technical sophistication indicators

Output as JSON with these sections: patterns, conversion, content, technical.
Always cite specific evidence from the scraped data.`;

  protected buildUserMessage(input: AgentInput): string {
    const scrape = input.data.scrapeResult as FullScrapeResult;
    return `Analyze this competitor website:
URL: ${scrape.targetUrl}
Components: ${scrape.components.length} found
Design tokens: ${JSON.stringify(scrape.designTokens.colors.slice(0, 5))}
Typography: ${scrape.typography.fontFamilies.join(', ')}
CTAs: ${scrape.conversionPatterns.ctas.map(c => c.text).join(', ')}
Social proof: ${scrape.conversionPatterns.socialProof.length} elements
Navigation depth: ${scrape.navigation.menuDepth}
Performance: LCP ${scrape.lighthouse.lcp}ms, CLS ${scrape.lighthouse.cls}
Accessibility: ${scrape.accessibility.overallScore}/100`;
  }

  protected parseResponse(response: string): Record<string, unknown> {
    return JSON.parse(response);
  }

  protected assessConfidence(result: Record<string, unknown>): number {
    // Higher confidence if all sections are populated
    const sections = ['patterns', 'conversion', 'content', 'technical'];
    const populated = sections.filter(s => result[s] && Object.keys(result[s] as object).length > 0);
    return populated.length / sections.length;
  }
}

// src/background/agents/analysis-agent.ts
export class AnalysisAgent extends CIAgent {
  name = 'analysis';
  systemPrompt = `You are a UX Analysis Agent. Given research findings about a competitor website, determine:
1. Relative strengths vs. weaknesses
2. Industry fit assessment (how well does the design serve the industry)
3. Opportunities for our project to differentiate
4. Threats from the competitor's design choices

You have access to the Research Agent's findings. Build on them -- do not repeat the research.
Output as JSON with sections: strengths, weaknesses, opportunities, threats, recommendations.`;

  protected buildUserMessage(input: AgentInput): string {
    const researchOutput = input.context.previousResults.get('research');
    const projectContext = input.context.projectContext;

    return `Our project: ${projectContext.industry} targeting ${projectContext.targetAudience}
Our design style: ${projectContext.designStyle}
Our goal: ${projectContext.goal}

Research Agent findings for ${input.context.competitorUrl}:
${JSON.stringify(researchOutput?.result, null, 2)}

Provide strategic analysis.`;
  }

  protected parseResponse(response: string): Record<string, unknown> {
    return JSON.parse(response);
  }

  protected assessConfidence(result: Record<string, unknown>): number {
    const sections = ['strengths', 'weaknesses', 'opportunities', 'threats'];
    const populated = sections.filter(s =>
      Array.isArray(result[s]) && (result[s] as unknown[]).length > 0
    );
    return populated.length / sections.length;
  }
}

// src/background/agents/synthesis-agent.ts
export class SynthesisAgent extends CIAgent {
  name = 'synthesis';
  systemPrompt = `You are a UX Synthesis Agent. Given research and analysis from other agents, produce:
1. A competitive battlecard (structured comparison document)
2. Top 3 design recommendations with implementation priority
3. A one-paragraph executive summary

You have access to both the Research Agent's and Analysis Agent's outputs.
Output as JSON with sections: battlecard, recommendations, executiveSummary.`;

  protected buildUserMessage(input: AgentInput): string {
    const research = input.context.previousResults.get('research');
    const analysis = input.context.previousResults.get('analysis');

    return `Synthesize these findings into deliverables:

Research findings:
${JSON.stringify(research?.result, null, 2)}

Analysis:
${JSON.stringify(analysis?.result, null, 2)}

Project context:
Industry: ${input.context.projectContext.industry}
Target: ${input.context.projectContext.targetAudience}
Goal: ${input.context.projectContext.goal}`;
  }

  protected parseResponse(response: string): Record<string, unknown> {
    return JSON.parse(response);
  }

  protected assessConfidence(result: Record<string, unknown>): number {
    return result.battlecard && result.recommendations && result.executiveSummary ? 1.0 : 0.5;
  }
}
```

### Coordinator

```typescript
// src/background/agents/ci-coordinator.ts
export class CICoordinator {
  private agents: Map<string, CIAgent> = new Map();
  private executionPlan: AgentExecutionStep[] = [];

  constructor(claudeClient: ClaudeAPIClient) {
    this.agents.set('research', new ResearchAgent(claudeClient));
    this.agents.set('analysis', new AnalysisAgent(claudeClient));
    this.agents.set('synthesis', new SynthesisAgent(claudeClient));

    // Define execution order with dependencies
    this.executionPlan = [
      { agentName: 'research', dependsOn: [] },
      { agentName: 'analysis', dependsOn: ['research'] },
      { agentName: 'synthesis', dependsOn: ['research', 'analysis'] },
    ];
  }

  async runPipeline(
    scrapeResult: FullScrapeResult,
    projectContext: ProjectContext
  ): Promise<Map<string, AgentOutput>> {
    const results = new Map<string, AgentOutput>();
    const context: AgentContext = {
      projectId: scrapeResult.projectName,
      competitorUrl: scrapeResult.targetUrl,
      projectContext,
      previousResults: results,
    };

    for (const step of this.executionPlan) {
      // Check all dependencies are satisfied
      const depsReady = step.dependsOn.every(dep => results.has(dep));
      if (!depsReady) {
        log.error(`Agent ${step.agentName} has unmet dependencies`, {
          required: step.dependsOn,
          available: [...results.keys()],
        });
        continue;
      }

      const agent = this.agents.get(step.agentName)!;
      try {
        const output = await agent.execute({
          data: { scrapeResult },
          context,
        });
        results.set(step.agentName, output);
      } catch (err) {
        log.error(`Agent ${step.agentName} failed`, err);
        // Continue pipeline -- downstream agents will work with available data
      }
    }

    return results;
  }
}
```

## Code Example: Integration with Phase Orchestrator

```typescript
// In phase-orchestrator.ts

import { CICoordinator } from './agents/ci-coordinator';

class PhaseOrchestrator {
  private ciCoordinator: CICoordinator;

  constructor(claudeClient: ClaudeAPIClient) {
    this.ciCoordinator = new CICoordinator(claudeClient);
  }

  async runCIAnalysis(
    scrapeResult: FullScrapeResult,
    projectContext: ProjectContext
  ): Promise<CIAnalysisResult> {
    // Run the multi-agent pipeline
    const agentResults = await this.ciCoordinator.runPipeline(
      scrapeResult,
      projectContext
    );

    // Extract deliverables
    const synthesis = agentResults.get('synthesis')?.result;

    return {
      battlecard: synthesis?.battlecard,
      recommendations: synthesis?.recommendations,
      executiveSummary: synthesis?.executiveSummary,
      agentMetrics: Object.fromEntries(
        [...agentResults.entries()].map(([name, output]) => [
          name,
          output.metadata,
        ])
      ),
    };
  }
}
```

## Integration Point

Replace the independent Claude API calls scattered across `ScoringEngine`, `DesignCritiqueEngine`, `PersonaGenerator`, and `CopyRewriter` with a coordinated agent pipeline. Each existing engine becomes an agent with a specialized system prompt.

Key files to modify:
- `src/background/claude-api-client.ts` -- no changes needed (agents use it as-is)
- `src/background/scoring-engine.ts` -- extract scoring prompt into a `ScoringAgent`
- `src/background/design-critique-engine.ts` -- extract into a `CritiqueAgent`
- `src/background/phase-orchestrator.ts` -- add `CICoordinator` as the analysis entry point
- New: `src/background/agents/` directory with all agent implementations
