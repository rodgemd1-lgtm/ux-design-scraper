# Taurus BizFlow CI Platform

**GitHub:** https://github.com/taurus-ai/bizflow-competitive-intelligence
**Stars:** 412
**What It Does:** A full-stack competitive intelligence platform built with Node.js, PostgreSQL, and React. Provides competitor tracking dashboards, automated scraping schedules, change detection with email alerts, and structured intelligence reports. The platform manages multiple "intelligence projects" each tracking a set of competitors. Includes a REST API, background job queue (Bull), and real-time WebSocket updates.
**Key Pattern:** Full CI platform architecture -- demonstrates the complete data model, job scheduling, and dashboard UI needed for a production CI system. The key architectural choices are: PostgreSQL for structured data, Bull queue for async job processing, and a project-based organizational model where each project tracks multiple competitors.
**Integration Point in UX Scraper:** `src/background/supabase-sync.ts` (database schema) and `src/sidepanel/` (dashboard UI) -- Adopt the database schema patterns for CI-specific tables (competitor profiles, intelligence reports, scrape schedules). Adapt the dashboard UI concepts for the sidepanel.
**Dependencies:** PostgreSQL/Supabase (existing), Chrome Alarms API (replaces Bull queue), React (existing for sidepanel)
**Effort:** High

---

## Database Schema Patterns

### Competitor Profiles
Taurus tracks competitors as first-class entities linked to projects:

```sql
CREATE TABLE competitor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  tracking_frequency TEXT DEFAULT 'weekly',
  tracking_enabled BOOLEAN DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  scrape_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, url)
);
```

**Adaptation for UX Scraper:** This maps directly to a new Supabase table. The `tracking_frequency` and `tracking_enabled` fields support the scheduled scraping feature.

### Intelligence Timeline
Taurus maintains a timeline of all intelligence events:

```sql
CREATE TABLE intelligence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitor_profiles(id),
  event_type TEXT NOT NULL,  -- 'scrape_complete', 'change_detected', 'report_generated'
  severity TEXT,             -- 'info', 'warning', 'critical'
  title TEXT NOT NULL,
  description TEXT,
  data JSONB,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Adaptation for UX Scraper:** This becomes the change log + notification feed. The sidepanel can render this as a timeline UI.

### Scrape History
Each scrape is versioned for temporal comparison:

```sql
CREATE TABLE scrape_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_id UUID REFERENCES competitor_profiles(id),
  version_number INTEGER NOT NULL,
  scrape_data JSONB NOT NULL,
  embedding VECTOR(1536),
  content_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(competitor_id, version_number)
);
```

**Adaptation for UX Scraper:** Version numbering allows precise comparison of any two scrapes. The `content_hash` enables quick "has anything changed?" checks before running expensive embedding comparisons.

## Job Scheduling Pattern

Taurus uses Bull (Redis-backed job queue) for background jobs. In the Chrome extension context, we replace this with Chrome Alarms API:

### Taurus Pattern (Bull Queue)
```javascript
// Taurus uses Bull for recurring jobs
const scrapeQueue = new Bull('competitor-scrape', { redis: config.redis });
scrapeQueue.process(async (job) => {
  const { competitorId, url } = job.data;
  await scrapeCompetitor(url);
});
scrapeQueue.add('scrape', { competitorId, url }, {
  repeat: { cron: '0 6 * * 1' }, // Every Monday at 6am
});
```

### Adapted Pattern (Chrome Alarms)
```typescript
// Chrome extension equivalent using Alarms API
class ScheduleManager {
  async createSchedule(competitorId: string, url: string, frequency: string): Promise<void> {
    const alarmName = `ci-scrape-${competitorId}`;
    const periodInMinutes = this.frequencyToMinutes(frequency);

    await chrome.alarms.create(alarmName, {
      periodInMinutes,
      delayInMinutes: 1, // start after 1 minute
    });

    // Persist schedule to Supabase
    await this.saveSchedule(competitorId, url, frequency);
  }

  private frequencyToMinutes(frequency: string): number {
    switch (frequency) {
      case 'hourly': return 60;
      case 'daily': return 1440;
      case 'weekly': return 10080;
      default: return 10080; // default weekly
    }
  }
}

// In service-worker.ts
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('ci-scrape-')) {
    const competitorId = alarm.name.replace('ci-scrape-', '');
    const schedule = await loadSchedule(competitorId);
    await ciPipeline.run(schedule.url);
  }
});
```

## Dashboard UI Concepts

Taurus provides a React dashboard with these views:

### 1. Competitor Overview Grid
Cards showing each competitor with:
- Last scrape date and status
- Key metrics (performance, accessibility scores)
- Trend indicators (up/down/stable)
- Quick actions (scrape now, view history, generate report)

### 2. Change Timeline
Chronological feed of detected changes across all tracked competitors. Each entry shows:
- Competitor name and URL
- Change type and severity badge
- Brief description
- Timestamp

### 3. Battlecard Viewer
Rendered battlecard documents with print/export capability.

### Adaptation for Sidepanel
The UX Scraper sidepanel (`src/sidepanel/`) uses React + Zustand. Add new views:
- `src/sidepanel/components/CompetitorGrid.tsx` -- competitor tracking overview
- `src/sidepanel/components/ChangeTimeline.tsx` -- change detection feed
- `src/sidepanel/components/BattlecardViewer.tsx` -- rendered battlecards
- `src/sidepanel/store/slices/ci-slice.ts` -- Zustand slice for CI state

## What to Adopt vs. What to Skip

**Adopt:**
- The database schema patterns (competitor profiles, intelligence events, scrape versions)
- The versioned scrape history model for temporal comparison
- The content hash for quick change detection
- The dashboard UI concepts (competitor grid, timeline, battlecard viewer)

**Skip:**
- Bull/Redis job queue (use Chrome Alarms API)
- REST API layer (extension communicates via Chrome messaging)
- WebSocket real-time updates (use Chrome storage change events)
- The full-stack deployment model (we are a Chrome extension)
