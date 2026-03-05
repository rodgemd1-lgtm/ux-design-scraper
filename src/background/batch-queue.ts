/**
 * Batch Queue System
 * Manages a queue of URLs to scrape sequentially with:
 * - Add single/bulk URLs to queue
 * - Start/pause/resume/clear queue
 * - Progress broadcasting via chrome.runtime.sendMessage
 * - Retry failed scrapes up to 2 times
 * - Rate limiting: minimum 5 seconds between scrapes
 * - Queue persistence to chrome.storage.local (survives service worker restarts)
 * - Returns results as they complete
 */

import { createLogger } from '@shared/logger';
import { generateId } from '@shared/utils';
import { MSG } from '@shared/message-types';
import { STORAGE_KEYS } from '@shared/constants';
import type {
  ScrapeConfig,
  BatchQueueStatus,
  BatchQueueItem,
  FullScrapeResult,
} from '@shared/types';

const log = createLogger('BatchQueue');

const QUEUE_STORAGE_KEY = 'ux_scraper_batch_queue';
const MIN_DELAY_BETWEEN_SCRAPES_MS = 5000;
const MAX_RETRIES = 2;

type ScrapeFunction = (config: ScrapeConfig) => Promise<FullScrapeResult>;

export class BatchQueue {
  private queue: BatchQueueItem[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private currentIndex: number = 0;
  private baseConfig: Omit<ScrapeConfig, 'targetUrl'> | null = null;
  private scrapeFn: ScrapeFunction;

  constructor(scrapeFn: ScrapeFunction) {
    this.scrapeFn = scrapeFn;
    this.restoreQueue();
  }

  /**
   * Add a single URL to the scrape queue.
   */
  async addToQueue(url: string, config: Omit<ScrapeConfig, 'targetUrl'>): Promise<void> {
    log.info('Adding URL to queue', { url });

    // Normalize URL
    const normalizedUrl = this.normalizeUrl(url);
    if (!normalizedUrl) {
      log.warn('Invalid URL, not adding to queue', { url });
      return;
    }

    // Check for duplicates
    if (this.queue.some(item => item.url === normalizedUrl)) {
      log.warn('URL already in queue, skipping', { url: normalizedUrl });
      return;
    }

    this.queue.push({
      url: normalizedUrl,
      status: 'pending',
      retries: 0,
    });

    this.baseConfig = config;
    await this.persistQueue();
    this.broadcastStatus();
  }

  /**
   * Add multiple URLs to the queue.
   */
  async addBulk(urls: string[], config: Omit<ScrapeConfig, 'targetUrl'>): Promise<void> {
    log.info('Adding bulk URLs to queue', { count: urls.length });

    const existingUrls = new Set(this.queue.map(item => item.url));

    for (const url of urls) {
      const normalizedUrl = this.normalizeUrl(url);
      if (!normalizedUrl) continue;

      if (existingUrls.has(normalizedUrl)) {
        log.warn('Duplicate URL in bulk add, skipping', { url: normalizedUrl });
        continue;
      }

      existingUrls.add(normalizedUrl);
      this.queue.push({
        url: normalizedUrl,
        status: 'pending',
        retries: 0,
      });
    }

    this.baseConfig = config;
    await this.persistQueue();
    this.broadcastStatus();

    log.info('Bulk add complete', { totalQueueSize: this.queue.length });
  }

  /**
   * Start processing the queue sequentially.
   */
  async startQueue(): Promise<void> {
    if (this.isRunning) {
      log.warn('Queue is already running');
      return;
    }

    if (!this.baseConfig) {
      throw new Error('No scrape configuration set. Add URLs with a config first.');
    }

    log.info('Starting queue processing', {
      total: this.queue.length,
      pending: this.queue.filter(i => i.status === 'pending').length,
    });

    this.isRunning = true;
    this.isPaused = false;
    this.broadcastStatus();

    // Find the first pending item
    this.currentIndex = this.queue.findIndex(item => item.status === 'pending');
    if (this.currentIndex === -1) {
      log.info('No pending items in queue');
      this.isRunning = false;
      this.broadcastStatus();
      return;
    }

    await this.processNext();
  }

  /**
   * Pause queue processing. Currently running scrape will finish.
   */
  pauseQueue(): void {
    log.info('Pausing queue');
    this.isPaused = true;
    this.broadcastStatus();
  }

  /**
   * Resume queue processing after a pause.
   */
  async resumeQueue(): Promise<void> {
    if (!this.isPaused) {
      log.warn('Queue is not paused');
      return;
    }

    log.info('Resuming queue');
    this.isPaused = false;
    this.broadcastStatus();

    if (this.isRunning) {
      await this.processNext();
    }
  }

  /**
   * Clear the entire queue.
   */
  async clearQueue(): Promise<void> {
    log.info('Clearing queue');
    this.queue = [];
    this.isRunning = false;
    this.isPaused = false;
    this.currentIndex = 0;
    await this.persistQueue();
    this.broadcastStatus();
  }

  /**
   * Get the current queue status.
   */
  getQueueStatus(): BatchQueueStatus {
    const completed = this.queue.filter(i => i.status === 'completed').length;
    const failed = this.queue.filter(i => i.status === 'failed').length;
    const pending = this.queue.filter(i => i.status === 'pending').length;
    const running = this.queue.find(i => i.status === 'running');

    return {
      total: this.queue.length,
      completed,
      failed,
      pending,
      currentUrl: running?.url || '',
      isPaused: this.isPaused,
      isRunning: this.isRunning,
      results: this.queue.map(item => ({
        ...item,
        // Don't include full scrape results in status to keep it lightweight
        result: undefined,
      })),
    };
  }

  /**
   * Get completed results.
   */
  getResults(): BatchQueueItem[] {
    return this.queue.filter(item => item.status === 'completed');
  }

  // ===== Private Methods =====

  private async processNext(): Promise<void> {
    if (this.isPaused) {
      log.info('Queue paused, stopping processing');
      return;
    }

    // Find the next pending item
    const nextIndex = this.queue.findIndex(item => item.status === 'pending');
    if (nextIndex === -1) {
      log.info('Queue processing complete - all items processed');
      this.isRunning = false;
      this.broadcastStatus();

      // Final broadcast with complete status
      this.broadcast({
        type: MSG.BATCH_QUEUE_PROGRESS,
        payload: {
          event: 'queue-complete',
          status: this.getQueueStatus(),
        },
      });
      return;
    }

    this.currentIndex = nextIndex;
    const item = this.queue[this.currentIndex];

    log.info('Processing queue item', {
      index: this.currentIndex,
      url: item.url,
      attempt: item.retries + 1,
    });

    // Mark as running
    item.status = 'running';
    item.startedAt = Date.now();
    await this.persistQueue();
    this.broadcastStatus();

    // Broadcast individual progress
    this.broadcast({
      type: MSG.BATCH_QUEUE_PROGRESS,
      payload: {
        event: 'scrape-start',
        url: item.url,
        index: this.currentIndex,
        total: this.queue.length,
      },
    });

    try {
      const config: ScrapeConfig = {
        ...this.baseConfig!,
        targetUrl: item.url,
      };

      const result = await this.scrapeFn(config);

      // Mark as completed
      item.status = 'completed';
      item.completedAt = Date.now();
      item.result = result;

      log.info('Queue item completed', {
        url: item.url,
        duration: item.completedAt - (item.startedAt || 0),
      });

      this.broadcast({
        type: MSG.BATCH_QUEUE_PROGRESS,
        payload: {
          event: 'scrape-complete',
          url: item.url,
          index: this.currentIndex,
          total: this.queue.length,
          result,
        },
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error('Queue item failed', { url: item.url, error: errorMessage, retries: item.retries });

      if (item.retries < MAX_RETRIES) {
        // Retry
        item.retries++;
        item.status = 'pending';
        item.error = `Attempt ${item.retries} failed: ${errorMessage}`;

        log.info('Retrying queue item', { url: item.url, retry: item.retries });

        this.broadcast({
          type: MSG.BATCH_QUEUE_PROGRESS,
          payload: {
            event: 'scrape-retry',
            url: item.url,
            retry: item.retries,
            error: errorMessage,
          },
        });
      } else {
        // Max retries exceeded
        item.status = 'failed';
        item.completedAt = Date.now();
        item.error = `Failed after ${MAX_RETRIES + 1} attempts: ${errorMessage}`;

        log.error('Queue item permanently failed', { url: item.url, error: item.error });

        this.broadcast({
          type: MSG.BATCH_QUEUE_PROGRESS,
          payload: {
            event: 'scrape-failed',
            url: item.url,
            error: item.error,
          },
        });
      }
    }

    await this.persistQueue();
    this.broadcastStatus();

    // Rate limit: wait minimum delay before next scrape
    await this.delay(MIN_DELAY_BETWEEN_SCRAPES_MS);

    // Process next item
    if (this.isRunning && !this.isPaused) {
      await this.processNext();
    }
  }

  private normalizeUrl(url: string): string | null {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      const parsed = new URL(url);
      return parsed.href;
    } catch {
      return null;
    }
  }

  private async persistQueue(): Promise<void> {
    try {
      // Persist queue state without full scrape results (too large)
      const persistable = this.queue.map(item => ({
        url: item.url,
        status: item.status,
        retries: item.retries,
        error: item.error,
        startedAt: item.startedAt,
        completedAt: item.completedAt,
        // Omit result to save storage space
      }));

      await chrome.storage.local.set({
        [QUEUE_STORAGE_KEY]: {
          items: persistable,
          baseConfig: this.baseConfig,
          isRunning: this.isRunning,
          isPaused: this.isPaused,
        },
      });
    } catch (err) {
      log.warn('Failed to persist queue', err);
    }
  }

  private async restoreQueue(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(QUEUE_STORAGE_KEY);
      const data = stored[QUEUE_STORAGE_KEY];

      if (data && data.items && Array.isArray(data.items)) {
        this.queue = data.items.map((item: BatchQueueItem) => ({
          ...item,
          // Mark previously running items as pending (service worker restarted)
          status: item.status === 'running' ? 'pending' : item.status,
        }));

        this.baseConfig = data.baseConfig || null;

        // Don't auto-resume - let user manually restart
        this.isRunning = false;
        this.isPaused = false;

        log.info('Queue restored from storage', {
          total: this.queue.length,
          pending: this.queue.filter(i => i.status === 'pending').length,
          completed: this.queue.filter(i => i.status === 'completed').length,
        });
      }
    } catch (err) {
      log.warn('Failed to restore queue from storage', err);
    }
  }

  private broadcastStatus(): void {
    this.broadcast({
      type: MSG.BATCH_QUEUE_STATUS,
      payload: this.getQueueStatus(),
    });
  }

  private broadcast(msg: { type: string; payload: unknown }): void {
    chrome.runtime.sendMessage(msg).catch(() => {
      // Side panel may not be open
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
