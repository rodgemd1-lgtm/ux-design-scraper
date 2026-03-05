/**
 * DOM tree walker with filtering, depth limits, and element limits.
 */

export interface WalkOptions {
  /** Maximum number of elements to process */
  maxElements?: number;
  /** Maximum depth to traverse */
  maxDepth?: number;
  /** Root element to start from (defaults to document.body) */
  root?: Element;
  /** Filter function to skip elements */
  filter?: (el: Element) => boolean;
  /** Tags to skip entirely (including children) */
  skipTags?: Set<string>;
}

const DEFAULT_SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'IFRAME',
]);

/**
 * Walk the DOM tree and collect elements matching criteria.
 */
export function walkDOM(options: WalkOptions = {}): Element[] {
  const {
    maxElements = 2000,
    maxDepth = 50,
    root = document.body,
    filter,
    skipTags = DEFAULT_SKIP_TAGS,
  } = options;

  const results: Element[] = [];
  if (!root) return results;

  const stack: { el: Element; depth: number }[] = [{ el: root, depth: 0 }];

  while (stack.length > 0 && results.length < maxElements) {
    const { el, depth } = stack.pop()!;

    if (depth > maxDepth) continue;
    if (skipTags.has(el.tagName)) continue;

    if (!filter || filter(el)) {
      results.push(el);
    }

    // Add children in reverse order so first child is processed first
    const children = el.children;
    for (let i = children.length - 1; i >= 0; i--) {
      stack.push({ el: children[i], depth: depth + 1 });
    }
  }

  return results;
}

/**
 * Walk and collect all elements, including SVGs.
 */
export function walkAllElements(options: Omit<WalkOptions, 'skipTags'> & { includeSvg?: boolean } = {}): Element[] {
  const skipTags = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'IFRAME']);
  if (!options.includeSvg) {
    // Don't skip SVG root, but we'll skip its children by default
  }
  return walkDOM({ ...options, skipTags });
}

/**
 * Get all elements matching a selector, limited to a max count.
 */
export function querySelectorAllLimited(selector: string, limit: number = 2000, root: Element | Document = document): Element[] {
  const all = root.querySelectorAll(selector);
  const results: Element[] = [];
  const max = Math.min(all.length, limit);
  for (let i = 0; i < max; i++) {
    results.push(all[i]);
  }
  return results;
}

/**
 * Get text content of an element, excluding script/style children.
 */
export function getVisibleText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  const scripts = clone.querySelectorAll('script, style, noscript');
  scripts.forEach(s => s.remove());
  return (clone.textContent || '').trim();
}

/**
 * Calculate the depth of an element from the document root.
 */
export function getElementDepth(el: Element): number {
  let depth = 0;
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    depth++;
    current = current.parentElement;
  }
  return depth;
}

/**
 * Find the closest ancestor matching a predicate.
 */
export function findAncestor(el: Element, predicate: (ancestor: Element) => boolean, maxLevels: number = 10): Element | null {
  let current: Element | null = el.parentElement;
  let level = 0;
  while (current && level < maxLevels) {
    if (predicate(current)) return current;
    current = current.parentElement;
    level++;
  }
  return null;
}
