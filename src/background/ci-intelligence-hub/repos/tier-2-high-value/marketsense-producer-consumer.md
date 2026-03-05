# MarketSense Producer-Consumer Intelligence Pipeline

**GitHub:** https://github.com/marketsense-ai/producer-consumer-pipeline
**Stars:** 327
**What It Does:** An event-driven market intelligence pipeline using the producer-consumer pattern. Data collection "producers" (web scrapers, API listeners, RSS parsers) push raw intelligence events onto a queue. Analysis "consumers" pick up events, process them through LLM analysis, and produce structured outputs. The separation allows producers and consumers to scale independently and process data asynchronously without blocking each other.
**Key Pattern:** Producer-Consumer -- decouples data collection from analysis using an event queue. Producers can run on different schedules (real-time RSS, hourly web scrapes, daily deep crawls) while consumers process the queue at their own pace. This prevents slow LLM analysis from blocking fast web scraping, and allows multiple consumers to process different event types.
**Integration Point in UX Scraper:** `src/background/batch-queue.ts` (existing queue infrastructure) and `src/background/service-worker.ts` -- Extend the existing batch queue to support the producer-consumer pattern. Scraping phases become producers, analysis phases become consumers, connected by the queue.
**Dependencies:** Chrome Storage API or IndexedDB for the event queue (no external dependencies)
**Effort:** Medium

---

## Architecture

```
PRODUCERS (Data Collection)          QUEUE              CONSUMERS (Analysis)
+---------------------------+                          +---------------------------+
| Brave Search Producer     |---+                  +---| Scoring Consumer          |
| Firecrawl Scrape Producer |---+--> [Event Queue] +---| Design Critique Consumer  |
| Exa Search Producer       |---+    (IndexedDB)   +---| Semantic Diff Consumer    |
| Wayback Producer          |---+                  +---| Battlecard Consumer       |
| Apify Actor Producer      |---+                  +---| Notification Consumer     |
+---------------------------+                          +---------------------------+
```

## Core Implementation

### Event Model
```typescript
interface IntelligenceEvent {
  id: string;
  type: 'scrape_complete' | 'search_result' | 'change_detected' | 'schedule_triggered';
  source: string;         // producer name
  competitorUrl: string;
  projectId: string;
  payload: unknown;       // raw data from the producer
  priority: number;       // 0 = low, 10 = critical
  createdAt: number;
  processedAt?: number;
  consumedBy?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
```

### Event Queue (IndexedDB-backed)
```typescript
class IntelligenceQueue {
  private dbName = 'ci-event-queue';
  private storeName = 'events';

  async enqueue(event: Omit<IntelligenceEvent, 'id' | 'createdAt' | 'status'>): Promise<string> {
    const id = generateId();
    const fullEvent: IntelligenceEvent = {
      ...event,
      id,
      createdAt: Date.now(),
      status: 'pending',
    };

    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    await tx.objectStore(this.storeName).put(fullEvent);

    log.info('Event enqueued', { id, type: event.type, source: event.source });
    return id;
  }

  async dequeue(consumerName: string): Promise<IntelligenceEvent | null> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const index = store.index('status');
    const cursor = await index.openCursor('pending');

    if (!cursor) return null;

    const event = cursor.value as IntelligenceEvent;
    event.status = 'processing';
    event.consumedBy = consumerName;
    await store.put(event);

    return event;
  }

  async complete(eventId: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const event = await store.get(eventId) as IntelligenceEvent;
    event.status = 'completed';
    event.processedAt = Date.now();
    await store.put(event);
  }

  async fail(eventId: string): Promise<void> {
    const db = await this.openDB();
    const tx = db.transaction(this.storeName, 'readwrite');
    const store = tx.objectStore(this.storeName);
    const event = await store.get(eventId) as IntelligenceEvent;
    event.status = 'failed';
    await store.put(event);
  }
}
```

### Producer Interface
```typescript
interface IntelligenceProducer {
  name: string;
  type: 'realtime' | 'scheduled' | 'on-demand';

  produce(context: ProducerContext): Promise<void>;
}

// Example: Firecrawl scrape producer
class FirecrawlProducer implements IntelligenceProducer {
  name = 'firecrawl-scraper';
  type = 'on-demand' as const;

  constructor(
    private firecrawl: FirecrawlClient,
    private queue: IntelligenceQueue
  ) {}

  async produce(context: ProducerContext): Promise<void> {
    const result = await this.firecrawl.scrape(context.url);

    await this.queue.enqueue({
      type: 'scrape_complete',
      source: this.name,
      competitorUrl: context.url,
      projectId: context.projectId,
      payload: result,
      priority: 5,
    });
  }
}
```

### Consumer Interface
```typescript
interface IntelligenceConsumer {
  name: string;
  eventTypes: string[];  // which event types this consumer handles

  consume(event: IntelligenceEvent): Promise<void>;
}

// Example: Scoring consumer
class ScoringConsumer implements IntelligenceConsumer {
  name = 'scoring-engine';
  eventTypes = ['scrape_complete'];

  constructor(
    private scoringEngine: ScoringEngine,
    private queue: IntelligenceQueue
  ) {}

  async consume(event: IntelligenceEvent): Promise<void> {
    if (event.type !== 'scrape_complete') return;

    const scrapeResult = event.payload as FullScrapeResult;
    const projectContext = await this.loadProjectContext(event.projectId);

    const scores = await this.scoringEngine.scoreAll({
      scrapeResult,
      projectContext,
    });

    // Scores are stored via SupabaseSync by the storage consumer
    await this.queue.enqueue({
      type: 'scores_computed',
      source: this.name,
      competitorUrl: event.competitorUrl,
      projectId: event.projectId,
      payload: scores,
      priority: 3,
    });
  }
}
```

### Consumer Loop
```typescript
class ConsumerManager {
  private consumers: IntelligenceConsumer[] = [];
  private queue: IntelligenceQueue;
  private running = false;

  registerConsumer(consumer: IntelligenceConsumer): void {
    this.consumers.push(consumer);
  }

  async start(): Promise<void> {
    this.running = true;
    while (this.running) {
      for (const consumer of this.consumers) {
        const event = await this.queue.dequeue(consumer.name);
        if (event && consumer.eventTypes.includes(event.type)) {
          try {
            await consumer.consume(event);
            await this.queue.complete(event.id);
          } catch (err) {
            log.error(`Consumer ${consumer.name} failed`, err);
            await this.queue.fail(event.id);
          }
        }
      }
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  stop(): void {
    this.running = false;
  }
}
```

## Benefits for UX Scraper

1. **Decoupled execution:** Slow Claude API calls (scoring, critique) do not block fast web scraping
2. **Resilience:** If Claude API fails, the scrape data is still in the queue and can be retried
3. **Extensibility:** New producers (social media, RSS) and consumers (trend analysis, alerts) can be added independently
4. **Priority handling:** Critical competitor changes are processed before routine scrapes
5. **Observability:** The event queue provides a complete audit trail of all CI activity

## What to Adopt vs. What to Skip

**Adopt:**
- The event model and queue abstraction
- Producer/consumer interfaces for clean separation
- IndexedDB-backed queue for Chrome extension persistence
- Priority-based event processing
- The consumer loop with polling and error handling

**Skip:**
- Redis/Kafka as the message broker (IndexedDB is sufficient for extension scale)
- The distributed worker pool (single service worker context)
- The microservices deployment model
- Real-time WebSocket notifications (use Chrome storage events)
