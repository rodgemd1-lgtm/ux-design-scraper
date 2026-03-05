import { createLogger } from '@shared/logger';
import { sanitizeFilename } from '@shared/utils';
import type {
  FullScrapeResult,
  OutputManifest,
  ReconstructedComponent,
  DesignCritique,
  GeneratedPersona,
  RewrittenCopy,
  ABTestPlan,
  MultiSiteResult,
} from '@shared/types';

const log = createLogger('FileOutput');

interface PromptChainResult {
  research: {
    patterns: string[];
    suggestedUrls: string[];
    insights: string[];
  };
  analysis: {
    tokenTaxonomy: Record<string, unknown>;
    componentTaxonomy: Record<string, unknown>;
    gaps: string[];
  };
  generation: {
    claudeMd: string;
    masterPrompt: string;
    analysisDocs: string[];
  };
}

interface OutputGenerationInput {
  scrapeResult: FullScrapeResult;
  promptChainResult: PromptChainResult;
  projectName: string;
}

export class FileOutputManager {
  async generateFullOutput(data: OutputGenerationInput): Promise<OutputManifest> {
    const { scrapeResult, promptChainResult, projectName } = data;
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}`;

    log.info('Generating full output', { projectName: safeName });

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    // 1. CLAUDE.md — the main deliverable
    const claudeMdContent = promptChainResult.generation.claudeMd || this.generateClaudeMd(scrapeResult, promptChainResult);
    await this.downloadFile(`${basePath}/CLAUDE.md`, claudeMdContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/CLAUDE.md`, type: 'markdown', size: claudeMdContent.length });

    // 2. README.md — project overview
    const readmeContent = this.generateReadme(scrapeResult, promptChainResult);
    await this.downloadFile(`${basePath}/README.md`, readmeContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/README.md`, type: 'markdown', size: readmeContent.length });

    // 3. Master prompt
    const masterPromptContent = promptChainResult.generation.masterPrompt || '';
    if (masterPromptContent) {
      await this.downloadFile(`${basePath}/prompts/master-prompt.md`, masterPromptContent, 'text/markdown');
      manifest.files.push({ path: `${basePath}/prompts/master-prompt.md`, type: 'markdown', size: masterPromptContent.length });
    }

    // 4. Research insights
    const researchContent = this.formatResearchDoc(promptChainResult.research);
    await this.downloadFile(`${basePath}/analysis/research-insights.md`, researchContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/analysis/research-insights.md`, type: 'markdown', size: researchContent.length });

    // 5. Analysis documents from prompt chain
    for (let i = 0; i < promptChainResult.generation.analysisDocs.length; i++) {
      const doc = promptChainResult.generation.analysisDocs[i];
      const filename = `${basePath}/analysis/analysis-${i + 1}.md`;
      await this.downloadFile(filename, doc, 'text/markdown');
      manifest.files.push({ path: filename, type: 'markdown', size: doc.length });
    }

    // 6. Design tokens JSON files
    const tokensJson = JSON.stringify(scrapeResult.designTokens, null, 2);
    await this.downloadFile(`${basePath}/tokens/design-tokens.json`, tokensJson, 'application/json');
    manifest.files.push({ path: `${basePath}/tokens/design-tokens.json`, type: 'json', size: tokensJson.length });

    const typographyJson = JSON.stringify(scrapeResult.typography, null, 2);
    await this.downloadFile(`${basePath}/tokens/typography.json`, typographyJson, 'application/json');
    manifest.files.push({ path: `${basePath}/tokens/typography.json`, type: 'json', size: typographyJson.length });

    const gridJson = JSON.stringify(scrapeResult.gridLayout, null, 2);
    await this.downloadFile(`${basePath}/tokens/grid-layout.json`, gridJson, 'application/json');
    manifest.files.push({ path: `${basePath}/tokens/grid-layout.json`, type: 'json', size: gridJson.length });

    if (scrapeResult.darkMode.hasDarkMode) {
      const darkModeJson = JSON.stringify(scrapeResult.darkMode, null, 2);
      await this.downloadFile(`${basePath}/tokens/dark-mode.json`, darkModeJson, 'application/json');
      manifest.files.push({ path: `${basePath}/tokens/dark-mode.json`, type: 'json', size: darkModeJson.length });
    }

    // 7. Component HTML/CSS files
    for (const component of scrapeResult.components) {
      const componentSafeName = sanitizeFilename(component.name);

      const htmlContent = component.html;
      await this.downloadFile(`${basePath}/components/${componentSafeName}.html`, htmlContent, 'text/html');
      manifest.files.push({ path: `${basePath}/components/${componentSafeName}.html`, type: 'html', size: htmlContent.length });

      const cssContent = component.css;
      await this.downloadFile(`${basePath}/components/${componentSafeName}.css`, cssContent, 'text/css');
      manifest.files.push({ path: `${basePath}/components/${componentSafeName}.css`, type: 'css', size: cssContent.length });

      if (Object.keys(component.stateVariants).length > 0) {
        const statesJson = JSON.stringify(component.stateVariants, null, 2);
        await this.downloadFile(`${basePath}/components/${componentSafeName}-states.json`, statesJson, 'application/json');
        manifest.files.push({ path: `${basePath}/components/${componentSafeName}-states.json`, type: 'json', size: statesJson.length });
      }
    }

    // 8. Screenshots as PNGs
    for (const screenshot of scrapeResult.screenshots) {
      const filename = `${basePath}/screenshots/viewport-${screenshot.breakpoint}px.png`;
      // Screenshots are data URLs, need to convert to binary for download
      await this.downloadDataUrl(filename, screenshot.dataUrl);
      manifest.files.push({ path: filename, type: 'png', size: screenshot.dataUrl.length });
    }

    // 9. Accessibility report
    const a11yContent = this.formatAccessibilityReport(scrapeResult);
    await this.downloadFile(`${basePath}/analysis/accessibility-report.md`, a11yContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/analysis/accessibility-report.md`, type: 'markdown', size: a11yContent.length });

    // 10. Performance report
    const perfContent = this.formatPerformanceReport(scrapeResult);
    await this.downloadFile(`${basePath}/analysis/performance-report.md`, perfContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/analysis/performance-report.md`, type: 'markdown', size: perfContent.length });

    // 11. Navigation / sitemap
    const navJson = JSON.stringify(scrapeResult.navigation, null, 2);
    await this.downloadFile(`${basePath}/analysis/navigation-structure.json`, navJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/navigation-structure.json`, type: 'json', size: navJson.length });

    // 12. Copy analysis
    const copyJson = JSON.stringify(scrapeResult.copyAnalysis, null, 2);
    await this.downloadFile(`${basePath}/analysis/copy-analysis.json`, copyJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/copy-analysis.json`, type: 'json', size: copyJson.length });

    // 13. Third-party stack
    const stackJson = JSON.stringify(scrapeResult.thirdPartyStack, null, 2);
    await this.downloadFile(`${basePath}/analysis/third-party-stack.json`, stackJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/third-party-stack.json`, type: 'json', size: stackJson.length });

    // 14. Conversion patterns
    const conversionJson = JSON.stringify(scrapeResult.conversionPatterns, null, 2);
    await this.downloadFile(`${basePath}/analysis/conversion-patterns.json`, conversionJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/conversion-patterns.json`, type: 'json', size: conversionJson.length });

    // 15. Animations
    const animationsJson = JSON.stringify(scrapeResult.animations, null, 2);
    await this.downloadFile(`${basePath}/analysis/animations.json`, animationsJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/animations.json`, type: 'json', size: animationsJson.length });

    // 16. Token taxonomy from Claude analysis
    const taxonomyJson = JSON.stringify(promptChainResult.analysis, null, 2);
    await this.downloadFile(`${basePath}/analysis/design-taxonomy.json`, taxonomyJson, 'application/json');
    manifest.files.push({ path: `${basePath}/analysis/design-taxonomy.json`, type: 'json', size: taxonomyJson.length });

    // 17. Knowledge base summary
    const knowledgeBaseContent = this.generateKnowledgeBase(scrapeResult, promptChainResult);
    await this.downloadFile(`${basePath}/knowledge-base.md`, knowledgeBaseContent, 'text/markdown');
    manifest.files.push({ path: `${basePath}/knowledge-base.md`, type: 'markdown', size: knowledgeBaseContent.length });

    // 18. Icons data
    if (scrapeResult.icons.length > 0) {
      const iconsJson = JSON.stringify(scrapeResult.icons, null, 2);
      await this.downloadFile(`${basePath}/assets/icons.json`, iconsJson, 'application/json');
      manifest.files.push({ path: `${basePath}/assets/icons.json`, type: 'json', size: iconsJson.length });
    }

    // 19. Image assets report
    const imagesJson = JSON.stringify(scrapeResult.imageAssets, null, 2);
    await this.downloadFile(`${basePath}/assets/image-assets.json`, imagesJson, 'application/json');
    manifest.files.push({ path: `${basePath}/assets/image-assets.json`, type: 'json', size: imagesJson.length });

    log.info('Output generation complete', { fileCount: manifest.files.length });
    return manifest;
  }

  private async downloadFile(path: string, content: string, mimeType: string): Promise<void> {
    const blob = new Blob([content], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    try {
      await chrome.downloads.download({
        url: blobUrl,
        filename: path,
        saveAs: false,
        conflictAction: 'overwrite',
      });

      log.debug('File downloaded', { path });
    } catch (err) {
      log.error('Failed to download file', { path, error: err });
      throw new Error(`Failed to save file ${path}: ${err}`);
    } finally {
      // Clean up blob URL after a brief delay to ensure download starts
      setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    }
  }

  private async downloadDataUrl(path: string, dataUrl: string): Promise<void> {
    try {
      await chrome.downloads.download({
        url: dataUrl,
        filename: path,
        saveAs: false,
        conflictAction: 'overwrite',
      });

      log.debug('Data URL file downloaded', { path });
    } catch (err) {
      log.error('Failed to download data URL file', { path, error: err });
      throw new Error(`Failed to save file ${path}: ${err}`);
    }
  }

  private generateClaudeMd(scrapeResult: FullScrapeResult, promptChainResult: PromptChainResult): string {
    const { designTokens, typography, gridLayout, accessibility, lighthouse, navigation, darkMode } = scrapeResult;
    const { analysis } = promptChainResult;

    return `# CLAUDE.md - Design System Reference
## ${scrapeResult.projectName}
Generated from: ${scrapeResult.targetUrl}
Date: ${new Date(scrapeResult.timestamp).toISOString()}

## Project Context
- **Industry**: ${scrapeResult.projectContext.industry}
- **Goal**: ${scrapeResult.projectContext.goal}
- **Target Audience**: ${scrapeResult.projectContext.targetAudience}
- **Design Style**: ${scrapeResult.projectContext.designStyle}

## Design Tokens

### Colors
${designTokens.colors.slice(0, 20).map(c => `- \`${c.value}\` (used ${c.count}x) - ${c.contexts.slice(0, 3).join(', ')}`).join('\n')}

### Spacing Scale
${designTokens.spacing.slice(0, 15).map(s => `- \`${s.value}\` (used ${s.count}x)`).join('\n')}

### Border Radii
${designTokens.borderRadii.map(r => `- \`${r.value}\` (used ${r.count}x)`).join('\n')}

### Shadows
${designTokens.shadows.map(s => `- \`${s.value}\` (used ${s.count}x)`).join('\n')}

## Typography System

### Font Families
${typography.fontFamilies.map(f => `- **${f.family}** (used ${f.count}x) - ${f.usage.slice(0, 3).join(', ')}`).join('\n')}

### Font Sizes
${typography.fontSizes.slice(0, 15).map(f => `- \`${f.size}\` on \`${f.element}\` (${f.count}x)`).join('\n')}

### Font Weights
${typography.fontWeights.map(f => `- \`${f.weight}\` (${f.count}x)`).join('\n')}

### Line Heights
${typography.lineHeights.map(l => `- \`${l.value}\` (${l.count}x)`).join('\n')}

## Grid System
- **Container Max Width**: ${gridLayout.containerMaxWidth}
- **Columns**: ${gridLayout.columns}
- **Gutter Width**: ${gridLayout.gutterWidth}
- **Layout Type**: ${gridLayout.layoutType}

### Breakpoint Behaviors
${gridLayout.breakpointBehaviors.map(b => `- ${b.breakpoint}px: ${b.columns} columns, ${b.layout}`).join('\n')}

## Navigation
- **Menu Depth**: ${navigation.menuDepth}
- **Total Pages**: ${navigation.totalPages}

## Accessibility
- **Overall Score**: ${accessibility.overallScore}/100
- **WCAG Level**: ${accessibility.wcagLevel}
- **Contrast Issues**: ${accessibility.contrastIssues.length}
- **Missing Alt Text**: ${accessibility.missingAltText.length}
- **Missing ARIA Labels**: ${accessibility.missingAriaLabels.length}

## Performance
- **Performance Score**: ${lighthouse.performanceScore}/100
- **LCP**: ${lighthouse.lcp}ms
- **CLS**: ${lighthouse.cls}
- **INP**: ${lighthouse.inp}ms
- **FCP**: ${lighthouse.fcp}ms
- **Speed Index**: ${lighthouse.speedIndex}ms

${darkMode.hasDarkMode ? `## Dark Mode
- **Method**: ${darkMode.method}
- **Dark Colors**: ${darkMode.darkColors.length} tokens
${darkMode.toggleSelector ? `- **Toggle Selector**: \`${darkMode.toggleSelector}\`` : ''}` : ''}

## Component Taxonomy
${JSON.stringify(analysis.componentTaxonomy, null, 2)}

## Design Gaps
${analysis.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## Design Rules
1. Follow the spacing scale strictly - do not introduce custom spacing values
2. Use only the defined font families and weights
3. Maintain the established color palette - extend through tints/shades only
4. All interactive elements must meet WCAG ${accessibility.wcagLevel} contrast requirements
5. Grid layouts must follow the ${gridLayout.columns}-column system with ${gridLayout.gutterWidth} gutters
6. Performance budget: LCP < ${Math.max(lighthouse.lcp, 2500)}ms, CLS < ${Math.max(lighthouse.cls, 0.1)}
`;
  }

  private generateReadme(scrapeResult: FullScrapeResult, promptChainResult: PromptChainResult): string {
    return `# ${scrapeResult.projectName} - UX Design Intelligence

## Overview
Design system intelligence extracted from [${scrapeResult.targetUrl}](${scrapeResult.targetUrl}).

Generated on: ${new Date(scrapeResult.timestamp).toISOString()}

## What's Included

### Core Files
- **CLAUDE.md** - Complete design system reference for AI-assisted development
- **knowledge-base.md** - Comprehensive design knowledge base

### Prompts
- **master-prompt.md** - Self-contained prompt to recreate this design system with any AI

### Tokens
- **design-tokens.json** - Colors, spacing, shadows, border radii
- **typography.json** - Font families, sizes, weights, line heights
- **grid-layout.json** - Grid system specification
${scrapeResult.darkMode.hasDarkMode ? '- **dark-mode.json** - Dark mode token mapping' : ''}

### Components
${scrapeResult.components.map(c => `- **${sanitizeFilename(c.name)}.html/.css** - ${c.type} component`).join('\n')}

### Analysis
- **research-insights.md** - Design pattern research
- **accessibility-report.md** - WCAG compliance audit
- **performance-report.md** - Lighthouse metrics
- **navigation-structure.json** - Site navigation tree
- **copy-analysis.json** - Microcopy and CTA analysis
- **third-party-stack.json** - Detected technologies
- **conversion-patterns.json** - Conversion optimization data
- **design-taxonomy.json** - Normalized design taxonomy

### Screenshots
${scrapeResult.screenshots.map(s => `- **viewport-${s.breakpoint}px.png** - ${s.breakpoint}px breakpoint`).join('\n')}

### Assets
- **icons.json** - Extracted SVG icons
- **image-assets.json** - Image asset audit

## Methodology
Generated using the Double Black Box framework:
1. **Discover** - Scraped and observed the live site
2. **Define** - Identified patterns and problems
3. **Analyze** - Normalized tokens and built taxonomy
4. **Generate** - Produced design system documentation

## Key Findings
${promptChainResult.research.insights.slice(0, 5).map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

## Gaps Identified
${promptChainResult.analysis.gaps.slice(0, 5).map((gap, i) => `${i + 1}. ${gap}`).join('\n')}
`;
  }

  private formatResearchDoc(research: PromptChainResult['research']): string {
    return `# Research Insights

## Design Patterns Identified
${research.patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Suggested URLs for Further Research
${research.suggestedUrls.map(url => `- ${url}`).join('\n')}

## Key Insights
${research.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
`;
  }

  private formatAccessibilityReport(scrapeResult: FullScrapeResult): string {
    const a11y = scrapeResult.accessibility;
    return `# Accessibility Report

## Summary
- **Overall Score**: ${a11y.overallScore}/100
- **WCAG Compliance Level**: ${a11y.wcagLevel}

## Contrast Issues (${a11y.contrastIssues.length})
${a11y.contrastIssues.map(issue =>
  `- **${issue.element}**: ${issue.foreground} on ${issue.background} (ratio: ${issue.ratio.toFixed(2)}, level: ${issue.level})`
).join('\n') || 'None found.'}

## Missing Alt Text (${a11y.missingAltText.length})
${a11y.missingAltText.map(item =>
  `- \`${item.element}\`: ${item.src}`
).join('\n') || 'None found.'}

## Missing ARIA Labels (${a11y.missingAriaLabels.length})
${a11y.missingAriaLabels.map(label => `- ${label}`).join('\n') || 'None found.'}

## Tab Order Issues (${a11y.tabOrderIssues.length})
${a11y.tabOrderIssues.map(issue => `- ${issue}`).join('\n') || 'None found.'}

## Semantic Issues (${a11y.semanticIssues.length})
${a11y.semanticIssues.map(issue => `- ${issue}`).join('\n') || 'None found.'}

## Focus Indicators Missing (${a11y.focusIndicatorsMissing.length})
${a11y.focusIndicatorsMissing.map(item => `- ${item}`).join('\n') || 'None found.'}
`;
  }

  private formatPerformanceReport(scrapeResult: FullScrapeResult): string {
    const lh = scrapeResult.lighthouse;
    return `# Performance Report

## Lighthouse Scores
- **Performance**: ${lh.performanceScore}/100
- **Accessibility**: ${lh.accessibilityScore}/100

## Core Web Vitals
- **LCP (Largest Contentful Paint)**: ${lh.lcp}ms ${lh.lcp <= 2500 ? '[GOOD]' : lh.lcp <= 4000 ? '[NEEDS IMPROVEMENT]' : '[POOR]'}
- **CLS (Cumulative Layout Shift)**: ${lh.cls} ${lh.cls <= 0.1 ? '[GOOD]' : lh.cls <= 0.25 ? '[NEEDS IMPROVEMENT]' : '[POOR]'}
- **INP (Interaction to Next Paint)**: ${lh.inp}ms ${lh.inp <= 200 ? '[GOOD]' : lh.inp <= 500 ? '[NEEDS IMPROVEMENT]' : '[POOR]'}

## Additional Metrics
- **FCP (First Contentful Paint)**: ${lh.fcp}ms
- **Speed Index**: ${lh.speedIndex}ms
- **Total Blocking Time**: ${lh.totalBlockingTime}ms

## Image Optimization
- **Total Images**: ${scrapeResult.imageAssets.images.length}
- **Total Size**: ${scrapeResult.imageAssets.totalSize} bytes
- **Lazy Load Coverage**: ${scrapeResult.imageAssets.lazyLoadPercentage}%
- **Format Distribution**: ${Object.entries(scrapeResult.imageAssets.formatDistribution).map(([fmt, count]) => `${fmt}: ${count}`).join(', ')}
`;
  }

  // ===== New AI Intelligence Output Methods =====

  async generateReconstructedComponentsOutput(
    components: ReconstructedComponent[],
    projectName: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/reconstructed-components`;

    log.info('Generating reconstructed component files', { count: components.length });

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    for (const component of components) {
      const componentFileName = sanitizeFilename(component.name);

      // Main TSX component file
      if (component.tsx) {
        const tsxPath = `${basePath}/${componentFileName}.tsx`;
        await this.downloadFile(tsxPath, component.tsx, 'text/typescript');
        manifest.files.push({ path: tsxPath, type: 'tsx', size: component.tsx.length });
      }

      // Props interface file
      if (component.propsInterface) {
        const propsPath = `${basePath}/${componentFileName}.types.ts`;
        await this.downloadFile(propsPath, component.propsInterface, 'text/typescript');
        manifest.files.push({ path: propsPath, type: 'ts', size: component.propsInterface.length });
      }

      // Storybook story file
      if (component.storybookStory) {
        const storyPath = `${basePath}/${componentFileName}.stories.tsx`;
        await this.downloadFile(storyPath, component.storybookStory, 'text/typescript');
        manifest.files.push({ path: storyPath, type: 'tsx', size: component.storybookStory.length });
      }

      // Usage example
      if (component.usageExample) {
        const usagePath = `${basePath}/${componentFileName}.usage.tsx`;
        await this.downloadFile(usagePath, component.usageExample, 'text/typescript');
        manifest.files.push({ path: usagePath, type: 'tsx', size: component.usageExample.length });
      }
    }

    // Index file that exports all components
    const indexContent = components.map(c => {
      const fileName = sanitizeFilename(c.name);
      return `export { default as ${c.name}, ${c.name} } from './${fileName}';`;
    }).join('\n');
    const indexPath = `${basePath}/index.ts`;
    await this.downloadFile(indexPath, indexContent, 'text/typescript');
    manifest.files.push({ path: indexPath, type: 'ts', size: indexContent.length });

    // Summary README
    const readmeContent = `# Reconstructed Components

${components.length} components reconstructed from scraped design data.

## Components

${components.map(c => `### ${c.name}
- **Original Type:** ${c.originalType}
- **Responsive:** ${c.responsive ? 'Yes' : 'No'}
- **State Variants:** ${c.stateVariants.join(', ') || 'None'}
- **ARIA Attributes:** ${c.ariaAttributes.join(', ') || 'None'}
- **Tailwind Classes Used:** ${c.tailwindClasses.length}
`).join('\n')}
`;
    const readmePath = `${basePath}/README.md`;
    await this.downloadFile(readmePath, readmeContent, 'text/markdown');
    manifest.files.push({ path: readmePath, type: 'markdown', size: readmeContent.length });

    log.info('Reconstructed component output complete', { fileCount: manifest.files.length });
    return manifest;
  }

  async generateCritiqueOutput(
    critique: DesignCritique,
    projectName: string,
    siteUrl: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/critique`;

    log.info('Generating design critique output');

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    const critiqueContent = `# Design Critique Report
## ${siteUrl}
Generated: ${new Date().toISOString()}

---

## Executive Summary
${critique.executiveSummary}

---

## Overall Design Maturity Score: ${critique.overallScore}/10

---

## Top 5 Strengths

${critique.strengths.map((s, i) => `### ${i + 1}. ${s.title}
**Evidence:** ${s.evidence}
**Impact:** ${s.impact}
`).join('\n')}

---

## Top 10 Weaknesses

${critique.weaknesses.map((w, i) => `### ${i + 1}. ${w.title} [${w.severity.toUpperCase()}]
**Evidence:** ${w.evidence}
**Recommendation:** ${w.recommendation}
**Estimated Effort:** ${w.estimatedEffort}
`).join('\n')}

---

## Detailed Analysis

### Visual Hierarchy (${critique.visualHierarchy.score}/10)
${critique.visualHierarchy.summary}
${critique.visualHierarchy.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.visualHierarchy.recommendations.map(r => `- ${r}`).join('\n')}

### Whitespace (${critique.whitespace.score}/10)
${critique.whitespace.summary}
${critique.whitespace.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.whitespace.recommendations.map(r => `- ${r}`).join('\n')}

### Color Harmony (${critique.colorHarmony.score}/10)
${critique.colorHarmony.summary}
${critique.colorHarmony.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.colorHarmony.recommendations.map(r => `- ${r}`).join('\n')}

### Typography (${critique.typographyCritique.score}/10)
${critique.typographyCritique.summary}
${critique.typographyCritique.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.typographyCritique.recommendations.map(r => `- ${r}`).join('\n')}

### CTA Effectiveness (${critique.ctaEffectiveness.score}/10)
${critique.ctaEffectiveness.summary}
${critique.ctaEffectiveness.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.ctaEffectiveness.recommendations.map(r => `- ${r}`).join('\n')}

### Mobile-First Assessment (${critique.mobileFirst.score}/10)
${critique.mobileFirst.summary}
${critique.mobileFirst.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.mobileFirst.recommendations.map(r => `- ${r}`).join('\n')}

### Emotional Design (${critique.emotionalDesign.score}/10)
${critique.emotionalDesign.summary}
${critique.emotionalDesign.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.emotionalDesign.recommendations.map(r => `- ${r}`).join('\n')}

### Brand Consistency (${critique.brandConsistency.score}/10)
${critique.brandConsistency.summary}
${critique.brandConsistency.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.brandConsistency.recommendations.map(r => `- ${r}`).join('\n')}

### Microinteractions (${critique.microinteractions.score}/10)
${critique.microinteractions.summary}
${critique.microinteractions.details.map(d => `- ${d}`).join('\n')}

**Recommendations:**
${critique.microinteractions.recommendations.map(r => `- ${r}`).join('\n')}

---

## Innovation Score: ${critique.innovationScore}/10
${critique.innovationAssessment}
`;

    const critiquePath = `${basePath}/design-critique.md`;
    await this.downloadFile(critiquePath, critiqueContent, 'text/markdown');
    manifest.files.push({ path: critiquePath, type: 'markdown', size: critiqueContent.length });

    // Also save as JSON for programmatic access
    const critiqueJson = JSON.stringify(critique, null, 2);
    const jsonPath = `${basePath}/design-critique.json`;
    await this.downloadFile(jsonPath, critiqueJson, 'application/json');
    manifest.files.push({ path: jsonPath, type: 'json', size: critiqueJson.length });

    log.info('Critique output complete');
    return manifest;
  }

  async generatePersonasOutput(
    personas: GeneratedPersona[],
    projectName: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/personas`;

    log.info('Generating persona output', { count: personas.length });

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    for (const persona of personas) {
      const personaFileName = sanitizeFilename(persona.name);
      const personaContent = `# ${persona.name}
*"${persona.quote}"*

## Demographics
- **Age Range:** ${persona.ageRange}
- **Occupation:** ${persona.occupation}
- **Tech Savviness:** ${persona.techSavviness}

## Bio
${persona.bio}

## Goals
${persona.goals.map(g => `- ${g}`).join('\n')}

## Frustrations
${persona.frustrations.map(f => `- ${f}`).join('\n')}

## Behavioral Patterns
${persona.behavioralPatterns.map(b => `- ${b}`).join('\n')}

## Device Preferences
${persona.devicePreferences.map(d => `- ${d}`).join('\n')}

## Accessibility Needs
${persona.accessibilityNeeds.length > 0 ? persona.accessibilityNeeds.map(a => `- ${a}`).join('\n') : '- No specific accessibility needs identified'}

## Jobs to Be Done
${persona.jobsToBeDone.map(j => `- ${j}`).join('\n')}

## Journey Map

### Discover
- **Actions:** ${persona.journeyMap.discover.actions.join(', ')}
- **Thoughts:** ${persona.journeyMap.discover.thoughts.join(', ')}
- **Emotions:** ${persona.journeyMap.discover.emotions.join(', ')}
- **Touchpoints:** ${persona.journeyMap.discover.touchpoints.join(', ')}
- **Pain Points:** ${persona.journeyMap.discover.painPoints.join(', ')}
- **Opportunities:** ${persona.journeyMap.discover.opportunities.join(', ')}

### Evaluate
- **Actions:** ${persona.journeyMap.evaluate.actions.join(', ')}
- **Thoughts:** ${persona.journeyMap.evaluate.thoughts.join(', ')}
- **Emotions:** ${persona.journeyMap.evaluate.emotions.join(', ')}
- **Touchpoints:** ${persona.journeyMap.evaluate.touchpoints.join(', ')}
- **Pain Points:** ${persona.journeyMap.evaluate.painPoints.join(', ')}
- **Opportunities:** ${persona.journeyMap.evaluate.opportunities.join(', ')}

### Convert
- **Actions:** ${persona.journeyMap.convert.actions.join(', ')}
- **Thoughts:** ${persona.journeyMap.convert.thoughts.join(', ')}
- **Emotions:** ${persona.journeyMap.convert.emotions.join(', ')}
- **Touchpoints:** ${persona.journeyMap.convert.touchpoints.join(', ')}
- **Pain Points:** ${persona.journeyMap.convert.painPoints.join(', ')}
- **Opportunities:** ${persona.journeyMap.convert.opportunities.join(', ')}

### Retain
- **Actions:** ${persona.journeyMap.retain.actions.join(', ')}
- **Thoughts:** ${persona.journeyMap.retain.thoughts.join(', ')}
- **Emotions:** ${persona.journeyMap.retain.emotions.join(', ')}
- **Touchpoints:** ${persona.journeyMap.retain.touchpoints.join(', ')}
- **Pain Points:** ${persona.journeyMap.retain.painPoints.join(', ')}
- **Opportunities:** ${persona.journeyMap.retain.opportunities.join(', ')}

## Key Scenarios
${persona.keyScenarios.map(s => `
### ${s.title}
**Context:** ${s.context}
**Steps:**
${s.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}
**Outcome:** ${s.outcome}
`).join('\n')}
`;

      const personaPath = `${basePath}/${personaFileName}.md`;
      await this.downloadFile(personaPath, personaContent, 'text/markdown');
      manifest.files.push({ path: personaPath, type: 'markdown', size: personaContent.length });
    }

    // All personas JSON
    const personasJson = JSON.stringify(personas, null, 2);
    const jsonPath = `${basePath}/all-personas.json`;
    await this.downloadFile(jsonPath, personasJson, 'application/json');
    manifest.files.push({ path: jsonPath, type: 'json', size: personasJson.length });

    log.info('Persona output complete', { fileCount: manifest.files.length });
    return manifest;
  }

  async generateCopyVariantsOutput(
    copyData: RewrittenCopy,
    projectName: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/copy-variants`;

    log.info('Generating copy variants output');

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    // Brand voice guide
    const voiceGuide = `# Brand Voice Guide

## Recommended Voice
${copyData.brandVoice}

## Tone Guidelines
${copyData.toneGuidelines.map(g => `- ${g}`).join('\n')}
`;
    const voicePath = `${basePath}/brand-voice-guide.md`;
    await this.downloadFile(voicePath, voiceGuide, 'text/markdown');
    manifest.files.push({ path: voicePath, type: 'markdown', size: voiceGuide.length });

    // CTA variants
    if (copyData.ctaRewrites.length > 0) {
      const ctaContent = this.formatCopyVariantSection('CTA Rewrites', copyData.ctaRewrites);
      const ctaPath = `${basePath}/cta-variants.md`;
      await this.downloadFile(ctaPath, ctaContent, 'text/markdown');
      manifest.files.push({ path: ctaPath, type: 'markdown', size: ctaContent.length });
    }

    // Headline variants
    if (copyData.headlineRewrites.length > 0) {
      const headlineContent = this.formatCopyVariantSection('Headline Rewrites', copyData.headlineRewrites);
      const headlinePath = `${basePath}/headline-variants.md`;
      await this.downloadFile(headlinePath, headlineContent, 'text/markdown');
      manifest.files.push({ path: headlinePath, type: 'markdown', size: headlineContent.length });
    }

    // Error message variants
    if (copyData.errorMessageRewrites.length > 0) {
      const errorContent = this.formatCopyVariantSection('Error Message Rewrites', copyData.errorMessageRewrites);
      const errorPath = `${basePath}/error-message-variants.md`;
      await this.downloadFile(errorPath, errorContent, 'text/markdown');
      manifest.files.push({ path: errorPath, type: 'markdown', size: errorContent.length });
    }

    // Empty state variants
    if (copyData.emptyStateRewrites.length > 0) {
      const emptyContent = this.formatCopyVariantSection('Empty State Rewrites', copyData.emptyStateRewrites);
      const emptyPath = `${basePath}/empty-state-variants.md`;
      await this.downloadFile(emptyPath, emptyContent, 'text/markdown');
      manifest.files.push({ path: emptyPath, type: 'markdown', size: emptyContent.length });
    }

    // Microcopy variants
    if (copyData.microcopyRewrites.length > 0) {
      const microContent = this.formatCopyVariantSection('Microcopy Rewrites', copyData.microcopyRewrites);
      const microPath = `${basePath}/microcopy-variants.md`;
      await this.downloadFile(microPath, microContent, 'text/markdown');
      manifest.files.push({ path: microPath, type: 'markdown', size: microContent.length });
    }

    // Onboarding copy
    if (copyData.onboardingCopy.length > 0) {
      const onboardContent = this.formatCopyVariantSection('Onboarding Copy', copyData.onboardingCopy);
      const onboardPath = `${basePath}/onboarding-variants.md`;
      await this.downloadFile(onboardPath, onboardContent, 'text/markdown');
      manifest.files.push({ path: onboardPath, type: 'markdown', size: onboardContent.length });
    }

    // Social proof copy
    if (copyData.socialProofCopy.length > 0) {
      const socialContent = this.formatCopyVariantSection('Social Proof Copy', copyData.socialProofCopy);
      const socialPath = `${basePath}/social-proof-variants.md`;
      await this.downloadFile(socialPath, socialContent, 'text/markdown');
      manifest.files.push({ path: socialPath, type: 'markdown', size: socialContent.length });
    }

    // Full JSON export
    const fullJson = JSON.stringify(copyData, null, 2);
    const jsonPath = `${basePath}/all-copy-variants.json`;
    await this.downloadFile(jsonPath, fullJson, 'application/json');
    manifest.files.push({ path: jsonPath, type: 'json', size: fullJson.length });

    log.info('Copy variants output complete', { fileCount: manifest.files.length });
    return manifest;
  }

  async generateABTestPlanOutput(
    testPlan: ABTestPlan,
    projectName: string,
    siteUrl: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/experiments`;

    log.info('Generating A/B test plan output');

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    const testPlanContent = `# A/B Test Plan
## ${siteUrl}
Generated: ${new Date().toISOString()}

---

## Executive Summary
${testPlan.summary}

**Estimated Total Lift:** ${testPlan.estimatedTotalLift}
**Testing Timeline:** ${testPlan.testingTimeline}

## Prerequisites
${testPlan.prerequisites.map(p => `- ${p}`).join('\n')}

---

## Prioritized Tests

${testPlan.prioritizedTests.map(test => `### #${test.rank}: ${test.name}
**Category:** ${test.category} | **Confidence:** ${test.confidence} | **Expected Lift:** ${test.expectedLift}

**Hypothesis:**
${test.hypothesis}

**Control (Current State):**
${test.control}

**Variant (Proposed Change):**
${test.variant}

**Metric to Track:** ${test.metricToTrack}
**Traffic Allocation:** ${test.trafficAllocation}
**Duration Estimate:** ${test.durationEstimate}

**Implementation Notes:**
${test.implementation}

---
`).join('\n')}
`;

    const planPath = `${basePath}/ab-test-plan.md`;
    await this.downloadFile(planPath, testPlanContent, 'text/markdown');
    manifest.files.push({ path: planPath, type: 'markdown', size: testPlanContent.length });

    // JSON export
    const planJson = JSON.stringify(testPlan, null, 2);
    const jsonPath = `${basePath}/ab-test-plan.json`;
    await this.downloadFile(jsonPath, planJson, 'application/json');
    manifest.files.push({ path: jsonPath, type: 'json', size: planJson.length });

    log.info('A/B test plan output complete');
    return manifest;
  }

  async generateMultiSiteSynthesisOutput(
    multiSiteResult: MultiSiteResult,
    projectName: string
  ): Promise<OutputManifest> {
    const safeName = sanitizeFilename(projectName);
    const basePath = `${safeName}/competitive`;

    log.info('Generating multi-site synthesis output');

    const manifest: OutputManifest = {
      projectName: safeName,
      outputPath: basePath,
      files: [],
      syncedToSupabase: false,
      generatedAt: Date.now(),
    };

    const synthesisContent = `# Multi-Site Competitive Analysis
Generated: ${new Date().toISOString()}
Sites Analyzed: ${multiSiteResult.sites.length}

---

## Site Rankings

${multiSiteResult.rankings.map((r, i) => `### #${i + 1}: ${r.url}
- **Overall Score:** ${r.overallScore}/100
- **Design Quality:** ${r.designQuality}/100
- **Accessibility:** ${r.accessibilityScore}/100
- **Performance:** ${r.performanceScore}/100
- **Conversion:** ${r.conversionScore}/100

**Strengths:**
${r.strengths.map(s => `- ${s}`).join('\n')}

**Weaknesses:**
${r.weaknesses.map(w => `- ${w}`).join('\n')}

---
`).join('\n')}

## Best Design Patterns by Component Type

${multiSiteResult.synthesis.bestPatterns.map(p => `### ${p.componentType}
**Best Implementation:** ${p.bestSiteUrl}
**Reasoning:** ${p.reasoning}
`).join('\n')}

## Common Industry Patterns
${multiSiteResult.synthesis.commonPatterns.map(p => `- ${p}`).join('\n')}

## Unique Innovations
${multiSiteResult.synthesis.uniqueInnovations.map(i => `- **${i.siteUrl}:** ${i.innovation}`).join('\n')}

## Overall Recommendations
${multiSiteResult.synthesis.overallRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

## Composite Design System Strategy

### Color Strategy
${multiSiteResult.compositeDesignSystem.colorStrategy}

### Spacing Strategy
${multiSiteResult.compositeDesignSystem.spacingStrategy}

### Typography Strategy
${multiSiteResult.compositeDesignSystem.typographyStrategy}
`;

    const synthPath = `${basePath}/multi-site-synthesis.md`;
    await this.downloadFile(synthPath, synthesisContent, 'text/markdown');
    manifest.files.push({ path: synthPath, type: 'markdown', size: synthesisContent.length });

    // Composite design tokens JSON
    const compositeTokensJson = JSON.stringify(multiSiteResult.compositeDesignSystem.tokens, null, 2);
    const tokensPath = `${basePath}/composite-design-tokens.json`;
    await this.downloadFile(tokensPath, compositeTokensJson, 'application/json');
    manifest.files.push({ path: tokensPath, type: 'json', size: compositeTokensJson.length });

    // Rankings JSON
    const rankingsJson = JSON.stringify(multiSiteResult.rankings, null, 2);
    const rankingsPath = `${basePath}/site-rankings.json`;
    await this.downloadFile(rankingsPath, rankingsJson, 'application/json');
    manifest.files.push({ path: rankingsPath, type: 'json', size: rankingsJson.length });

    // Full result JSON
    const fullJson = JSON.stringify({
      synthesis: multiSiteResult.synthesis,
      compositeDesignSystem: multiSiteResult.compositeDesignSystem,
      rankings: multiSiteResult.rankings,
      timestamp: multiSiteResult.timestamp,
    }, null, 2);
    const fullJsonPath = `${basePath}/full-analysis.json`;
    await this.downloadFile(fullJsonPath, fullJson, 'application/json');
    manifest.files.push({ path: fullJsonPath, type: 'json', size: fullJson.length });

    log.info('Multi-site synthesis output complete', { fileCount: manifest.files.length });
    return manifest;
  }

  private formatCopyVariantSection(title: string, variants: { original: string; context: string; variants: { formal: string; casual: string; urgent: string }; reasoning: string }[]): string {
    return `# ${title}

${variants.map((v, i) => `## ${i + 1}. Original: "${v.original}"
**Context:** ${v.context}

| Tone | Copy |
|------|------|
| **Formal** | ${v.variants.formal} |
| **Casual** | ${v.variants.casual} |
| **Urgent** | ${v.variants.urgent} |

**Reasoning:** ${v.reasoning}

---
`).join('\n')}
`;
  }

  private generateKnowledgeBase(scrapeResult: FullScrapeResult, promptChainResult: PromptChainResult): string {
    return `# Design Knowledge Base - ${scrapeResult.projectName}

## Source
URL: ${scrapeResult.targetUrl}
Scraped: ${new Date(scrapeResult.timestamp).toISOString()}

## Industry Context
- **Industry**: ${scrapeResult.projectContext.industry}
- **Goal**: ${scrapeResult.projectContext.goal}
- **Target Audience**: ${scrapeResult.projectContext.targetAudience}
- **Design Style**: ${scrapeResult.projectContext.designStyle}

## Research Patterns
${promptChainResult.research.patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Design System Summary

### Color Palette
Primary colors: ${scrapeResult.designTokens.colors.slice(0, 5).map(c => c.value).join(', ')}
Total unique colors: ${scrapeResult.designTokens.colors.length}

### Typography
${scrapeResult.typography.fontFamilies.map(f => `- ${f.family}: ${f.usage.join(', ')}`).join('\n')}

### Component Library
${scrapeResult.components.map(c => `- **${c.name}** (${c.type}): ${Object.keys(c.stateVariants).length} state variants`).join('\n')}

### Navigation Architecture
- Depth: ${scrapeResult.navigation.menuDepth} levels
- Total pages: ${scrapeResult.navigation.totalPages}
- Primary nav items: ${scrapeResult.navigation.primaryNav.length}

### Technology Stack
${Object.entries(scrapeResult.thirdPartyStack)
  .filter(([, tools]) => tools.length > 0)
  .map(([category, tools]) => `- **${category}**: ${(tools as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}`)
  .join('\n')}

### Conversion Strategy
- CTAs: ${scrapeResult.conversionPatterns.ctas.length} identified
- Social proof elements: ${scrapeResult.conversionPatterns.socialProof.length}
- Trust badges: ${scrapeResult.conversionPatterns.trustBadges.length}
- Form fields: ${scrapeResult.conversionPatterns.formFields.length}

### Copy/Content Tone
Keywords: ${scrapeResult.copyAnalysis.toneKeywords.join(', ')}

## Gaps & Opportunities
${promptChainResult.analysis.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

## Suggested Reference Sites
${promptChainResult.research.suggestedUrls.map(url => `- ${url}`).join('\n')}
`;
  }
}
