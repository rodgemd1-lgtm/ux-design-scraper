/**
 * State Variant Detector
 * Detects component state variants (hover, focus, active, disabled, etc.)
 * by inspecting CSSOM rules and element attributes.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import { captureStateDiff, STATE_SENSITIVE_PROPERTIES } from '../utils/state-trigger';
import type { ComponentData } from '@shared/types';

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const parts: string[] = [];
  let current: Element | null = el;
  while (current && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    if (current.id) {
      parts.unshift(`#${current.id}`);
      break;
    }
    if (current.className && typeof current.className === 'string') {
      const classes = current.className.trim().split(/\s+/).slice(0, 2);
      if (classes.length > 0 && classes[0]) {
        selector += '.' + classes.join('.');
      }
    }
    const parent: Element | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c: Element) => c.tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(selector);
    current = parent;
  }
  return parts.join(' > ');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

interface StateVariantResult {
  components: ComponentData[];
}

export class StateVariantDetector extends BaseExtractor<StateVariantResult> {
  constructor() {
    super('state-variants');
  }

  protected async doExtract(): Promise<StateVariantResult> {
    const components: ComponentData[] = [];
    const processed = new Set<string>();

    // Find all interactive elements
    const interactiveSelectors = [
      'button', 'a[href]', 'input', 'select', 'textarea',
      '[role="button"]', '[role="tab"]', '[role="menuitem"]',
      '[role="checkbox"]', '[role="radio"]', '[role="switch"]',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const allInteractive: Element[] = [];
    for (const selector of interactiveSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          allInteractive.push(el);
        }
      } catch {
        continue;
      }
    }

    // Process unique elements (limit to 100 for performance)
    const limit = Math.min(allInteractive.length, 100);

    for (let i = 0; i < limit; i++) {
      const el = allInteractive[i];
      const selector = buildSelector(el);
      if (processed.has(selector)) continue;
      processed.add(selector);

      try {
        const stateVariants = this.detectVariants(el);

        // Only include elements with actual state variants
        if (Object.keys(stateVariants).length === 0) continue;

        const tag = el.tagName.toLowerCase();
        const name = el.id || el.getAttribute('aria-label') ||
          (el.textContent || '').trim().slice(0, 30) || `${tag}-${i}`;

        components.push({
          name,
          selector,
          html: truncate(el.outerHTML, 2000),
          css: this.getBaseStyles(el),
          type: tag === 'a' ? 'button' : tag,
          stateVariants,
        });
      } catch {
        continue;
      }
    }

    return { components };
  }

  private detectVariants(el: Element): Record<string, Record<string, string>> {
    const variants: Record<string, Record<string, string>> = {};

    // 1. Check CSSOM for pseudo-class rules
    const cssomVariants = this.detectCSSOMVariants(el);
    for (const [state, styles] of Object.entries(cssomVariants)) {
      if (Object.keys(styles).length > 0) {
        variants[state] = styles;
      }
    }

    // 2. Try programmatic state triggering for hover/focus
    // Only do this for a subset of elements to avoid performance issues
    if (el instanceof HTMLElement) {
      const statesToTrigger = ['hover', 'focus'] as const;
      for (const state of statesToTrigger) {
        if (variants[`:${state}`]) continue; // Already detected via CSSOM

        try {
          const diff = captureStateDiff(el, state, STATE_SENSITIVE_PROPERTIES);
          if (Object.keys(diff).length > 0) {
            variants[`:${state}`] = diff;
          }
        } catch {
          // Element may not support state triggering
        }
      }
    }

    // 3. Check for disabled state
    if (el.hasAttribute('disabled')) {
      try {
        const style = getCachedStyle(el);
        variants[':disabled'] = {
          opacity: style.opacity,
          cursor: style.cursor,
          'pointer-events': style.pointerEvents,
        };
      } catch {
        // Skip
      }
    }

    // 4. Check data/aria attributes that indicate state
    const dataState = el.getAttribute('data-state');
    if (dataState) {
      variants[`[data-state="${dataState}"]`] = {};
    }

    const ariaExpanded = el.getAttribute('aria-expanded');
    if (ariaExpanded !== null) {
      variants[`[aria-expanded="${ariaExpanded}"]`] = {};
    }

    const ariaSelected = el.getAttribute('aria-selected');
    if (ariaSelected !== null) {
      variants[`[aria-selected="${ariaSelected}"]`] = {};
    }

    const ariaChecked = el.getAttribute('aria-checked');
    if (ariaChecked !== null) {
      variants[`[aria-checked="${ariaChecked}"]`] = {};
    }

    const ariaPressed = el.getAttribute('aria-pressed');
    if (ariaPressed !== null) {
      variants[`[aria-pressed="${ariaPressed}"]`] = {};
    }

    return variants;
  }

  private detectCSSOMVariants(el: Element): Record<string, Record<string, string>> {
    const variants: Record<string, Record<string, string>> = {};
    const pseudoClasses = [':hover', ':focus', ':active', ':focus-visible', ':focus-within', ':disabled', ':checked'];

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue; // Cross-origin
        }

        this.scanRulesForElement(rules, el, pseudoClasses, variants);
      }
    } catch {
      // Stylesheet access error
    }

    return variants;
  }

  private scanRulesForElement(
    rules: CSSRuleList,
    el: Element,
    pseudoClasses: string[],
    variants: Record<string, Record<string, string>>
  ): void {
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];

      if (rule instanceof CSSStyleRule) {
        const ruleSelector = rule.selectorText;
        if (!ruleSelector) continue;

        for (const pseudo of pseudoClasses) {
          if (!ruleSelector.includes(pseudo)) continue;

          // Strip the pseudo-class to get base selector
          const baseSelector = ruleSelector.replace(new RegExp(`\\${pseudo}`, 'g'), '').trim();

          try {
            // Check if the element matches the base selector
            if (el.matches(baseSelector)) {
              const styles: Record<string, string> = {};
              for (let k = 0; k < rule.style.length; k++) {
                const prop = rule.style[k];
                styles[prop] = rule.style.getPropertyValue(prop);
              }
              variants[pseudo] = { ...variants[pseudo], ...styles };
            }
          } catch {
            // el.matches may throw for complex selectors
          }
        }
      } else if (rule instanceof CSSMediaRule) {
        // Recurse into media query rules
        this.scanRulesForElement(rule.cssRules, el, pseudoClasses, variants);
      }
    }
  }

  private getBaseStyles(el: Element): string {
    try {
      const style = getCachedStyle(el);
      const props = STATE_SENSITIVE_PROPERTIES;
      const lines: string[] = [];

      for (const prop of props) {
        const value = style.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' &&
            value !== '0px' && value !== '0') {
          lines.push(`  ${prop}: ${value};`);
        }
      }

      return `{\n${lines.join('\n')}\n}`;
    } catch {
      return '{}';
    }
  }

  protected emptyResult(): StateVariantResult {
    return { components: [] };
  }
}
