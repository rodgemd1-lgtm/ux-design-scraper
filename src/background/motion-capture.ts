/**
 * Motion Capture Module
 * Uses Chrome DevTools Protocol (CDP) to capture page animations:
 * - Animation.enable() to track CSS animations
 * - Captures animation names, durations, timing functions, playback rates
 * - Takes a series of screenshots during scroll (every 200px) for scroll-triggered animations
 * - Detects loading, hover, and page entrance animations
 * - Returns MotionCaptureData with frame sequences, animation metadata, and easing curves
 */

import { createLogger } from '@shared/logger';
import { sleep } from '@shared/utils';
import type { MotionCaptureData } from '@shared/types';

const log = createLogger('MotionCapture');

const MAX_SCROLL_FRAMES = 30;
const SCROLL_STEP_PX = 200;
const SCROLL_SETTLE_MS = 400;
const MAX_ANIMATIONS = 50;

interface CDPAnimation {
  id: string;
  name: string;
  pausedState: boolean;
  playState: string;
  playbackRate: number;
  startTime: number;
  currentTime: number;
  type: string;
  source?: {
    delay: number;
    endDelay: number;
    iterationStart: number;
    iterations: number;
    duration: number;
    direction: string;
    fill: string;
    backendNodeId: number;
    keyframesRule?: {
      name: string;
      keyframes: { offset: string; easing: string; style: string }[];
    };
    easing: string;
  };
  cssId?: string;
}

export class MotionCaptureManager {
  async captureAnimations(tabId: number, url: string): Promise<MotionCaptureData> {
    log.info('Starting motion capture', { tabId, url });

    const result: MotionCaptureData = {
      animations: [],
      scrollFrames: [],
      loadingAnimations: [],
      hoverAnimations: [],
      entranceAnimations: [],
      easingCurves: [],
    };

    try {
      await chrome.debugger.attach({ tabId }, '1.3');
      log.info('Debugger attached for motion capture', { tabId });
    } catch (err) {
      log.error('Failed to attach debugger for motion capture', err);
      throw new Error(`Cannot attach debugger to tab ${tabId}: ${err}`);
    }

    try {
      // Enable Animation domain
      await chrome.debugger.sendCommand({ tabId }, 'Animation.enable', {});
      log.info('Animation domain enabled');

      // Collect animations currently active on the page
      const animationData = await this.collectActiveAnimations(tabId);
      result.animations = animationData;

      // Collect easing curves from the animations
      result.easingCurves = this.aggregateEasingCurves(animationData);

      // Capture scroll frames for scroll-triggered animation detection
      result.scrollFrames = await this.captureScrollFrames(tabId);

      // Detect loading animations by analyzing initial page state
      result.loadingAnimations = await this.detectLoadingAnimations(tabId);

      // Detect hover animations by analyzing transition properties
      result.hoverAnimations = await this.detectHoverAnimations(tabId);

      // Detect entrance animations
      result.entranceAnimations = await this.detectEntranceAnimations(tabId);

      // Disable Animation domain
      await chrome.debugger.sendCommand({ tabId }, 'Animation.disable', {}).catch(() => {});

    } catch (err) {
      log.error('Motion capture error', err);
    } finally {
      // Scroll back to top
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
          expression: 'window.scrollTo(0, 0)',
        });
      } catch {
        // Ignore
      }

      // Clear overrides
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride', {});
      } catch {
        // Ignore
      }

      // Detach debugger
      try {
        await chrome.debugger.detach({ tabId });
        log.info('Debugger detached after motion capture', { tabId });
      } catch (err) {
        log.warn('Failed to detach debugger after motion capture', err);
      }
    }

    log.info('Motion capture complete', {
      animationCount: result.animations.length,
      scrollFrames: result.scrollFrames.length,
      loadingAnimations: result.loadingAnimations.length,
      hoverAnimations: result.hoverAnimations.length,
      entranceAnimations: result.entranceAnimations.length,
    });

    return result;
  }

  private async collectActiveAnimations(tabId: number): Promise<MotionCaptureData['animations']> {
    const animations: MotionCaptureData['animations'] = [];

    try {
      // Use Runtime.evaluate to get animation data from the page's Web Animations API
      const animResult = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          (function() {
            const allAnimations = document.getAnimations ? document.getAnimations() : [];
            return JSON.stringify(allAnimations.slice(0, ${MAX_ANIMATIONS}).map(anim => {
              let name = 'unknown';
              let type = 'web-animation';
              let timingFunction = 'ease';
              let duration = 0;
              let playbackRate = anim.playbackRate || 1;

              if (anim instanceof CSSAnimation) {
                name = anim.animationName || 'unnamed';
                type = 'css-animation';
              } else if (anim instanceof CSSTransition) {
                name = anim.transitionProperty || 'unnamed';
                type = 'css-transition';
              } else {
                name = anim.id || 'web-animation-' + Math.random().toString(36).slice(2, 6);
              }

              const timing = anim.effect?.getTiming?.();
              if (timing) {
                duration = typeof timing.duration === 'number' ? timing.duration : 0;
                timingFunction = timing.easing || 'ease';
              }

              return {
                name,
                duration,
                timingFunction,
                playbackRate,
                type,
              };
            }));
          })()
        `,
        returnByValue: true,
      }) as { result: { value: string } };

      if (animResult?.result?.value) {
        const parsed = JSON.parse(animResult.result.value);
        for (const anim of parsed) {
          animations.push({
            name: anim.name,
            duration: anim.duration,
            timingFunction: anim.timingFunction,
            playbackRate: anim.playbackRate,
            type: anim.type,
          });
        }
      }
    } catch (err) {
      log.warn('Failed to collect active animations via Web Animations API', err);
    }

    // Also try the Animation CDP domain events to capture any we missed
    try {
      const cdpAnimResult = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          (function() {
            const results = [];
            const sheets = document.styleSheets;
            for (let i = 0; i < sheets.length; i++) {
              try {
                const rules = sheets[i].cssRules;
                for (let j = 0; j < rules.length; j++) {
                  const rule = rules[j];
                  if (rule instanceof CSSKeyframesRule) {
                    results.push({
                      name: rule.name,
                      type: 'css-animation',
                      keyframeCount: rule.cssRules.length,
                    });
                  }
                }
              } catch (e) { /* cross-origin */ }
            }
            return JSON.stringify(results.slice(0, ${MAX_ANIMATIONS}));
          })()
        `,
        returnByValue: true,
      }) as { result: { value: string } };

      if (cdpAnimResult?.result?.value) {
        const keyframes = JSON.parse(cdpAnimResult.result.value);
        const existingNames = new Set(animations.map(a => a.name));

        for (const kf of keyframes) {
          if (!existingNames.has(kf.name)) {
            animations.push({
              name: kf.name,
              duration: 0,
              timingFunction: 'ease',
              playbackRate: 1,
              type: 'css-animation',
            });
          }
        }
      }
    } catch (err) {
      log.warn('Failed to scan stylesheets for keyframe animations', err);
    }

    return animations;
  }

  private aggregateEasingCurves(animations: MotionCaptureData['animations']): MotionCaptureData['easingCurves'] {
    const curveMap = new Map<string, { count: number; usedBy: Set<string> }>();

    for (const anim of animations) {
      const curve = anim.timingFunction;
      const existing = curveMap.get(curve);
      if (existing) {
        existing.count++;
        existing.usedBy.add(anim.name);
      } else {
        curveMap.set(curve, { count: 1, usedBy: new Set([anim.name]) });
      }
    }

    return Array.from(curveMap.entries())
      .map(([curve, data]) => ({
        curve,
        count: data.count,
        usedBy: Array.from(data.usedBy).slice(0, 10),
      }))
      .sort((a, b) => b.count - a.count);
  }

  private async captureScrollFrames(tabId: number): Promise<MotionCaptureData['scrollFrames']> {
    const frames: MotionCaptureData['scrollFrames'] = [];

    try {
      // Get page height
      const heightResult = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: 'document.documentElement.scrollHeight',
        returnByValue: true,
      }) as { result: { value: number } };

      const pageHeight = heightResult?.result?.value || 0;
      if (pageHeight <= 0) return frames;

      const maxScroll = Math.min(pageHeight, MAX_SCROLL_FRAMES * SCROLL_STEP_PX);

      for (let scrollY = 0; scrollY < maxScroll; scrollY += SCROLL_STEP_PX) {
        if (frames.length >= MAX_SCROLL_FRAMES) break;

        try {
          // Scroll to position
          await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: `window.scrollTo(0, ${scrollY})`,
          });

          // Wait for scroll animations to settle
          await sleep(SCROLL_SETTLE_MS);

          // Capture screenshot
          const screenshot = await chrome.debugger.sendCommand(
            { tabId },
            'Page.captureScreenshot',
            {
              format: 'jpeg',
              quality: 60,
              fromSurface: true,
            }
          ) as { data: string };

          if (screenshot?.data) {
            frames.push({
              scrollY,
              screenshotDataUrl: `data:image/jpeg;base64,${screenshot.data}`,
              timestamp: Date.now(),
            });
          }
        } catch (err) {
          log.warn('Failed to capture scroll frame', { scrollY, error: err });
        }
      }
    } catch (err) {
      log.error('Failed to capture scroll frames', err);
    }

    return frames;
  }

  private async detectLoadingAnimations(tabId: number): Promise<MotionCaptureData['loadingAnimations']> {
    const loadingAnims: MotionCaptureData['loadingAnimations'] = [];

    try {
      const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          (function() {
            const results = [];
            const selectors = [
              '.skeleton', '.shimmer', '.loader', '.loading', '.spinner',
              '[class*="skeleton"]', '[class*="shimmer"]', '[class*="loader"]',
              '[class*="loading"]', '[class*="spinner"]', '[class*="pulse"]',
              '[class*="bounce"]', '[class*="spin"]', '[class*="rotate"]',
            ];

            for (const sel of selectors) {
              try {
                const elements = document.querySelectorAll(sel);
                for (let i = 0; i < Math.min(elements.length, 5); i++) {
                  const el = elements[i];
                  const style = getComputedStyle(el);
                  const animName = style.animationName;
                  const duration = style.animationDuration;

                  if (animName && animName !== 'none') {
                    const tag = el.tagName.toLowerCase();
                    const cls = el.className && typeof el.className === 'string'
                      ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
                      : '';
                    results.push({
                      selector: tag + cls,
                      animationName: animName,
                      duration: duration || '0s',
                    });
                  }
                }
              } catch (e) { /* continue */ }
            }
            return JSON.stringify(results.slice(0, 20));
          })()
        `,
        returnByValue: true,
      }) as { result: { value: string } };

      if (result?.result?.value) {
        loadingAnims.push(...JSON.parse(result.result.value));
      }
    } catch (err) {
      log.warn('Failed to detect loading animations', err);
    }

    return loadingAnims;
  }

  private async detectHoverAnimations(tabId: number): Promise<MotionCaptureData['hoverAnimations']> {
    const hoverAnims: MotionCaptureData['hoverAnimations'] = [];

    try {
      const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          (function() {
            const results = [];
            const interactiveSelectors = 'a, button, [role="button"], input, .card, [class*="card"], [class*="btn"]';
            const elements = document.querySelectorAll(interactiveSelectors);
            const seen = new Set();

            for (let i = 0; i < Math.min(elements.length, 200); i++) {
              const el = elements[i];
              try {
                const style = getComputedStyle(el);
                const transition = style.transition;

                if (!transition || transition === 'all 0s ease 0s' || transition === 'none') continue;

                // Parse transition properties
                const parts = transition.split(',');
                const properties = [];
                let duration = '0s';
                let easing = 'ease';

                for (const part of parts) {
                  const tokens = part.trim().split(/\\s+/);
                  if (tokens[0] && tokens[0] !== 'all') {
                    properties.push(tokens[0]);
                  }
                  if (tokens[1] && tokens[1] !== '0s') {
                    duration = tokens[1];
                  }
                  if (tokens[2]) {
                    easing = tokens[2];
                  }
                }

                if (properties.length === 0 && parts[0]) {
                  properties.push('all');
                  const tokens = parts[0].trim().split(/\\s+/);
                  if (tokens[1]) duration = tokens[1];
                  if (tokens[2]) easing = tokens[2];
                }

                if (duration === '0s') continue;

                const tag = el.tagName.toLowerCase();
                const cls = el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
                  : '';
                const selector = tag + cls;

                if (seen.has(selector)) continue;
                seen.add(selector);

                results.push({
                  selector,
                  properties: properties.slice(0, 5),
                  duration,
                  easing,
                });
              } catch (e) { /* continue */ }
            }
            return JSON.stringify(results.slice(0, 30));
          })()
        `,
        returnByValue: true,
      }) as { result: { value: string } };

      if (result?.result?.value) {
        hoverAnims.push(...JSON.parse(result.result.value));
      }
    } catch (err) {
      log.warn('Failed to detect hover animations', err);
    }

    return hoverAnims;
  }

  private async detectEntranceAnimations(tabId: number): Promise<MotionCaptureData['entranceAnimations']> {
    const entranceAnims: MotionCaptureData['entranceAnimations'] = [];

    try {
      const result = await chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
        expression: `
          (function() {
            const results = [];
            const elements = document.querySelectorAll('*');
            const limit = Math.min(elements.length, 1000);
            const seen = new Set();

            for (let i = 0; i < limit; i++) {
              const el = elements[i];
              try {
                const style = getComputedStyle(el);
                const animName = style.animationName;
                const animDelay = style.animationDelay;
                const animDuration = style.animationDuration;
                const opacity = parseFloat(style.opacity);
                const transform = style.transform;

                // Check for entrance animations
                const isEntrance =
                  (animName && animName !== 'none' && (
                    animName.includes('fade') ||
                    animName.includes('slide') ||
                    animName.includes('appear') ||
                    animName.includes('enter') ||
                    animName.includes('in') ||
                    animName.includes('reveal')
                  )) ||
                  // Elements with data attributes for scroll animation libraries
                  el.hasAttribute('data-aos') ||
                  el.hasAttribute('data-scroll') ||
                  el.hasAttribute('data-animate') ||
                  el.hasAttribute('data-reveal');

                if (!isEntrance) continue;

                const tag = el.tagName.toLowerCase();
                const cls = el.className && typeof el.className === 'string'
                  ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.')
                  : '';
                const selector = tag + cls;

                if (seen.has(selector)) continue;
                seen.add(selector);

                let type = 'custom';
                const name = (animName || '').toLowerCase();
                const dataAos = el.getAttribute('data-aos') || '';

                if (name.includes('fade') || dataAos.includes('fade')) type = 'fade';
                else if (name.includes('slide') || dataAos.includes('slide')) type = 'slide';
                else if (name.includes('zoom') || dataAos.includes('zoom')) type = 'zoom';
                else if (name.includes('flip') || dataAos.includes('flip')) type = 'flip';
                else if (name.includes('bounce')) type = 'bounce';

                results.push({
                  selector,
                  type,
                  delay: animDelay || '0s',
                  duration: animDuration || '0s',
                });
              } catch (e) { /* continue */ }
            }
            return JSON.stringify(results.slice(0, 30));
          })()
        `,
        returnByValue: true,
      }) as { result: { value: string } };

      if (result?.result?.value) {
        entranceAnims.push(...JSON.parse(result.result.value));
      }
    } catch (err) {
      log.warn('Failed to detect entrance animations', err);
    }

    return entranceAnims;
  }
}
