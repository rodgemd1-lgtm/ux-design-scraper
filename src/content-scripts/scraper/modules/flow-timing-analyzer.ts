/**
 * Flow Timing Analyzer
 * Analyzes user flow: steps to conversion, form field counts,
 * decisions per screen, cognitive load estimation, and friction points.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle, isVisible } from '../utils/computed-style-reader';
import type { FlowAnalysis } from '@shared/types';

export class FlowTimingAnalyzer extends BaseExtractor<FlowAnalysis> {
  constructor() {
    super('flow-timing');
  }

  protected async doExtract(): Promise<FlowAnalysis> {
    const formFieldCount = this.countFormFields();
    const stepsToConversion = this.estimateStepsToConversion();
    const decisionsPerScreen = this.calculateDecisionsPerScreen();
    const estimatedCognitiveLoad = this.estimateCognitiveLoad(formFieldCount, decisionsPerScreen);
    const frictionPoints = this.identifyFrictionPoints(formFieldCount, decisionsPerScreen);

    return {
      stepsToConversion,
      formFieldCount,
      decisionsPerScreen,
      estimatedCognitiveLoad,
      frictionPoints,
    };
  }

  private countFormFields(): number {
    const inputs = document.querySelectorAll(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), ' +
      'select, textarea'
    );

    let count = 0;
    for (const input of Array.from(inputs)) {
      try {
        if (isVisible(input)) count++;
      } catch {
        count++; // Count it if we can't determine visibility
      }
    }
    return count;
  }

  private estimateStepsToConversion(): number {
    // Find the primary CTA (largest/most prominent button above the fold)
    const foldY = window.innerHeight;
    let primaryCTA: Element | null = null;
    let maxProminence = 0;

    const ctaCandidates = document.querySelectorAll(
      'button, [role="button"], a[href], input[type="submit"]'
    );

    for (const el of Array.from(ctaCandidates)) {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const style = getCachedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const bgColor = style.backgroundColor;
        const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';
        const fontSize = parseFloat(style.fontSize);

        // Calculate prominence
        let prominence = 0;
        if (hasBg) prominence += 30;
        if (rect.width > 100) prominence += 20;
        if (fontSize >= 16) prominence += 15;
        if (rect.top < foldY) prominence += 20;

        // Check for action text
        const text = (el.textContent || '').trim().toLowerCase();
        const actionWords = ['get started', 'sign up', 'try', 'buy', 'shop', 'subscribe', 'start', 'join', 'register', 'book', 'contact'];
        if (actionWords.some(w => text.includes(w))) prominence += 15;

        if (prominence > maxProminence) {
          maxProminence = prominence;
          primaryCTA = el;
        }
      } catch {
        continue;
      }
    }

    if (!primaryCTA) return 1;

    // Count interactions needed to reach the CTA
    let steps = 1; // At least one step: the CTA click itself

    // Check if the CTA is below the fold (requires scrolling)
    const ctaRect = primaryCTA.getBoundingClientRect();
    if (ctaRect.top > foldY) {
      // Estimate number of "screens" of scrolling needed
      const screensToScroll = Math.ceil(ctaRect.top / foldY);
      steps += screensToScroll - 1;
    }

    // Check if there are form fields before the CTA
    const forms = document.querySelectorAll('form');
    for (const form of Array.from(forms)) {
      if (form.contains(primaryCTA) || this.isElementBefore(form, primaryCTA)) {
        const formInputs = form.querySelectorAll(
          'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'
        );
        // Each form field is a step
        steps += formInputs.length;
        break;
      }
    }

    // Check if CTA requires a modal/dropdown interaction first
    const modal = primaryCTA.closest('[class*="modal"], [class*="dialog"], [role="dialog"]');
    if (modal) {
      steps += 1; // Opening the modal is an extra step
    }

    return steps;
  }

  private calculateDecisionsPerScreen(): number[] {
    const viewportHeight = window.innerHeight;
    const bodyHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight
    );
    const screenCount = Math.max(1, Math.ceil(bodyHeight / viewportHeight));
    const decisionsPerScreen: number[] = [];

    for (let screen = 0; screen < Math.min(screenCount, 20); screen++) {
      const screenTop = screen * viewportHeight;
      const screenBottom = (screen + 1) * viewportHeight;
      let decisions = 0;

      // Count clickable elements in this viewport section
      const clickables = document.querySelectorAll(
        'button, a[href], [role="button"], input[type="submit"], [tabindex]:not([tabindex="-1"])'
      );

      for (const el of Array.from(clickables)) {
        try {
          const rect = el.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;

          if (absoluteTop >= screenTop && absoluteTop < screenBottom) {
            if (rect.width > 0 && rect.height > 0) {
              decisions++;
            }
          }
        } catch {
          continue;
        }
      }

      // Count form inputs in this section
      const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
      for (const input of Array.from(inputs)) {
        try {
          const rect = input.getBoundingClientRect();
          const absoluteTop = rect.top + window.scrollY;

          if (absoluteTop >= screenTop && absoluteTop < screenBottom) {
            if (rect.width > 0 && rect.height > 0) {
              decisions++;
            }
          }
        } catch {
          continue;
        }
      }

      decisionsPerScreen.push(decisions);
    }

    return decisionsPerScreen;
  }

  private estimateCognitiveLoad(formFieldCount: number, decisionsPerScreen: number[]): number {
    let load = 0;

    // Factor 1: Number of choices (clicks/decisions visible at once)
    const avgDecisions = decisionsPerScreen.length > 0
      ? decisionsPerScreen.reduce((a, b) => a + b, 0) / decisionsPerScreen.length
      : 0;

    if (avgDecisions > 20) load += 30;
    else if (avgDecisions > 10) load += 20;
    else if (avgDecisions > 5) load += 10;

    // Factor 2: Text density
    const bodyText = (document.body.textContent || '').trim();
    const wordCount = bodyText.split(/\s+/).length;
    if (wordCount > 3000) load += 20;
    else if (wordCount > 1500) load += 15;
    else if (wordCount > 500) load += 10;

    // Factor 3: Form complexity
    if (formFieldCount > 15) load += 25;
    else if (formFieldCount > 8) load += 15;
    else if (formFieldCount > 3) load += 10;

    // Factor 4: Competing CTAs
    const ctaCount = this.countCompetingCTAs();
    if (ctaCount > 5) load += 15;
    else if (ctaCount > 3) load += 10;
    else if (ctaCount > 1) load += 5;

    // Factor 5: Page depth/length
    const pageScreens = Math.ceil(document.body.scrollHeight / window.innerHeight);
    if (pageScreens > 10) load += 10;
    else if (pageScreens > 5) load += 5;

    return Math.min(100, load);
  }

  private countCompetingCTAs(): number {
    const foldY = window.innerHeight;
    let count = 0;

    const buttons = document.querySelectorAll('button, [role="button"], a[href]');
    for (const el of Array.from(buttons)) {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.top > foldY) continue;
        if (rect.width === 0 || rect.height === 0) continue;

        const style = getCachedStyle(el);
        const bgColor = style.backgroundColor;
        const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';
        const fontSize = parseFloat(style.fontSize);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

        // Only count visually prominent CTAs
        if (hasBg && (fontSize >= 14 || padding > 10)) {
          count++;
        }
      } catch {
        continue;
      }
    }

    return count;
  }

  private identifyFrictionPoints(formFieldCount: number, decisionsPerScreen: number[]): { step: number; description: string; severity: number }[] {
    const frictionPoints: { step: number; description: string; severity: number }[] = [];
    let step = 1;

    // Friction: Too many form fields
    if (formFieldCount > 10) {
      frictionPoints.push({
        step: step++,
        description: `Long form with ${formFieldCount} fields may cause abandonment`,
        severity: formFieldCount > 20 ? 5 : (formFieldCount > 15 ? 4 : 3),
      });
    }

    // Friction: Primary CTA below the fold
    const primaryCTA = this.findPrimaryCTA();
    if (primaryCTA) {
      const rect = primaryCTA.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        frictionPoints.push({
          step: step++,
          description: `Primary CTA "${(primaryCTA.textContent || '').trim().slice(0, 30)}" is below the fold (${Math.round(rect.top)}px from top)`,
          severity: 3,
        });
      }
    }

    // Friction: Too many competing CTAs
    const ctaCount = this.countCompetingCTAs();
    if (ctaCount > 5) {
      frictionPoints.push({
        step: step++,
        description: `${ctaCount} competing CTAs above the fold may cause decision paralysis`,
        severity: 4,
      });
    }

    // Friction: Screens with too many decisions
    for (let i = 0; i < decisionsPerScreen.length; i++) {
      if (decisionsPerScreen[i] > 20) {
        frictionPoints.push({
          step: step++,
          description: `Screen ${i + 1} has ${decisionsPerScreen[i]} interactive elements (cognitive overload)`,
          severity: 4,
        });
      }
    }

    // Friction: Required fields without labels
    const unlabeledInputs = document.querySelectorAll('input[required]:not([aria-label]):not([id])');
    if (unlabeledInputs.length > 0) {
      frictionPoints.push({
        step: step++,
        description: `${unlabeledInputs.length} required form field(s) without clear labels`,
        severity: 3,
      });
    }

    // Friction: No clear navigation
    const hasNav = document.querySelector('nav') !== null;
    if (!hasNav) {
      frictionPoints.push({
        step: step++,
        description: 'No <nav> element found - users may have difficulty navigating',
        severity: 2,
      });
    }

    // Friction: Missing breadcrumbs on deep pages
    const hasBreadcrumb = document.querySelector('[class*="breadcrumb"], [aria-label*="breadcrumb"]') !== null;
    const path = window.location.pathname.split('/').filter(Boolean);
    if (path.length > 2 && !hasBreadcrumb) {
      frictionPoints.push({
        step: step++,
        description: `Deep page (${path.length} levels) without breadcrumb navigation`,
        severity: 2,
      });
    }

    // Friction: No search functionality
    const hasSearch = document.querySelector(
      'input[type="search"], [role="search"], [class*="search"], [id*="search"]'
    ) !== null;
    const bodyText = (document.body.textContent || '').trim();
    const wordCount = bodyText.split(/\s+/).length;
    if (!hasSearch && wordCount > 2000) {
      frictionPoints.push({
        step: step++,
        description: 'Content-heavy page without search functionality',
        severity: 2,
      });
    }

    // Sort by severity descending
    frictionPoints.sort((a, b) => b.severity - a.severity);
    return frictionPoints;
  }

  private findPrimaryCTA(): Element | null {
    let bestEl: Element | null = null;
    let bestScore = 0;

    const candidates = document.querySelectorAll('button, [role="button"], input[type="submit"]');
    for (const el of Array.from(candidates)) {
      try {
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const style = getCachedStyle(el);
        if (style.display === 'none') continue;

        const bgColor = style.backgroundColor;
        const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';
        const fontSize = parseFloat(style.fontSize);

        let score = 0;
        if (hasBg) score += 30;
        if (rect.width > 100) score += 20;
        if (fontSize >= 16) score += 15;

        const text = (el.textContent || '').trim().toLowerCase();
        const actionWords = ['get started', 'sign up', 'try', 'buy', 'shop', 'subscribe', 'start', 'join'];
        if (actionWords.some(w => text.includes(w))) score += 20;

        if (score > bestScore) {
          bestScore = score;
          bestEl = el;
        }
      } catch {
        continue;
      }
    }

    return bestEl;
  }

  private isElementBefore(elA: Element, elB: Element): boolean {
    try {
      const rectA = elA.getBoundingClientRect();
      const rectB = elB.getBoundingClientRect();
      return rectA.top < rectB.top;
    } catch {
      return false;
    }
  }

  protected emptyResult(): FlowAnalysis {
    return {
      stepsToConversion: 0,
      formFieldCount: 0,
      decisionsPerScreen: [],
      estimatedCognitiveLoad: 0,
      frictionPoints: [],
    };
  }
}
