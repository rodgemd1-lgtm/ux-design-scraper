import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, STORAGE_KEYS } from '@shared/constants';
import type { AppSettings, HeatmapData } from '@shared/types';

const log = createLogger('FullStoryAPI');

interface FullStorySession {
  sessionId: string;
  userId: string;
  createdTime: string;
  duration: number;
  pagesVisited: number;
  device: string;
  browser: string;
  location: string;
  sessionUrl: string;
}

interface FullStorySearchResponse {
  sessions: FullStorySession[];
  totalCount: number;
}

export class FullStoryAPIClient {
  private apiKey: string = '';
  private orgId: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadCredentials();
  }

  private async loadCredentials(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.fullstoryApiKey && settings?.fullstoryOrgId) {
        this.apiKey = settings.fullstoryApiKey;
        this.orgId = settings.fullstoryOrgId;
        this.initialized = true;
        log.info('Credentials loaded');
      } else {
        log.warn('No FullStory API credentials found in settings');
      }
    } catch (err) {
      log.error('Failed to load credentials', err);
    }
  }

  private async ensureCredentials(): Promise<void> {
    if (!this.initialized || !this.apiKey) {
      await this.loadCredentials();
    }
    if (!this.apiKey || !this.orgId) {
      throw new Error('FullStory API credentials not configured. Please set API key and org ID in Settings.');
    }
  }

  private getAuthHeader(): string {
    // FullStory uses Basic auth with apiKey as the username and empty password
    const encoded = btoa(`${this.apiKey}:`);
    return `Basic ${encoded}`;
  }

  private async apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${API_ENDPOINTS.FULLSTORY_API}${path}`;

    const headers: Record<string, string> = {
      'Authorization': this.getAuthHeader(),
      'Accept': 'application/json',
    };

    const options: RequestInit = { method, headers };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`FullStory API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    await this.ensureCredentials();

    try {
      // FullStory v2 API: use a simple endpoint to verify connectivity
      await this.apiRequest<unknown>('GET', '/users?limit=1');
      log.info('FullStory connection verified');
      return true;
    } catch (err) {
      log.error('FullStory connection test failed', err);
      return false;
    }
  }

  async searchSessions(orgId?: string, url?: string): Promise<HeatmapData[]> {
    await this.ensureCredentials();

    const targetOrgId = orgId || this.orgId;
    log.info('Searching FullStory sessions', { orgId: targetOrgId, url });

    const searchBody: Record<string, unknown> = {
      limit: 20,
      filter: {
        type: 'and',
        filters: [] as unknown[],
      },
    };

    if (url) {
      (searchBody.filter as { filters: unknown[] }).filters.push({
        type: 'visited_url',
        operator: 'contains',
        value: url,
      });
    }

    try {
      const searchResult = await this.apiRequest<FullStorySearchResponse>(
        'POST',
        '/sessions/search',
        searchBody
      );

      const results: HeatmapData[] = searchResult.sessions.map(session => ({
        type: 'click' as const,
        source: 'fullstory_api' as const,
        pageUrl: url || '',
        data: {
          sessionId: session.sessionId,
          userId: session.userId,
          createdTime: session.createdTime,
          duration: session.duration,
          pagesVisited: session.pagesVisited,
          device: session.device,
          browser: session.browser,
          location: session.location,
          sessionUrl: session.sessionUrl,
        },
      }));

      log.info('FullStory sessions found', { count: results.length, total: searchResult.totalCount });
      return results;
    } catch (err) {
      log.error('Failed to search FullStory sessions', err);
      throw err;
    }
  }

  async getHeatmapData(orgId?: string, url?: string): Promise<HeatmapData[]> {
    await this.ensureCredentials();

    const targetOrgId = orgId || this.orgId;
    log.info('Fetching FullStory heatmap data', { orgId: targetOrgId, url });

    try {
      // FullStory heatmap data endpoint — may not be available in all plans
      let path = '/heatmaps';
      if (url) {
        path += `?url=${encodeURIComponent(url)}`;
      }

      const heatmapResult = await this.apiRequest<{
        heatmaps: {
          id: string;
          url: string;
          type: string;
          data: unknown;
          imageUrl?: string;
        }[];
      }>('GET', path);

      const results: HeatmapData[] = heatmapResult.heatmaps.map(hm => ({
        type: this.mapFullStoryHeatmapType(hm.type),
        source: 'fullstory_api' as const,
        pageUrl: hm.url,
        data: hm.data,
        imageDataUrl: hm.imageUrl,
      }));

      log.info('FullStory heatmap data fetched', { count: results.length });
      return results;
    } catch (err) {
      log.warn('FullStory heatmap endpoint not available, falling back to session search', err);
      // Heatmap endpoint may not be available; fall back to session search
      return this.searchSessions(targetOrgId, url);
    }
  }

  private mapFullStoryHeatmapType(type: string): HeatmapData['type'] {
    switch (type.toLowerCase()) {
      case 'click':
      case 'clicks':
        return 'click';
      case 'scroll':
        return 'scroll';
      case 'movement':
      case 'move':
        return 'movement';
      default:
        return 'attention';
    }
  }
}
