/**
 * Conversion Pattern Analyzer
 * Analyzes conversion patterns: CTAs, social proof, form fields,
 * urgency patterns, and trust badges.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { ConversionPatterns } from '@shared/types';

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

export class ConversionPatternAnalyzer extends BaseExtractor<ConversionPatterns> {
  constructor() {
    super('conversion-patterns');
  }

  protected async doExtract(): Promise<ConversionPatterns> {
    const ctas = this.extractCTAs();
    const socialProof = this.extractSocialProof();
    const formFields = this.extractFormFields();
    const urgencyPatterns = this.extractUrgencyPatterns();
    const trustBadges = this.extractTrustBadges();

    return {
      ctas,
      socialProof,
      formFields,
      urgencyPatterns,
      trustBadges,
    };
  }

  private extractCTAs(): { text: string; position: string; size: string; color: string; prominence: number }[] {
    const ctas: { text: string; position: string; size: string; color: string; prominence: number }[] = [];
    const foldY = window.innerHeight;

    // Collect all buttons and prominent links
    const candidates = document.querySelectorAll(
      'button, [role="button"], a[href], input[type="submit"], input[type="button"]'
    );

    for (const el of Array.from(candidates)) {
      try {
        const text = this.getElementText(el);
        if (!text || text.length < 2 || text.length > 100) continue;

        const style = getCachedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') continue;

        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const bgColor = style.backgroundColor;
        const hasBg = bgColor && bgColor !== 'transparent' && bgColor !== 'rgba(0, 0, 0, 0)';
        const fontSize = parseFloat(style.fontSize);
        const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);

        // Calculate prominence score (0-100)
        let prominence = 0;

        // Size factors
        if (rect.width > 150) prominence += 15;
        else if (rect.width > 100) prominence += 10;
        if (rect.height > 40) prominence += 10;
        if (fontSize >= 18) prominence += 15;
        else if (fontSize >= 16) prominence += 10;

        // Styling factors
        if (hasBg) prominence += 20;
        if (padding > 12) prominence += 10;
        if (style.fontWeight === '700' || style.fontWeight === 'bold') prominence += 5;

        // Position factors
        if (rect.top < foldY) prominence += 15; // Above the fold
        const centerX = Math.abs(rect.left + rect.width / 2 - window.innerWidth / 2);
        if (centerX < window.innerWidth * 0.25) prominence += 10; // Near center

        // Text factors (action words)
        const lowerText = text.toLowerCase();
        const actionWords = ['get started', 'sign up', 'try', 'buy', 'shop', 'subscribe', 'join', 'start', 'free', 'now'];
        if (actionWords.some(w => lowerText.includes(w))) prominence += 10;

        // Only include elements with some prominence
        if (prominence < 20) continue;

        // For links, only include button-styled ones
        if (el.tagName === 'A' && !hasBg && padding < 8 && fontSize < 16) continue;

        const position = rect.top < foldY ? 'above-fold' : 'below-fold';
        const size = `${Math.round(rect.width)}x${Math.round(rect.height)}`;

        ctas.push({
          text,
          position,
          size,
          color: hasBg ? bgColor : style.color,
          prominence: Math.min(100, prominence),
        });
      } catch {
        continue;
      }
    }

    // Sort by prominence descending
    ctas.sort((a, b) => b.prominence - a.prominence);
    return ctas.slice(0, 30);
  }

  private extractSocialProof(): { type: string; content: string; position: string }[] {
    const proofs: { type: string; content: string; position: string }[] = [];
    const foldY = window.innerHeight;

    const selectors = [
      { type: 'testimonial', patterns: ['testimonial', 'quote', 'review', 'feedback'] },
      { type: 'rating', patterns: ['rating', 'stars', 'score', 'review-score'] },
      { type: 'trust', patterns: ['trust', 'trusted', 'as-seen', 'featured-in', 'press', 'media'] },
      { type: 'client', patterns: ['client', 'customer', 'partner', 'logo-grid', 'logo-wall', 'brand'] },
      { type: 'social-proof', patterns: ['social-proof', 'proof', 'counter', 'users', 'members', 'companies'] },
      { type: 'certification', patterns: ['certified', 'award', 'badge', 'accredited'] },
    ];

    for (const { type, patterns } of selectors) {
      for (const pattern of patterns) {
        try {
          const elements = document.querySelectorAll(
            `[class*="${pattern}" i], [id*="${pattern}" i]`
          );

          for (const el of Array.from(elements)) {
            const text = (el.textContent || '').trim().slice(0, 200);
            if (!text || text.length < 5) continue;

            const rect = el.getBoundingClientRect();
            const position = rect.top < foldY ? 'above-fold' : 'below-fold';

            proofs.push({ type, content: text, position });
          }
        } catch {
          continue;
        }
      }
    }

    // Also check for star ratings (common pattern: ★ or unicode stars)
    const bodyText = document.body.textContent || '';
    const starPatterns = [
      /(\d+(?:\.\d+)?)\s*(?:\/\s*5|out of 5|stars?)/gi,
      /(\d+[\s,]*\d*)\+?\s*(?:reviews?|ratings?|customers?|users?)/gi,
    ];

    for (const pattern of starPatterns) {
      const matches = bodyText.match(pattern);
      if (matches) {
        for (const match of matches.slice(0, 5)) {
          proofs.push({ type: 'social-proof', content: match.trim(), position: 'unknown' });
        }
      }
    }

    return proofs.slice(0, 30);
  }

  private extractFormFields(): { label: string; type: string; required: boolean }[] {
    const fields: { label: string; type: string; required: boolean }[] = [];

    const inputs = document.querySelectorAll('input, select, textarea');
    for (const input of Array.from(inputs)) {
      const htmlInput = input as HTMLInputElement;
      const type = htmlInput.type || input.tagName.toLowerCase();

      // Skip hidden, submit, button types
      if (['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;

      const required = htmlInput.required || htmlInput.getAttribute('aria-required') === 'true';

      // Find label
      let label = '';
      const id = input.id;
      if (id) {
        const labelEl = document.querySelector(`label[for="${id}"]`);
        if (labelEl) label = (labelEl.textContent || '').trim();
      }
      if (!label) {
        const parentLabel = input.closest('label');
        if (parentLabel) label = (parentLabel.textContent || '').trim();
      }
      if (!label) {
        label = htmlInput.placeholder || htmlInput.name || htmlInput.getAttribute('aria-label') || type;
      }

      fields.push({
        label: label.slice(0, 100),
        type,
        required,
      });
    }

    return fields;
  }

  private extractUrgencyPatterns(): { type: string; content: string }[] {
    const patterns: { type: string; content: string }[] = [];
    const bodyText = (document.body.textContent || '').toLowerCase();

    // Text-based urgency
    const urgencyRegexes: { type: string; regex: RegExp }[] = [
      { type: 'limited-time', regex: /limited[\s-]?time[\s\w]*/gi },
      { type: 'hurry', regex: /hurry[\s\w!]*/gi },
      { type: 'scarcity', regex: /only\s+\d+\s+(?:left|remaining|available)/gi },
      { type: 'deadline', regex: /(?:offer|deal|sale)\s+(?:ends?|expires?)\s+[\w\s]*/gi },
      { type: 'countdown', regex: /\d+\s*(?:days?|hours?|minutes?|seconds?)\s*(?:left|remaining)/gi },
      { type: 'exclusive', regex: /(?:exclusive|special)\s+(?:offer|deal|discount)/gi },
      { type: 'fomo', regex: /(?:don'?t miss|act now|before it'?s too late)/gi },
      { type: 'discount', regex: /(?:\d+%?\s*off|save\s+\$?\d+)/gi },
    ];

    for (const { type, regex } of urgencyRegexes) {
      const matches = bodyText.match(regex);
      if (matches) {
        for (const match of matches.slice(0, 3)) {
          patterns.push({ type, content: match.trim() });
        }
      }
    }

    // Countdown timer elements
    const timerSelectors = [
      '[class*="countdown" i]', '[class*="timer" i]',
      '[class*="clock" i]', '[id*="countdown" i]',
    ];

    for (const selector of timerSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = (el.textContent || '').trim().slice(0, 100);
          if (text) {
            patterns.push({ type: 'countdown-timer', content: text });
          }
        }
      } catch {
        continue;
      }
    }

    return patterns.slice(0, 20);
  }

  private extractTrustBadges(): string[] {
    const badges = new Set<string>();

    // Image-based trust badges near checkout/CTA areas
    const trustKeywords = ['secure', 'guarantee', 'certified', 'ssl', 'safe', 'verified',
      'money-back', 'refund', 'protection', 'trust', 'trusted', 'norton', 'mcafee',
      'bbb', 'stripe', 'visa', 'mastercard', 'amex'];

    // Check images
    const images = document.querySelectorAll('img');
    for (const img of Array.from(images)) {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      const src = (img.src || '').toLowerCase();
      const classes = (typeof img.className === 'string' ? img.className : '').toLowerCase();

      for (const keyword of trustKeywords) {
        if (alt.includes(keyword) || src.includes(keyword) || classes.includes(keyword)) {
          badges.add(alt || src.split('/').pop() || keyword);
          break;
        }
      }
    }

    // Check text-based trust indicators
    const trustSelectors = [
      '[class*="trust" i]', '[class*="badge" i]', '[class*="secure" i]',
      '[class*="guarantee" i]', '[class*="certification" i]',
    ];

    for (const selector of trustSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          const text = (el.textContent || '').trim();
          if (text && text.length > 3 && text.length < 100) {
            badges.add(text);
          }
        }
      } catch {
        continue;
      }
    }

    return Array.from(badges).slice(0, 20);
  }

  private getElementText(el: Element): string {
    if (el.tagName === 'INPUT') {
      return (el as HTMLInputElement).value || el.getAttribute('aria-label') || '';
    }
    return (el.textContent || '').trim().replace(/\s+/g, ' ');
  }

  protected emptyResult(): ConversionPatterns {
    return {
      ctas: [],
      socialProof: [],
      formFields: [],
      urgencyPatterns: [],
      trustBadges: [],
    };
  }
}
