import type { FullScrapeResult } from '../shared/types';

export function generateAccessibilityAudit(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;
  const { accessibility: a } = result;

  return `# Accessibility Audit Report

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## Overall Score: ${a.overallScore}/100
## WCAG Level: ${a.wcagLevel}

---

## Contrast Issues (${a.contrastIssues.length})

${a.contrastIssues.slice(0, 20).map(c => `| \`${c.element}\` | FG: ${c.foreground} | BG: ${c.background} | Ratio: ${c.ratio.toFixed(2)}:1 | ${c.level} |`).join('\n')}

### Recommendations
- Increase contrast on all elements below 4.5:1 ratio for normal text
- Large text (18px+ or 14px+ bold) requires minimum 3:1 ratio
- Test with browser DevTools accessibility panel

## Missing Alt Text (${a.missingAltText.length})

${a.missingAltText.slice(0, 10).map(m => `- \`${m.element}\` — src: ${m.src}`).join('\n')}

## Missing ARIA Labels (${a.missingAriaLabels.length})

${a.missingAriaLabels.slice(0, 10).map(l => `- ${l}`).join('\n')}

## Tab Order Issues (${a.tabOrderIssues.length})

${a.tabOrderIssues.slice(0, 10).map(t => `- ${t}`).join('\n')}

## Semantic Issues (${a.semanticIssues.length})

${a.semanticIssues.slice(0, 10).map(s => `- ${s}`).join('\n')}

## Missing Focus Indicators (${a.focusIndicatorsMissing.length})

${a.focusIndicatorsMissing.slice(0, 10).map(f => `- ${f}`).join('\n')}

---

## Action Items

1. Fix all contrast ratio violations (priority: critical)
2. Add alt text to all meaningful images
3. Add ARIA labels to all interactive elements
4. Remove positive tabindex values (use natural DOM order)
5. Add focus-visible indicators to all interactive elements
6. Use semantic HTML elements (nav, main, header, footer, article, section)
7. Ensure heading hierarchy (h1 → h2 → h3, no skipping)
`;
}

export function generatePerformanceReport(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;
  const { lighthouse: l, imageAssets } = result;

  return `# Performance Report

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| LCP (Largest Contentful Paint) | ${l.lcp}ms | < 2500ms | ${l.lcp < 2500 ? 'PASS' : 'FAIL'} |
| CLS (Cumulative Layout Shift) | ${l.cls} | < 0.1 | ${l.cls < 0.1 ? 'PASS' : 'FAIL'} |
| INP (Interaction to Next Paint) | ${l.inp}ms | < 200ms | ${l.inp < 200 ? 'PASS' : 'FAIL'} |
| FCP (First Contentful Paint) | ${l.fcp}ms | < 1800ms | ${l.fcp < 1800 ? 'PASS' : 'FAIL'} |
| Speed Index | ${l.speedIndex}ms | < 3400ms | ${l.speedIndex < 3400 ? 'PASS' : 'FAIL'} |
| Total Blocking Time | ${l.totalBlockingTime}ms | < 200ms | ${l.totalBlockingTime < 200 ? 'PASS' : 'FAIL'} |

## Scores

- Performance: ${l.performanceScore}/100
- Accessibility: ${l.accessibilityScore}/100

## Image Analysis

- Total images: ${imageAssets.images.length}
- Lazy-loaded: ${imageAssets.lazyLoadPercentage.toFixed(0)}%
- Format distribution: ${Object.entries(imageAssets.formatDistribution).map(([f, c]) => `${f}: ${c}`).join(', ')}

## Recommendations

1. ${l.lcp >= 2500 ? 'Optimize LCP: preload critical images, use efficient formats (WebP/AVIF)' : 'LCP is within target'}
2. ${l.cls >= 0.1 ? 'Reduce CLS: set explicit dimensions on images/videos, avoid dynamic content insertion' : 'CLS is within target'}
3. ${imageAssets.lazyLoadPercentage < 70 ? 'Increase lazy loading coverage — currently only ' + imageAssets.lazyLoadPercentage.toFixed(0) + '% of images' : 'Good lazy loading coverage'}
4. ${l.totalBlockingTime >= 200 ? 'Reduce JavaScript blocking time: code-split, defer non-critical scripts' : 'Blocking time is acceptable'}
`;
}

export function generateCompetitorMatrix(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;

  return `# Competitor Analysis Matrix

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## Design Comparison

| Dimension | ${result.projectName} | Notes |
|-----------|----------------------|-------|
| Visual Style | ${result.projectContext.designStyle} | Scraped from live site |
| Typography | ${result.typography.fontFamilies[0]?.family || 'System'} | Primary font |
| Color Count | ${result.designTokens.colors.length} | Unique colors |
| Components | ${result.components.length} | Identified components |
| Accessibility | ${result.accessibility.overallScore}/100 | WCAG audit |
| Performance | ${result.lighthouse.performanceScore}/100 | Lighthouse |
| Dark Mode | ${result.darkMode.hasDarkMode ? 'Yes' : 'No'} | Theme support |

## Third-Party Stack

${Object.entries(result.thirdPartyStack).map(([category, tools]) =>
    tools.length > 0 ? `### ${category}\n${tools.map((t: { name: string; confidence: number }) => `- ${t.name} (confidence: ${(t.confidence * 100).toFixed(0)}%)`).join('\n')}` : ''
  ).filter(Boolean).join('\n\n')}

## Design Version History

${result.waybackSnapshots.length > 0
    ? result.waybackSnapshots.map(s => `- **${s.timestamp}**: ${s.waybackUrl}`).join('\n')
    : 'No historical snapshots available'}
`;
}

export function generateFlowAnalysis(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;
  const { flowAnalysis: f } = result;

  return `# User Flow Analysis

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## Overview

- Steps to conversion: ${f.stepsToConversion}
- Total form fields: ${f.formFieldCount}
- Estimated cognitive load: ${f.estimatedCognitiveLoad}/100

## Decisions Per Screen

${f.decisionsPerScreen.map((d, i) => `- Screen ${i + 1}: ${d} decisions`).join('\n')}

## Friction Points

${f.frictionPoints.map(fp => `### ${fp.description}\n- Step: ${fp.step}\n- Severity: ${fp.severity}/10`).join('\n\n')}

## Recommendations

1. ${f.stepsToConversion > 5 ? 'Reduce conversion steps — current ' + f.stepsToConversion + ' steps is high' : 'Conversion funnel length is reasonable'}
2. ${f.formFieldCount > 10 ? 'Simplify forms — ' + f.formFieldCount + ' fields is excessive' : 'Form field count is manageable'}
3. ${f.estimatedCognitiveLoad > 60 ? 'Reduce cognitive load — simplify choices and visual hierarchy' : 'Cognitive load is within acceptable range'}
`;
}

export function generateConversionPatterns(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;
  const { conversionPatterns: c } = result;

  return `# Conversion Pattern Analysis

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## CTAs (${c.ctas.length} found)

${c.ctas.slice(0, 10).map(cta => `- **"${cta.text}"** — Position: ${cta.position}, Color: ${cta.color}, Prominence: ${cta.prominence}/10`).join('\n')}

## Social Proof (${c.socialProof.length} elements)

${c.socialProof.slice(0, 10).map(sp => `- ${sp.type}: "${sp.content}" — Position: ${sp.position}`).join('\n')}

## Form Optimization

Total fields: ${c.formFields.length}
Required fields: ${c.formFields.filter(f => f.required).length}

${c.formFields.slice(0, 15).map(f => `- ${f.label} (${f.type}) ${f.required ? '**required**' : ''}`).join('\n')}

## Urgency/Scarcity Patterns

${c.urgencyPatterns.length > 0 ? c.urgencyPatterns.map(u => `- ${u.type}: "${u.content}"`).join('\n') : 'None detected'}

## Trust Signals

${c.trustBadges.length > 0 ? c.trustBadges.map(t => `- ${t}`).join('\n') : 'None detected'}
`;
}

export function generateCopyToneGuide(result: FullScrapeResult, generatedContent?: string): string {
  if (generatedContent) return generatedContent;
  const { copyAnalysis: c } = result;

  return `# Copy & Tone Guide

> Source: ${result.targetUrl}
> Generated: ${new Date().toISOString()}

## CTA Language

${c.ctaLabels.slice(0, 15).map(l => `- "${l.text}" (${l.element}, used ${l.count}x)`).join('\n')}

## Tone Keywords

${c.toneKeywords.slice(0, 20).map(k => `\`${k}\``).join(', ')}

## Microcopy Patterns

${c.microcopy.slice(0, 15).map(m => `- **${m.context}**: "${m.text}"`).join('\n')}

## Placeholder Text

${c.placeholders.slice(0, 10).map(p => `- ${p.field}: "${p.text}"`).join('\n')}

## Error Messages

${c.errorMessages.slice(0, 10).map(e => `- ${e}`).join('\n') || 'None detected on page load'}

## Empty State Text

${c.emptyStateText.slice(0, 5).map(e => `- "${e}"`).join('\n') || 'None detected'}

## Tooltip Content

${c.tooltips.slice(0, 10).map(t => `- "${t}"`).join('\n') || 'None detected'}
`;
}
