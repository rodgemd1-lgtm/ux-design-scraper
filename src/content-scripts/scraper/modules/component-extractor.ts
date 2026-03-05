/**
 * Component Extractor
 * Identifies and extracts major UI components from the page based on
 * semantic HTML, ARIA roles, and common class patterns.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import { classifyElement, getComponentName, isSignificantComponent } from '../utils/element-classifier';
import type { ComponentData } from '@shared/types';

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + '...';
}

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

const MAX_COMPONENTS = 50;
const MAX_HTML_LENGTH = 5000;

export class ComponentExtractor extends BaseExtractor<ComponentData[]> {
  constructor() {
    super('components');
  }

  protected async doExtract(): Promise<ComponentData[]> {
    const components: ComponentData[] = [];
    const processedElements = new Set<Element>();

    // Phase 1: Semantic HTML elements
    const semanticSelectors = [
      'header', 'main', 'footer', 'nav', 'section', 'article', 'aside',
      'dialog', 'form',
    ];

    for (const selector of semanticSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of Array.from(elements)) {
        if (processedElements.has(el)) continue;
        if (components.length >= MAX_COMPONENTS) break;

        processedElements.add(el);
        const component = this.extractComponent(el);
        if (component) components.push(component);
      }
    }

    // Phase 2: ARIA role elements
    const roleSelectors = [
      '[role="dialog"]', '[role="alertdialog"]', '[role="navigation"]',
      '[role="banner"]', '[role="contentinfo"]', '[role="complementary"]',
      '[role="tablist"]', '[role="menu"]', '[role="menubar"]',
      '[role="toolbar"]', '[role="search"]', '[role="region"]',
    ];

    for (const selector of roleSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        for (const el of Array.from(elements)) {
          if (processedElements.has(el)) continue;
          if (components.length >= MAX_COMPONENTS) break;

          processedElements.add(el);
          const component = this.extractComponent(el);
          if (component) components.push(component);
        }
      } catch {
        continue;
      }
    }

    // Phase 3: Class-based component patterns
    const classPatterns = [
      'card', 'modal', 'hero', 'sidebar', 'dropdown', 'tab', 'accordion',
      'carousel', 'slider', 'gallery', 'pricing', 'banner', 'toast',
      'alert', 'notification', 'breadcrumb', 'pagination', 'avatar',
      'badge', 'tooltip', 'popover',
    ];

    for (const pattern of classPatterns) {
      try {
        const elements = document.querySelectorAll(
          `[class*="${pattern}" i]`
        );
        for (const el of Array.from(elements)) {
          if (processedElements.has(el)) continue;
          if (components.length >= MAX_COMPONENTS) break;
          if (!isSignificantComponent(el)) continue;

          // Skip if an ancestor is already extracted
          let ancestorExtracted = false;
          let parent = el.parentElement;
          while (parent) {
            if (processedElements.has(parent)) {
              ancestorExtracted = true;
              break;
            }
            parent = parent.parentElement;
          }
          if (ancestorExtracted) continue;

          processedElements.add(el);
          const component = this.extractComponent(el);
          if (component) components.push(component);
        }
      } catch {
        continue;
      }
    }

    // Phase 4: Structural detection (large sections with multiple children)
    if (components.length < MAX_COMPONENTS) {
      const allSections = document.querySelectorAll('div, section');
      for (const el of Array.from(allSections).slice(0, 500)) {
        if (processedElements.has(el)) continue;
        if (components.length >= MAX_COMPONENTS) break;
        if (!isSignificantComponent(el)) continue;

        const { type, confidence } = classifyElement(el);
        if (type === 'unknown' || confidence < 0.5) continue;

        // Skip if parent already extracted
        let ancestorExtracted = false;
        let parent = el.parentElement;
        while (parent) {
          if (processedElements.has(parent)) {
            ancestorExtracted = true;
            break;
          }
          parent = parent.parentElement;
        }
        if (ancestorExtracted) continue;

        processedElements.add(el);
        const component = this.extractComponent(el);
        if (component) components.push(component);
      }
    }

    return components;
  }

  private extractComponent(el: Element): ComponentData | null {
    try {
      const { type } = classifyElement(el);
      const name = getComponentName(el, type);
      const selector = buildSelector(el);
      const html = truncate(el.outerHTML, MAX_HTML_LENGTH);
      const css = this.extractComponentCSS(el);
      const stateVariants = this.extractStateVariants(el);

      return {
        name,
        selector,
        html,
        css,
        type,
        stateVariants,
      };
    } catch {
      return null;
    }
  }

  private extractComponentCSS(el: Element): string {
    const cssEntries: string[] = [];

    try {
      // Get computed styles for the element itself
      const style = getCachedStyle(el);
      const keyProps = [
        'display', 'position', 'width', 'max-width', 'height', 'min-height',
        'margin', 'padding', 'background-color', 'background',
        'border', 'border-radius', 'box-shadow',
        'font-family', 'font-size', 'font-weight', 'color',
        'flex-direction', 'align-items', 'justify-content', 'gap',
        'grid-template-columns', 'grid-template-rows',
        'overflow', 'z-index', 'opacity', 'transition', 'transform',
      ];

      const rootStyles: string[] = [];
      for (const prop of keyProps) {
        const value = style.getPropertyValue(prop);
        if (value && value !== 'none' && value !== 'normal' && value !== 'auto' &&
            value !== '0px' && value !== '0' && value !== 'rgba(0, 0, 0, 0)' &&
            value !== 'transparent') {
          rootStyles.push(`  ${prop}: ${value};`);
        }
      }
      if (rootStyles.length > 0) {
        cssEntries.push(`/* root */\n{\n${rootStyles.join('\n')}\n}`);
      }

      // Get styles for direct children (first 5)
      const children = Array.from(el.children).slice(0, 5);
      for (const child of children) {
        try {
          const childStyle = getCachedStyle(child);
          const childTag = child.tagName.toLowerCase();
          const childCssProps: string[] = [];

          for (const prop of keyProps) {
            const value = childStyle.getPropertyValue(prop);
            if (value && value !== 'none' && value !== 'normal' && value !== 'auto' &&
                value !== '0px' && value !== '0' && value !== 'rgba(0, 0, 0, 0)' &&
                value !== 'transparent') {
              childCssProps.push(`  ${prop}: ${value};`);
            }
          }

          if (childCssProps.length > 0) {
            cssEntries.push(`/* > ${childTag} */\n{\n${childCssProps.join('\n')}\n}`);
          }
        } catch {
          continue;
        }
      }
    } catch {
      // Skip
    }

    return cssEntries.join('\n\n').slice(0, 3000);
  }

  private extractStateVariants(el: Element): Record<string, Record<string, string>> {
    const variants: Record<string, Record<string, string>> = {};

    // Check for data-state, aria-expanded, aria-selected attributes
    const dataState = el.getAttribute('data-state');
    if (dataState) {
      variants[`data-state="${dataState}"`] = {};
    }

    const ariaExpanded = el.getAttribute('aria-expanded');
    if (ariaExpanded !== null) {
      variants[`aria-expanded="${ariaExpanded}"`] = {};
    }

    const ariaSelected = el.getAttribute('aria-selected');
    if (ariaSelected !== null) {
      variants[`aria-selected="${ariaSelected}"`] = {};
    }

    // Check CSSOM for pseudo-class rules matching this element
    try {
      const selector = buildSelector(el);
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue;
        }

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (!(rule instanceof CSSStyleRule)) continue;

          const ruleSelector = rule.selectorText;
          if (!ruleSelector) continue;

          // Check if the rule matches a state variant of our element
          const states = [':hover', ':focus', ':active', ':focus-visible', ':disabled'];
          for (const state of states) {
            if (ruleSelector.includes(state)) {
              // Try to match the base selector
              const baseSelector = ruleSelector.replace(state, '').trim();
              try {
                if (el.matches(baseSelector) || ruleSelector.includes(selector)) {
                  const diff: Record<string, string> = {};
                  for (let k = 0; k < rule.style.length; k++) {
                    const prop = rule.style[k];
                    const value = rule.style.getPropertyValue(prop);
                    diff[prop] = value;
                  }
                  if (Object.keys(diff).length > 0) {
                    variants[state] = { ...variants[state], ...diff };
                  }
                }
              } catch {
                // el.matches may throw for complex selectors
              }
            }
          }
        }
      }
    } catch {
      // Stylesheet access error
    }

    return variants;
  }

  protected emptyResult(): ComponentData[] {
    return [];
  }
}
