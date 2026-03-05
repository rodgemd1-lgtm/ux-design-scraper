/**
 * Heuristic classifier for UI element types based on
 * tag name, CSS classes, content, ARIA roles, and structure.
 */

export type ComponentType =
  | 'button' | 'card' | 'form' | 'input' | 'select' | 'modal' | 'dialog'
  | 'nav' | 'header' | 'footer' | 'hero' | 'sidebar' | 'table' | 'list'
  | 'tabs' | 'accordion' | 'dropdown' | 'tooltip' | 'badge' | 'avatar'
  | 'breadcrumb' | 'pagination' | 'progress' | 'skeleton' | 'alert'
  | 'toast' | 'banner' | 'carousel' | 'gallery' | 'pricing'
  | 'unknown';

interface ClassificationRule {
  type: ComponentType;
  score: number;
  match: (el: Element, classes: string, role: string, tag: string) => boolean;
}

const RULES: ClassificationRule[] = [
  // Semantic HTML first (highest confidence)
  { type: 'nav', score: 10, match: (_el, _c, _r, tag) => tag === 'nav' },
  { type: 'header', score: 10, match: (_el, _c, _r, tag) => tag === 'header' },
  { type: 'footer', score: 10, match: (_el, _c, _r, tag) => tag === 'footer' },
  { type: 'table', score: 10, match: (_el, _c, _r, tag) => tag === 'table' },
  { type: 'form', score: 10, match: (_el, _c, _r, tag) => tag === 'form' },
  { type: 'dialog', score: 10, match: (_el, _c, _r, tag) => tag === 'dialog' },
  { type: 'progress', score: 10, match: (_el, _c, _r, tag) => tag === 'progress' || tag === 'meter' },

  // ARIA roles
  { type: 'button', score: 9, match: (_el, _c, role) => role === 'button' },
  { type: 'dialog', score: 9, match: (_el, _c, role) => role === 'dialog' || role === 'alertdialog' },
  { type: 'nav', score: 9, match: (_el, _c, role) => role === 'navigation' },
  { type: 'tabs', score: 9, match: (_el, _c, role) => role === 'tablist' || role === 'tab' },
  { type: 'alert', score: 9, match: (_el, _c, role) => role === 'alert' || role === 'status' },
  { type: 'breadcrumb', score: 9, match: (_el, _c, role, _t) => role === 'navigation' },
  { type: 'tooltip', score: 9, match: (_el, _c, role) => role === 'tooltip' },
  { type: 'list', score: 8, match: (_el, _c, role) => role === 'list' || role === 'listbox' },
  { type: 'banner', score: 8, match: (_el, _c, role) => role === 'banner' },
  { type: 'sidebar', score: 8, match: (_el, _c, role) => role === 'complementary' },

  // Tags
  { type: 'button', score: 8, match: (_el, _c, _r, tag) => tag === 'button' },
  { type: 'input', score: 8, match: (_el, _c, _r, tag) => tag === 'input' || tag === 'textarea' },
  { type: 'select', score: 8, match: (_el, _c, _r, tag) => tag === 'select' },
  { type: 'list', score: 7, match: (_el, _c, _r, tag) => tag === 'ul' || tag === 'ol' },

  // Class-based patterns
  { type: 'hero', score: 7, match: (_el, c) => /\bhero\b/i.test(c) },
  { type: 'card', score: 7, match: (_el, c) => /\bcard\b/i.test(c) },
  { type: 'modal', score: 7, match: (_el, c) => /\bmodal\b/i.test(c) || /\bdialog\b/i.test(c) },
  { type: 'sidebar', score: 7, match: (_el, c) => /\bsidebar\b/i.test(c) || /\bside-bar\b/i.test(c) || /\baside\b/i.test(c) },
  { type: 'dropdown', score: 7, match: (_el, c) => /\bdropdown\b/i.test(c) || /\bdrop-down\b/i.test(c) },
  { type: 'tabs', score: 7, match: (_el, c) => /\btab[s]?\b/i.test(c) && !/\btable\b/i.test(c) },
  { type: 'accordion', score: 7, match: (_el, c) => /\baccordion\b/i.test(c) || /\bcollapsible\b/i.test(c) },
  { type: 'tooltip', score: 7, match: (_el, c) => /\btooltip\b/i.test(c) || /\bpopover\b/i.test(c) },
  { type: 'badge', score: 7, match: (_el, c) => /\bbadge\b/i.test(c) || /\btag\b/i.test(c) || /\bchip\b/i.test(c) },
  { type: 'avatar', score: 7, match: (_el, c) => /\bavatar\b/i.test(c) },
  { type: 'breadcrumb', score: 7, match: (_el, c) => /\bbreadcrumb\b/i.test(c) },
  { type: 'pagination', score: 7, match: (_el, c) => /\bpagination\b/i.test(c) || /\bpager\b/i.test(c) },
  { type: 'skeleton', score: 7, match: (_el, c) => /\bskeleton\b/i.test(c) || /\bplaceholder\b/i.test(c) },
  { type: 'alert', score: 7, match: (_el, c) => /\balert\b/i.test(c) || /\bnotification\b/i.test(c) },
  { type: 'toast', score: 7, match: (_el, c) => /\btoast\b/i.test(c) || /\bsnackbar\b/i.test(c) },
  { type: 'banner', score: 7, match: (_el, c) => /\bbanner\b/i.test(c) },
  { type: 'carousel', score: 7, match: (_el, c) => /\bcarousel\b/i.test(c) || /\bslider\b/i.test(c) || /\bswiper\b/i.test(c) },
  { type: 'gallery', score: 7, match: (_el, c) => /\bgallery\b/i.test(c) || /\blightbox\b/i.test(c) },
  { type: 'pricing', score: 7, match: (_el, c) => /\bpricing\b/i.test(c) || /\bprice\b/i.test(c) },
  { type: 'nav', score: 6, match: (_el, c) => /\bnav\b/i.test(c) || /\bmenu\b/i.test(c) || /\bnavbar\b/i.test(c) },
  { type: 'header', score: 6, match: (_el, c) => /\bheader\b/i.test(c) || /\btop-bar\b/i.test(c) },
  { type: 'footer', score: 6, match: (_el, c) => /\bfooter\b/i.test(c) },
  { type: 'form', score: 6, match: (_el, c) => /\bform\b/i.test(c) },
  { type: 'button', score: 6, match: (_el, c) => /\bbtn\b/i.test(c) || /\bbutton\b/i.test(c) },

  // Structural heuristics
  { type: 'hero', score: 5, match: (el) => {
    if (el.tagName !== 'SECTION' && el.tagName !== 'DIV') return false;
    const rect = el.getBoundingClientRect();
    // Hero sections are typically large, near the top, and full-width
    return rect.height > 300 && rect.top < 200 && rect.width > window.innerWidth * 0.8;
  }},
  { type: 'card', score: 5, match: (el) => {
    const style = window.getComputedStyle(el);
    return (
      style.borderRadius !== '0px' &&
      (style.boxShadow !== 'none' || style.border !== '') &&
      el.children.length >= 2
    );
  }},
];

/**
 * Classify an element into a UI component type.
 * Returns the best matching type and confidence score.
 */
export function classifyElement(el: Element): { type: ComponentType; confidence: number } {
  const tag = el.tagName.toLowerCase();
  const classes = typeof el.className === 'string' ? el.className : '';
  const role = el.getAttribute('role') || '';

  let bestType: ComponentType = 'unknown';
  let bestScore = 0;

  for (const rule of RULES) {
    try {
      if (rule.match(el, classes, role, tag) && rule.score > bestScore) {
        bestType = rule.type;
        bestScore = rule.score;
      }
    } catch {
      // Skip rules that throw (e.g., getBoundingClientRect on detached elements)
    }
  }

  // Normalize score to 0-1 confidence
  const confidence = bestScore / 10;

  return { type: bestType, confidence };
}

/**
 * Get a descriptive name for an element based on its content and structure.
 */
export function getComponentName(el: Element, type: ComponentType): string {
  // Try ID first
  if (el.id) return el.id;

  // Try aria-label
  const ariaLabel = el.getAttribute('aria-label');
  if (ariaLabel) return ariaLabel;

  // Try class-based name
  const classes = typeof el.className === 'string' ? el.className : '';
  if (classes) {
    // Find the most descriptive class (longest, non-utility)
    const classList = classes.trim().split(/\s+/);
    const descriptive = classList.find(c =>
      c.length > 3 &&
      !/^(w-|h-|p-|m-|text-|bg-|flex|grid|block|hidden|relative|absolute)/.test(c)
    );
    if (descriptive) return descriptive;
  }

  // Try heading content
  const heading = el.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const text = (heading.textContent || '').trim().slice(0, 40);
    if (text) return `${type}-${text.replace(/\s+/g, '-').toLowerCase()}`;
  }

  // Fall back to type + index
  return type;
}

/**
 * Check if an element is a "significant" component worth extracting.
 * Filters out small utility elements and text nodes.
 */
export function isSignificantComponent(el: Element): boolean {
  const tag = el.tagName.toLowerCase();

  // Skip inline/text elements
  if (['span', 'a', 'em', 'strong', 'b', 'i', 'u', 'small', 'br', 'hr', 'img', 'svg'].includes(tag)) {
    return false;
  }

  // Skip script/style/meta
  if (['script', 'style', 'link', 'meta', 'noscript', 'template'].includes(tag)) {
    return false;
  }

  // Must have some content
  if (el.children.length === 0 && !(el.textContent || '').trim()) {
    return false;
  }

  // Must have some visual presence
  try {
    const rect = el.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return false;
  } catch {
    return false;
  }

  return true;
}
