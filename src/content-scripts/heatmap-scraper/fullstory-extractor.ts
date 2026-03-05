/**
 * FullStory Dashboard Extractor
 * Scrapes heatmap and session replay data from FullStory dashboard pages.
 * Extracts heatmap overlays, rage clicks, and dead click markers.
 */

import type { HeatmapData } from '@shared/types';

interface FullStoryHeatmapResult {
  heatmaps: HeatmapData[];
  rageClicks: { x: number; y: number; count: number; element: string }[];
  deadClicks: { x: number; y: number; element: string }[];
  pageUrl: string;
}

/**
 * Detect if the current page is a FullStory dashboard.
 */
export function isFullStoryDashboard(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes('fullstory.com') ||
    hostname.includes('app.fullstory.com') ||
    hostname === 'app.fullstory.com'
  );
}

/**
 * Extract heatmap and interaction data from the FullStory dashboard.
 */
export async function extractFullStoryHeatmaps(): Promise<FullStoryHeatmapResult> {
  const heatmaps: HeatmapData[] = [];
  const rageClicks: { x: number; y: number; count: number; element: string }[] = [];
  const deadClicks: { x: number; y: number; element: string }[] = [];
  const pageUrl = extractPageUrl();

  // Wait for content to render
  await waitForContent();

  // 1. Extract canvas-based heatmaps
  const canvasData = extractCanvasData(pageUrl);
  heatmaps.push(...canvasData);

  // 2. Extract session replay overlay data
  const overlayData = extractOverlayData(pageUrl);
  heatmaps.push(...overlayData);

  // 3. Extract rage click markers
  const rageClickData = extractRageClicks();
  rageClicks.push(...rageClickData);

  // 4. Extract dead click markers
  const deadClickData = extractDeadClicks();
  deadClicks.push(...deadClickData);

  // 5. If we found rage/dead click data, create a heatmap entry for them
  if (rageClicks.length > 0) {
    heatmaps.push({
      type: 'click',
      source: 'dom_scrape',
      pageUrl,
      data: {
        sourceType: 'rage-clicks',
        rageClicks,
        count: rageClicks.length,
      },
    });
  }

  if (deadClicks.length > 0) {
    heatmaps.push({
      type: 'click',
      source: 'dom_scrape',
      pageUrl,
      data: {
        sourceType: 'dead-clicks',
        deadClicks,
        count: deadClicks.length,
      },
    });
  }

  return { heatmaps, rageClicks, deadClicks, pageUrl };
}

function extractPageUrl(): string {
  // Try to find the analyzed page URL from the FullStory dashboard
  const urlSelectors = [
    '[class*="page-url"]',
    '[class*="PageUrl"]',
    '[data-testid*="url"]',
    '[class*="session-url"]',
    '[class*="visited-page"]',
    'a[class*="page-link"]',
  ];

  for (const selector of urlSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = (el.textContent || '').trim();
        const href = (el as HTMLAnchorElement).href;
        if (text.startsWith('http') || text.startsWith('/')) return text;
        if (href && !href.includes('fullstory.com')) return href;
      }
    } catch {
      continue;
    }
  }

  return window.location.href;
}

async function waitForContent(timeout: number = 10000): Promise<void> {
  const startTime = Date.now();

  return new Promise<void>((resolve) => {
    const check = () => {
      const hasCanvas = document.querySelector('canvas') !== null;
      const hasReplay = document.querySelector(
        '[class*="replay"], [class*="session"], [class*="heatmap"], iframe[class*="replay"]'
      ) !== null;

      if (hasCanvas || hasReplay || Date.now() - startTime > timeout) {
        // Give extra time for rendering
        setTimeout(resolve, 1000);
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

function extractCanvasData(pageUrl: string): HeatmapData[] {
  const heatmaps: HeatmapData[] = [];
  const canvasElements = document.querySelectorAll('canvas');

  for (const canvas of Array.from(canvasElements)) {
    try {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 200) continue;

      // Check if canvas is in a heatmap/replay container
      const container = canvas.closest(
        '[class*="heatmap" i], [class*="replay" i], [class*="session" i], [class*="recording" i]'
      );

      if (!container && rect.width < 400) continue;

      const dataUrl = canvas.toDataURL('image/png');

      heatmaps.push({
        type: 'click',
        source: 'dom_scrape',
        pageUrl,
        data: {
          width: canvas.width,
          height: canvas.height,
          sourceType: 'canvas',
          context: container ? 'heatmap-container' : 'standalone',
        },
        imageDataUrl: dataUrl,
      });
    } catch {
      // Canvas may be tainted
      continue;
    }
  }

  return heatmaps;
}

function extractOverlayData(pageUrl: string): HeatmapData[] {
  const heatmaps: HeatmapData[] = [];

  // FullStory may render heatmap overlays as SVG or absolute-positioned elements
  const overlaySelectors = [
    '[class*="click-overlay"]',
    '[class*="ClickOverlay"]',
    '[class*="heatmap-layer"]',
    '[class*="HeatmapLayer"]',
    '[class*="interaction-overlay"]',
    'svg[class*="overlay"]',
  ];

  for (const selector of overlaySelectors) {
    try {
      const overlays = document.querySelectorAll(selector);
      for (const overlay of Array.from(overlays)) {
        const rect = overlay.getBoundingClientRect();
        if (rect.width < 200 || rect.height < 200) continue;

        // If it's an SVG, serialize it
        if (overlay.tagName === 'svg' || overlay.querySelector('svg')) {
          const svg = overlay.tagName === 'svg' ? overlay : overlay.querySelector('svg')!;
          const svgContent = new XMLSerializer().serializeToString(svg);
          const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

          heatmaps.push({
            type: 'click',
            source: 'dom_scrape',
            pageUrl,
            data: {
              width: rect.width,
              height: rect.height,
              sourceType: 'svg-overlay',
            },
            imageDataUrl: dataUrl,
          });
        } else {
          // Capture the overlay element and its children as heatmap data
          const clickPoints = extractClickPointsFromOverlay(overlay);

          if (clickPoints.length > 0) {
            heatmaps.push({
              type: 'click',
              source: 'dom_scrape',
              pageUrl,
              data: {
                width: rect.width,
                height: rect.height,
                sourceType: 'dom-overlay',
                clickPoints,
              },
            });
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Also check for iframe-based replays
  const iframes = document.querySelectorAll('iframe[class*="replay"], iframe[class*="session"]');
  for (const iframe of Array.from(iframes)) {
    try {
      const rect = iframe.getBoundingClientRect();
      if (rect.width < 200 || rect.height < 200) continue;

      heatmaps.push({
        type: 'click',
        source: 'dom_scrape',
        pageUrl,
        data: {
          width: rect.width,
          height: rect.height,
          sourceType: 'replay-iframe',
          note: 'Cross-origin iframe content cannot be directly extracted',
        },
      });
    } catch {
      continue;
    }
  }

  return heatmaps;
}

function extractClickPointsFromOverlay(overlay: Element): { x: number; y: number; intensity: number }[] {
  const points: { x: number; y: number; intensity: number }[] = [];
  const overlayRect = overlay.getBoundingClientRect();

  // Look for individual click markers within the overlay
  const markers = overlay.querySelectorAll(
    '[class*="click"], [class*="marker"], [class*="point"], [class*="dot"], circle, [class*="Click"]'
  );

  for (const marker of Array.from(markers)) {
    try {
      const markerRect = marker.getBoundingClientRect();
      const x = markerRect.left - overlayRect.left + markerRect.width / 2;
      const y = markerRect.top - overlayRect.top + markerRect.height / 2;
      const style = window.getComputedStyle(marker);
      const opacity = parseFloat(style.opacity || '1');
      const size = Math.max(markerRect.width, markerRect.height);

      points.push({
        x: Math.round(x),
        y: Math.round(y),
        intensity: opacity * (size / 20),
      });
    } catch {
      continue;
    }
  }

  return points;
}

function extractRageClicks(): { x: number; y: number; count: number; element: string }[] {
  const rageClicks: { x: number; y: number; count: number; element: string }[] = [];

  // FullStory marks rage clicks with specific classes/attributes
  const rageSelectors = [
    '[class*="rage-click"]',
    '[class*="RageClick"]',
    '[class*="rage_click"]',
    '[data-rage-click]',
    '[class*="frustrated"]',
    '[class*="frustration"]',
  ];

  for (const selector of rageSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        const rect = el.getBoundingClientRect();
        const countAttr = el.getAttribute('data-count') || el.getAttribute('data-rage-count');
        const count = countAttr ? parseInt(countAttr, 10) : 1;

        rageClicks.push({
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          count: isNaN(count) ? 1 : count,
          element: el.getAttribute('data-element') || el.getAttribute('data-selector') ||
                   (el.textContent || '').trim().slice(0, 50),
        });
      }
    } catch {
      continue;
    }
  }

  // Also check for rage click indicators in lists/tables
  const listSelectors = [
    'table[class*="rage"] tr',
    '[class*="rage-list"] li',
    '[class*="RageClick"] [class*="item"]',
  ];

  for (const selector of listSelectors) {
    try {
      const items = document.querySelectorAll(selector);
      for (const item of Array.from(items)) {
        const text = (item.textContent || '').trim();
        if (text) {
          // Try to extract count from text
          const countMatch = text.match(/(\d+)\s*(?:clicks?|times?|x)/i);
          const count = countMatch ? parseInt(countMatch[1], 10) : 1;

          rageClicks.push({
            x: 0,
            y: 0,
            count: isNaN(count) ? 1 : count,
            element: text.slice(0, 100),
          });
        }
      }
    } catch {
      continue;
    }
  }

  return rageClicks;
}

function extractDeadClicks(): { x: number; y: number; element: string }[] {
  const deadClicks: { x: number; y: number; element: string }[] = [];

  const deadClickSelectors = [
    '[class*="dead-click"]',
    '[class*="DeadClick"]',
    '[class*="dead_click"]',
    '[data-dead-click]',
    '[class*="unresponsive"]',
  ];

  for (const selector of deadClickSelectors) {
    try {
      const elements = document.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        const rect = el.getBoundingClientRect();

        deadClicks.push({
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          element: el.getAttribute('data-element') || el.getAttribute('data-selector') ||
                   (el.textContent || '').trim().slice(0, 50),
        });
      }
    } catch {
      continue;
    }
  }

  // Check lists/tables for dead click data
  const listSelectors = [
    'table[class*="dead"] tr',
    '[class*="dead-list"] li',
    '[class*="DeadClick"] [class*="item"]',
  ];

  for (const selector of listSelectors) {
    try {
      const items = document.querySelectorAll(selector);
      for (const item of Array.from(items)) {
        const text = (item.textContent || '').trim();
        if (text) {
          deadClicks.push({
            x: 0,
            y: 0,
            element: text.slice(0, 100),
          });
        }
      }
    } catch {
      continue;
    }
  }

  return deadClicks;
}
