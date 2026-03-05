/**
 * Hotjar Dashboard Extractor
 * Scrapes heatmap visualizations from Hotjar dashboard pages.
 * Extracts click maps, scroll maps, and move maps from the dashboard DOM.
 */

import type { HeatmapData } from '@shared/types';

interface HotjarHeatmapResult {
  heatmaps: HeatmapData[];
  pageUrl: string;
}

/**
 * Detect if the current page is a Hotjar dashboard.
 */
export function isHotjarDashboard(): boolean {
  const hostname = window.location.hostname;
  return (
    hostname.includes('hotjar.com') ||
    hostname.includes('insights.hotjar.com') ||
    hostname === 'insights.hotjar.com'
  );
}

/**
 * Extract heatmap data from the Hotjar dashboard page.
 */
export async function extractHotjarHeatmaps(): Promise<HotjarHeatmapResult> {
  const heatmaps: HeatmapData[] = [];
  const pageUrl = extractPageUrl();

  // Wait for heatmap to render
  await waitForHeatmapRender();

  // 1. Extract canvas-based heatmaps
  const canvasHeatmaps = extractCanvasHeatmaps(pageUrl);
  heatmaps.push(...canvasHeatmaps);

  // 2. Extract SVG overlay heatmaps
  const svgHeatmaps = extractSVGOverlayHeatmaps(pageUrl);
  heatmaps.push(...svgHeatmaps);

  // 3. Extract the screenshot/page image underlying the heatmap
  const screenshotHeatmaps = extractScreenshotImages(pageUrl);
  heatmaps.push(...screenshotHeatmaps);

  // 4. Detect heatmap type from UI controls
  const heatmapType = detectHeatmapType();
  for (const heatmap of heatmaps) {
    if (heatmap.type === 'click') {
      heatmap.type = heatmapType;
    }
  }

  return { heatmaps, pageUrl };
}

function extractPageUrl(): string {
  // Try to find the page URL shown in the Hotjar dashboard
  const urlSelectors = [
    '[class*="page-url"]',
    '[class*="PageUrl"]',
    '[class*="heatmap-url"]',
    '[data-testid*="url"]',
    'h1', 'h2',
  ];

  for (const selector of urlSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = (el.textContent || '').trim();
        if (text.startsWith('http') || text.startsWith('/')) {
          return text;
        }
      }
    } catch {
      continue;
    }
  }

  // Fall back to current page URL
  return window.location.href;
}

async function waitForHeatmapRender(timeout: number = 10000): Promise<void> {
  const startTime = Date.now();

  return new Promise<void>((resolve) => {
    const check = () => {
      // Check if canvas or heatmap overlay exists
      const hasCanvas = document.querySelector('canvas') !== null;
      const hasSVG = document.querySelector('svg[class*="heatmap"], [class*="heatmap"] svg') !== null;
      const hasOverlay = document.querySelector('[class*="heatmap-overlay"], [class*="HeatmapOverlay"]') !== null;

      if (hasCanvas || hasSVG || hasOverlay || Date.now() - startTime > timeout) {
        resolve();
        return;
      }

      requestAnimationFrame(check);
    };

    check();
  });
}

function extractCanvasHeatmaps(pageUrl: string): HeatmapData[] {
  const heatmaps: HeatmapData[] = [];
  const canvasElements = document.querySelectorAll('canvas');

  for (const canvas of Array.from(canvasElements)) {
    try {
      const rect = canvas.getBoundingClientRect();
      // Skip tiny canvases (likely UI elements, not heatmaps)
      if (rect.width < 200 || rect.height < 200) continue;

      // Check if this canvas is inside a heatmap container
      const parent = canvas.parentElement;
      const isHeatmapCanvas = parent &&
        (parent.className.toString().toLowerCase().includes('heatmap') ||
         parent.className.toString().toLowerCase().includes('map') ||
         parent.closest('[class*="heatmap" i]') !== null);

      // Also include large canvases that could be heatmap renders
      if (!isHeatmapCanvas && rect.width < 400) continue;

      const dataUrl = canvas.toDataURL('image/png');

      heatmaps.push({
        type: 'click',
        source: 'dom_scrape',
        pageUrl,
        data: {
          width: canvas.width,
          height: canvas.height,
          sourceType: 'canvas',
        },
        imageDataUrl: dataUrl,
      });
    } catch {
      // Canvas may be tainted by cross-origin content
      continue;
    }
  }

  return heatmaps;
}

function extractSVGOverlayHeatmaps(pageUrl: string): HeatmapData[] {
  const heatmaps: HeatmapData[] = [];

  // Look for SVG overlays that represent heatmap data points
  const svgSelectors = [
    'svg[class*="heatmap"]',
    '[class*="heatmap"] svg',
    '[class*="HeatmapOverlay"] svg',
    'svg[class*="overlay"]',
    '[class*="click-map"] svg',
  ];

  for (const selector of svgSelectors) {
    try {
      const svgs = document.querySelectorAll(selector);
      for (const svg of Array.from(svgs)) {
        const rect = svg.getBoundingClientRect();
        if (rect.width < 200 || rect.height < 200) continue;

        // Serialize SVG to data URL
        const svgContent = new XMLSerializer().serializeToString(svg);
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

        // Extract click point data if available
        const circles = svg.querySelectorAll('circle, ellipse');
        const clickPoints: { x: number; y: number; intensity: number }[] = [];

        for (const circle of Array.from(circles)) {
          const cx = parseFloat(circle.getAttribute('cx') || '0');
          const cy = parseFloat(circle.getAttribute('cy') || '0');
          const r = parseFloat(circle.getAttribute('r') || '0');
          const opacity = parseFloat((circle as SVGElement).style.opacity || circle.getAttribute('opacity') || '1');

          clickPoints.push({
            x: cx,
            y: cy,
            intensity: opacity * (r / 10), // Rough intensity estimate
          });
        }

        heatmaps.push({
          type: 'click',
          source: 'dom_scrape',
          pageUrl,
          data: {
            width: rect.width,
            height: rect.height,
            sourceType: 'svg-overlay',
            clickPoints,
          },
          imageDataUrl: dataUrl,
        });
      }
    } catch {
      continue;
    }
  }

  return heatmaps;
}

function extractScreenshotImages(pageUrl: string): HeatmapData[] {
  const heatmaps: HeatmapData[] = [];

  // Look for the background screenshot image under the heatmap overlay
  const imgSelectors = [
    '[class*="heatmap"] img',
    '[class*="screenshot"] img',
    '[class*="page-image"] img',
    '[class*="PageScreenshot"] img',
    'img[class*="heatmap"]',
  ];

  for (const selector of imgSelectors) {
    try {
      const images = document.querySelectorAll(selector);
      for (const img of Array.from(images)) {
        const htmlImg = img as HTMLImageElement;
        const rect = htmlImg.getBoundingClientRect();
        if (rect.width < 200 || rect.height < 200) continue;

        // Try to get the image as data URL via canvas
        try {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = htmlImg.naturalWidth || rect.width;
          tempCanvas.height = htmlImg.naturalHeight || rect.height;
          const ctx = tempCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(htmlImg, 0, 0);
            const dataUrl = tempCanvas.toDataURL('image/png');

            heatmaps.push({
              type: 'click',
              source: 'dom_scrape',
              pageUrl,
              data: {
                width: tempCanvas.width,
                height: tempCanvas.height,
                sourceType: 'screenshot-image',
                originalSrc: htmlImg.src,
              },
              imageDataUrl: dataUrl,
            });
          }
        } catch {
          // Cross-origin image, just store the URL
          heatmaps.push({
            type: 'click',
            source: 'dom_scrape',
            pageUrl,
            data: {
              width: rect.width,
              height: rect.height,
              sourceType: 'screenshot-image',
              originalSrc: htmlImg.src,
            },
          });
        }
      }
    } catch {
      continue;
    }
  }

  return heatmaps;
}

function detectHeatmapType(): 'click' | 'scroll' | 'attention' | 'movement' {
  // Check the Hotjar UI for which heatmap type is selected
  const typeSelectors = [
    '[class*="heatmap-type"]',
    '[class*="HeatmapType"]',
    '[data-testid*="heatmap-type"]',
    '[role="tab"][aria-selected="true"]',
    'button[class*="active"][class*="type"]',
  ];

  for (const selector of typeSelectors) {
    try {
      const el = document.querySelector(selector);
      if (el) {
        const text = (el.textContent || '').trim().toLowerCase();
        if (text.includes('click')) return 'click';
        if (text.includes('scroll')) return 'scroll';
        if (text.includes('move') || text.includes('movement')) return 'movement';
        if (text.includes('attention')) return 'attention';
      }
    } catch {
      continue;
    }
  }

  // Check URL for type indicator
  const url = window.location.href.toLowerCase();
  if (url.includes('scroll')) return 'scroll';
  if (url.includes('move')) return 'movement';
  if (url.includes('attention')) return 'attention';

  return 'click'; // Default
}
