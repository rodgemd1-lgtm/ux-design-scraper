import { useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { MSG } from '@shared/message-types';
import { createLogger } from '@shared/logger';

const log = createLogger('useScrapeSession');

const ALL_STEP_IDS = [
  'inject',
  'design-tokens', 'typography', 'icons', 'grid-layout', 'navigation',
  'copy-analysis', 'accessibility', 'third-party', 'dark-mode',
  'image-assets', 'conversion',
  'components', 'animations', 'scroll-behavior', 'flow-analysis',
  'screenshots-375', 'screenshots-768', 'screenshots-1280', 'screenshots-1920',
  'lighthouse', 'wayback', 'heatmaps',
];

export function useScrapeSession() {
  const steps = useStore((s) => s.steps);
  const isRunning = useStore((s) => s.isRunning);
  const currentUrl = useStore((s) => s.currentUrl);
  const startScrapeState = useStore((s) => s.startScrape);
  const updateStep = useStore((s) => s.updateStep);
  const completeScrape = useStore((s) => s.completeScrape);
  const resetScrape = useStore((s) => s.reset);

  // Listen for scrape progress messages from background
  useEffect(() => {
    const listener = (
      message: { type: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ) => {
      switch (message.type) {
        case MSG.SCRAPE_STEP_START: {
          const { stepId } = message.payload as { stepId: string };
          updateStep(stepId, { status: 'running', progress: 0 });
          log.debug(`Step started: ${stepId}`);
          break;
        }
        case MSG.SCRAPE_STEP_PROGRESS: {
          const { stepId, progress } = message.payload as { stepId: string; progress: number };
          updateStep(stepId, { progress });
          break;
        }
        case MSG.SCRAPE_STEP_COMPLETE: {
          const { stepId, data, duration } = message.payload as {
            stepId: string;
            data: unknown;
            duration: number;
          };
          updateStep(stepId, { status: 'complete', progress: 100, data, duration });
          log.info(`Step complete: ${stepId} (${(duration / 1000).toFixed(1)}s)`);
          break;
        }
        case MSG.SCRAPE_STEP_ERROR: {
          const { stepId, error, duration } = message.payload as {
            stepId: string;
            error: string;
            duration: number;
          };
          updateStep(stepId, { status: 'error', error, duration });
          log.error(`Step failed: ${stepId}`, error);
          break;
        }
        case MSG.SCRAPE_ALL_COMPLETE: {
          completeScrape();
          log.info('Scrape pipeline complete');
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [updateStep, completeScrape]);

  const startScrape = useCallback(
    async (url: string, projectName?: string) => {
      startScrapeState(url, ALL_STEP_IDS);

      try {
        await chrome.runtime.sendMessage({
          type: MSG.START_SCRAPE,
          payload: { targetUrl: url, projectName: projectName || url },
        });
        log.info(`Scrape started for ${url}`);
      } catch (err) {
        log.error('Failed to start scrape', err);
        completeScrape();
      }
    },
    [startScrapeState, completeScrape]
  );

  const stopScrape = useCallback(async () => {
    try {
      await chrome.runtime.sendMessage({ type: MSG.STOP_SCRAPE });
      completeScrape();
      log.info('Scrape stopped');
    } catch (err) {
      log.error('Failed to stop scrape', err);
    }
  }, [completeScrape]);

  return {
    steps,
    isRunning,
    currentUrl,
    startScrape,
    stopScrape,
    resetScrape,
  };
}
