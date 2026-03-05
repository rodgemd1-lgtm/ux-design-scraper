/**
 * Animation Extractor
 * Extracts CSS animations, transitions, and keyframe definitions from the page.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { AnimationData } from '@shared/types';

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (parent) {
    const parentId = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${parentId} > ${tag}:nth-of-type(${index})`;
    }
    return `${parentId} > ${tag}`;
  }
  return tag;
}

const MAX_ELEMENTS = 2000;

// Default transition value (no transition set)
const DEFAULT_TRANSITION = 'all 0s ease 0s';
const NO_TRANSITIONS = new Set([
  'all 0s ease 0s',
  'none 0s ease 0s',
  'none',
  '0s',
]);

export class AnimationExtractor extends BaseExtractor<AnimationData> {
  constructor() {
    super('animations');
  }

  protected async doExtract(): Promise<AnimationData> {
    const cssTransitions = this.extractTransitions();
    const { cssAnimations, keyframeDefinitions } = this.extractAnimationsFromStylesheets();
    const elementAnimations = this.extractElementAnimations();
    const scrollTriggered = this.detectScrollTriggeredAnimations();

    // Merge stylesheet animations with element animations
    const allAnimations = [...cssAnimations, ...elementAnimations];

    // Deduplicate animations by name
    const seenNames = new Set<string>();
    const uniqueAnimations = allAnimations.filter(a => {
      if (seenNames.has(a.name)) return false;
      seenNames.add(a.name);
      return true;
    });

    return {
      cssTransitions,
      cssAnimations: uniqueAnimations,
      scrollTriggered,
    };
  }

  private extractTransitions(): AnimationData['cssTransitions'] {
    const transitions: AnimationData['cssTransitions'] = [];
    const seen = new Set<string>();

    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const transition = style.transition;

        if (!transition || NO_TRANSITIONS.has(transition)) continue;

        // Parse the transition value
        // Format: property duration timing-function delay, ...
        const parts = this.parseTransitions(transition);
        const selector = buildSelector(el);

        for (const part of parts) {
          const key = `${selector}:${part.property}`;
          if (seen.has(key)) continue;
          seen.add(key);

          transitions.push({
            property: part.property,
            duration: part.duration,
            easing: part.easing,
            selector,
          });
        }
      } catch {
        continue;
      }
    }

    return transitions;
  }

  private parseTransitions(transitionStr: string): { property: string; duration: string; easing: string }[] {
    const results: { property: string; duration: string; easing: string }[] = [];

    // Split by comma, respecting parentheses (for cubic-bezier)
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const char of transitionStr) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === ',' && parenDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());

    for (const part of parts) {
      const tokens = part.trim().split(/\s+/);
      if (tokens.length === 0) continue;

      const property = tokens[0] || 'all';
      const duration = tokens[1] || '0s';
      // Reconstruct easing, which might contain spaces (cubic-bezier)
      let easing = 'ease';
      if (tokens.length >= 3) {
        // If third token looks like a timing function
        if (tokens[2].startsWith('cubic-bezier') || ['ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear', 'step-start', 'step-end'].includes(tokens[2])) {
          easing = tokens[2];
          // Handle cubic-bezier with spaces
          if (tokens[2].startsWith('cubic-bezier') && !tokens[2].includes(')')) {
            let bezier = tokens[2];
            for (let i = 3; i < tokens.length; i++) {
              bezier += ' ' + tokens[i];
              if (tokens[i].includes(')')) break;
            }
            easing = bezier;
          }
        }
      }

      // Skip the default "all 0s ease 0s" pattern
      if (property === 'all' && duration === '0s') continue;

      results.push({ property, duration, easing });
    }

    return results;
  }

  private extractAnimationsFromStylesheets(): {
    cssAnimations: AnimationData['cssAnimations'];
    keyframeDefinitions: Map<string, string>;
  } {
    const animations: AnimationData['cssAnimations'] = [];
    const keyframeDefinitions = new Map<string, string>();

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue; // Cross-origin
        }

        this.scanRulesForAnimations(rules, animations, keyframeDefinitions);
      }
    } catch {
      // Stylesheet access error
    }

    return { cssAnimations: animations, keyframeDefinitions };
  }

  private scanRulesForAnimations(
    rules: CSSRuleList,
    animations: AnimationData['cssAnimations'],
    keyframeDefinitions: Map<string, string>
  ): void {
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];

      // Collect @keyframes rules
      if (rule instanceof CSSKeyframesRule) {
        const name = rule.name;
        let keyframesText = '';
        for (let k = 0; k < rule.cssRules.length; k++) {
          const keyframe = rule.cssRules[k] as CSSKeyframeRule;
          keyframesText += `  ${keyframe.keyText} { ${keyframe.style.cssText} }\n`;
        }
        keyframeDefinitions.set(name, keyframesText.trim());
      }

      // Collect animation declarations
      if (rule instanceof CSSStyleRule) {
        const style = rule.style;
        const animName = style.animationName;
        if (animName && animName !== 'none') {
          animations.push({
            name: animName,
            duration: style.animationDuration || '0s',
            easing: style.animationTimingFunction || 'ease',
            keyframes: keyframeDefinitions.get(animName) || '',
            selector: rule.selectorText,
          });
        }
      }

      // Recurse into media queries
      if (rule instanceof CSSMediaRule) {
        this.scanRulesForAnimations(rule.cssRules, animations, keyframeDefinitions);
      }
    }
  }

  private extractElementAnimations(): AnimationData['cssAnimations'] {
    const animations: AnimationData['cssAnimations'] = [];
    const seen = new Set<string>();

    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const animName = style.animationName;

        if (!animName || animName === 'none') continue;
        if (seen.has(animName)) continue;
        seen.add(animName);

        const selector = buildSelector(el);
        animations.push({
          name: animName,
          duration: style.animationDuration || '0s',
          easing: style.animationTimingFunction || 'ease',
          keyframes: '', // Will be merged from stylesheet extraction
          selector,
        });
      } catch {
        continue;
      }
    }

    return animations;
  }

  private detectScrollTriggeredAnimations(): AnimationData['scrollTriggered'] {
    const triggered: AnimationData['scrollTriggered'] = [];

    // Heuristic: find elements with opacity: 0 or transform that suggests
    // they will animate on scroll (common with intersection observer patterns)
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const classes = typeof el.className === 'string' ? el.className.toLowerCase() : '';

        // Check for common scroll animation library patterns
        const hasScrollAnimClass =
          classes.includes('aos-') ||        // AOS (Animate On Scroll)
          classes.includes('wow') ||          // WOW.js
          classes.includes('scroll-') ||      // Generic scroll animation
          classes.includes('reveal') ||       // ScrollReveal
          classes.includes('animate-') ||     // Generic animation
          classes.includes('fade-in') ||      // Common fade pattern
          classes.includes('slide-in') ||     // Common slide pattern
          classes.includes('gsap');           // GSAP

        // Check for data attributes used by scroll libraries
        const hasScrollAnimData =
          el.hasAttribute('data-aos') ||
          el.hasAttribute('data-scroll') ||
          el.hasAttribute('data-animate') ||
          el.hasAttribute('data-reveal') ||
          el.hasAttribute('data-parallax');

        // Check for elements likely to animate on scroll
        // (opacity: 0 with transition, or transform: translateY with transition)
        const hasHiddenInitialState =
          (style.opacity === '0' && style.transition && !NO_TRANSITIONS.has(style.transition)) ||
          (style.transform !== 'none' && style.transform.includes('translate') && style.transition && !NO_TRANSITIONS.has(style.transition));

        if (hasScrollAnimClass || hasScrollAnimData || hasHiddenInitialState) {
          const selector = buildSelector(el);
          let triggerType = 'intersection-observer';
          let animation = '';

          if (hasScrollAnimClass) {
            triggerType = 'css-class';
            animation = classes;
          }
          if (hasScrollAnimData) {
            triggerType = el.getAttribute('data-aos') ? 'AOS' :
                          el.getAttribute('data-scroll') ? 'data-scroll' :
                          el.getAttribute('data-parallax') ? 'parallax' : 'data-attribute';
            animation = el.getAttribute('data-aos') || el.getAttribute('data-scroll') ||
                        el.getAttribute('data-animate') || '';
          }
          if (hasHiddenInitialState) {
            animation = `opacity: ${style.opacity}, transform: ${style.transform}`;
          }

          triggered.push({
            selector,
            triggerType,
            animation,
          });
        }
      } catch {
        continue;
      }
    }

    return triggered.slice(0, 50);
  }

  protected emptyResult(): AnimationData {
    return {
      cssTransitions: [],
      cssAnimations: [],
      scrollTriggered: [],
    };
  }
}
