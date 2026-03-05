/**
 * Typography Extractor
 * Extracts the complete typography system: font families, weights, sizes,
 * line heights, and letter spacings.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { TypographySystem } from '@shared/types';

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

const MAX_ELEMENTS = 2000;

// Text-bearing elements to prioritize
const TEXT_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON',
  'LABEL', 'LI', 'TD', 'TH', 'FIGCAPTION', 'BLOCKQUOTE', 'CITE',
  'EM', 'STRONG', 'B', 'I', 'SMALL', 'MARK', 'DEL', 'INS', 'SUB', 'SUP',
  'CODE', 'PRE', 'LEGEND', 'CAPTION', 'DT', 'DD', 'SUMMARY',
]);

export class TypographyExtractor extends BaseExtractor<TypographySystem> {
  constructor() {
    super('typography');
  }

  protected async doExtract(): Promise<TypographySystem> {
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    const familyMap = new Map<string, { count: number; usage: Set<string> }>();
    const weightMap = new Map<string, number>();
    const sizeMap = new Map<string, { count: number; element: string }>();
    const lineHeightMap = new Map<string, number>();
    const letterSpacingMap = new Map<string, number>();

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      const tag = el.tagName;

      // Focus on text-bearing elements for relevance
      const hasDirectText = TEXT_TAGS.has(tag) || this.hasDirectTextContent(el);
      if (!hasDirectText) continue;

      let style: CSSStyleDeclaration;
      try {
        style = getCachedStyle(el);
      } catch {
        continue;
      }

      const desc = describeElement(el);

      // ---- Font Family ----
      const fontFamily = style.fontFamily;
      if (fontFamily) {
        // Normalize: take the primary family
        const primary = this.normalizeFontFamily(fontFamily);
        const existing = familyMap.get(primary);
        if (existing) {
          existing.count++;
          existing.usage.add(tag.toLowerCase());
        } else {
          familyMap.set(primary, { count: 1, usage: new Set([tag.toLowerCase()]) });
        }
      }

      // ---- Font Weight ----
      const fontWeight = style.fontWeight;
      if (fontWeight) {
        weightMap.set(fontWeight, (weightMap.get(fontWeight) || 0) + 1);
      }

      // ---- Font Size ----
      const fontSize = style.fontSize;
      if (fontSize) {
        const existing = sizeMap.get(fontSize);
        if (existing) {
          existing.count++;
        } else {
          sizeMap.set(fontSize, { count: 1, element: desc });
        }
      }

      // ---- Line Height ----
      const lineHeight = style.lineHeight;
      if (lineHeight && lineHeight !== 'normal') {
        lineHeightMap.set(lineHeight, (lineHeightMap.get(lineHeight) || 0) + 1);
      }

      // ---- Letter Spacing ----
      const letterSpacing = style.letterSpacing;
      if (letterSpacing && letterSpacing !== 'normal' && letterSpacing !== '0px') {
        letterSpacingMap.set(letterSpacing, (letterSpacingMap.get(letterSpacing) || 0) + 1);
      }
    }

    // Build result arrays
    const fontFamilies = Array.from(familyMap.entries())
      .map(([family, data]) => ({
        family,
        count: data.count,
        usage: Array.from(data.usage),
      }))
      .sort((a, b) => b.count - a.count);

    const fontWeights = Array.from(weightMap.entries())
      .map(([weight, count]) => ({ weight, count }))
      .sort((a, b) => b.count - a.count);

    const fontSizes = Array.from(sizeMap.entries())
      .map(([size, data]) => ({ size, count: data.count, element: data.element }))
      .sort((a, b) => {
        const aNum = parseFloat(a.size);
        const bNum = parseFloat(b.size);
        return bNum - aNum; // Sort by size descending
      });

    const lineHeights = Array.from(lineHeightMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    const letterSpacings = Array.from(letterSpacingMap.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count);

    return {
      fontFamilies,
      fontWeights,
      fontSizes,
      lineHeights,
      letterSpacings,
    };
  }

  private normalizeFontFamily(fontFamily: string): string {
    // Take the first font family from the stack, clean up quotes
    const first = fontFamily.split(',')[0].trim();
    return first.replace(/['"]/g, '');
  }

  private hasDirectTextContent(el: Element): boolean {
    for (const node of Array.from(el.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE && (node.textContent || '').trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  protected emptyResult(): TypographySystem {
    return {
      fontFamilies: [],
      fontWeights: [],
      fontSizes: [],
      lineHeights: [],
      letterSpacings: [],
    };
  }
}
