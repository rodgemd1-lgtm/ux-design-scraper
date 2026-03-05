/**
 * Dark Mode Detector
 * Detects dark mode support via media queries, CSS custom properties,
 * class-based toggles, and collects dark theme color tokens.
 */

import { BaseExtractor } from './base-extractor';
import type { DarkModeData, TokenEntry } from '@shared/types';

export class DarkModeDetector extends BaseExtractor<DarkModeData> {
  constructor() {
    super('dark-mode');
  }

  protected async doExtract(): Promise<DarkModeData> {
    const mediaQueryResult = this.checkMediaQueryDarkMode();
    const cssVariableResult = this.checkCSSVariableDarkMode();
    const classToggleResult = this.checkClassToggleDarkMode();

    // Determine the primary method
    if (mediaQueryResult.found) {
      return {
        hasDarkMode: true,
        method: 'media-query',
        darkColors: mediaQueryResult.colors,
        toggleSelector: undefined,
      };
    }

    if (cssVariableResult.found) {
      return {
        hasDarkMode: true,
        method: 'css-variables',
        darkColors: cssVariableResult.colors,
        toggleSelector: cssVariableResult.toggleSelector,
      };
    }

    if (classToggleResult.found) {
      return {
        hasDarkMode: true,
        method: 'class-toggle',
        darkColors: classToggleResult.colors,
        toggleSelector: classToggleResult.toggleSelector,
      };
    }

    return {
      hasDarkMode: false,
      method: 'none',
      darkColors: [],
      toggleSelector: undefined,
    };
  }

  private checkMediaQueryDarkMode(): { found: boolean; colors: TokenEntry[] } {
    const colors: TokenEntry[] = [];
    let found = false;

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
          if (rule instanceof CSSMediaRule) {
            const mediaText = rule.conditionText || rule.media.mediaText;
            if (mediaText.includes('prefers-color-scheme') && mediaText.includes('dark')) {
              found = true;

              // Extract color values from the dark mode rules
              for (let k = 0; k < rule.cssRules.length; k++) {
                const innerRule = rule.cssRules[k];
                if (innerRule instanceof CSSStyleRule) {
                  this.extractColorsFromRule(innerRule, colors);
                }
              }
            }
          }
        }
      }
    } catch {
      // Stylesheet access error
    }

    return { found, colors: this.deduplicateColors(colors) };
  }

  private checkCSSVariableDarkMode(): { found: boolean; colors: TokenEntry[]; toggleSelector?: string } {
    const colors: TokenEntry[] = [];
    let found = false;
    let toggleSelector: string | undefined;

    // Common dark mode CSS variable patterns
    const darkVarPatterns = [
      '--background', '--bg', '--text-color', '--text', '--foreground',
      '--primary', '--secondary', '--surface', '--card-bg', '--body-bg',
      '--color-bg', '--color-text', '--color-background',
    ];

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue;
        }

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule instanceof CSSStyleRule) {
            const selector = rule.selectorText;
            // Check for dark mode selectors
            if (this.isDarkModeSelector(selector)) {
              found = true;
              toggleSelector = selector;

              // Extract CSS custom properties
              const style = rule.style;
              for (let k = 0; k < style.length; k++) {
                const prop = style[k];
                if (prop.startsWith('--')) {
                  const value = style.getPropertyValue(prop).trim();
                  if (this.isColorValue(value)) {
                    colors.push({
                      value,
                      count: 1,
                      contexts: [prop],
                      property: prop,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Stylesheet access error
    }

    // Also check computed :root for CSS variables that suggest dark mode support
    if (!found) {
      try {
        const root = document.documentElement;
        const rootStyle = getComputedStyle(root);

        let darkVarCount = 0;
        for (const pattern of darkVarPatterns) {
          const value = rootStyle.getPropertyValue(pattern).trim();
          if (value) {
            darkVarCount++;
            if (this.isColorValue(value)) {
              colors.push({
                value,
                count: 1,
                contexts: [pattern],
                property: pattern,
              });
            }
          }
        }

        // If we find multiple dark-mode-like CSS variables, it's likely there's dark mode support
        if (darkVarCount >= 3) {
          found = true;
        }
      } catch {
        // Skip
      }
    }

    return { found, colors: this.deduplicateColors(colors), toggleSelector };
  }

  private checkClassToggleDarkMode(): { found: boolean; colors: TokenEntry[]; toggleSelector?: string } {
    const colors: TokenEntry[] = [];
    let found = false;
    let toggleSelector: string | undefined;

    // Check for dark mode class on html/body
    const html = document.documentElement;
    const body = document.body;

    const darkClassPatterns = ['dark', 'dark-mode', 'dark-theme', 'theme-dark', 'is-dark'];
    const darkDataPatterns = ['data-theme', 'data-color-scheme', 'data-mode', 'data-color-mode'];

    // Check classes
    for (const pattern of darkClassPatterns) {
      if (html.classList.contains(pattern) || body.classList.contains(pattern)) {
        found = true;
        toggleSelector = `.${pattern}`;
        break;
      }
    }

    // Check data attributes
    for (const attr of darkDataPatterns) {
      const htmlValue = html.getAttribute(attr);
      const bodyValue = body.getAttribute(attr);
      if (htmlValue === 'dark' || bodyValue === 'dark') {
        found = true;
        toggleSelector = `[${attr}="dark"]`;
        break;
      }
      // Even if not currently dark, the presence of theme attributes suggests dark mode support
      if (htmlValue || bodyValue) {
        // Check stylesheets for dark version of the selector
        const hasDarkRules = this.checkForDarkClassInStylesheets();
        if (hasDarkRules) {
          found = true;
          toggleSelector = hasDarkRules;
        }
      }
    }

    // If found, try to extract dark colors from stylesheets
    if (found || toggleSelector) {
      try {
        for (let i = 0; i < document.styleSheets.length; i++) {
          let rules: CSSRuleList;
          try {
            rules = document.styleSheets[i].cssRules;
          } catch {
            continue;
          }

          for (let j = 0; j < rules.length; j++) {
            const rule = rules[j];
            if (rule instanceof CSSStyleRule) {
              if (this.isDarkModeSelector(rule.selectorText)) {
                this.extractColorsFromRule(rule, colors);
              }
            }
          }
        }
      } catch {
        // Skip
      }
    }

    // Check for dark mode toggle buttons
    if (!toggleSelector) {
      const toggleBtns = document.querySelectorAll(
        '[aria-label*="dark" i], [aria-label*="theme" i], [aria-label*="mode" i], ' +
        '[class*="theme-toggle"], [class*="dark-toggle"], [class*="color-mode"], ' +
        '[id*="theme-toggle"], [id*="dark-mode"]'
      );
      if (toggleBtns.length > 0) {
        found = true;
        const btn = toggleBtns[0];
        toggleSelector = btn.id ? `#${btn.id}` : (typeof btn.className === 'string' ? `.${btn.className.split(' ')[0]}` : undefined);
      }
    }

    return { found, colors: this.deduplicateColors(colors), toggleSelector };
  }

  private checkForDarkClassInStylesheets(): string | null {
    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue;
        }

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule instanceof CSSStyleRule) {
            const sel = rule.selectorText;
            if (this.isDarkModeSelector(sel)) {
              return sel;
            }
          }
        }
      }
    } catch {
      // Skip
    }
    return null;
  }

  private isDarkModeSelector(selector: string): boolean {
    if (!selector) return false;
    const lower = selector.toLowerCase();
    return (
      lower.includes('.dark') ||
      lower.includes('[data-theme="dark"]') ||
      lower.includes('[data-color-scheme="dark"]') ||
      lower.includes('[data-mode="dark"]') ||
      lower.includes('[data-color-mode="dark"]') ||
      lower.includes('.dark-mode') ||
      lower.includes('.dark-theme') ||
      lower.includes('.theme-dark') ||
      lower.includes(':root.dark') ||
      lower.includes('html.dark')
    );
  }

  private extractColorsFromRule(rule: CSSStyleRule, colors: TokenEntry[]): void {
    const colorProperties = [
      'background-color', 'color', 'border-color', 'outline-color',
      'box-shadow', 'background',
    ];

    const style = rule.style;
    for (const prop of colorProperties) {
      const value = style.getPropertyValue(prop).trim();
      if (value && value !== 'inherit' && value !== 'initial' && value !== 'unset') {
        colors.push({
          value,
          count: 1,
          contexts: [rule.selectorText],
          property: prop,
        });
      }
    }

    // Also extract CSS custom properties
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      if (prop.startsWith('--')) {
        const value = style.getPropertyValue(prop).trim();
        if (this.isColorValue(value)) {
          colors.push({
            value,
            count: 1,
            contexts: [rule.selectorText],
            property: prop,
          });
        }
      }
    }
  }

  private isColorValue(value: string): boolean {
    if (!value) return false;
    return (
      value.startsWith('#') ||
      value.startsWith('rgb') ||
      value.startsWith('hsl') ||
      value.startsWith('oklch') ||
      value.startsWith('lch') ||
      value.startsWith('lab') ||
      /^(transparent|currentColor|inherit|initial|unset)$/i.test(value) === false &&
      /^[a-z]+$/i.test(value) && CSS.supports('color', value)
    );
  }

  private deduplicateColors(colors: TokenEntry[]): TokenEntry[] {
    const map = new Map<string, TokenEntry>();
    for (const color of colors) {
      const existing = map.get(color.value);
      if (existing) {
        existing.count++;
        existing.contexts.push(...color.contexts);
      } else {
        map.set(color.value, { ...color, contexts: [...color.contexts] });
      }
    }
    return Array.from(map.values());
  }

  protected emptyResult(): DarkModeData {
    return {
      hasDarkMode: false,
      method: 'none',
      darkColors: [],
      toggleSelector: undefined,
    };
  }
}
