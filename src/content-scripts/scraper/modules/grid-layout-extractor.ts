/**
 * Grid Layout Extractor
 * Analyzes the layout system: CSS Grid, Flexbox, containers, and responsive patterns.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { GridLayout } from '@shared/types';

const MAX_ELEMENTS = 2000;

interface LayoutElement {
  el: Element;
  type: 'grid' | 'flex';
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gap?: string;
  flexDirection?: string;
  flexWrap?: string;
}

interface ContainerElement {
  el: Element;
  maxWidth: string;
}

export class GridLayoutExtractor extends BaseExtractor<GridLayout> {
  constructor() {
    super('grid-layout');
  }

  protected async doExtract(): Promise<GridLayout> {
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    const layoutElements: LayoutElement[] = [];
    const containers: ContainerElement[] = [];

    let gridCount = 0;
    let flexCount = 0;

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      let style: CSSStyleDeclaration;
      try {
        style = getCachedStyle(el);
      } catch {
        continue;
      }

      const display = style.display;

      // Detect grid layouts
      if (display === 'grid' || display === 'inline-grid') {
        gridCount++;
        layoutElements.push({
          el,
          type: 'grid',
          gridTemplateColumns: style.gridTemplateColumns,
          gridTemplateRows: style.gridTemplateRows,
          gap: style.gap || style.gridGap,
        });
      }

      // Detect flex layouts
      if (display === 'flex' || display === 'inline-flex') {
        flexCount++;
        layoutElements.push({
          el,
          type: 'flex',
          flexDirection: style.flexDirection,
          flexWrap: style.flexWrap,
          gap: style.gap,
        });
      }

      // Detect container elements (max-width + margin: auto)
      const maxWidth = style.maxWidth;
      const marginLeft = style.marginLeft;
      const marginRight = style.marginRight;
      if (
        maxWidth && maxWidth !== 'none' && maxWidth !== '0px' &&
        marginLeft === 'auto' && marginRight === 'auto'
      ) {
        containers.push({ el, maxWidth });
      }
    }

    // Determine primary layout type
    let layoutType: 'grid' | 'flexbox' | 'mixed' = 'mixed';
    if (gridCount > 0 && flexCount === 0) layoutType = 'grid';
    else if (flexCount > 0 && gridCount === 0) layoutType = 'flexbox';
    else if (gridCount > 0 && flexCount > 0) layoutType = 'mixed';
    else layoutType = 'flexbox'; // Default

    // Determine primary container max-width
    const containerMaxWidth = this.findPrimaryContainer(containers);

    // Determine column count from the most common grid-template-columns
    const columns = this.detectColumnCount(layoutElements);

    // Determine primary gutter/gap
    const gutterWidth = this.findPrimaryGutter(layoutElements);

    // Detect responsive patterns from stylesheets
    const breakpointBehaviors = this.detectBreakpointBehaviors();

    return {
      containerMaxWidth,
      columns,
      gutterWidth,
      layoutType,
      breakpointBehaviors,
    };
  }

  private findPrimaryContainer(containers: ContainerElement[]): string {
    if (containers.length === 0) return 'none';

    // Find the most common max-width
    const widthCounts = new Map<string, number>();
    for (const c of containers) {
      widthCounts.set(c.maxWidth, (widthCounts.get(c.maxWidth) || 0) + 1);
    }

    let maxCount = 0;
    let primaryWidth = 'none';
    for (const [width, count] of widthCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryWidth = width;
      }
    }

    return primaryWidth;
  }

  private detectColumnCount(layouts: LayoutElement[]): number {
    // Look at grid-template-columns values
    const columnCounts = new Map<number, number>();

    for (const layout of layouts) {
      if (layout.type === 'grid' && layout.gridTemplateColumns) {
        const cols = layout.gridTemplateColumns;
        // Count the number of column tracks
        // grid-template-columns might be "200px 200px 200px" or "repeat(3, 1fr)" etc.
        if (cols === 'none') continue;

        const parts = cols.split(/\s+/).filter(p => p && p !== 'none');
        const count = parts.length;
        if (count > 0 && count <= 24) {
          columnCounts.set(count, (columnCounts.get(count) || 0) + 1);
        }
      }
    }

    // Find most common column count
    let maxCount = 0;
    let primaryColumns = 12; // Default

    for (const [cols, count] of columnCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryColumns = cols;
      }
    }

    // If no grid columns found, check for flex children patterns
    if (maxCount === 0) {
      for (const layout of layouts) {
        if (layout.type === 'flex' && layout.flexWrap === 'wrap') {
          const children = layout.el.children.length;
          if (children >= 2 && children <= 12) {
            const rect = layout.el.getBoundingClientRect();
            const firstChild = layout.el.children[0];
            if (firstChild) {
              const childRect = firstChild.getBoundingClientRect();
              if (childRect.width > 0) {
                const estimatedCols = Math.round(rect.width / childRect.width);
                if (estimatedCols >= 2 && estimatedCols <= 12) {
                  primaryColumns = estimatedCols;
                  break;
                }
              }
            }
          }
        }
      }
    }

    return primaryColumns;
  }

  private findPrimaryGutter(layouts: LayoutElement[]): string {
    const gapCounts = new Map<string, number>();
    for (const layout of layouts) {
      if (layout.gap && layout.gap !== 'normal' && layout.gap !== '0px') {
        gapCounts.set(layout.gap, (gapCounts.get(layout.gap) || 0) + 1);
      }
    }

    let maxCount = 0;
    let primaryGap = '0px';
    for (const [gap, count] of gapCounts) {
      if (count > maxCount) {
        maxCount = count;
        primaryGap = gap;
      }
    }

    return primaryGap;
  }

  private detectBreakpointBehaviors(): { breakpoint: number; columns: number; layout: string }[] {
    const behaviors: { breakpoint: number; columns: number; layout: string }[] = [];
    const seenBreakpoints = new Set<number>();

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          // Cross-origin stylesheet, skip
          continue;
        }

        for (let j = 0; j < rules.length; j++) {
          const rule = rules[j];
          if (rule instanceof CSSMediaRule) {
            const mediaText = rule.conditionText || rule.media.mediaText;
            // Extract breakpoint values
            const widthMatch = mediaText.match(/(?:min|max)-width:\s*(\d+)(?:px)?/);
            if (widthMatch) {
              const breakpoint = parseInt(widthMatch[1], 10);
              if (seenBreakpoints.has(breakpoint)) continue;
              seenBreakpoints.add(breakpoint);

              // Look for grid/flex rules inside this media query
              let columns = 0;
              let layout = 'unknown';

              for (let k = 0; k < rule.cssRules.length; k++) {
                const innerRule = rule.cssRules[k];
                if (innerRule instanceof CSSStyleRule) {
                  const ruleStyle = innerRule.style;
                  if (ruleStyle.display === 'grid' || ruleStyle.gridTemplateColumns) {
                    layout = 'grid';
                    const gtc = ruleStyle.gridTemplateColumns;
                    if (gtc) {
                      columns = gtc.split(/\s+/).filter(p => p).length;
                    }
                  } else if (ruleStyle.display === 'flex') {
                    layout = 'flex';
                    columns = 1; // Flex typically stacks at smaller breakpoints
                  } else if (ruleStyle.display === 'block' || ruleStyle.display === 'none') {
                    layout = ruleStyle.display;
                    columns = 1;
                  }
                }
              }

              if (layout !== 'unknown') {
                behaviors.push({ breakpoint, columns: columns || 1, layout });
              }
            }
          }
        }
      }
    } catch {
      // Stylesheet access may fail
    }

    behaviors.sort((a, b) => a.breakpoint - b.breakpoint);
    return behaviors;
  }

  protected emptyResult(): GridLayout {
    return {
      containerMaxWidth: 'none',
      columns: 12,
      gutterWidth: '0px',
      layoutType: 'flexbox',
      breakpointBehaviors: [],
    };
  }
}
