/**
 * Scraper Content Script Entry Point
 *
 * This is the main entry point for the scraper content script bundle.
 * It is injected into target web pages and:
 * 1. Sends SCRAPER_READY to background on injection
 * 2. Listens for RUN_EXTRACTOR messages with { module: string } payload
 * 3. Dynamically calls the appropriate extractor module
 * 4. Sends EXTRACTOR_RESULT back with the extracted data
 */

// Import all extractor modules
import { DesignTokenExtractor } from './modules/design-token-extractor';
import { TypographyExtractor } from './modules/typography-extractor';
import { IconExtractor } from './modules/icon-extractor';
import { GridLayoutExtractor } from './modules/grid-layout-extractor';
import { NavigationExtractor } from './modules/navigation-extractor';
import { CopyAnalyzer } from './modules/copy-analyzer';
import { AccessibilityAuditor } from './modules/accessibility-auditor';
import { ThirdPartyDetector } from './modules/third-party-detector';
import { DarkModeDetector } from './modules/dark-mode-detector';
import { ImageAssetExtractor } from './modules/image-asset-extractor';
import { ConversionPatternAnalyzer } from './modules/conversion-pattern-analyzer';
import { ComponentExtractor } from './modules/component-extractor';
import { StateVariantDetector } from './modules/state-variant-detector';
import { AnimationExtractor } from './modules/animation-extractor';
import { ScrollBehaviorExtractor } from './modules/scroll-behavior-extractor';
import { FlowTimingAnalyzer } from './modules/flow-timing-analyzer';
import { SEOExtractor } from './modules/seo-extractor';
import { ColorIntelligenceExtractor } from './modules/color-intelligence';
import { WhitespaceAnalyzer } from './modules/whitespace-analyzer';
import { InteractionPatternDetector } from './modules/interaction-pattern-detector';

import type { BaseExtractor } from './modules/base-extractor';

// Message type constants (inline to avoid import issues with content script isolation)
const MSG_SCRAPER_READY = 'SCRAPER_READY';
const MSG_RUN_EXTRACTOR = 'RUN_EXTRACTOR';
const MSG_EXTRACTOR_RESULT = 'EXTRACTOR_RESULT';

// ---- Logger ----
function log(message: string, data?: unknown): void {
  const prefix = '%c[UXScraper:ContentScript]';
  const style = 'color: #4c6ef5; font-weight: bold;';
  if (data !== undefined) {
    console.log(prefix, style, message, data);
  } else {
    console.log(prefix, style, message);
  }
}

function logError(message: string, data?: unknown): void {
  const prefix = '%c[UXScraper:ContentScript]';
  const style = 'color: #e03131; font-weight: bold;';
  if (data !== undefined) {
    console.error(prefix, style, message, data);
  } else {
    console.error(prefix, style, message);
  }
}

// ---- Module Registry ----
// Maps module names to their extractor class instances.
// Each module name corresponds to a step in the scrape pipeline.

type ExtractorFactory = () => BaseExtractor<unknown>;

const extractorRegistry: Record<string, ExtractorFactory> = {
  'design-tokens': () => new DesignTokenExtractor(),
  'typography': () => new TypographyExtractor(),
  'icons': () => new IconExtractor(),
  'grid-layout': () => new GridLayoutExtractor(),
  'navigation': () => new NavigationExtractor(),
  'copy-analysis': () => new CopyAnalyzer(),
  'accessibility': () => new AccessibilityAuditor(),
  'third-party': () => new ThirdPartyDetector(),
  'dark-mode': () => new DarkModeDetector(),
  'image-assets': () => new ImageAssetExtractor(),
  'conversion-patterns': () => new ConversionPatternAnalyzer(),
  'components': () => new ComponentExtractor(),
  'state-variants': () => new StateVariantDetector(),
  'animations': () => new AnimationExtractor(),
  'scroll-behavior': () => new ScrollBehaviorExtractor(),
  'flow-timing': () => new FlowTimingAnalyzer(),
  'seo': () => new SEOExtractor(),
  'color-intelligence': () => new ColorIntelligenceExtractor(),
  'whitespace': () => new WhitespaceAnalyzer(),
  'interaction-patterns': () => new InteractionPatternDetector(),
};

// ---- Message Handler ----

interface RunExtractorMessage {
  type: string;
  payload: {
    module: string;
  };
}

/**
 * Run a specific extractor module by name.
 */
async function runExtractor(moduleName: string): Promise<void> {
  log(`Running extractor: ${moduleName}`);

  const factory = extractorRegistry[moduleName];
  if (!factory) {
    const error = `Unknown extractor module: "${moduleName}". Available modules: ${Object.keys(extractorRegistry).join(', ')}`;
    logError(error);

    chrome.runtime.sendMessage({
      type: MSG_EXTRACTOR_RESULT,
      payload: {
        module: moduleName,
        success: false,
        data: null,
        errors: [error],
        duration: 0,
      },
    });
    return;
  }

  try {
    const extractor = factory();
    const result = await extractor.extract();

    log(`Extractor "${moduleName}" completed in ${result.duration.toFixed(1)}ms`, {
      success: result.success,
      errors: result.errors,
    });

    chrome.runtime.sendMessage({
      type: MSG_EXTRACTOR_RESULT,
      payload: {
        module: moduleName,
        success: result.success,
        data: result.data,
        errors: result.errors,
        duration: result.duration,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Extractor "${moduleName}" failed`, errorMessage);

    chrome.runtime.sendMessage({
      type: MSG_EXTRACTOR_RESULT,
      payload: {
        module: moduleName,
        success: false,
        data: null,
        errors: [errorMessage],
        duration: 0,
      },
    });
  }
}

/**
 * Listen for messages from the background service worker.
 */
chrome.runtime.onMessage.addListener(
  (message: RunExtractorMessage, _sender, sendResponse) => {
    if (message.type === MSG_RUN_EXTRACTOR) {
      const moduleName = message.payload?.module;

      if (!moduleName) {
        logError('RUN_EXTRACTOR message missing module name');
        sendResponse({ received: false, error: 'Missing module name' });
        return;
      }

      log(`Received RUN_EXTRACTOR for module: ${moduleName}`);

      // Run the extractor asynchronously
      runExtractor(moduleName)
        .then(() => {
          sendResponse({ received: true, module: moduleName });
        })
        .catch((err) => {
          logError(`Error running extractor "${moduleName}"`, err);
          sendResponse({ received: false, error: String(err) });
        });

      // Return true to indicate we will respond asynchronously
      return true;
    }
  }
);

// ---- Initialization ----

/**
 * Notify the background service worker that the scraper is ready.
 */
function notifyReady(): void {
  log('Content script loaded, sending SCRAPER_READY');

  chrome.runtime.sendMessage({
    type: MSG_SCRAPER_READY,
    payload: {
      url: window.location.href,
      title: document.title,
      availableModules: Object.keys(extractorRegistry),
      timestamp: Date.now(),
    },
  }).catch((err) => {
    logError('Failed to send SCRAPER_READY', err);
  });
}

// Send ready signal
notifyReady();

// Also send ready when the page finishes loading (in case we were injected before load)
if (document.readyState !== 'complete') {
  window.addEventListener('load', () => {
    // Re-send ready after full page load
    log('Page load complete, re-sending SCRAPER_READY');
    notifyReady();
  });
}

log(`Scraper initialized with ${Object.keys(extractorRegistry).length} modules: ${Object.keys(extractorRegistry).join(', ')}`);
