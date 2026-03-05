# Pattern: Skills Packaging

Bundle CI capabilities into composable, self-describing skill modules that can be dynamically discovered, configured, and chained.

---

## Problem

As the UX Design Scraper adds CI capabilities, each new feature (battlecard generation, semantic diffing, competitor profiling, trend analysis) is implemented as a tightly-coupled function inside an existing class. Adding a new capability means modifying `PhaseOrchestrator`, `ScrapeOrchestrator`, or creating a new standalone class with no standard interface.

This leads to:
- No discoverability: the pipeline cannot enumerate its own capabilities
- No configurability: skills cannot be enabled/disabled without code changes
- No composability: skills cannot be chained in arbitrary order
- No validation: input/output compatibility between pipeline stages is not checked
- No rollback: if a skill fails, there is no standard recovery mechanism

## Solution

Define a `CISkill` interface that every CI capability implements. Skills are self-describing (they declare their input/output schemas), composable (they can be chained), and registered in a skill registry that the pipeline discovers at runtime.

This pattern is inspired by the `raym26/market-intelligence-skills` repo but adapted for the Chrome extension context.

## Implementation

### Skill Interface

```typescript
// src/shared/types/ci-skill.ts

export interface SkillInputSchema {
  type: 'object';
  required: string[];
  properties: Record<string, {
    type: string;
    description: string;
    optional?: boolean;
  }>;
}

export interface SkillMetadata {
  name: string;
  version: string;
  description: string;
  category: 'ingestion' | 'analysis' | 'generation' | 'monitoring' | 'delivery';
  layer: number;  // 0-5, corresponds to architecture layers
  dependencies: string[];  // names of other skills this requires
  inputSchema: SkillInputSchema;
  outputSchema: SkillInputSchema;
  estimatedDurationMs: number;
  requiresApiKey?: string;  // e.g., 'firecrawlApiKey', 'exaApiKey'
}

export interface SkillExecutionContext {
  projectId: string;
  projectContext: ProjectContext;
  previousOutputs: Map<string, unknown>;  // outputs from upstream skills
  settings: AppSettings;
  abortSignal?: AbortSignal;
}

export interface SkillResult<T = unknown> {
  success: boolean;
  data: T;
  durationMs: number;
  warnings: string[];
}

export interface CISkill<TInput = unknown, TOutput = unknown> {
  metadata: SkillMetadata;

  validate(input: TInput): { valid: boolean; errors: string[] };
  execute(input: TInput, context: SkillExecutionContext): Promise<SkillResult<TOutput>>;
  rollback?(input: TInput, context: SkillExecutionContext): Promise<void>;
}
```

### Skill Registry

```typescript
// src/background/skill-registry.ts
import { createLogger } from '@shared/logger';
import type { CISkill, SkillMetadata } from '@shared/types/ci-skill';

const log = createLogger('SkillRegistry');

export class SkillRegistry {
  private skills: Map<string, CISkill> = new Map();

  register(skill: CISkill): void {
    if (this.skills.has(skill.metadata.name)) {
      log.warn('Overwriting existing skill', { name: skill.metadata.name });
    }
    this.skills.set(skill.metadata.name, skill);
    log.info('Skill registered', {
      name: skill.metadata.name,
      category: skill.metadata.category,
      layer: skill.metadata.layer,
    });
  }

  get(name: string): CISkill | undefined {
    return this.skills.get(name);
  }

  list(): SkillMetadata[] {
    return Array.from(this.skills.values()).map(s => s.metadata);
  }

  listByCategory(category: string): SkillMetadata[] {
    return this.list().filter(s => s.category === category);
  }

  listByLayer(layer: number): SkillMetadata[] {
    return this.list().filter(s => s.layer === layer);
  }

  /**
   * Resolve a dependency chain for a given skill.
   * Returns skills in topological order (dependencies first).
   */
  resolveDependencies(skillName: string): CISkill[] {
    const resolved: CISkill[] = [];
    const visited = new Set<string>();

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const skill = this.skills.get(name);
      if (!skill) {
        throw new Error(`Skill not found: ${name}`);
      }

      for (const dep of skill.metadata.dependencies) {
        visit(dep);
      }

      resolved.push(skill);
    };

    visit(skillName);
    return resolved;
  }

  /**
   * Check if all required API keys are configured for a skill chain.
   */
  async checkAvailability(skillNames: string[], settings: AppSettings): Promise<{
    available: string[];
    unavailable: Array<{ skill: string; reason: string }>;
  }> {
    const available: string[] = [];
    const unavailable: Array<{ skill: string; reason: string }> = [];

    for (const name of skillNames) {
      const skill = this.skills.get(name);
      if (!skill) {
        unavailable.push({ skill: name, reason: 'Skill not registered' });
        continue;
      }

      if (skill.metadata.requiresApiKey) {
        const key = (settings as Record<string, unknown>)[skill.metadata.requiresApiKey];
        if (!key) {
          unavailable.push({
            skill: name,
            reason: `Missing API key: ${skill.metadata.requiresApiKey}`,
          });
          continue;
        }
      }

      available.push(name);
    }

    return { available, unavailable };
  }
}
```

### Example Skills

```typescript
// src/background/skills/firecrawl-scrape-skill.ts
export class FirecrawlScrapeSkill implements CISkill<{ url: string }, FirecrawlScrapeResult> {
  metadata: SkillMetadata = {
    name: 'firecrawl-scrape',
    version: '1.0.0',
    description: 'Scrape a URL using Firecrawl for clean markdown and structured data',
    category: 'ingestion',
    layer: 0,
    dependencies: [],
    inputSchema: {
      type: 'object',
      required: ['url'],
      properties: {
        url: { type: 'string', description: 'URL to scrape' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['markdown', 'metadata'],
      properties: {
        markdown: { type: 'string', description: 'Clean markdown content' },
        metadata: { type: 'object', description: 'Page metadata' },
        screenshot: { type: 'string', description: 'Base64 screenshot', optional: true },
      },
    },
    estimatedDurationMs: 10000,
    requiresApiKey: 'firecrawlApiKey',
  };

  constructor(private firecrawl: FirecrawlClient) {}

  validate(input: { url: string }): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!input.url) errors.push('URL is required');
    try { new URL(input.url); } catch { errors.push('Invalid URL format'); }
    return { valid: errors.length === 0, errors };
  }

  async execute(
    input: { url: string },
    context: SkillExecutionContext
  ): Promise<SkillResult<FirecrawlScrapeResult>> {
    const startTime = Date.now();
    const result = await this.firecrawl.scrape(input.url);

    return {
      success: true,
      data: result,
      durationMs: Date.now() - startTime,
      warnings: [],
    };
  }
}

// src/background/skills/semantic-diff-skill.ts
export class SemanticDiffSkill implements CISkill<{ scrapeResult: FullScrapeResult; url: string }, DiffResult | null> {
  metadata: SkillMetadata = {
    name: 'semantic-diff',
    version: '1.0.0',
    description: 'Compare current scrape against historical data to detect meaningful changes',
    category: 'monitoring',
    layer: 2,
    dependencies: ['firecrawl-scrape'],  // needs scrape data as input
    inputSchema: {
      type: 'object',
      required: ['scrapeResult', 'url'],
      properties: {
        scrapeResult: { type: 'object', description: 'Full scrape result' },
        url: { type: 'string', description: 'Competitor URL' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['isSignificant'],
      properties: {
        similarity: { type: 'number', description: 'Cosine similarity (0-1)' },
        distance: { type: 'number', description: 'Semantic distance (0-1)' },
        isSignificant: { type: 'boolean', description: 'Whether the change is significant' },
        classification: { type: 'object', description: 'Change type and severity' },
      },
    },
    estimatedDurationMs: 5000,
    requiresApiKey: 'openaiApiKey',
  };

  constructor(
    private embedder: SemanticEmbedder,
    private diffEngine: SemanticDiffEngine
  ) {}

  validate(input: { scrapeResult: FullScrapeResult; url: string }) {
    const errors: string[] = [];
    if (!input.scrapeResult) errors.push('Scrape result is required');
    if (!input.url) errors.push('URL is required');
    return { valid: errors.length === 0, errors };
  }

  async execute(
    input: { scrapeResult: FullScrapeResult; url: string },
    context: SkillExecutionContext
  ): Promise<SkillResult<DiffResult | null>> {
    const startTime = Date.now();

    const currentEmbedding = await this.embedder.embed(input.scrapeResult);
    const previousEmbedding = await this.loadPreviousEmbedding(input.url, context.projectId);

    if (!previousEmbedding) {
      return {
        success: true,
        data: null,
        durationMs: Date.now() - startTime,
        warnings: ['No previous embedding found -- first scrape for this URL'],
      };
    }

    const diff = this.diffEngine.compare(currentEmbedding, previousEmbedding);

    return {
      success: true,
      data: diff,
      durationMs: Date.now() - startTime,
      warnings: [],
    };
  }

  private async loadPreviousEmbedding(url: string, projectId: string): Promise<number[] | null> {
    // Load from Supabase page_embeddings table
    // ...
    return null;
  }
}

// src/background/skills/battlecard-skill.ts
export class BattlecardSkill implements CISkill<{ scrapeResult: FullScrapeResult }, Battlecard> {
  metadata: SkillMetadata = {
    name: 'battlecard-generation',
    version: '1.0.0',
    description: 'Generate a competitive battlecard from scrape results',
    category: 'generation',
    layer: 5,
    dependencies: ['firecrawl-scrape', 'semantic-diff'],
    inputSchema: {
      type: 'object',
      required: ['scrapeResult'],
      properties: {
        scrapeResult: { type: 'object', description: 'Full scrape result' },
      },
    },
    outputSchema: {
      type: 'object',
      required: ['overview', 'strengths', 'weaknesses', 'recommendations'],
      properties: {
        overview: { type: 'object', description: 'Competitor overview' },
        strengths: { type: 'array', description: 'Design strengths' },
        weaknesses: { type: 'array', description: 'Design weaknesses' },
        recommendations: { type: 'object', description: 'Action items' },
      },
    },
    estimatedDurationMs: 15000,
  };

  // ... validate and execute methods
}
```

### Pipeline Composition with Skills

```typescript
// src/background/skill-pipeline.ts
export class SkillPipeline {
  constructor(private registry: SkillRegistry) {}

  async run(
    skillNames: string[],
    initialInput: Record<string, unknown>,
    context: SkillExecutionContext
  ): Promise<Map<string, SkillResult>> {
    // Resolve full dependency chain
    const allSkills: CISkill[] = [];
    const seen = new Set<string>();

    for (const name of skillNames) {
      const chain = this.registry.resolveDependencies(name);
      for (const skill of chain) {
        if (!seen.has(skill.metadata.name)) {
          seen.add(skill.metadata.name);
          allSkills.push(skill);
        }
      }
    }

    // Execute in order
    const results = new Map<string, SkillResult>();

    for (const skill of allSkills) {
      // Build input from initial input + previous outputs
      const input = this.buildInput(skill, initialInput, context.previousOutputs);

      const validation = skill.validate(input);
      if (!validation.valid) {
        log.warn(`Skill ${skill.metadata.name} validation failed`, { errors: validation.errors });
        results.set(skill.metadata.name, {
          success: false,
          data: null,
          durationMs: 0,
          warnings: validation.errors,
        });
        continue;
      }

      try {
        const result = await skill.execute(input, context);
        results.set(skill.metadata.name, result);
        context.previousOutputs.set(skill.metadata.name, result.data);
      } catch (err) {
        log.error(`Skill ${skill.metadata.name} failed`, err);
        if (skill.rollback) {
          await skill.rollback(input, context);
        }
        results.set(skill.metadata.name, {
          success: false,
          data: null,
          durationMs: 0,
          warnings: [`Execution failed: ${err}`],
        });
      }
    }

    return results;
  }

  private buildInput(
    skill: CISkill,
    initialInput: Record<string, unknown>,
    previousOutputs: Map<string, unknown>
  ): unknown {
    // Merge initial input with outputs from dependency skills
    const merged = { ...initialInput };
    for (const dep of skill.metadata.dependencies) {
      if (previousOutputs.has(dep)) {
        merged[dep] = previousOutputs.get(dep);
      }
    }
    return merged;
  }
}
```

## Code Example: Registering All Skills at Startup

```typescript
// src/background/service-worker.ts

import { SkillRegistry } from './skill-registry';
import { FirecrawlScrapeSkill } from './skills/firecrawl-scrape-skill';
import { SemanticDiffSkill } from './skills/semantic-diff-skill';
import { BattlecardSkill } from './skills/battlecard-skill';

function initializeSkillRegistry(): SkillRegistry {
  const registry = new SkillRegistry();

  // Layer 0: Ingestion skills
  registry.register(new FirecrawlScrapeSkill(firecrawlClient));
  registry.register(new ExaSearchSkill(exaClient));
  registry.register(new BraveSearchSkill(braveClient));
  registry.register(new ApifyScrapingSkill(apifyClient));

  // Layer 1: Visual skills
  registry.register(new ScreenshotCaptureSkill(screenshotManager));
  registry.register(new FullPageCaptureSkill(screenshotManager));

  // Layer 2: Diffing skills
  registry.register(new SemanticDiffSkill(embedder, diffEngine));

  // Layer 3: Analysis skills
  registry.register(new ScoringSkill(scoringEngine));
  registry.register(new DesignCritiqueSkill(critiqueEngine));
  registry.register(new PersonaGenerationSkill(personaGenerator));

  // Layer 5: Delivery skills
  registry.register(new BattlecardSkill(claudeClient));
  registry.register(new TrendAnalysisSkill(claudeClient));
  registry.register(new NotificationSkill());

  log.info('Skill registry initialized', {
    totalSkills: registry.list().length,
    byCategory: {
      ingestion: registry.listByCategory('ingestion').length,
      analysis: registry.listByCategory('analysis').length,
      generation: registry.listByCategory('generation').length,
      monitoring: registry.listByCategory('monitoring').length,
      delivery: registry.listByCategory('delivery').length,
    },
  });

  return registry;
}
```

## Integration Point

This pattern provides the organizational backbone for all other patterns. Each pattern's implementation becomes one or more skills:

| Pattern | Skills Created |
|---------|---------------|
| Semantic Diffing | `semantic-diff`, `page-embedding` |
| Producer-Consumer | Producers and consumers become skill wrappers |
| Multi-Agent | Each agent becomes a skill |
| Closed-Loop | The pipeline uses `SkillPipeline.run()` with the full skill chain |

Key files to create:
- `src/shared/types/ci-skill.ts` -- skill interfaces
- `src/background/skill-registry.ts` -- registry implementation
- `src/background/skill-pipeline.ts` -- pipeline composition
- `src/background/skills/` -- directory for all skill implementations
