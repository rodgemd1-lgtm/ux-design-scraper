import { createLogger } from '@shared/logger';
import { sleep } from '@shared/utils';
import { BREAKPOINTS } from '@shared/constants';
import type { ScreenshotData } from '@shared/types';

const log = createLogger('ScreenshotMgr');

const SETTLE_DELAY_MS = 1500;

export class ScreenshotManager {
  async captureAllBreakpoints(tabId: number, url: string): Promise<ScreenshotData[]> {
    log.info('Capturing screenshots at all breakpoints', { tabId, url, breakpoints: [...BREAKPOINTS] });

    const results: ScreenshotData[] = [];

    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      log.info('Debugger attached', { tabId });
    } catch (err) {
      log.error('Failed to attach debugger', err);
      throw new Error(`Cannot attach debugger to tab ${tabId}: ${err}`);
    }

    try {
      for (const breakpoint of BREAKPOINTS) {
        try {
          log.info('Capturing breakpoint', { breakpoint });

          // Set viewport to target breakpoint width with a tall height for full-page feel
          await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
            width: breakpoint,
            height: breakpoint <= 768 ? 812 : 900,
            deviceScaleFactor: breakpoint <= 768 ? 2 : 1,
            mobile: breakpoint <= 768,
          });

          // Wait for layout to settle
          await sleep(SETTLE_DELAY_MS);

          // Capture screenshot as PNG base64
          const screenshotResult = await chrome.debugger.sendCommand(
            { tabId },
            'Page.captureScreenshot',
            {
              format: 'png',
              quality: 100,
              captureBeyondViewport: true,
              fromSurface: true,
            }
          ) as { data: string };

          if (screenshotResult?.data) {
            results.push({
              breakpoint,
              dataUrl: `data:image/png;base64,${screenshotResult.data}`,
              width: breakpoint,
              height: breakpoint <= 768 ? 812 : 900,
              timestamp: Date.now(),
            });
            log.info('Screenshot captured', { breakpoint, dataSize: screenshotResult.data.length });
          } else {
            log.warn('No screenshot data returned', { breakpoint });
          }
        } catch (err) {
          log.error('Failed to capture breakpoint', { breakpoint, error: err });
          // Continue with other breakpoints
        }
      }

      // Clear overrides before detaching
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {});
      } catch (err) {
        log.warn('Failed to clear device metrics override', err);
      }
    } finally {
      // Always detach debugger
      try {
        await chrome.debugger.detach({ tabId });
        log.info('Debugger detached', { tabId });
      } catch (err) {
        log.warn('Failed to detach debugger', err);
      }
    }

    log.info('All screenshots captured', { count: results.length });
    return results;
  }
}
