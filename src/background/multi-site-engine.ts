import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import type {
  FullScrapeResult,
  ScrapeConfig,
  ProjectContext,
  MultiSiteResult,
  SiteResult,
  SiteRanking,
  DesignSynthesis,
  CompositeDesignSystem,
  DesignTokens,
  TypographySystem,
  ComponentData,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';
import { ScrapeOrchestrator } from './scrape-orchestrator';

const log = createLogger('MultiSiteEngine');

const MULTI_SITE_SYNTHESIS_SYSTEM_PROMPT = `You are a Design Systems Architect specializing in competitive analysis and design pattern synthesis. You have analyzed hundreds of websites across dozens of industries and have an exceptional ability to identify which design patterns, tokens, and components represent the highest quality across a set of competing or reference sites.

Your task is to analyze scraped data from multiple websites and synthesize the BEST design elements from each into a unified, composite design system. You are not averaging — you are CHERRY-PICKING the highest quality implementation of each element across all analyzed sites.

Your analysis process:
1. For each component type (button, card, hero, nav, form, etc.), compare all implementations across sites and select the one with the best combination of accessibility, visual design, conversion optimization, and code quality.
2. Identify patterns that appear across ALL sites (common patterns) — these are likely industry standards worth following.
3. Identify UNIQUE innovations at individual sites — novel patterns that differentiate and could provide competitive advantage.
4. Rank each site holistically across design quality, accessibility, performance, and conversion optimization.
5. Produce overall recommendations that synthesize the best of all analyzed sites into a coherent design strategy.

Ground every observation in specific data from the scrape results. Reference exact color values, spacing measurements, component counts, accessibility scores, and performance metrics.

## Output Format
Respond with a valid JSON object matching this schema:
{
  "bestPatterns": [
    {
      "componentType": "string",
      "bestSiteUrl": "string",
      "reasoning": "string (why this site's implementation is best)",
      "html": "string (the winning component HTML, if available)",
      "css": "string (the winning component CSS, if available)"
    }
  ],
  "commonPatterns": ["string (patterns found across all or most sites)"],
  "uniqueInnovations": [
    { "siteUrl": "string", "innovation": "string (description of what's novel)" }
  ],
  "overallRecommendations": ["string (actionable recommendations for the composite system)"],
  "colorStrategy": "string (recommended color approach based on best practices observed)",
  "spacingStrategy": "string (recommended spacing system based on best practices observed)",
  "typographyStrategy": "string (recommended typography approach based on best practices observed)"
}`;

const SITE_RANKING_SYSTEM_PROMPT = `You are a UX Benchmarking Specialist. Score this website across multiple quality dimensions based on the scraped design data provided. Be rigorous and evidence-based — cite specific metrics, counts, and measurements to justify each score.

## Output Format
Respond with a valid JSON object:
{
  "overallScore": number (0-100),
  "designQuality": number (0-100),
  "accessibilityScore": number (0-100),
  "performanceScore": number (0-100),
  "conversionScore": number (0-100),
  "strengths": ["string (specific strengths with evidence)"],
  "weaknesses": ["string (specific weaknesses with evidence)"]
}`;

export interface MultiSiteConfig {
  urls: string[];
  projectContext: ProjectContext;
  projectName: string;
  breakpoints?: number[];
}

export class MultiSiteEngine {
  private claudeClient: ClaudeAPIClient;
  private scrapeOrchestrator: ScrapeOrchestrator;

  constructor(claudeClient: ClaudeAPIClient, scrapeOrchestrator: ScrapeOrchestrator) {
    this.claudeClient = claudeClient;
    this.scrapeOrchestrator = scrapeOrchestrator;
  }

  async scrapeMultipleSites(config: MultiSiteConfig): Promise<MultiSiteResult> {
    const { urls, projectContext, projectName, breakpoints } = config;

    log.info('Starting multi-site scrape', { siteCount: urls.length, urls });

    const siteResults: SiteResult[] = [];

    // Scrape each site sequentially to avoid overwhelming the browser
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      log.info(`Scraping site ${i + 1}/${urls.length}`, { url });

      this.broadcastProgress({
        phase: 'scraping',
        currentSite: url,
        siteIndex: i,
        totalSites: urls.length,
        message: `Scraping site ${i + 1} of ${urls.length}: ${url}`,
      });

      const startTime = Date.now();

      try {
        const scrapeConfig: ScrapeConfig = {
          targetUrl: url,
          projectName: `${projectName}-${new URL(url).hostname}`,
          projectContext,
          breakpoints: breakpoints || [375, 768, 1280, 1920],
        };

        const scrapeResult = await this.scrapeOrchestrator.startPipeline(scrapeConfig);
        const scrapeDuration = Date.now() - startTime;

        // Rank this site immediately after scraping
        const quality = await this.rankSingleSite(scrapeResult);

        siteResults.push({
          url,
          scrapeResult,
          quality,
          scrapeDuration,
        });

        log.info(`Site ${i + 1} scraped successfully`, {
          url,
          duration: scrapeDuration,
          score: quality.overallScore,
        });

        this.broadcastProgress({
          phase: 'scraping',
          currentSite: url,
          siteIndex: i + 1,
          totalSites: urls.length,
          message: `Completed scraping ${url} (score: ${quality.overallScore}/100)`,
        });
      } catch (err) {
        log.error(`Failed to scrape site: ${url}`, err);

        this.broadcastProgress({
          phase: 'scraping',
          currentSite: url,
          siteIndex: i + 1,
          totalSites: urls.length,
          message: `Failed to scrape ${url}: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      }
    }

    if (siteResults.length === 0) {
      throw new Error('All site scrapes failed. No results to synthesize.');
    }

    // Phase 2: Synthesize best patterns across all sites
    this.broadcastProgress({
      phase: 'synthesis',
      currentSite: '',
      siteIndex: siteResults.length,
      totalSites: urls.length,
      message: 'Synthesizing best patterns across all scraped sites...',
    });

    const synthesis = await this.synthesizeBestPatterns(siteResults.map(r => r.scrapeResult));

    // Phase 3: Generate composite design system
    this.broadcastProgress({
      phase: 'composite',
      currentSite: '',
      siteIndex: siteResults.length,
      totalSites: urls.length,
      message: 'Generating composite design system from best elements...',
    });

    const compositeDesignSystem = await this.generateCompositeDesignSystem(siteResults, synthesis);

    // Phase 4: Final rankings
    const rankings = this.rankSitesByQuality(siteResults);

    const result: MultiSiteResult = {
      sites: siteResults,
      synthesis,
      compositeDesignSystem,
      rankings,
      timestamp: Date.now(),
    };

    // Broadcast completion
    chrome.runtime.sendMessage({
      type: MSG.MULTI_SITE_COMPLETE,
      payload: {
        siteCount: siteResults.length,
        topSite: rankings[0]?.url,
        topScore: rankings[0]?.overallScore,
      },
    }).catch(() => {});

    log.info('Multi-site scrape complete', {
      sitesScraped: siteResults.length,
      topSite: rankings[0]?.url,
    });

    return result;
  }

  async synthesizeBestPatterns(results: FullScrapeResult[]): Promise<DesignSynthesis> {
    log.info('Synthesizing best patterns across sites', { siteCount: results.length });

    // Build a comprehensive summary of all sites for Claude to analyze
    const sitesSummary = results.map((result, i) => {
      const componentTypes = [...new Set(result.components.map(c => c.type))];
      return `
### Site ${i + 1}: ${result.targetUrl}

**Design Tokens:**
- Colors: ${result.designTokens.colors.length} unique (top: ${result.designTokens.colors.slice(0, 5).map(c => c.value).join(', ')})
- Spacing values: ${result.designTokens.spacing.length} unique
- Border radii: ${result.designTokens.borderRadii.length} unique
- Shadows: ${result.designTokens.shadows.length} unique

**Typography:**
- Families: ${result.typography.fontFamilies.map(f => f.family).join(', ')}
- Sizes: ${result.typography.fontSizes.length} unique
- Weights: ${result.typography.fontWeights.map(w => w.weight).join(', ')}

**Components (${result.components.length}):**
- Types: ${componentTypes.join(', ')}
${result.components.slice(0, 10).map(c =>
  `  - ${c.name} (${c.type}): ${Object.keys(c.stateVariants).length} state variants`
).join('\n')}

**Accessibility:** Score ${result.accessibility.overallScore}/100 (WCAG ${result.accessibility.wcagLevel})
- Contrast issues: ${result.accessibility.contrastIssues.length}
- Missing alt text: ${result.accessibility.missingAltText.length}
- Missing ARIA labels: ${result.accessibility.missingAriaLabels.length}

**Performance:** Lighthouse ${result.lighthouse.performanceScore}/100
- LCP: ${result.lighthouse.lcp}ms
- CLS: ${result.lighthouse.cls}
- INP: ${result.lighthouse.inp}ms

**Conversion:**
- CTAs: ${result.conversionPatterns.ctas.length} (labels: ${result.conversionPatterns.ctas.slice(0, 5).map(c => `"${c.text}"`).join(', ')})
- Social proof: ${result.conversionPatterns.socialProof.length} elements
- Trust badges: ${result.conversionPatterns.trustBadges.length}
- Form fields: ${result.conversionPatterns.formFields.length}

**Navigation:** Depth ${result.navigation.menuDepth}, ${result.navigation.totalPages} pages
**Dark Mode:** ${result.darkMode.hasDarkMode ? `Yes (${result.darkMode.method})` : 'No'}
**Grid:** ${result.gridLayout.columns} columns, ${result.gridLayout.layoutType}, max-width ${result.gridLayout.containerMaxWidth}
`;
    }).join('\n---\n');

    const userMessage = `Analyze these ${results.length} scraped websites and synthesize the best design patterns from each.

${sitesSummary}

For each component type found across the sites, identify which site has the BEST implementation and explain why. Identify common patterns (industry standards) and unique innovations. Recommend color, spacing, and typography strategies based on the best practices observed.`;

    try {
      const responseText = await this.claudeClient.singleCall(MULTI_SITE_SYNTHESIS_SYSTEM_PROMPT, userMessage);
      const parsed = JSON.parse(responseText);

      const synthesis: DesignSynthesis = {
        bestPatterns: parsed.bestPatterns || [],
        commonPatterns: parsed.commonPatterns || [],
        uniqueInnovations: parsed.uniqueInnovations || [],
        overallRecommendations: parsed.overallRecommendations || [],
      };

      log.info('Pattern synthesis complete', {
        bestPatterns: synthesis.bestPatterns.length,
        commonPatterns: synthesis.commonPatterns.length,
        innovations: synthesis.uniqueInnovations.length,
      });

      return synthesis;
    } catch (err) {
      log.error('Failed to synthesize patterns', err);
      return {
        bestPatterns: [],
        commonPatterns: [],
        uniqueInnovations: [],
        overallRecommendations: ['Synthesis failed — review individual site results for design patterns.'],
      };
    }
  }

  async generateCompositeDesignSystem(
    siteResults: SiteResult[],
    synthesis: DesignSynthesis
  ): Promise<CompositeDesignSystem> {
    log.info('Generating composite design system');

    // Find the highest-scoring site for baseline tokens
    const bestSite = siteResults.reduce((best, current) =>
      current.quality.overallScore > best.quality.overallScore ? current : best
    );

    // Merge tokens from all sites, weighted by quality score
    const mergedTokens = this.mergeDesignTokens(siteResults);
    const mergedTypography = this.mergeTypography(siteResults);
    const bestComponents = this.selectBestComponents(siteResults, synthesis);

    // Extract strategy strings from the synthesis Claude response
    // If synthesis was successful, these should be populated
    let colorStrategy = 'Use the color palette from the highest-scoring site as baseline, supplemented with accent colors from runner-up sites.';
    let spacingStrategy = 'Adopt a consistent spacing scale (4px base unit) derived from the most common spacing values across all analyzed sites.';
    let typographyStrategy = 'Use the font family pairing from the highest-scoring site with the type scale from the site with the best readability scores.';

    // Try to get strategies from a Claude call if we have the data
    try {
      const strategySummary = synthesis.overallRecommendations.join('\n');
      if (strategySummary.length > 50) {
        const strategyResponse = await this.claudeClient.singleCall(
          `You are a Design Systems Architect. Based on these recommendations, produce three strategy strings. Respond with JSON: { "colorStrategy": "string", "spacingStrategy": "string", "typographyStrategy": "string" }`,
          `Design system recommendations:\n${strategySummary}\n\nBest site tokens: ${JSON.stringify(bestSite.scrapeResult.designTokens.colors.slice(0, 10))}\nBest site typography: ${JSON.stringify(bestSite.scrapeResult.typography.fontFamilies)}`
        );
        const strategies = JSON.parse(strategyResponse);
        colorStrategy = strategies.colorStrategy || colorStrategy;
        spacingStrategy = strategies.spacingStrategy || spacingStrategy;
        typographyStrategy = strategies.typographyStrategy || typographyStrategy;
      }
    } catch {
      log.warn('Failed to generate strategy descriptions, using defaults');
    }

    return {
      tokens: mergedTokens,
      typography: mergedTypography,
      bestComponents,
      colorStrategy,
      spacingStrategy,
      typographyStrategy,
    };
  }

  rankSitesByQuality(siteResults: SiteResult[]): SiteRanking[] {
    const rankings = siteResults
      .map(site => site.quality)
      .sort((a, b) => b.overallScore - a.overallScore);

    log.info('Sites ranked', {
      rankings: rankings.map(r => ({ url: r.url, score: r.overallScore })),
    });

    return rankings;
  }

  private async rankSingleSite(scrapeResult: FullScrapeResult): Promise<SiteRanking> {
    const dataSummary = `
URL: ${scrapeResult.targetUrl}

Design Tokens: ${scrapeResult.designTokens.colors.length} colors, ${scrapeResult.designTokens.spacing.length} spacing values, ${scrapeResult.designTokens.shadows.length} shadows, ${scrapeResult.designTokens.borderRadii.length} border radii

Typography: ${scrapeResult.typography.fontFamilies.length} families (${scrapeResult.typography.fontFamilies.map(f => f.family).join(', ')}), ${scrapeResult.typography.fontSizes.length} sizes, ${scrapeResult.typography.fontWeights.length} weights

Components: ${scrapeResult.components.length} total (${[...new Set(scrapeResult.components.map(c => c.type))].join(', ')})

Accessibility: Score ${scrapeResult.accessibility.overallScore}/100, WCAG Level ${scrapeResult.accessibility.wcagLevel}
- ${scrapeResult.accessibility.contrastIssues.length} contrast issues
- ${scrapeResult.accessibility.missingAltText.length} missing alt text
- ${scrapeResult.accessibility.missingAriaLabels.length} missing ARIA labels
- ${scrapeResult.accessibility.tabOrderIssues.length} tab order issues
- ${scrapeResult.accessibility.focusIndicatorsMissing.length} missing focus indicators

Performance: Lighthouse ${scrapeResult.lighthouse.performanceScore}/100
- LCP: ${scrapeResult.lighthouse.lcp}ms, CLS: ${scrapeResult.lighthouse.cls}, INP: ${scrapeResult.lighthouse.inp}ms
- FCP: ${scrapeResult.lighthouse.fcp}ms, Speed Index: ${scrapeResult.lighthouse.speedIndex}ms

Conversion: ${scrapeResult.conversionPatterns.ctas.length} CTAs, ${scrapeResult.conversionPatterns.socialProof.length} social proof, ${scrapeResult.conversionPatterns.trustBadges.length} trust badges

Navigation: Depth ${scrapeResult.navigation.menuDepth}, ${scrapeResult.navigation.totalPages} pages
Grid: ${scrapeResult.gridLayout.columns} columns, ${scrapeResult.gridLayout.layoutType}
Dark Mode: ${scrapeResult.darkMode.hasDarkMode}
Images: ${scrapeResult.imageAssets.images.length} images, ${scrapeResult.imageAssets.lazyLoadPercentage}% lazy loaded
Animations: ${scrapeResult.animations.cssTransitions.length} transitions, ${scrapeResult.animations.cssAnimations.length} animations

Flow: ${scrapeResult.flowAnalysis.stepsToConversion} steps to conversion, cognitive load ${scrapeResult.flowAnalysis.estimatedCognitiveLoad}/100
`;

    try {
      const responseText = await this.claudeClient.singleCall(
        SITE_RANKING_SYSTEM_PROMPT,
        `Score this website based on the scraped data:\n${dataSummary}`
      );
      const parsed = JSON.parse(responseText);

      return {
        url: scrapeResult.targetUrl,
        overallScore: parsed.overallScore ?? 50,
        designQuality: parsed.designQuality ?? 50,
        accessibilityScore: parsed.accessibilityScore ?? scrapeResult.accessibility.overallScore,
        performanceScore: parsed.performanceScore ?? scrapeResult.lighthouse.performanceScore,
        conversionScore: parsed.conversionScore ?? 50,
        strengths: parsed.strengths || [],
        weaknesses: parsed.weaknesses || [],
      };
    } catch (err) {
      log.warn('Failed to rank site via Claude, using heuristic scoring', err);
      return this.heuristicRanking(scrapeResult);
    }
  }

  private heuristicRanking(scrapeResult: FullScrapeResult): SiteRanking {
    const a11yScore = scrapeResult.accessibility.overallScore;
    const perfScore = scrapeResult.lighthouse.performanceScore;

    // Heuristic design quality based on token variety and component coverage
    const colorVariety = Math.min(scrapeResult.designTokens.colors.length / 20, 1) * 100;
    const componentCoverage = Math.min(scrapeResult.components.length / 15, 1) * 100;
    const typographyQuality = Math.min(scrapeResult.typography.fontFamilies.length / 3, 1) * 100;
    const designQuality = Math.round((colorVariety + componentCoverage + typographyQuality) / 3);

    // Heuristic conversion score
    const ctaCount = Math.min(scrapeResult.conversionPatterns.ctas.length / 5, 1) * 100;
    const socialProof = Math.min(scrapeResult.conversionPatterns.socialProof.length / 3, 1) * 100;
    const trustBadges = Math.min(scrapeResult.conversionPatterns.trustBadges.length / 3, 1) * 100;
    const conversionScore = Math.round((ctaCount + socialProof + trustBadges) / 3);

    const overallScore = Math.round(
      (designQuality * 0.3) + (a11yScore * 0.25) + (perfScore * 0.25) + (conversionScore * 0.2)
    );

    return {
      url: scrapeResult.targetUrl,
      overallScore,
      designQuality,
      accessibilityScore: a11yScore,
      performanceScore: perfScore,
      conversionScore,
      strengths: [],
      weaknesses: [],
    };
  }

  private mergeDesignTokens(siteResults: SiteResult[]): DesignTokens {
    // Weight tokens by site quality score
    const allColors = new Map<string, { value: string; count: number; contexts: string[]; quality: number }>();
    const allSpacing = new Map<string, { value: string; count: number; contexts: string[]; quality: number }>();
    const allShadows = new Map<string, { value: string; count: number; contexts: string[]; quality: number }>();
    const allRadii = new Map<string, { value: string; count: number; contexts: string[]; quality: number }>();

    for (const site of siteResults) {
      const weight = site.quality.overallScore / 100;

      for (const token of site.scrapeResult.designTokens.colors) {
        const existing = allColors.get(token.value);
        if (existing) {
          existing.count += Math.round(token.count * weight);
          existing.contexts.push(...token.contexts.slice(0, 2));
        } else {
          allColors.set(token.value, {
            value: token.value,
            count: Math.round(token.count * weight),
            contexts: [...token.contexts.slice(0, 3)],
            quality: weight,
          });
        }
      }

      for (const token of site.scrapeResult.designTokens.spacing) {
        const existing = allSpacing.get(token.value);
        if (existing) {
          existing.count += Math.round(token.count * weight);
        } else {
          allSpacing.set(token.value, {
            value: token.value,
            count: Math.round(token.count * weight),
            contexts: [...token.contexts.slice(0, 3)],
            quality: weight,
          });
        }
      }

      for (const token of site.scrapeResult.designTokens.shadows) {
        const existing = allShadows.get(token.value);
        if (existing) {
          existing.count += Math.round(token.count * weight);
        } else {
          allShadows.set(token.value, {
            value: token.value,
            count: Math.round(token.count * weight),
            contexts: [...token.contexts.slice(0, 3)],
            quality: weight,
          });
        }
      }

      for (const token of site.scrapeResult.designTokens.borderRadii) {
        const existing = allRadii.get(token.value);
        if (existing) {
          existing.count += Math.round(token.count * weight);
        } else {
          allRadii.set(token.value, {
            value: token.value,
            count: Math.round(token.count * weight),
            contexts: [...token.contexts.slice(0, 3)],
            quality: weight,
          });
        }
      }
    }

    // Sort by weighted count and take top entries
    const sortByCount = (a: { count: number }, b: { count: number }) => b.count - a.count;

    return {
      colors: [...allColors.values()].sort(sortByCount).slice(0, 30).map(t => ({
        value: t.value,
        count: t.count,
        contexts: [...new Set(t.contexts)].slice(0, 5),
      })),
      spacing: [...allSpacing.values()].sort(sortByCount).slice(0, 20).map(t => ({
        value: t.value,
        count: t.count,
        contexts: [...new Set(t.contexts)].slice(0, 3),
      })),
      shadows: [...allShadows.values()].sort(sortByCount).slice(0, 10).map(t => ({
        value: t.value,
        count: t.count,
        contexts: [...new Set(t.contexts)].slice(0, 3),
      })),
      borderRadii: [...allRadii.values()].sort(sortByCount).slice(0, 10).map(t => ({
        value: t.value,
        count: t.count,
        contexts: [...new Set(t.contexts)].slice(0, 3),
      })),
      zIndices: siteResults.reduce((best, current) =>
        current.quality.overallScore > best.quality.overallScore ? current : best
      ).scrapeResult.designTokens.zIndices,
      opacities: siteResults.reduce((best, current) =>
        current.quality.overallScore > best.quality.overallScore ? current : best
      ).scrapeResult.designTokens.opacities,
    };
  }

  private mergeTypography(siteResults: SiteResult[]): TypographySystem {
    // Use typography from the highest-quality site as the baseline
    const bestSite = siteResults.reduce((best, current) =>
      current.quality.designQuality > best.quality.designQuality ? current : best
    );

    return bestSite.scrapeResult.typography;
  }

  private selectBestComponents(
    siteResults: SiteResult[],
    synthesis: DesignSynthesis
  ): ComponentData[] {
    const bestComponents: ComponentData[] = [];
    const componentTypesSeen = new Set<string>();

    // First, use synthesis recommendations to pick the best implementation per type
    for (const pattern of synthesis.bestPatterns) {
      const site = siteResults.find(s => s.url === pattern.bestSiteUrl);
      if (!site) continue;

      const matchingComponent = site.scrapeResult.components.find(
        c => c.type === pattern.componentType
      );
      if (matchingComponent && !componentTypesSeen.has(pattern.componentType)) {
        bestComponents.push(matchingComponent);
        componentTypesSeen.add(pattern.componentType);
      }
    }

    // Fill in any remaining component types from the highest-scoring site
    const bestSite = siteResults.reduce((best, current) =>
      current.quality.overallScore > best.quality.overallScore ? current : best
    );

    for (const component of bestSite.scrapeResult.components) {
      if (!componentTypesSeen.has(component.type)) {
        bestComponents.push(component);
        componentTypesSeen.add(component.type);
      }
    }

    return bestComponents;
  }

  private broadcastProgress(data: {
    phase: string;
    currentSite: string;
    siteIndex: number;
    totalSites: number;
    message: string;
  }): void {
    chrome.runtime.sendMessage({
      type: MSG.MULTI_SITE_PROGRESS,
      payload: data,
    }).catch(() => {
      // Side panel may not be open
    });
  }
}
