/**
 * Scroll Behavior Extractor
 * Detects sticky/fixed elements, parallax layers, scroll-snap,
 * and intersection observer-based animations.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { ScrollBehavior } from '@shared/types';

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${classes}`;
}

const MAX_ELEMENTS = 2000;

export class ScrollBehaviorExtractor extends BaseExtractor<ScrollBehavior> {
  constructor() {
    super('scroll-behavior');
  }

  protected async doExtract(): Promise<ScrollBehavior> {
    const stickyElements = this.findStickyFixedElements();
    const parallaxLayers = this.findParallaxLayers();
    const scrollAnimations = this.findScrollAnimations();
    const pageTransitions = this.findPageTransitions();

    return {
      stickyElements,
      parallaxLayers,
      scrollAnimations,
      pageTransitions,
    };
  }

  private findStickyFixedElements(): { selector: string; position: string }[] {
    const results: { selector: string; position: string }[] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const position = style.position;

        if (position === 'sticky') {
          results.push({
            selector: buildSelector(el),
            position: `sticky (top: ${style.top})`,
          });
        } else if (position === 'fixed') {
          // Only include if it's visible (not a hidden modal/overlay)
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const location = this.describeFixedPosition(style, rect);
            results.push({
              selector: buildSelector(el),
              position: `fixed (${location})`,
            });
          }
        }
      } catch {
        continue;
      }
    }

    return results;
  }

  private describeFixedPosition(style: CSSStyleDeclaration, rect: DOMRect): string {
    const parts: string[] = [];

    if (rect.top < 10) parts.push('top');
    if (rect.bottom > window.innerHeight - 10 || style.bottom === '0px') parts.push('bottom');
    if (rect.left < 10) parts.push('left');
    if (rect.right > window.innerWidth - 10 || style.right === '0px') parts.push('right');

    if (parts.length === 0) return 'center';
    return parts.join('-');
  }

  private findParallaxLayers(): { selector: string; speed: number }[] {
    const layers: { selector: string; speed: number }[] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const classes = typeof el.className === 'string' ? el.className.toLowerCase() : '';

        // Method 1: CSS perspective-based parallax
        if (style.perspective !== 'none' || style.perspectiveOrigin !== '50% 50%') {
          // This is a parallax container
          const children = el.children;
          for (let j = 0; j < children.length; j++) {
            const childStyle = getCachedStyle(children[j]);
            const transform = childStyle.transform;
            if (transform !== 'none' && transform.includes('translateZ')) {
              // Extract translateZ value to estimate speed
              const zMatch = transform.match(/translateZ\(([-\d.]+)/);
              const z = zMatch ? parseFloat(zMatch[1]) : 0;
              const speed = z !== 0 ? 1 + (z / 100) : 1;
              layers.push({
                selector: buildSelector(children[j]),
                speed: Math.round(speed * 100) / 100,
              });
            }
          }
        }

        // Method 2: Data attribute based parallax
        if (el.hasAttribute('data-parallax') || el.hasAttribute('data-speed') || el.hasAttribute('data-rellax-speed')) {
          const speed = parseFloat(
            el.getAttribute('data-speed') ||
            el.getAttribute('data-rellax-speed') ||
            el.getAttribute('data-parallax-speed') ||
            '0.5'
          );
          layers.push({
            selector: buildSelector(el),
            speed: isNaN(speed) ? 0.5 : speed,
          });
        }

        // Method 3: Class-based parallax detection
        if (classes.includes('parallax') || classes.includes('rellax')) {
          layers.push({
            selector: buildSelector(el),
            speed: 0.5, // Default speed estimate
          });
        }

        // Method 4: Background-attachment: fixed (simple parallax)
        if (style.backgroundAttachment === 'fixed') {
          layers.push({
            selector: buildSelector(el),
            speed: 0, // Background stays fixed while content scrolls
          });
        }
      } catch {
        continue;
      }
    }

    return layers;
  }

  private findScrollAnimations(): { selector: string; type: string; trigger: string }[] {
    const animations: { selector: string; type: string; trigger: string }[] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];

      try {
        const style = getCachedStyle(el);
        const classes = typeof el.className === 'string' ? el.className.toLowerCase() : '';

        // Scroll-snap containers
        const scrollSnapType = style.scrollSnapType;
        if (scrollSnapType && scrollSnapType !== 'none') {
          animations.push({
            selector: buildSelector(el),
            type: 'scroll-snap',
            trigger: `scroll-snap-type: ${scrollSnapType}`,
          });
        }

        // Scroll-snap children
        const scrollSnapAlign = style.scrollSnapAlign;
        if (scrollSnapAlign && scrollSnapAlign !== 'none') {
          animations.push({
            selector: buildSelector(el),
            type: 'scroll-snap-child',
            trigger: `scroll-snap-align: ${scrollSnapAlign}`,
          });
        }

        // Elements with opacity 0 and transition (likely scroll-triggered reveals)
        if (style.opacity === '0' && style.transition && style.transition !== 'all 0s ease 0s') {
          animations.push({
            selector: buildSelector(el),
            type: 'reveal',
            trigger: 'intersection-observer (inferred from opacity:0 + transition)',
          });
        }

        // Elements with transform + transition (likely slide-in animations)
        if (style.transform !== 'none' && style.transition && style.transition !== 'all 0s ease 0s') {
          const transformStr = style.transform;
          if (transformStr.includes('translate') && !transformStr.includes('(0')) {
            animations.push({
              selector: buildSelector(el),
              type: 'slide-in',
              trigger: `intersection-observer (inferred from transform: ${transformStr})`,
            });
          }
        }

        // AOS library
        const aosType = el.getAttribute('data-aos');
        if (aosType) {
          const aosOffset = el.getAttribute('data-aos-offset') || 'default';
          animations.push({
            selector: buildSelector(el),
            type: aosType,
            trigger: `AOS (offset: ${aosOffset})`,
          });
        }

        // ScrollReveal / generic data-scroll
        if (el.hasAttribute('data-scroll') || el.hasAttribute('data-reveal')) {
          animations.push({
            selector: buildSelector(el),
            type: el.getAttribute('data-scroll') || el.getAttribute('data-reveal') || 'reveal',
            trigger: 'data-attribute scroll trigger',
          });
        }

        // GSAP ScrollTrigger (class-based detection)
        if (classes.includes('gsap') || classes.includes('pin-spacer') || el.hasAttribute('data-scroll-trigger')) {
          animations.push({
            selector: buildSelector(el),
            type: 'gsap-scroll-trigger',
            trigger: 'GSAP ScrollTrigger',
          });
        }
      } catch {
        continue;
      }
    }

    return animations.slice(0, 50);
  }

  private findPageTransitions(): string[] {
    const transitions: string[] = [];

    // Check for SPA transition libraries
    const indicators = [
      { check: () => !!(window as any).barba, name: 'Barba.js (page transition library)' },
      { check: () => !!(window as any).Swup, name: 'Swup (page transition library)' },
      { check: () => !!(window as any).Highway, name: 'Highway.js (page transition library)' },
      { check: () => document.querySelector('[data-barba]') !== null, name: 'Barba.js container found' },
      { check: () => document.querySelector('[data-swup]') !== null, name: 'Swup container found' },
    ];

    for (const { check, name } of indicators) {
      try {
        if (check()) transitions.push(name);
      } catch {
        // Skip
      }
    }

    // Check for CSS view transitions API
    try {
      const hasViewTransition = document.querySelector('meta[name="view-transition"]') !== null;
      if (hasViewTransition) transitions.push('CSS View Transitions API');

      // Check stylesheets for ::view-transition
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue;
        }

        for (let j = 0; j < rules.length; j++) {
          if (rules[j] instanceof CSSStyleRule) {
            const sel = (rules[j] as CSSStyleRule).selectorText;
            if (sel && sel.includes('::view-transition')) {
              transitions.push('CSS View Transitions (stylesheet rules found)');
              break;
            }
          }
        }
      }
    } catch {
      // Skip
    }

    // Check for smooth scrolling
    try {
      const htmlStyle = getCachedStyle(document.documentElement);
      const bodyStyle = getCachedStyle(document.body);
      if (htmlStyle.scrollBehavior === 'smooth' || bodyStyle.scrollBehavior === 'smooth') {
        transitions.push('CSS smooth scroll behavior');
      }
    } catch {
      // Skip
    }

    return transitions;
  }

  protected emptyResult(): ScrollBehavior {
    return {
      stickyElements: [],
      parallaxLayers: [],
      scrollAnimations: [],
      pageTransitions: [],
    };
  }
}
