/**
 * Copy Analyzer
 * Analyzes page copy and microcopy: CTAs, error messages, placeholders,
 * tooltips, empty states, microcopy, and tone keywords.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle, isVisible } from '../utils/computed-style-reader';
import type { CopyAnalysis } from '@shared/types';

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

const ACTION_VERBS = [
  'get', 'start', 'try', 'sign', 'join', 'subscribe', 'buy', 'shop',
  'learn', 'discover', 'explore', 'create', 'build', 'download',
  'register', 'contact', 'request', 'book', 'schedule', 'claim',
  'unlock', 'upgrade', 'submit', 'apply', 'order', 'reserve',
  'activate', 'launch', 'continue', 'proceed', 'add', 'save',
];

const TONE_ADJECTIVES = [
  'free', 'easy', 'simple', 'fast', 'quick', 'powerful', 'secure',
  'trusted', 'reliable', 'modern', 'innovative', 'seamless', 'intuitive',
  'premium', 'exclusive', 'limited', 'instant', 'smart', 'beautiful',
  'elegant', 'professional', 'affordable', 'custom', 'personalized',
  'flexible', 'scalable', 'robust', 'efficient', 'delightful',
  'friendly', 'playful', 'bold', 'minimal', 'clean', 'fresh',
  'new', 'best', 'top', 'great', 'amazing', 'awesome',
];

export class CopyAnalyzer extends BaseExtractor<CopyAnalysis> {
  constructor() {
    super('copy-analysis');
  }

  protected async doExtract(): Promise<CopyAnalysis> {
    const ctaLabels = this.extractCTALabels();
    const errorMessages = this.extractErrorMessages();
    const placeholders = this.extractPlaceholders();
    const tooltips = this.extractTooltips();
    const emptyStateText = this.extractEmptyStateText();
    const microcopy = this.extractMicrocopy();
    const toneKeywords = this.extractToneKeywords();

    return {
      ctaLabels,
      errorMessages,
      placeholders,
      tooltips,
      emptyStateText,
      microcopy,
      toneKeywords,
    };
  }

  private extractCTALabels(): { text: string; element: string; count: number }[] {
    const ctaMap = new Map<string, { element: string; count: number }>();

    // Buttons
    const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]');
    for (const btn of Array.from(buttons)) {
      const text = this.getButtonText(btn);
      if (text && text.length > 0 && text.length < 100) {
        this.addToCTAMap(ctaMap, text, describeElement(btn));
      }
    }

    // Prominent links (styled as buttons or with prominent styling)
    const links = document.querySelectorAll('a');
    for (const link of Array.from(links)) {
      try {
        const style = getCachedStyle(link);
        const isProminent = this.isProminentLink(style, link);
        if (isProminent) {
          const text = (link.textContent || '').trim();
          if (text && text.length > 0 && text.length < 100) {
            this.addToCTAMap(ctaMap, text, describeElement(link));
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(ctaMap.entries())
      .map(([text, data]) => ({ text, element: data.element, count: data.count }))
      .sort((a, b) => b.count - a.count);
  }

  private getButtonText(el: Element): string {
    // For input elements, use the value attribute
    if (el.tagName === 'INPUT') {
      return (el as HTMLInputElement).value || '';
    }
    // For buttons, get visible text content
    const text = (el.textContent || '').trim();
    // Skip if it's just an icon (very short or empty)
    return text.length > 0 ? text : el.getAttribute('aria-label') || '';
  }

  private isProminentLink(style: CSSStyleDeclaration, el: Element): boolean {
    // Check if link has button-like styling
    const display = style.display;
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const bgColor = style.backgroundColor;
    const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';
    const borderRadius = parseFloat(style.borderRadius);
    const fontSize = parseFloat(style.fontSize);

    // Button-like: has padding, background color, or border-radius
    if (hasBg && padding > 8) return true;
    if (display === 'inline-block' || display === 'inline-flex' || display === 'flex') {
      if (padding > 10 || borderRadius > 2) return true;
    }
    // Large font with action verb
    if (fontSize >= 16) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (ACTION_VERBS.some(v => text.startsWith(v))) return true;
    }

    return false;
  }

  private addToCTAMap(map: Map<string, { element: string; count: number }>, text: string, element: string): void {
    const normalized = text.replace(/\s+/g, ' ').trim();
    const existing = map.get(normalized);
    if (existing) {
      existing.count++;
    } else {
      map.set(normalized, { element, count: 1 });
    }
  }

  private extractErrorMessages(): string[] {
    const messages = new Set<string>();

    // role="alert" elements
    const alerts = document.querySelectorAll('[role="alert"]');
    for (const alert of Array.from(alerts)) {
      const text = (alert.textContent || '').trim();
      if (text) messages.add(text.slice(0, 200));
    }

    // Class-based error/warning/danger elements
    const errorSelectors = [
      '[class*="error"]', '[class*="Error"]',
      '[class*="warning"]', '[class*="Warning"]',
      '[class*="danger"]', '[class*="Danger"]',
      '[class*="invalid"]', '[class*="Invalid"]',
      '.alert-danger', '.alert-warning', '.alert-error',
      '[data-error]', '[aria-invalid="true"]',
    ];

    for (const selector of errorSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = (el.textContent || '').trim();
          if (text && text.length > 3 && text.length < 300) {
            messages.add(text);
          }
        }
      } catch {
        // Invalid selector
      }
    }

    return Array.from(messages);
  }

  private extractPlaceholders(): { text: string; field: string }[] {
    const placeholders: { text: string; field: string }[] = [];
    const seen = new Set<string>();

    const inputs = document.querySelectorAll('input[placeholder], textarea[placeholder]');
    for (const input of Array.from(inputs)) {
      const placeholder = input.getAttribute('placeholder') || '';
      if (placeholder && !seen.has(placeholder)) {
        seen.add(placeholder);
        const name = input.getAttribute('name') || input.getAttribute('id') || input.getAttribute('type') || 'unknown';
        placeholders.push({ text: placeholder, field: name });
      }
    }

    return placeholders;
  }

  private extractTooltips(): string[] {
    const tooltips = new Set<string>();

    // Title attributes
    const titleElements = document.querySelectorAll('[title]');
    for (const el of Array.from(titleElements)) {
      const title = el.getAttribute('title') || '';
      if (title && title.length > 0 && title.length < 200) {
        tooltips.add(title);
      }
    }

    // role="tooltip" elements
    const tooltipElements = document.querySelectorAll('[role="tooltip"]');
    for (const el of Array.from(tooltipElements)) {
      const text = (el.textContent || '').trim();
      if (text) tooltips.add(text.slice(0, 200));
    }

    return Array.from(tooltips);
  }

  private extractEmptyStateText(): string[] {
    const emptyTexts = new Set<string>();

    const selectors = [
      '[class*="empty"]', '[class*="Empty"]',
      '[class*="no-results"]', '[class*="noResults"]', '[class*="NoResults"]',
      '[class*="placeholder"]', '[class*="Placeholder"]',
      '[class*="zero-state"]', '[class*="zeroState"]',
      '[class*="blank-slate"]', '[class*="blankSlate"]',
      '[class*="no-data"]', '[class*="noData"]',
      '[class*="empty-state"]', '[class*="emptyState"]',
    ];

    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = (el.textContent || '').trim();
          if (text && text.length > 5 && text.length < 300) {
            emptyTexts.add(text);
          }
        }
      } catch {
        // Invalid selector
      }
    }

    return Array.from(emptyTexts);
  }

  private extractMicrocopy(): { text: string; context: string }[] {
    const microcopy: { text: string; context: string }[] = [];
    const seen = new Set<string>();

    // Form labels
    const labels = document.querySelectorAll('label');
    for (const label of Array.from(labels)) {
      const text = (label.textContent || '').trim();
      if (text && text.length > 1 && text.length < 200 && !seen.has(text)) {
        seen.add(text);
        const forAttr = label.getAttribute('for');
        microcopy.push({ text, context: `label${forAttr ? ` for="${forAttr}"` : ''}` });
      }
    }

    // Help text / hints / descriptions
    const helpSelectors = [
      '[class*="help"]', '[class*="Help"]',
      '[class*="hint"]', '[class*="Hint"]',
      '[class*="description"]', '[class*="Description"]',
      '[class*="helper"]', '[class*="Helper"]',
      '[class*="caption"]', '[class*="Caption"]',
      '[class*="note"]', '[class*="Note"]',
      '[id*="help"]', '[id*="hint"]',
      '[aria-describedby]',
      'small',
    ];

    for (const selector of helpSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = (el.textContent || '').trim();
          if (text && text.length > 3 && text.length < 300 && !seen.has(text)) {
            seen.add(text);
            microcopy.push({ text, context: describeElement(el) });
          }
        }
      } catch {
        continue;
      }
    }

    return microcopy.slice(0, 100); // Limit output
  }

  private extractToneKeywords(): string[] {
    // Get all visible text on the page
    const bodyText = (document.body.textContent || '').toLowerCase();
    const words = bodyText.split(/\W+/).filter(w => w.length > 2);
    const wordFreq = new Map<string, number>();

    for (const word of words) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }

    const keywords: string[] = [];

    // Find matching action verbs
    for (const verb of ACTION_VERBS) {
      if (wordFreq.has(verb) && (wordFreq.get(verb)! > 0)) {
        keywords.push(verb);
      }
    }

    // Find matching tone adjectives
    for (const adj of TONE_ADJECTIVES) {
      if (wordFreq.has(adj) && (wordFreq.get(adj)! > 0)) {
        keywords.push(adj);
      }
    }

    // Sort by frequency
    keywords.sort((a, b) => (wordFreq.get(b) || 0) - (wordFreq.get(a) || 0));

    return keywords;
  }

  protected emptyResult(): CopyAnalysis {
    return {
      ctaLabels: [],
      errorMessages: [],
      placeholders: [],
      tooltips: [],
      emptyStateText: [],
      microcopy: [],
      toneKeywords: [],
    };
  }
}
