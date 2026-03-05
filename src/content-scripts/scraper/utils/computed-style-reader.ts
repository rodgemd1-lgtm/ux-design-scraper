/**
 * Batch computed style reader for efficient DOM style extraction.
 * Caches getComputedStyle calls to avoid redundant reflows.
 */

const styleCache = new WeakMap<Element, CSSStyleDeclaration>();

export function getCachedStyle(el: Element): CSSStyleDeclaration {
  let style = styleCache.get(el);
  if (!style) {
    style = window.getComputedStyle(el);
    styleCache.set(el, style);
  }
  return style;
}

export function clearStyleCache(): void {
  // WeakMap entries are automatically GC'd when elements are removed,
  // but we expose this for explicit cleanup between extraction runs.
  // Since WeakMap doesn't have clear(), we just create a note for callers
  // that re-extraction will rebuild the cache.
}

export interface StyleProperties {
  [key: string]: string;
}

/**
 * Read multiple CSS properties from an element at once.
 */
export function readStyles(el: Element, properties: string[]): StyleProperties {
  const computed = getCachedStyle(el);
  const result: StyleProperties = {};
  for (const prop of properties) {
    result[prop] = computed.getPropertyValue(prop) || (computed as any)[prop] || '';
  }
  return result;
}

/**
 * Read a single CSS property from an element.
 */
export function readStyle(el: Element, property: string): string {
  const computed = getCachedStyle(el);
  return computed.getPropertyValue(property) || (computed as any)[property] || '';
}

/**
 * Batch-read styles from multiple elements for the same set of properties.
 * Returns a Map keyed by element.
 */
export function batchReadStyles(
  elements: Element[],
  properties: string[]
): Map<Element, StyleProperties> {
  const results = new Map<Element, StyleProperties>();
  for (const el of elements) {
    results.set(el, readStyles(el, properties));
  }
  return results;
}

/**
 * Check if an element is visible (has dimensions and is not hidden).
 */
export function isVisible(el: Element): boolean {
  const style = getCachedStyle(el);
  if (style.display === 'none') return false;
  if (style.visibility === 'hidden') return false;
  if (style.opacity === '0') return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

/**
 * Get the effective background color of an element,
 * walking up the DOM tree if the element's background is transparent.
 */
export function getEffectiveBackgroundColor(el: Element): string {
  let current: Element | null = el;
  while (current) {
    const style = getCachedStyle(current);
    const bg = style.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
      return bg;
    }
    current = current.parentElement;
  }
  // Default to white if no background found
  return 'rgb(255, 255, 255)';
}
