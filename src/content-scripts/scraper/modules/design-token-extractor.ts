/**
 * Design Token Extractor
 * Extracts colors, spacing, shadows, border radii, z-indices, and opacities
 * from all elements via getComputedStyle.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';

// Inline type from @shared/types since content scripts use webpack alias
import type { DesignTokens, TokenEntry } from '@shared/types';

// Inline utility from @shared/utils
function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

const MAX_ELEMENTS = 2000;

export class DesignTokenExtractor extends BaseExtractor<DesignTokens> {
  constructor() {
    super('design-tokens');
  }

  protected async doExtract(): Promise<DesignTokens> {
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    const colorMap = new Map<string, { count: number; contexts: Set<string>; property: string }>();
    const spacingMap = new Map<string, { count: number; contexts: Set<string>; property: string }>();
    const shadowMap = new Map<string, { count: number; contexts: Set<string> }>();
    const radiusMap = new Map<string, { count: number; contexts: Set<string> }>();
    const zIndices: { value: number; element: string }[] = [];
    const opacities: { value: number; context: string }[] = [];

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      const desc = describeElement(el);

      let style: CSSStyleDeclaration;
      try {
        style = getCachedStyle(el);
      } catch {
        continue;
      }

      // ---- Colors ----
      const colorProps = [
        { prop: 'backgroundColor', name: 'background-color' },
        { prop: 'color', name: 'color' },
        { prop: 'borderTopColor', name: 'border-color' },
        { prop: 'outlineColor', name: 'outline-color' },
      ];

      for (const { prop, name } of colorProps) {
        const value = (style as any)[prop] as string;
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
          const existing = colorMap.get(value);
          if (existing) {
            existing.count++;
            existing.contexts.add(desc);
          } else {
            colorMap.set(value, { count: 1, contexts: new Set([desc]), property: name });
          }
        }
      }

      // ---- Spacing ----
      const spacingProps = [
        'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      ];

      for (const prop of spacingProps) {
        const value = (style as any)[prop] as string;
        if (value && value !== '0px' && value !== '0') {
          const propName = prop.replace(/([A-Z])/g, '-$1').toLowerCase();
          const existing = spacingMap.get(value);
          if (existing) {
            existing.count++;
            existing.contexts.add(desc);
          } else {
            spacingMap.set(value, { count: 1, contexts: new Set([desc]), property: propName });
          }
        }
      }

      // ---- Shadows ----
      const boxShadow = style.boxShadow;
      if (boxShadow && boxShadow !== 'none') {
        const existing = shadowMap.get(boxShadow);
        if (existing) {
          existing.count++;
          existing.contexts.add(desc);
        } else {
          shadowMap.set(boxShadow, { count: 1, contexts: new Set([desc]) });
        }
      }

      // ---- Border Radii ----
      const borderRadius = style.borderRadius;
      if (borderRadius && borderRadius !== '0px' && borderRadius !== '0') {
        const existing = radiusMap.get(borderRadius);
        if (existing) {
          existing.count++;
          existing.contexts.add(desc);
        } else {
          radiusMap.set(borderRadius, { count: 1, contexts: new Set([desc]) });
        }
      }

      // ---- Z-Indices ----
      const zIndex = style.zIndex;
      if (zIndex && zIndex !== 'auto' && zIndex !== '0') {
        const numVal = parseInt(zIndex, 10);
        if (!isNaN(numVal)) {
          zIndices.push({ value: numVal, element: desc });
        }
      }

      // ---- Opacities ----
      const opacity = parseFloat(style.opacity);
      if (!isNaN(opacity) && opacity < 1 && opacity > 0) {
        opacities.push({ value: opacity, context: desc });
      }
    }

    // Convert maps to sorted arrays
    const colors = this.mapToTokenEntries(colorMap);
    const spacing = this.mapToTokenEntries(spacingMap);
    const shadows = this.mapToTokenEntries(shadowMap);
    const borderRadii = this.mapToTokenEntries(radiusMap);

    // Deduplicate z-indices by value
    const seenZ = new Set<number>();
    const uniqueZ: { value: number; element: string }[] = [];
    for (const z of zIndices) {
      if (!seenZ.has(z.value)) {
        seenZ.add(z.value);
        uniqueZ.push(z);
      }
    }
    uniqueZ.sort((a, b) => b.value - a.value);

    // Deduplicate opacities by value
    const seenOp = new Set<number>();
    const uniqueOp: { value: number; context: string }[] = [];
    for (const op of opacities) {
      if (!seenOp.has(op.value)) {
        seenOp.add(op.value);
        uniqueOp.push(op);
      }
    }
    uniqueOp.sort((a, b) => b.value - a.value);

    return {
      colors,
      spacing,
      shadows,
      borderRadii,
      zIndices: uniqueZ,
      opacities: uniqueOp,
    };
  }

  private mapToTokenEntries(
    map: Map<string, { count: number; contexts: Set<string>; property?: string }>
  ): TokenEntry[] {
    const entries: TokenEntry[] = [];
    for (const [value, data] of map) {
      entries.push({
        value,
        count: data.count,
        contexts: Array.from(data.contexts).slice(0, 10), // Limit context list
        property: data.property,
      });
    }
    entries.sort((a, b) => b.count - a.count);
    return entries;
  }

  protected emptyResult(): DesignTokens {
    return {
      colors: [],
      spacing: [],
      shadows: [],
      borderRadii: [],
      zIndices: [],
      opacities: [],
    };
  }
}
