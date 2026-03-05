import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, STORAGE_KEYS } from '@shared/constants';
import type { AppSettings, BraveSearchResult, BraveSearchResponse } from '@shared/types';

const log = createLogger('BraveSearch');

export class BraveSearchClient {
  private apiKey: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.braveApiKey) {
        this.apiKey = settings.braveApiKey;
        this.initialized = true;
        log.info('API key loaded');
      } else {
        log.warn('No Brave Search API key found in settings');
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
      throw new Error('Brave Search API key not configured. Please set it in Settings.');
    }
  }

  async search(query: string, count: number = 10): Promise<BraveSearchResponse> {
    await this.ensureApiKey();

    log.info('Searching', { query, count });

    const params = new URLSearchParams({
      q: query,
      count: String(count),
      search_lang: 'en',
    });

    const url = `${API_ENDPOINTS.BRAVE_SEARCH}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Brave Search API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    const results: BraveSearchResult[] = [];

    if (data.web?.results) {
      for (const item of data.web.results) {
        results.push({
          title: item.title || '',
          url: item.url || '',
          description: item.description || '',
          thumbnail: item.thumbnail?.src || undefined,
          age: item.age || undefined,
        });
      }
    }

    const searchResponse: BraveSearchResponse = {
      query,
      results,
      totalResults: data.web?.totalResults || results.length,
    };

    log.info('Search complete', { query, resultCount: results.length });

    return searchResponse;
  }

  async searchDesignInspiration(goal: string, industry: string): Promise<BraveSearchResponse> {
    await this.ensureApiKey();

    const year = new Date().getFullYear();

    const queries = [
      `${industry} best website design ${year}`,
      `${goal} UX design inspiration examples`,
      `luxury premium website design ${industry}`,
    ];

    log.info('Running design inspiration searches', { queries });

    const searchPromises = queries.map(q => this.search(q, 10));
    const searchResults = await Promise.allSettled(searchPromises);

    const allResults: BraveSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        for (const item of result.value.results) {
          const normalizedUrl = item.url.replace(/\/$/, '').toLowerCase();
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allResults.push(item);
          }
        }
      } else {
        log.warn('One search query failed', result.reason);
      }
    }

    log.info('Design inspiration search complete', { totalUniqueResults: allResults.length });

    return {
      query: queries.join(' | '),
      results: allResults,
      totalResults: allResults.length,
    };
  }

  async searchCompetitors(competitors: string[]): Promise<BraveSearchResponse> {
    await this.ensureApiKey();

    log.info('Searching competitors', { competitors });

    const searchPromises = competitors.map(competitor =>
      this.search(`${competitor} website design UI UX`, 5)
    );

    const searchResults = await Promise.allSettled(searchPromises);

    const allResults: BraveSearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const result of searchResults) {
      if (result.status === 'fulfilled') {
        for (const item of result.value.results) {
          const normalizedUrl = item.url.replace(/\/$/, '').toLowerCase();
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allResults.push(item);
          }
        }
      } else {
        log.warn('Competitor search failed', result.reason);
      }
    }

    log.info('Competitor search complete', { totalUniqueResults: allResults.length });

    return {
      query: competitors.join(', '),
      results: allResults,
      totalResults: allResults.length,
    };
  }
}
