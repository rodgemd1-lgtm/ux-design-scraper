# Market Intelligence Skills (raym26)

**GitHub:** https://github.com/raym26/market-intelligence-skills
**Stars:** 342
**What It Does:** A composable skills framework for competitive intelligence tasks. Each "skill" is a self-contained module that performs a specific CI function -- competitor profiling, pricing analysis, feature comparison, sentiment tracking. Skills can be composed into pipelines and expose a uniform interface for invocation by AI agents or orchestrators.
**Key Pattern:** Skills Packaging -- each CI capability is wrapped in a standardized skill interface with `execute()`, `validate()`, and `schema()` methods. Skills declare their input/output types, dependencies, and execution constraints. An orchestrator can dynamically discover and chain skills based on the intelligence task at hand.
**Integration Point in UX Scraper:** `src/background/phase-orchestrator.ts` -- Refactor the existing 7-phase pipeline to use a skills-based dispatch model. Each phase becomes a skill, and new CI capabilities (battlecard generation, trend analysis) are added as new skills without modifying the orchestrator.
**Dependencies:** None (pure TypeScript pattern). The skill interface is framework-agnostic.
**Effort:** Medium

---

## Key Concepts

### Skill Interface
```typescript
interface CISkill<TInput, TOutput> {
  name: string;
  description: string;
  version: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  dependencies: string[];  // names of other skills this depends on

  validate(input: TInput): ValidationResult;
  execute(input: TInput, context: SkillContext): Promise<TOutput>;
  rollback?(input: TInput, context: SkillContext): Promise<void>;
}
```

### Skill Registry
```typescript
class SkillRegistry {
  private skills: Map<string, CISkill<unknown, unknown>> = new Map();

  register(skill: CISkill<unknown, unknown>): void;
  get(name: string): CISkill<unknown, unknown> | undefined;
  list(): SkillMetadata[];
  resolve(taskDescription: string): CISkill<unknown, unknown>[]; // AI-powered skill selection
}
```

### Pipeline Composition
Skills are composed into directed acyclic graphs where the output of one skill feeds into the next. The orchestrator handles:
- Dependency resolution
- Parallel execution of independent skills
- Error recovery and retry logic
- Progress reporting

## Integration Strategy for UX Scraper

1. Define a `CISkill` interface in `src/shared/types.ts`
2. Wrap existing phases (DOM extraction, Claude scoring, Supabase sync) as skills
3. Create a `SkillRegistry` in `src/background/skill-registry.ts`
4. New CI features (battlecard gen, semantic diffing) are added as skills
5. `PhaseOrchestrator` delegates to the registry instead of hardcoding phase logic

## What to Adopt vs. What to Skip

**Adopt:**
- The skill interface pattern (input/output schemas, validate/execute/rollback)
- The registry pattern for dynamic skill discovery
- The pipeline composition model

**Skip:**
- The repo's custom event system (we have Chrome message passing)
- The CLI runner (we run in a Chrome extension)
- The REST API layer (not applicable to extension context)
