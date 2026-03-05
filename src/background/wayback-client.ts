import { createLogger } from '@shared/logger';
import { API_ENDPOINTS } from '@shared/constants';
import type { WaybackSnapshot } from '@shared/types';

const log = createLogger('WaybackClient');

export class WaybackClient {
  async fetchSnapshots(url: string, limit: number = 10): Promise<WaybackSnapshot[]> {
    log.info('Fetching Wayback Machine snapshots', { url, limit });

    const params = new URLSearchParams({
      url,
      output: 'json',
      limit: String(limit),
      fl: 'timestamp,original,statuscode',
    });

    const cdxUrl = `${API_ENDPOINTS.WAYBACK_CDX}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(cdxUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    } catch (err) {
      log.error('Failed to fetch Wayback CDX API', err);
      throw new Error(`Wayback Machine CDX API request failed: ${err}`);
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log.error('Wayback CDX API error', { status: response.status, body: errorText });
      throw new Error(`Wayback Machine CDX API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // CDX API returns array of arrays; first row is headers
    if (!Array.isArray(data) || data.length < 2) {
      log.info('No Wayback snapshots found', { url });
      return [];
    }

    const snapshots: WaybackSnapshot[] = [];

    // Skip the header row (index 0)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!Array.isArray(row) || row.length < 3) continue;

      const [timestamp, original, statusCode] = row;

      // Only include successful snapshots
      if (String(statusCode) !== '200') continue;

      const waybackUrl = `${API_ENDPOINTS.WAYBACK_WEB}/${timestamp}/${original}`;

      snapshots.push({
        timestamp: String(timestamp),
        url: String(original),
        waybackUrl,
        thumbnail: `${API_ENDPOINTS.WAYBACK_WEB}/${timestamp}im_/${original}`,
      });
    }

    log.info('Wayback snapshots fetched', { url, count: snapshots.length });

    return snapshots;
  }
}
