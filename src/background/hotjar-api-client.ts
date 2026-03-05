import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, STORAGE_KEYS } from '@shared/constants';
import type { AppSettings, HeatmapData } from '@shared/types';

const log = createLogger('HotjarAPI');

interface HotjarHeatmapResponse {
  id: number;
  name: string;
  url: string;
  created: string;
  status: string;
  heatmap_type: string;
  data?: unknown;
}

interface HotjarRecordingResponse {
  id: number;
  user_id: string;
  created: string;
  duration: number;
  pages: string[];
  device: string;
  country: string;
}

export class HotjarAPIClient {
  private apiKey: string = '';
  private siteId: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadCredentials();
  }

  private async loadCredentials(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.hotjarApiKey && settings?.hotjarSiteId) {
        this.apiKey = settings.hotjarApiKey;
        this.siteId = settings.hotjarSiteId;
        this.initialized = true;
        log.info('Credentials loaded');
      } else {
        log.warn('No Hotjar API credentials found in settings');
      }
    } catch (err) {
      log.error('Failed to load credentials', err);
    }
  }

  private async ensureCredentials(): Promise<void> {
    if (!this.initialized || !this.apiKey) {
      await this.loadCredentials();
    }
    if (!this.apiKey || !this.siteId) {
      throw new Error('Hotjar API credentials not configured. Please set API key and site ID in Settings.');
    }
  }

  private async apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${API_ENDPOINTS.HOTJAR_API}${path}`;

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
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
      throw new Error(`Hotjar API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  async testConnection(): Promise<boolean> {
    await this.ensureCredentials();

    try {
      await this.apiRequest<unknown>('GET', '/me');
      log.info('Hotjar connection verified');
      return true;
    } catch (err) {
      log.error('Hotjar connection test failed', err);
      return false;
    }
  }

  async getHeatmaps(siteId?: string, pageUrl?: string): Promise<HeatmapData[]> {
    await this.ensureCredentials();

    const targetSiteId = siteId || this.siteId;
    log.info('Fetching heatmaps', { siteId: targetSiteId, pageUrl });

    let path = `/sites/${targetSiteId}/heatmaps`;
    if (pageUrl) {
      path += `?url=${encodeURIComponent(pageUrl)}`;
    }

    try {
      const heatmaps = await this.apiRequest<HotjarHeatmapResponse[]>('GET', path);

      const results: HeatmapData[] = heatmaps.map(hm => ({
        type: this.mapHotjarHeatmapType(hm.heatmap_type),
        source: 'hotjar_api' as const,
        pageUrl: hm.url,
        data: {
          id: hm.id,
          name: hm.name,
          created: hm.created,
          status: hm.status,
          heatmapType: hm.heatmap_type,
          rawData: hm.data,
        },
      }));

      log.info('Heatmaps fetched', { count: results.length });
      return results;
    } catch (err) {
      log.error('Failed to fetch heatmaps', err);
      throw err;
    }
  }

  async getRecordings(siteId?: string): Promise<HotjarRecordingResponse[]> {
    await this.ensureCredentials();

    const targetSiteId = siteId || this.siteId;
    log.info('Fetching recordings', { siteId: targetSiteId });

    try {
      const recordings = await this.apiRequest<HotjarRecordingResponse[]>(
        'GET',
        `/sites/${targetSiteId}/recordings`
      );

      log.info('Recordings fetched', { count: recordings.length });
      return recordings;
    } catch (err) {
      log.error('Failed to fetch recordings', err);
      throw err;
    }
  }

  private mapHotjarHeatmapType(heatmapType: string): HeatmapData['type'] {
    switch (heatmapType.toLowerCase()) {
      case 'click':
      case 'clicks':
        return 'click';
      case 'scroll':
      case 'scrolls':
        return 'scroll';
      case 'move':
      case 'moves':
      case 'movement':
        return 'movement';
      default:
        return 'attention';
    }
  }
}
