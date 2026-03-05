# Pattern: Producer-Consumer

Decouple data collection from analysis using an event queue so that fast scrapers and slow LLM analysis do not block each other.

---

## Problem

The UX Design Scraper's current pipeline runs sequentially: scrape -> extract -> analyze -> score -> generate -> persist. If the Claude API scoring call takes 30 seconds, the entire pipeline is blocked for 30 seconds. If Firecrawl scraping takes 10 seconds but Exa search takes 2 seconds, the pipeline waits for the slowest operation before proceeding.

Additionally, when tracking multiple competitors, each competitor's pipeline runs end-to-end before the next one starts. With 10 competitors, the total wall-clock time is 10x a single pipeline run.

## Solution

Split the pipeline into producers (data collection) and consumers (analysis/generation). Producers push events onto a queue. Consumers pick up events and process them independently. This allows:
- Multiple scrapers to run in parallel without blocking analysis
- Slow LLM calls to process at their own pace
- Failed analysis to be retried without re-scraping
- Priority-based processing (urgent competitor changes processed first)

## Implementation

### Event Queue using IndexedDB

```typescript
// src/background/intelligence-queue.ts
import { createLogger } from '@shared/logger';
import { generateId } from '@shared/utils';

const log = createLogger('IntelQueue');

interface QueueEvent {
  id: string;
  type: string;
  source: string;
  competitorUrl: string;
  projectId: string;
  payload: unknown;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  processedAt: number | null;
}

export class IntelligenceQueue {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'ux-scraper-ci-queue';
  private readonly STORE_NAME = 'events';
  private readonly DB_VERSION = 1;

  private async openDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          store.createIndex('type', 'type', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async enqueue(event: Omit<QueueEvent, 'id' | 'status' | 'attempts' | 'createdAt' | 'processedAt'>): Promise<string> {
    const db = await this.openDB();
    const id = generateId();

    const fullEvent: QueueEvent = {
      ...event,
      id,
      status: 'pending',
      attempts: 0,
      maxAttempts: event.maxAttempts || 3,
      createdAt: Date.now(),
      processedAt: null,
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      tx.objectStore(this.STORE_NAME).put(fullEvent);
      tx.oncomplete = () => {
        log.info('Event enqueued', { id, type: event.type, priority: event.priority });
        resolve(id);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async dequeue(eventTypes: string[]): Promise<QueueEvent | null> {
    const db = await this.openDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const index = store.index('status');
      const request = index.openCursor('pending');

      let bestEvent: QueueEvent | null = null;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const event = cursor.value as QueueEvent;
          if (eventTypes.includes(event.type)) {
            if (!bestEvent || event.priority > bestEvent.priority) {
              bestEvent = event;
            }
          }
          cursor.continue();
        } else {
          // All pending events scanned, claim the highest-priority one
          if (bestEvent) {
            bestEvent.status = 'processing';
            bestEvent.attempts += 1;
            store.put(bestEvent);
          }
          resolve(bestEvent);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async complete(eventId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const getReq = store.get(eventId);

      getReq.onsuccess = () => {
        const event = getReq.result as QueueEvent;
        event.status = 'completed';
        event.processedAt = Date.now();
        store.put(event);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async fail(eventId: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const getReq = store.get(eventId);

      getReq.onsuccess = () => {
        const event = getReq.result as QueueEvent;
        // Re-enqueue if under max attempts, otherwise mark failed
        event.status = event.attempts < event.maxAttempts ? 'pending' : 'failed';
        store.put(event);
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
```

### Producer Interface

```typescript
// src/background/producers/base-producer.ts
export interface CIProducer {
  name: string;
  produce(url: string, projectId: string): Promise<void>;
}

// src/background/producers/firecrawl-producer.ts
export class FirecrawlProducer implements CIProducer {
  name = 'firecrawl';

  constructor(
    private firecrawl: FirecrawlClient,
    private queue: IntelligenceQueue
  ) {}

  async produce(url: string, projectId: string): Promise<void> {
    log.info('Firecrawl producer starting', { url });
    const result = await this.firecrawl.scrape(url);

    await this.queue.enqueue({
      type: 'scrape_complete',
      source: this.name,
      competitorUrl: url,
      projectId,
      payload: result,
      priority: 5,
      maxAttempts: 1, // scraping is not retryable
    });
  }
}

// src/background/producers/exa-producer.ts
export class ExaProducer implements CIProducer {
  name = 'exa';

  constructor(
    private exa: ExaSearchClient,
    private queue: IntelligenceQueue
  ) {}

  async produce(url: string, projectId: string): Promise<void> {
    log.info('Exa producer starting', { url });
    const similar = await this.exa.findSimilar(url, 10);

    await this.queue.enqueue({
      type: 'similar_sites_found',
      source: this.name,
      competitorUrl: url,
      projectId,
      payload: similar,
      priority: 3,
      maxAttempts: 2,
    });
  }
}
```

### Consumer Interface

```typescript
// src/background/consumers/base-consumer.ts
export interface CIConsumer {
  name: string;
  eventTypes: string[];
  consume(event: QueueEvent): Promise<void>;
}

// src/background/consumers/scoring-consumer.ts
export class ScoringConsumer implements CIConsumer {
  name = 'scoring';
  eventTypes = ['scrape_complete'];

  constructor(
    private scoringEngine: ScoringEngine,
    private queue: IntelligenceQueue
  ) {}

  async consume(event: QueueEvent): Promise<void> {
    const scrapeResult = event.payload as FullScrapeResult;
    const context = await loadProjectContext(event.projectId);

    const scores = await this.scoringEngine.scoreAll({
      scrapeResult,
      projectContext: context,
    });

    // Enqueue scores for persistence consumer
    await this.queue.enqueue({
      type: 'scores_computed',
      source: this.name,
      competitorUrl: event.competitorUrl,
      projectId: event.projectId,
      payload: scores,
      priority: 3,
      maxAttempts: 1,
    });
  }
}
```

### Consumer Manager

```typescript
// src/background/consumer-manager.ts
export class ConsumerManager {
  private consumers: CIConsumer[] = [];
  private queue: IntelligenceQueue;
  private polling = false;
  private pollIntervalMs = 2000;

  constructor(queue: IntelligenceQueue) {
    this.queue = queue;
  }

  register(consumer: CIConsumer): void {
    this.consumers.push(consumer);
    log.info('Consumer registered', { name: consumer.name, eventTypes: consumer.eventTypes });
  }

  async startPolling(): Promise<void> {
    this.polling = true;
    log.info('Consumer manager started polling');

    while (this.polling) {
      for (const consumer of this.consumers) {
        const event = await this.queue.dequeue(consumer.eventTypes);
        if (event) {
          try {
            await consumer.consume(event);
            await this.queue.complete(event.id);
            log.info('Event consumed', { eventId: event.id, consumer: consumer.name });
          } catch (err) {
            log.error('Consumer failed', { consumer: consumer.name, eventId: event.id, err });
            await this.queue.fail(event.id);
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, this.pollIntervalMs));
    }
  }

  stopPolling(): void {
    this.polling = false;
  }
}
```

## Code Example: Wiring Producers and Consumers

```typescript
// In service-worker.ts initialization

const queue = new IntelligenceQueue();

// Register producers
const producers: CIProducer[] = [
  new FirecrawlProducer(firecrawlClient, queue),
  new ExaProducer(exaClient, queue),
  new BraveProducer(braveClient, queue),
];

// Register consumers
const consumerManager = new ConsumerManager(queue);
consumerManager.register(new ScoringConsumer(scoringEngine, queue));
consumerManager.register(new DiffConsumer(diffEngine, queue));
consumerManager.register(new PersistenceConsumer(supabaseSync, queue));
consumerManager.register(new NotificationConsumer(queue));

// Start consumer polling
consumerManager.startPolling();

// Trigger a CI pipeline for a competitor
async function triggerCIPipeline(url: string, projectId: string): Promise<void> {
  // All producers run in parallel
  await Promise.allSettled(
    producers.map(p => p.produce(url, projectId))
  );
  // Consumers will pick up events from the queue asynchronously
}
```

## Integration Point

This pattern replaces the sequential execution in `src/background/phase-orchestrator.ts` with event-driven processing. The existing `batch-queue.ts` can be extended to serve as the underlying queue, or the new `IntelligenceQueue` can run alongside it.

Key files to modify:
- `src/background/phase-orchestrator.ts` -- refactor phases into producer/consumer pairs
- `src/background/service-worker.ts` -- initialize consumer manager on service worker startup
- `src/background/batch-queue.ts` -- optionally extend as the queue backend
