/**
 * Whitespace & Rhythm Analyzer
 * Analyzes spatial design: vertical rhythm, base spacing unit, whitespace density zones,
 * padding/margin consistency, visual grouping patterns, section spacing, and responsive spacing.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';

// Inline types since content scripts cannot use @shared/ path aliases
interface WhitespaceAnalysis {
  verticalRhythm: {
    baseLineHeight: number;
    commonMultiples: number[];
    consistencyScore: number;
    violations: { element: string; expected: number; actual: number }[];
  };
  baseSpacingUnit: {
    detectedUnit: number;
    confidence: number;
    gridSystem: string;
  };
  densityZones: {
    selector: string;
    density: 'cramped' | 'balanced' | 'airy';
    whitespaceRatio: number;
    elementCount: number;
    area: { x: number; y: number; width: number; height: number };
  }[];
  paddingMarginConsistency: {
    score: number;
    commonPaddings: { value: string; count: number }[];
    commonMargins: { value: string; count: number }[];
    outliers: { element: string; property: string; value: string; expected: string }[];
  };
  visualGrouping: {
    groups: {
      elements: string[];
      spacing: string;
      relationship: 'tight' | 'related' | 'separated';
    }[];
  };
  sectionSpacing: {
    sections: { selector: string; topMargin: string; bottomMargin: string }[];
    averageSpacing: number;
    consistency: number;
  };
  responsiveSpacing: {
    breakpoint: number;
    changes: { selector: string; property: string; oldValue: string; newValue: string }[];
  }[];
}

const MAX_ELEMENTS = 2000;

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

function parsePxValue(val: string): number {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

export class WhitespaceAnalyzer extends BaseExtractor<WhitespaceAnalysis> {
  constructor() {
    super('whitespace');
  }

  protected async doExtract(): Promise<WhitespaceAnalysis> {
    const verticalRhythm = this.analyzeVerticalRhythm();
    const baseSpacingUnit = this.detectBaseSpacingUnit();
    const densityZones = this.analyzeDensityZones();
    const paddingMarginConsistency = this.analyzePaddingMarginConsistency(baseSpacingUnit.detectedUnit);
    const visualGrouping = this.analyzeVisualGrouping();
    const sectionSpacing = this.analyzeSectionSpacing();
    const responsiveSpacing = this.detectResponsiveSpacing();

    return {
      verticalRhythm,
      baseSpacingUnit,
      densityZones,
      paddingMarginConsistency,
      visualGrouping,
      sectionSpacing,
      responsiveSpacing,
    };
  }

  private analyzeVerticalRhythm(): WhitespaceAnalysis['verticalRhythm'] {
    const lineHeights: number[] = [];
    const allElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, span, div, a');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      try {
        const style = getCachedStyle(allElements[i]);
        const lh = parsePxValue(style.lineHeight);
        if (lh > 0) lineHeights.push(lh);
      } catch {
        continue;
      }
    }

    if (lineHeights.length === 0) {
      return { baseLineHeight: 0, commonMultiples: [], consistencyScore: 0, violations: [] };
    }

    // Find the most common line-height (likely the base)
    const lhCounts = new Map<number, number>();
    for (const lh of lineHeights) {
      const rounded = Math.round(lh * 10) / 10;
      lhCounts.set(rounded, (lhCounts.get(rounded) || 0) + 1);
    }

    const sortedLH = Array.from(lhCounts.entries()).sort((a, b) => b[1] - a[1]);
    const baseLineHeight = sortedLH[0]?.[0] || 24;

    // Find common multiples of the base line-height
    const multiples = new Set<number>();
    const violations: WhitespaceAnalysis['verticalRhythm']['violations'] = [];

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      try {
        const style = getCachedStyle(el);
        const marginTop = parsePxValue(style.marginTop);
        const marginBottom = parsePxValue(style.marginBottom);

        for (const spacing of [marginTop, marginBottom]) {
          if (spacing <= 0) continue;
          const multiple = spacing / baseLineHeight;
          const roundedMultiple = Math.round(multiple * 2) / 2; // Round to nearest 0.5

          if (Math.abs(multiple - roundedMultiple) < 0.15) {
            multiples.add(roundedMultiple);
          } else if (spacing > 4 && violations.length < 20) {
            violations.push({
              element: describeElement(el),
              expected: Math.round(roundedMultiple) * baseLineHeight,
              actual: spacing,
            });
          }
        }
      } catch {
        continue;
      }
    }

    // Calculate consistency score
    const totalElements = lineHeights.length;
    const consistencyScore = totalElements > 0
      ? Math.round(Math.max(0, 100 - (violations.length / totalElements) * 200))
      : 0;

    return {
      baseLineHeight,
      commonMultiples: Array.from(multiples).sort((a, b) => a - b).slice(0, 10),
      consistencyScore: Math.max(0, Math.min(100, consistencyScore)),
      violations: violations.slice(0, 15),
    };
  }

  private detectBaseSpacingUnit(): WhitespaceAnalysis['baseSpacingUnit'] {
    const spacingValues: number[] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    const spacingProps = [
      'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'gap', 'rowGap', 'columnGap',
    ];

    for (let i = 0; i < limit; i++) {
      try {
        const style = getCachedStyle(allElements[i]);

        for (const prop of spacingProps) {
          const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
          if (value) {
            const num = parsePxValue(value);
            if (num > 0 && num < 500) {
              spacingValues.push(num);
            }
          }
        }
      } catch {
        continue;
      }
    }

    if (spacingValues.length === 0) {
      return { detectedUnit: 8, confidence: 0, gridSystem: 'unknown' };
    }

    // Test common spacing grids: 4px, 5px, 6px, 8px, 10px
    const candidates = [4, 5, 6, 8, 10];
    let bestUnit = 8;
    let bestScore = 0;

    for (const unit of candidates) {
      let matches = 0;
      for (const val of spacingValues) {
        if (val % unit === 0 || Math.abs(val % unit) <= 1) {
          matches++;
        }
      }
      const score = matches / spacingValues.length;
      if (score > bestScore) {
        bestScore = score;
        bestUnit = unit;
      }
    }

    let gridSystem = 'custom';
    if (bestUnit === 4) gridSystem = '4px grid (Material Design)';
    else if (bestUnit === 8) gridSystem = '8px grid (common standard)';
    else if (bestUnit === 5 || bestUnit === 10) gridSystem = '5/10px grid';
    else if (bestUnit === 6) gridSystem = '6px grid';

    return {
      detectedUnit: bestUnit,
      confidence: Math.round(bestScore * 100),
      gridSystem,
    };
  }

  private analyzeDensityZones(): WhitespaceAnalysis['densityZones'] {
    const zones: WhitespaceAnalysis['densityZones'] = [];

    // Analyze major sections
    const sections = document.querySelectorAll('section, main, article, header, footer, aside, nav, [role="main"], [role="banner"], [role="contentinfo"]');
    const limit = Math.min(sections.length, 30);

    for (let i = 0; i < limit; i++) {
      const section = sections[i];
      try {
        const rect = section.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;

        const sectionArea = rect.width * rect.height;
        const children = section.children;
        let childrenArea = 0;

        for (let j = 0; j < Math.min(children.length, 100); j++) {
          const childRect = children[j].getBoundingClientRect();
          childrenArea += childRect.width * childRect.height;
        }

        const whitespaceRatio = sectionArea > 0
          ? Math.round((1 - Math.min(1, childrenArea / sectionArea)) * 100) / 100
          : 0;

        let density: 'cramped' | 'balanced' | 'airy';
        if (whitespaceRatio < 0.25) density = 'cramped';
        else if (whitespaceRatio > 0.6) density = 'airy';
        else density = 'balanced';

        zones.push({
          selector: describeElement(section),
          density,
          whitespaceRatio,
          elementCount: children.length,
          area: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        });
      } catch {
        continue;
      }
    }

    return zones;
  }

  private analyzePaddingMarginConsistency(baseUnit: number): WhitespaceAnalysis['paddingMarginConsistency'] {
    const paddingCounts = new Map<string, number>();
    const marginCounts = new Map<string, number>();
    const outliers: WhitespaceAnalysis['paddingMarginConsistency']['outliers'] = [];

    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      try {
        const style = getCachedStyle(el);
        const desc = describeElement(el);

        // Collect paddings
        const paddings = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
        for (const prop of paddings) {
          const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
          if (value && value !== '0px') {
            paddingCounts.set(value, (paddingCounts.get(value) || 0) + 1);

            // Check against base unit
            const num = parsePxValue(value);
            if (num > 0 && baseUnit > 0 && num % baseUnit !== 0 && Math.abs(num % baseUnit) > 1) {
              if (outliers.length < 20) {
                const expected = Math.round(num / baseUnit) * baseUnit;
                outliers.push({
                  element: desc,
                  property: prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
                  value,
                  expected: `${expected}px`,
                });
              }
            }
          }
        }

        // Collect margins
        const margins = ['marginTop', 'marginRight', 'marginBottom', 'marginLeft'];
        for (const prop of margins) {
          const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
          if (value && value !== '0px' && value !== 'auto') {
            marginCounts.set(value, (marginCounts.get(value) || 0) + 1);

            const num = parsePxValue(value);
            if (num > 0 && baseUnit > 0 && num % baseUnit !== 0 && Math.abs(num % baseUnit) > 1) {
              if (outliers.length < 20) {
                const expected = Math.round(num / baseUnit) * baseUnit;
                outliers.push({
                  element: desc,
                  property: prop.replace(/([A-Z])/g, '-$1').toLowerCase(),
                  value,
                  expected: `${expected}px`,
                });
              }
            }
          }
        }
      } catch {
        continue;
      }
    }

    const commonPaddings = Array.from(paddingCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const commonMargins = Array.from(marginCounts.entries())
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // Score: how many values align with the grid
    const totalValues = Array.from(paddingCounts.values()).reduce((s, c) => s + c, 0)
      + Array.from(marginCounts.values()).reduce((s, c) => s + c, 0);
    const score = totalValues > 0
      ? Math.round(Math.max(0, 100 - (outliers.length / totalValues) * 400))
      : 50;

    return {
      score: Math.max(0, Math.min(100, score)),
      commonPaddings,
      commonMargins,
      outliers: outliers.slice(0, 15),
    };
  }

  private analyzeVisualGrouping(): WhitespaceAnalysis['visualGrouping'] {
    const groups: WhitespaceAnalysis['visualGrouping']['groups'] = [];

    // Find containers with multiple direct children and analyze their spacing
    const containers = document.querySelectorAll('div, section, main, article, ul, ol, nav');
    const limit = Math.min(containers.length, 100);

    for (let i = 0; i < limit; i++) {
      const container = containers[i];
      const children = Array.from(container.children);
      if (children.length < 2 || children.length > 30) continue;

      try {
        const childRects = children.map(c => c.getBoundingClientRect());
        const elements = children.slice(0, 8).map(describeElement);

        // Calculate average vertical spacing between consecutive children
        let totalSpacing = 0;
        let spacingCount = 0;

        for (let j = 0; j < childRects.length - 1; j++) {
          const gap = childRects[j + 1].top - childRects[j].bottom;
          if (gap >= 0) {
            totalSpacing += gap;
            spacingCount++;
          }
        }

        if (spacingCount === 0) continue;
        const avgSpacing = totalSpacing / spacingCount;

        let relationship: 'tight' | 'related' | 'separated';
        if (avgSpacing < 8) relationship = 'tight';
        else if (avgSpacing < 32) relationship = 'related';
        else relationship = 'separated';

        groups.push({
          elements,
          spacing: `${Math.round(avgSpacing)}px`,
          relationship,
        });
      } catch {
        continue;
      }

      if (groups.length >= 20) break;
    }

    return { groups };
  }

  private analyzeSectionSpacing(): WhitespaceAnalysis['sectionSpacing'] {
    const sections: WhitespaceAnalysis['sectionSpacing']['sections'] = [];
    const sectionElements = document.querySelectorAll('section, article, [role="region"], .section');
    const limit = Math.min(sectionElements.length, 30);

    let totalSpacing = 0;
    let spacingCount = 0;
    const spacingValues: number[] = [];

    for (let i = 0; i < limit; i++) {
      const el = sectionElements[i];
      try {
        const style = getCachedStyle(el);
        const topMargin = style.marginTop || '0px';
        const bottomMargin = style.marginBottom || '0px';
        const topPadding = style.paddingTop || '0px';
        const bottomPadding = style.paddingBottom || '0px';

        // Use the larger of margin or padding for section spacing
        const effectiveTop = Math.max(parsePxValue(topMargin), parsePxValue(topPadding));
        const effectiveBottom = Math.max(parsePxValue(bottomMargin), parsePxValue(bottomPadding));

        sections.push({
          selector: describeElement(el),
          topMargin: `${effectiveTop}px`,
          bottomMargin: `${effectiveBottom}px`,
        });

        if (effectiveTop > 0) { totalSpacing += effectiveTop; spacingCount++; spacingValues.push(effectiveTop); }
        if (effectiveBottom > 0) { totalSpacing += effectiveBottom; spacingCount++; spacingValues.push(effectiveBottom); }
      } catch {
        continue;
      }
    }

    const averageSpacing = spacingCount > 0 ? Math.round(totalSpacing / spacingCount) : 0;

    // Calculate consistency (standard deviation relative to mean)
    let consistency = 100;
    if (spacingValues.length > 1 && averageSpacing > 0) {
      const variance = spacingValues.reduce((sum, v) => sum + Math.pow(v - averageSpacing, 2), 0) / spacingValues.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / averageSpacing; // Coefficient of variation
      consistency = Math.round(Math.max(0, 100 - cv * 100));
    }

    return {
      sections,
      averageSpacing,
      consistency: Math.max(0, Math.min(100, consistency)),
    };
  }

  private detectResponsiveSpacing(): WhitespaceAnalysis['responsiveSpacing'] {
    // Analyze media query breakpoints from stylesheets for spacing changes
    const responsiveChanges: WhitespaceAnalysis['responsiveSpacing'] = [];

    try {
      for (let i = 0; i < document.styleSheets.length; i++) {
        let rules: CSSRuleList;
        try {
          rules = document.styleSheets[i].cssRules;
        } catch {
          continue; // Cross-origin
        }

        this.scanMediaQueries(rules, responsiveChanges);
      }
    } catch {
      // Stylesheet access error
    }

    return responsiveChanges.slice(0, 10);
  }

  private scanMediaQueries(
    rules: CSSRuleList,
    results: WhitespaceAnalysis['responsiveSpacing']
  ): void {
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j];

      if (rule instanceof CSSMediaRule) {
        const mediaText = rule.conditionText || rule.media.mediaText;
        const bpMatch = mediaText.match(/(?:max|min)-width:\s*(\d+)px/);
        if (!bpMatch) continue;

        const breakpoint = parseInt(bpMatch[1]);
        const changes: WhitespaceAnalysis['responsiveSpacing'][0]['changes'] = [];

        for (let k = 0; k < Math.min(rule.cssRules.length, 50); k++) {
          const innerRule = rule.cssRules[k];
          if (innerRule instanceof CSSStyleRule) {
            const style = innerRule.style;
            const spacingProps = ['margin', 'padding', 'gap', 'margin-top', 'margin-bottom', 'padding-top', 'padding-bottom'];

            for (const prop of spacingProps) {
              const value = style.getPropertyValue(prop);
              if (value) {
                changes.push({
                  selector: innerRule.selectorText,
                  property: prop,
                  oldValue: 'inherited',
                  newValue: value,
                });
              }
            }
          }
        }

        if (changes.length > 0) {
          results.push({ breakpoint, changes: changes.slice(0, 10) });
        }
      }
    }
  }

  protected emptyResult(): WhitespaceAnalysis {
    return {
      verticalRhythm: { baseLineHeight: 0, commonMultiples: [], consistencyScore: 0, violations: [] },
      baseSpacingUnit: { detectedUnit: 8, confidence: 0, gridSystem: 'unknown' },
      densityZones: [],
      paddingMarginConsistency: { score: 0, commonPaddings: [], commonMargins: [], outliers: [] },
      visualGrouping: { groups: [] },
      sectionSpacing: { sections: [], averageSpacing: 0, consistency: 0 },
      responsiveSpacing: [],
    };
  }
}
