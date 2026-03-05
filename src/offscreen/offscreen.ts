import { MSG } from '@shared/message-types';
import type { LighthouseData } from '@shared/types';

/**
 * Offscreen document entry point.
 * Listens for RUN_LIGHTHOUSE messages and runs a Lighthouse audit
 * via the Google PageSpeed Insights API (since we cannot run Lighthouse
 * directly inside a Chrome extension context).
 */

const PAGESPEED_INSIGHTS_API = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type !== MSG.RUN_LIGHTHOUSE) return false;
  if (message.target && message.target !== 'offscreen') return false;

  const { url } = message.payload as { url: string };

  runLighthouseAudit(url)
    .then(result => {
      sendResponse({ type: MSG.LIGHTHOUSE_RESULT, payload: result });
      // Also broadcast back to the service worker
      chrome.runtime.sendMessage({
        type: MSG.LIGHTHOUSE_RESULT,
        payload: result,
      }).catch(() => {
        // Service worker may have restarted
      });
    })
    .catch(err => {
      const errorResult = createEmptyLighthouseData();
      console.error('[UXScraper:Offscreen] Lighthouse audit failed:', err);
      sendResponse({ type: MSG.LIGHTHOUSE_RESULT, payload: errorResult });
      chrome.runtime.sendMessage({
        type: MSG.LIGHTHOUSE_RESULT,
        payload: errorResult,
      }).catch(() => {});
    });

  // Return true to indicate async sendResponse
  return true;
});

async function runLighthouseAudit(url: string): Promise<LighthouseData> {
  console.log('[UXScraper:Offscreen] Running Lighthouse audit for:', url);

  // PageSpeed Insights API supports multiple categories via repeated params
  const params = new URLSearchParams();
  params.append('url', url);
  params.append('strategy', 'desktop');
  params.append('category', 'performance');
  params.append('category', 'accessibility');

  const apiUrl = `${PAGESPEED_INSIGHTS_API}?${params.toString()}`;

  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`PageSpeed Insights API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();

  // Extract Lighthouse data from PageSpeed Insights response
  const lighthouseResult = data.lighthouseResult;

  if (!lighthouseResult) {
    throw new Error('No lighthouse result in PageSpeed Insights response');
  }

  const categories = lighthouseResult.categories || {};
  const audits = lighthouseResult.audits || {};

  const performanceScore = Math.round((categories.performance?.score || 0) * 100);
  const accessibilityScore = Math.round((categories.accessibility?.score || 0) * 100);

  // Extract Core Web Vitals from audits
  const lcp = extractMetricValue(audits, 'largest-contentful-paint');
  const cls = extractMetricFloat(audits, 'cumulative-layout-shift');
  const inp = extractMetricValue(audits, 'interaction-to-next-paint') ||
              extractMetricValue(audits, 'experimental-interaction-to-next-paint');
  const fcp = extractMetricValue(audits, 'first-contentful-paint');
  const speedIndex = extractMetricValue(audits, 'speed-index');
  const totalBlockingTime = extractMetricValue(audits, 'total-blocking-time');

  const result: LighthouseData = {
    performanceScore,
    accessibilityScore,
    lcp,
    cls,
    inp,
    fcp,
    speedIndex,
    totalBlockingTime,
  };

  console.log('[UXScraper:Offscreen] Lighthouse audit complete:', result);
  return result;
}

function extractMetricValue(
  audits: Record<string, { numericValue?: number; numericUnit?: string }>,
  auditId: string
): number {
  const audit = audits[auditId];
  if (!audit || audit.numericValue === undefined) return 0;
  // numericValue is in milliseconds for timing metrics
  return Math.round(audit.numericValue);
}

function extractMetricFloat(
  audits: Record<string, { numericValue?: number }>,
  auditId: string
): number {
  const audit = audits[auditId];
  if (!audit || audit.numericValue === undefined) return 0;
  // CLS is a unitless float, keep precision
  return Math.round(audit.numericValue * 1000) / 1000;
}

function createEmptyLighthouseData(): LighthouseData {
  return {
    performanceScore: 0,
    accessibilityScore: 0,
    lcp: 0,
    cls: 0,
    inp: 0,
    fcp: 0,
    speedIndex: 0,
    totalBlockingTime: 0,
  };
}
