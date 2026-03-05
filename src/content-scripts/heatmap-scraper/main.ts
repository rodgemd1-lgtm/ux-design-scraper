/**
 * Heatmap Scraper Entry Point
 * Content script injected into Hotjar/FullStory dashboard pages.
 * Listens for SCRAPE_HEATMAPS_DOM messages, detects which dashboard
 * is active, extracts heatmap data, and sends results back.
 */

import { isHotjarDashboard, extractHotjarHeatmaps } from './hotjar-extractor';
import { isFullStoryDashboard, extractFullStoryHeatmaps } from './fullstory-extractor';

// Message type constants (inline to avoid import issues)
const MSG_SCRAPE_HEATMAPS_DOM = 'SCRAPE_HEATMAPS_DOM';
const MSG_HEATMAP_DATA = 'HEATMAP_DATA';

interface HeatmapScrapeMessage {
  type: string;
  payload?: {
    targetUrl?: string;
  };
}

function log(message: string, data?: unknown): void {
  const prefix = '%c[UXScraper:HeatmapScraper]';
  const style = 'color: #4c6ef5; font-weight: bold;';
  if (data !== undefined) {
    console.log(prefix, style, message, data);
  } else {
    console.log(prefix, style, message);
  }
}

function logError(message: string, data?: unknown): void {
  const prefix = '%c[UXScraper:HeatmapScraper]';
  const style = 'color: #e03131; font-weight: bold;';
  if (data !== undefined) {
    console.error(prefix, style, message, data);
  } else {
    console.error(prefix, style, message);
  }
}

/**
 * Detect which analytics dashboard we are on.
 */
function detectDashboard(): 'hotjar' | 'fullstory' | 'unknown' {
  if (isHotjarDashboard()) return 'hotjar';
  if (isFullStoryDashboard()) return 'fullstory';
  return 'unknown';
}

/**
 * Handle the scrape request.
 */
async function handleScrapeRequest(targetUrl?: string): Promise<void> {
  const dashboard = detectDashboard();
  log(`Detected dashboard: ${dashboard}`);

  if (dashboard === 'unknown') {
    chrome.runtime.sendMessage({
      type: MSG_HEATMAP_DATA,
      payload: {
        success: false,
        error: 'Not on a recognized analytics dashboard (Hotjar or FullStory)',
        data: [],
      },
    });
    return;
  }

  try {
    if (dashboard === 'hotjar') {
      const result = await extractHotjarHeatmaps();
      log(`Extracted ${result.heatmaps.length} heatmaps from Hotjar`, result);

      chrome.runtime.sendMessage({
        type: MSG_HEATMAP_DATA,
        payload: {
          success: true,
          dashboard: 'hotjar',
          pageUrl: result.pageUrl,
          data: result.heatmaps,
        },
      });
    } else if (dashboard === 'fullstory') {
      const result = await extractFullStoryHeatmaps();
      log(`Extracted ${result.heatmaps.length} heatmaps from FullStory`, {
        heatmaps: result.heatmaps.length,
        rageClicks: result.rageClicks.length,
        deadClicks: result.deadClicks.length,
      });

      chrome.runtime.sendMessage({
        type: MSG_HEATMAP_DATA,
        payload: {
          success: true,
          dashboard: 'fullstory',
          pageUrl: result.pageUrl,
          data: result.heatmaps,
          rageClicks: result.rageClicks,
          deadClicks: result.deadClicks,
        },
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('Failed to extract heatmap data', errorMessage);

    chrome.runtime.sendMessage({
      type: MSG_HEATMAP_DATA,
      payload: {
        success: false,
        error: errorMessage,
        dashboard,
        data: [],
      },
    });
  }
}

/**
 * Listen for messages from the background service worker.
 */
chrome.runtime.onMessage.addListener(
  (message: HeatmapScrapeMessage, _sender, sendResponse) => {
    if (message.type === MSG_SCRAPE_HEATMAPS_DOM) {
      log('Received SCRAPE_HEATMAPS_DOM request');
      handleScrapeRequest(message.payload?.targetUrl)
        .then(() => {
          sendResponse({ received: true });
        })
        .catch((err) => {
          logError('Error handling scrape request', err);
          sendResponse({ received: false, error: String(err) });
        });

      // Return true to indicate async response
      return true;
    }
  }
);

// Log that the heatmap scraper is loaded
log('Heatmap scraper content script loaded');

// Notify background that heatmap scraper is ready
chrome.runtime.sendMessage({
  type: 'HEATMAP_SCRAPER_READY',
  payload: {
    dashboard: detectDashboard(),
    url: window.location.href,
  },
}).catch(() => {
  // Background may not be listening yet
});
