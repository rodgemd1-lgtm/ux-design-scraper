# Pattern: Closed-Loop Delivery

Auto-trigger the full CI pipeline on new URL input, eliminating manual intervention between competitor discovery and intelligence delivery.

---

## Problem

The UX Design Scraper requires the user to manually trigger each scrape by clicking a button in the sidepanel. For a single-site analysis, this is fine. But for competitive intelligence -- where the user tracks 10-20 competitors and wants ongoing monitoring -- manual triggering creates friction that degrades the CI workflow:

1. User adds a competitor URL to their project
2. User must remember to manually scrape it
3. User must wait for the scrape to complete
4. User must manually trigger analysis
5. If the competitor changes their site later, the user must manually re-scrape

The gap between "adding a competitor" and "receiving intelligence" is filled entirely with manual steps.

## Solution

Close the loop: when a new competitor URL is added to a project, automatically trigger the full 7-phase CI pipeline. When the pipeline completes, deliver the results (battlecard, design analysis, change detection) without user intervention. When a scheduled re-scrape detects changes, auto-generate an updated report and notify the user.

```
URL Added --> Auto-Scrape --> Auto-Analyze --> Auto-Report --> Notify User
     ^                                                            |
     |______________ Scheduled Re-Scrape (weekly) ________________|
```

## Implementation

### Step 1: Storage Change Listener

Detect when a new competitor URL is added to the project:

```typescript
// src/background/service-worker.ts
chrome.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName !== 'local') return;

  // Check for changes to competitor tracking list
  if (changes.competitorProfiles) {
    const oldProfiles = changes.competitorProfiles.oldValue || [];
    const newProfiles = changes.competitorProfiles.newValue || [];

    // Find newly added competitors
    const oldUrls = new Set(oldProfiles.map((p: CompetitorProfile) => p.url));
    const addedCompetitors = newProfiles.filter(
      (p: CompetitorProfile) => !oldUrls.has(p.url)
    );

    for (const competitor of addedCompetitors) {
      log.info('New competitor detected, triggering CI pipeline', {
        url: competitor.url,
        projectId: competitor.projectId,
      });

      // Auto-trigger the full CI pipeline
      await triggerCIPipeline(competitor.url, competitor.projectId);
    }
  }
});
```

### Step 2: Full CI Pipeline Function

Orchestrate all layers from ingestion to delivery:

```typescript
// src/background/ci-pipeline.ts
import { createLogger } from '@shared/logger';
import { PhaseOrchestrator } from './phase-orchestrator';
import { SemanticEmbedder } from './semantic-embedder';
import { SemanticDiffEngine } from './semantic-diff-engine';
import { CICoordinator } from './agents/ci-coordinator';

const log = createLogger('CIPipeline');

export class CIPipeline {
  constructor(
    private orchestrator: PhaseOrchestrator,
    private embedder: SemanticEmbedder,
    private diffEngine: SemanticDiffEngine,
    private ciCoordinator: CICoordinator,
    private supabaseSync: SupabaseSync
  ) {}

  async run(url: string, projectId: string): Promise<CIPipelineResult> {
    const startTime = Date.now();
    log.info('CI pipeline starting', { url, projectId });

    const result: CIPipelineResult = {
      url,
      projectId,
      phases: {},
      success: false,
      durationMs: 0,
    };

    try {
      // Phase 0: Data Ingestion (parallel)
      log.info('Phase 0: Data Ingestion');
      const ingestionResults = await this.runIngestion(url);
      result.phases.ingestion = { status: 'complete', data: ingestionResults };

      // Phase 1: Visual Capture
      log.info('Phase 1: Visual Capture');
      const visuals = await this.runVisualCapture(url);
      result.phases.visual = { status: 'complete', data: visuals };

      // Phase 2: DOM Extraction (existing pipeline)
      log.info('Phase 2: DOM Extraction');
      const scrapeResult = await this.orchestrator.runExistingPipeline(url, projectId);
      result.phases.extraction = { status: 'complete', data: scrapeResult };

      // Phase 3: Multi-Agent Analysis
      log.info('Phase 3: Multi-Agent Analysis');
      const projectContext = await this.loadProjectContext(projectId);
      const analysis = await this.ciCoordinator.runPipeline(scrapeResult, projectContext);
      result.phases.analysis = { status: 'complete', data: analysis };

      // Phase 4: Semantic Diffing
      log.info('Phase 4: Semantic Diffing');
      const diffResult = await this.runSemanticDiff(scrapeResult, url, projectId);
      result.phases.diffing = { status: 'complete', data: diffResult };

      // Phase 5: Persistence
      log.info('Phase 5: Persistence');
      await this.supabaseSync.syncProject(scrapeResult);
      await this.persistCIResults(projectId, url, analysis, diffResult);
      result.phases.persistence = { status: 'complete' };

      // Phase 6: Report Generation
      log.info('Phase 6: Report Generation');
      const reports = await this.generateReports(scrapeResult, analysis, diffResult, projectContext);
      result.phases.reports = { status: 'complete', data: reports };

      // Phase 7: Delivery (notifications)
      log.info('Phase 7: Delivery');
      await this.deliverResults(url, diffResult, reports);
      result.phases.delivery = { status: 'complete' };

      result.success = true;
    } catch (err) {
      log.error('CI pipeline failed', { url, error: err });
      result.phases.error = { status: 'failed', error: String(err) };
    }

    result.durationMs = Date.now() - startTime;
    log.info('CI pipeline complete', {
      url,
      success: result.success,
      durationMs: result.durationMs,
    });

    return result;
  }

  private async runIngestion(url: string) {
    // Run all data sources in parallel
    const results = await Promise.allSettled([
      this.firecrawlClient?.scrape(url),
      this.exaClient?.findSimilar(url, 5),
      this.braveClient?.search(`${new URL(url).hostname} design UX`, 5),
    ]);

    return {
      firecrawl: results[0].status === 'fulfilled' ? results[0].value : null,
      exa: results[1].status === 'fulfilled' ? results[1].value : null,
      brave: results[2].status === 'fulfilled' ? results[2].value : null,
    };
  }

  private async deliverResults(
    url: string,
    diffResult: DiffResult | null,
    reports: CIReports
  ): Promise<void> {
    // Chrome notification for significant changes
    if (diffResult?.isSignificant) {
      chrome.notifications.create(`ci-change-${Date.now()}`, {
        type: 'basic',
        iconUrl: 'assets/icon-128.png',
        title: 'Competitor Change Detected',
        message: `${new URL(url).hostname}: ${diffResult.classification.label}`,
        buttons: [{ title: 'View Details' }],
      });
    }

    // Update sidepanel state via Chrome storage
    const currentResults = await chrome.storage.local.get('ciPipelineResults');
    const allResults = currentResults.ciPipelineResults || [];
    allResults.unshift({
      url,
      timestamp: Date.now(),
      hasChanges: diffResult?.isSignificant || false,
      reportSummary: reports.executiveSummary,
    });
    await chrome.storage.local.set({ ciPipelineResults: allResults.slice(0, 100) });
  }
}
```

### Step 3: Scheduled Re-Scraping

Use Chrome Alarms API for recurring CI pipeline runs:

```typescript
// src/background/schedule-manager.ts
export class ScheduleManager {
  async initializeSchedules(): Promise<void> {
    // Load active schedules from Supabase
    const { getSupabase } = await import('@shared/supabase-client');
    const supabase = await getSupabase();
    const { data: schedules } = await supabase
      .from('scrape_schedules')
      .select('*')
      .eq('enabled', true);

    if (!schedules) return;

    for (const schedule of schedules) {
      const alarmName = `ci-schedule-${schedule.id}`;
      const periodMinutes = this.parseCronToMinutes(schedule.cron_expression);

      await chrome.alarms.create(alarmName, { periodInMinutes: periodMinutes });
      log.info('Schedule alarm created', { id: schedule.id, periodMinutes });
    }
  }

  private parseCronToMinutes(cron: string): number {
    // Simplified cron parsing for common intervals
    if (cron === '0 * * * *') return 60;        // hourly
    if (cron === '0 0 * * *') return 1440;       // daily
    if (cron === '0 0 * * 1') return 10080;      // weekly (Monday)
    if (cron === '0 0 1 * *') return 43200;      // monthly
    return 10080; // default to weekly
  }
}

// In service-worker.ts
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('ci-schedule-')) {
    const scheduleId = alarm.name.replace('ci-schedule-', '');

    const { getSupabase } = await import('@shared/supabase-client');
    const supabase = await getSupabase();
    const { data: schedule } = await supabase
      .from('scrape_schedules')
      .select('*')
      .eq('id', scheduleId)
      .single();

    if (schedule && schedule.enabled) {
      log.info('Scheduled CI pipeline triggered', {
        scheduleId,
        url: schedule.competitor_url,
      });

      const pipeline = new CIPipeline(/* ... dependencies ... */);
      await pipeline.run(schedule.competitor_url, schedule.project_id);

      // Update last_run_at
      await supabase
        .from('scrape_schedules')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', scheduleId);
    }
  }
});
```

### Step 4: Notification Click Handling

```typescript
// In service-worker.ts
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
  if (notificationId.startsWith('ci-change-') && buttonIndex === 0) {
    // Open sidepanel to the CI dashboard
    chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
    // Navigate sidepanel to changes view
    await chrome.storage.local.set({ sidepanelView: 'ci-changes' });
  }
});
```

## Code Example: Complete Closed Loop

```typescript
// User adds competitor in sidepanel UI
// -> CompetitorGrid.tsx dispatches action
// -> Zustand store updates chrome.storage.local
// -> service-worker.ts detects storage change
// -> CIPipeline.run() executes all 7 phases
// -> Results persisted to Supabase
// -> Chrome notification sent
// -> User clicks notification
// -> Sidepanel opens to changes view
// -> User sees battlecard + visual diff + recommendations

// Additionally:
// -> Chrome alarm triggers weekly re-scrape
// -> CIPipeline.run() detects changes via semantic diffing
// -> New notification: "Competitor redesigned pricing page"
// -> Cycle repeats
```

## Integration Point

This pattern ties together all other patterns (semantic diffing, producer-consumer, multi-agent) into a unified loop. The primary integration points are:

- `src/background/service-worker.ts` -- storage change listener + alarm handler
- `src/background/phase-orchestrator.ts` -- new `runCIPipeline()` method
- `src/sidepanel/store/slices/ci-slice.ts` -- new Zustand slice for CI state
- `src/sidepanel/components/CompetitorGrid.tsx` -- UI for adding competitors
- New: `src/background/ci-pipeline.ts` -- the full pipeline orchestration
- New: `src/background/schedule-manager.ts` -- Chrome alarms for recurring scrapes
