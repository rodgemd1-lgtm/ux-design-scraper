import { createLogger } from '@shared/logger';
import { STORAGE_KEYS } from '@shared/constants';
import type {
  AppSettings,
  ExaSearchResult,
  ExaSearchOptions,
} from '@shared/types';

const log = createLogger('ExaMCPClient');

const EXA_API_BASE = 'https://api.exa.ai';

export class ExaMCPClient {
  private apiKey: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.exaApiKey) {
        this.apiKey = settings.exaApiKey;
        this.initialized = true;
        log.info('API key loaded');
      } else {
        log.warn('No Exa API key found in settings');
      }
    } catch (err) {
      log.error('Failed to load API key', err);
    }
  }

  private async ensureApiKey(): Promise<void> {
    if (!this.initialized || !this.apiKey) {
      await this.loadApiKey();
    }
    if (!this.apiKey) {
      throw new Error('Exa API key not configured. Please set it in Settings.');
    }
  }

  async searchUXPatterns(query: string, options?: ExaSearchOptions): Promise<ExaSearchResult[]> {
    await this.ensureApiKey();
    log.info('Searching UX patterns', { query });

    const numResults = options?.numResults || 10;
    const body: Record<string, unknown> = {
      query,
      numResults,
      type: 'neural',
      useAutoprompt: true,
      contents: {
        text: options?.includeText !== false ? { maxCharacters: 2000 } : undefined,
        highlights: { numSentences: 3 },
      },
    };

    if (options?.startDate) body.startPublishedDate = options.startDate;
    if (options?.endDate) body.endPublishedDate = options.endDate;
    if (options?.category) body.category = options.category;

    const response = await fetch(`${EXA_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Exa API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const results: ExaSearchResult[] = (data.results || []).map((item: Record<string, unknown>) => ({
      url: (item.url as string) || '',
      title: (item.title as string) || '',
      publishedDate: item.publishedDate as string | undefined,
      author: item.author as string | undefined,
      text: item.text as string | undefined,
      highlights: item.highlights as string[] | undefined,
      score: (item.score as number) || 0,
    }));

    log.info('UX pattern search complete', { query, resultCount: results.length });
    return results;
  }

  async findSimilarDesigns(referenceUrl: string): Promise<ExaSearchResult[]> {
    await this.ensureApiKey();
    log.info('Finding similar designs', { referenceUrl });

    const response = await fetch(`${EXA_API_BASE}/findSimilar`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        url: referenceUrl,
        numResults: 5,
        contents: {
          text: { maxCharacters: 1000 },
          highlights: { numSentences: 2 },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Exa findSimilar error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const results: ExaSearchResult[] = (data.results || []).map((item: Record<string, unknown>) => ({
      url: (item.url as string) || '',
      title: (item.title as string) || '',
      publishedDate: item.publishedDate as string | undefined,
      author: item.author as string | undefined,
      text: item.text as string | undefined,
      highlights: item.highlights as string[] | undefined,
      score: (item.score as number) || 0,
    }));

    log.info('Similar designs found', { referenceUrl, resultCount: results.length });
    return results;
  }

  async searchCompetitorIntelligence(competitor: string, topic: string): Promise<ExaSearchResult[]> {
    await this.ensureApiKey();
    log.info('Searching competitor intelligence', { competitor, topic });

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const startDate = ninetyDaysAgo.toISOString().split('T')[0];

    return this.searchUXPatterns(`${competitor} ${topic}`, {
      numResults: 10,
      startDate,
      includeText: true,
    });
  }
}
