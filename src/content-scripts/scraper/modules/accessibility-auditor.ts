/**
 * Accessibility Auditor
 * Performs a WCAG audit: contrast ratios, alt text, ARIA labels,
 * tab order, semantic issues, focus indicators, and overall scoring.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle, getEffectiveBackgroundColor } from '../utils/computed-style-reader';
import type { AccessibilityAudit } from '@shared/types';

// Inline utility functions from @shared/utils
function parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
  if (color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

function contrastRatio(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }): number {
  const luminance = (c: { r: number; g: number; b: number }) => {
    const [rs, gs, bs] = [c.r, c.g, c.b].map(v => {
      v = v / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

const MAX_ELEMENTS = 2000;
const TEXT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON',
  'LABEL', 'LI', 'TD', 'TH', 'FIGCAPTION', 'BLOCKQUOTE',
  'EM', 'STRONG', 'B', 'I', 'SMALL', 'CODE', 'PRE',
]);

export class AccessibilityAuditor extends BaseExtractor<AccessibilityAudit> {
  constructor() {
    super('accessibility');
  }

  protected async doExtract(): Promise<AccessibilityAudit> {
    const contrastIssues = this.checkContrast();
    const missingAltText = this.checkMissingAltText();
    const missingAriaLabels = this.checkMissingAriaLabels();
    const tabOrderIssues = this.checkTabOrder();
    const semanticIssues = this.checkSemanticIssues();
    const focusIndicatorsMissing = this.checkFocusIndicators();

    // Calculate overall score
    const totalIssues =
      contrastIssues.length +
      missingAltText.length +
      missingAriaLabels.length +
      tabOrderIssues.length +
      semanticIssues.length +
      focusIndicatorsMissing.length;

    // Score out of 100: start at 100, deduct per issue
    const deductionPerIssue = 3;
    const overallScore = Math.max(0, Math.min(100, 100 - (totalIssues * deductionPerIssue)));

    // Determine WCAG level
    let wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL' = 'AAA';
    if (contrastIssues.some(i => i.level === 'AAA-fail')) wcagLevel = 'AA';
    if (contrastIssues.some(i => i.level === 'AA-fail') || missingAltText.length > 0 || missingAriaLabels.length > 3) {
      wcagLevel = 'A';
    }
    if (overallScore < 50 || contrastIssues.filter(i => i.level === 'AA-fail').length > 5) {
      wcagLevel = 'FAIL';
    }

    return {
      contrastIssues,
      missingAltText,
      missingAriaLabels,
      tabOrderIssues,
      semanticIssues,
      focusIndicatorsMissing,
      overallScore,
      wcagLevel,
    };
  }

  private checkContrast(): { foreground: string; background: string; ratio: number; element: string; level: string }[] {
    const issues: { foreground: string; background: string; ratio: number; element: string; level: string }[] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      if (!TEXT_TAGS.has(el.tagName)) continue;

      // Must have visible text content
      const text = (el.textContent || '').trim();
      if (!text) continue;

      try {
        const style = getCachedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const fgColor = style.color;
        const bgColor = getEffectiveBackgroundColor(el);

        const fg = parseColor(fgColor);
        const bg = parseColor(bgColor);

        if (!fg || !bg) continue;

        const ratio = contrastRatio(fg, bg);
        const fontSize = parseFloat(style.fontSize);
        const fontWeight = parseInt(style.fontWeight, 10);

        // Large text: >= 18pt (24px) or >= 14pt (18.66px) bold
        const isLargeText = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);

        // AA: 4.5:1 normal, 3:1 large
        // AAA: 7:1 normal, 4.5:1 large
        const aaThreshold = isLargeText ? 3 : 4.5;
        const aaaThreshold = isLargeText ? 4.5 : 7;

        if (ratio < aaThreshold) {
          issues.push({
            foreground: fgColor,
            background: bgColor,
            ratio: Math.round(ratio * 100) / 100,
            element: describeElement(el),
            level: 'AA-fail',
          });
        } else if (ratio < aaaThreshold) {
          issues.push({
            foreground: fgColor,
            background: bgColor,
            ratio: Math.round(ratio * 100) / 100,
            element: describeElement(el),
            level: 'AAA-fail',
          });
        }
      } catch {
        continue;
      }
    }

    // Limit to most severe issues
    return issues.slice(0, 50);
  }

  private checkMissingAltText(): { element: string; src: string }[] {
    const issues: { element: string; src: string }[] = [];
    const images = document.querySelectorAll('img');

    for (const img of Array.from(images)) {
      const alt = img.getAttribute('alt');
      const role = img.getAttribute('role');
      const ariaHidden = img.getAttribute('aria-hidden');

      // Decorative images (role="presentation" or aria-hidden) are OK without alt
      if (role === 'presentation' || role === 'none' || ariaHidden === 'true') continue;

      // Missing alt attribute entirely
      if (alt === null) {
        issues.push({
          element: describeElement(img),
          src: img.src || '',
        });
      }
      // Empty alt on non-decorative image (only flag if it seems meaningful)
      else if (alt === '' && !this.isLikelyDecorative(img)) {
        issues.push({
          element: describeElement(img),
          src: img.src || '',
        });
      }
    }

    return issues;
  }

  private isLikelyDecorative(img: HTMLImageElement): boolean {
    // Small images are likely decorative (icons, spacers)
    const rect = img.getBoundingClientRect();
    if (rect.width < 24 && rect.height < 24) return true;

    // CSS background-like images
    const parent = img.parentElement;
    if (parent) {
      const parentClasses = (parent.className || '').toString().toLowerCase();
      if (parentClasses.includes('bg') || parentClasses.includes('background') || parentClasses.includes('decoration')) {
        return true;
      }
    }

    return false;
  }

  private checkMissingAriaLabels(): string[] {
    const issues: string[] = [];

    // Interactive elements that need accessible names
    const interactiveSelectors = [
      'button:not([aria-label]):not([aria-labelledby])',
      'a[href]:not([aria-label]):not([aria-labelledby])',
      'input:not([aria-label]):not([aria-labelledby]):not([id])',
      'select:not([aria-label]):not([aria-labelledby])',
      'textarea:not([aria-label]):not([aria-labelledby])',
      '[role="button"]:not([aria-label]):not([aria-labelledby])',
    ];

    for (const selector of interactiveSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          // Check if element has an accessible name from content
          const text = (el.textContent || '').trim();
          const ariaLabel = el.getAttribute('aria-label');
          const ariaLabelledby = el.getAttribute('aria-labelledby');
          const title = el.getAttribute('title');

          // For inputs, check for associated label
          if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
            const id = el.getAttribute('id');
            if (id) {
              const label = document.querySelector(`label[for="${id}"]`);
              if (label) continue;
            }
            // Check for wrapping label
            if (el.closest('label')) continue;
            // Check for placeholder (not ideal, but provides some name)
            if ((el as HTMLInputElement).placeholder) continue;
          }

          if (!text && !ariaLabel && !ariaLabelledby && !title) {
            issues.push(describeElement(el));
          }
        }
      } catch {
        continue;
      }
    }

    return issues.slice(0, 50);
  }

  private checkTabOrder(): string[] {
    const issues: string[] = [];

    // tabindex > 0 is an anti-pattern
    const elements = document.querySelectorAll('[tabindex]');
    for (const el of Array.from(elements)) {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0', 10);
      if (tabindex > 0) {
        issues.push(`${describeElement(el)} has tabindex="${tabindex}" (should be 0 or -1)`);
      }
    }

    return issues;
  }

  private checkSemanticIssues(): string[] {
    const issues: string[] = [];

    // 1. Divs with click handlers but no role="button"
    const allElements = document.querySelectorAll('div, span');
    for (const el of Array.from(allElements).slice(0, 500)) {
      const hasClick = el.getAttribute('onclick') || el.getAttribute('ng-click') || el.getAttribute('@click');
      const hasRole = el.getAttribute('role');
      const hasTabindex = el.getAttribute('tabindex');

      if (hasClick && !hasRole) {
        issues.push(`${describeElement(el)} has click handler but no role attribute`);
      }

      // Check for cursor: pointer without role (heuristic for JS click handlers)
      try {
        const style = getCachedStyle(el);
        if (style.cursor === 'pointer' && !hasRole && !hasTabindex && el.tagName !== 'A' && el.tagName !== 'BUTTON') {
          issues.push(`${describeElement(el)} has cursor:pointer but no role or tabindex`);
        }
      } catch {
        // Skip
      }
    }

    // 2. Missing heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let lastLevel = 0;
    const h1Count = document.querySelectorAll('h1').length;

    if (h1Count === 0) {
      issues.push('Page is missing an h1 element');
    } else if (h1Count > 1) {
      issues.push(`Page has ${h1Count} h1 elements (should have exactly 1)`);
    }

    for (const heading of Array.from(headings)) {
      const level = parseInt(heading.tagName.charAt(1), 10);
      if (lastLevel > 0 && level > lastLevel + 1) {
        issues.push(`Heading hierarchy skips from h${lastLevel} to h${level} at "${(heading.textContent || '').trim().slice(0, 50)}"`);
      }
      lastLevel = level;
    }

    // 3. Missing landmarks
    const hasMain = document.querySelector('main, [role="main"]') !== null;
    const hasNav = document.querySelector('nav, [role="navigation"]') !== null;
    const hasBanner = document.querySelector('header, [role="banner"]') !== null;
    const hasContentinfo = document.querySelector('footer, [role="contentinfo"]') !== null;

    if (!hasMain) issues.push('Page is missing a <main> landmark');
    if (!hasNav) issues.push('Page is missing a <nav> landmark');
    if (!hasBanner) issues.push('Page is missing a <header>/<banner> landmark');
    if (!hasContentinfo) issues.push('Page is missing a <footer>/<contentinfo> landmark');

    // 4. Form inputs without labels
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea');
    for (const input of Array.from(inputs)) {
      const id = input.getAttribute('id');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');
      const wrappedInLabel = input.closest('label');

      if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && !wrappedInLabel) {
        issues.push(`${describeElement(input)} has no associated label`);
      }
    }

    return issues.slice(0, 50);
  }

  private checkFocusIndicators(): string[] {
    const issues: string[] = [];

    // Check if stylesheets contain :focus styles
    const focusableElements = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // We check CSSOM for focus rules
    const hasFocusRules = this.detectFocusRulesInStylesheets();

    if (!hasFocusRules) {
      issues.push('No :focus or :focus-visible CSS rules found - interactive elements may lack focus indicators');
    }

    // Check specific elements for outline: none or outline: 0 without alternative
    for (const el of Array.from(focusableElements).slice(0, 200)) {
      try {
        const style = getCachedStyle(el);
        // These are default styles, not focus styles, but we check for outline:none
        // which is sometimes set globally
        if (style.outlineStyle === 'none' && style.outlineWidth === '0px') {
          // Check if there's a box-shadow or border that might serve as focus indicator
          // This is a heuristic - can't fully determine without triggering :focus
          const hasAlternative = style.boxShadow !== 'none';
          if (!hasAlternative) {
            // Only flag a few to avoid noise
            if (issues.length < 10) {
              issues.push(`${describeElement(el)} has outline:none without visible focus alternative`);
            }
          }
        }
      } catch {
        continue;
      }
    }

    return issues;
  }

  private detectFocusRulesInStylesheets(): boolean {
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue; // Cross-origin
        }

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule instanceof CSSStyleRule) {
            if (rule.selectorText && (
              rule.selectorText.includes(':focus') ||
              rule.selectorText.includes(':focus-visible') ||
              rule.selectorText.includes(':focus-within')
            )) {
              return true;
            }
          } else if (rule instanceof CSSMediaRule) {
            for (let k = 0; k < rule.cssRules.length; k++) {
              const innerRule = rule.cssRules[k];
              if (innerRule instanceof CSSStyleRule && innerRule.selectorText &&
                (innerRule.selectorText.includes(':focus') || innerRule.selectorText.includes(':focus-visible'))) {
                return true;
              }
            }
          }
        }
      }
    } catch {
      // Stylesheet access error
    }
    return false;
  }

  protected emptyResult(): AccessibilityAudit {
    return {
      contrastIssues: [],
      missingAltText: [],
      missingAriaLabels: [],
      tabOrderIssues: [],
      semanticIssues: [],
      focusIndicatorsMissing: [],
      overallScore: 0,
      wcagLevel: 'FAIL',
    };
  }
}
