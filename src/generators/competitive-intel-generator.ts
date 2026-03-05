import type {
  FullScrapeResult,
  DesignTokens,
  TypographySystem,
  AccessibilityAudit,
  LighthouseData,
  ThirdPartyStack,
  ComponentData,
  ConversionPatterns,
  NavigationStructure,
  FlowAnalysis,
  DetectedTool,
} from '../shared/types';

// ===== Types =====

export interface CompetitiveIntelReport {
  generatedAt: number;
  sites: string[];
  featureMatrix: FeatureMatrixRow[];
  scorecards: SiteScorecard[];
  techComparison: TechComparison;
  uxPatternComparison: UXPatternComparison;
  performanceComparison: PerformanceComparison;
  mobileRanking: MobileRankEntry[];
  innovationIndex: InnovationEntry[];
  swotAnalyses: SWOTAnalysis[];
  categoryWinners: CategoryWinner[];
  markdownReport: string;
}

export interface FeatureMatrixRow {
  componentType: string;
  sites: { url: string; found: boolean; count: number; quality: number }[];
}

export interface SiteScorecard {
  url: string;
  accessibility: number;
  performance: number;
  conversion: number;
  visualQuality: number;
  overallScore: number;
  grade: string;
}

export interface TechComparison {
  sites: {
    url: string;
    analytics: string[];
    cms: string[];
    frameworks: string[];
    auth: string[];
    payment: string[];
    cdns: string[];
    abTesting: string[];
  }[];
}

export interface UXPatternComparison {
  onboarding: { url: string; stepsToConversion: number; cognitiveLoad: number; frictionPoints: number }[];
  navigation: { url: string; menuDepth: number; totalPages: number; hasBreadcrumbs: boolean; primaryItems: number }[];
  forms: { url: string; totalFields: number; requiredFields: number; hasValidation: boolean }[];
  checkout: { url: string; steps: number; trustBadges: number; socialProof: number }[];
}

export interface PerformanceComparison {
  sites: {
    url: string;
    performanceScore: number;
    lcp: number;
    cls: number;
    inp: number;
    fcp: number;
    speedIndex: number;
    tbt: number;
  }[];
}

export interface MobileRankEntry {
  rank: number;
  url: string;
  mobileScore: number;
  breakpointCount: number;
  touchFriendly: boolean;
  responsiveImages: boolean;
}

export interface InnovationEntry {
  url: string;
  uniquePatterns: string[];
  innovationScore: number;
  standoutFeatures: string[];
}

export interface SWOTAnalysis {
  url: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CategoryWinner {
  category: string;
  winner: string;
  score: number;
  runnerUp?: string;
  runnerUpScore?: number;
}

// ===== Helpers =====

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function grade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 85) return 'A-';
  if (score >= 80) return 'B+';
  if (score >= 75) return 'B';
  if (score >= 70) return 'B-';
  if (score >= 65) return 'C+';
  if (score >= 60) return 'C';
  if (score >= 55) return 'C-';
  if (score >= 50) return 'D';
  return 'F';
}

function toolNames(tools: DetectedTool[]): string[] {
  return tools.filter((t) => t.confidence > 0.5).map((t) => t.name);
}

function estimateVisualQuality(result: FullScrapeResult): number {
  let score = 50;
  const { designTokens, typography, components, animations, darkMode } = result;

  // Color palette richness
  const colorCount = designTokens.colors.length;
  if (colorCount >= 8) score += 10;
  else if (colorCount >= 4) score += 5;

  // Typography diversity
  if (typography.fontFamilies.length >= 2) score += 8;
  if (typography.fontWeights.length >= 3) score += 5;

  // Component variety
  const componentTypes = new Set(components.map((c) => c.type));
  if (componentTypes.size >= 8) score += 10;
  else if (componentTypes.size >= 4) score += 5;

  // Animations
  if (animations.cssAnimations.length > 0) score += 5;
  if (animations.cssTransitions.length >= 3) score += 5;

  // Dark mode
  if (darkMode.hasDarkMode) score += 5;

  // Shadows
  if (designTokens.shadows.length >= 2) score += 3;

  // Border radii consistency
  if (designTokens.borderRadii.length >= 2) score += 2;

  return Math.min(100, score);
}

function estimateConversionScore(result: FullScrapeResult): number {
  let score = 40;
  const { conversionPatterns, flowAnalysis, copyAnalysis } = result;

  // CTAs
  if (conversionPatterns.ctas.length >= 3) score += 10;
  else if (conversionPatterns.ctas.length >= 1) score += 5;

  // High-prominence CTAs
  const prominentCTAs = conversionPatterns.ctas.filter((c) => c.prominence > 0.7);
  if (prominentCTAs.length >= 1) score += 8;

  // Social proof
  if (conversionPatterns.socialProof.length >= 2) score += 8;

  // Trust badges
  if (conversionPatterns.trustBadges.length >= 1) score += 5;

  // Low friction
  if (flowAnalysis.stepsToConversion <= 3) score += 10;
  else if (flowAnalysis.stepsToConversion <= 5) score += 5;

  // Low cognitive load
  if (flowAnalysis.estimatedCognitiveLoad < 40) score += 7;

  // Urgency patterns
  if (conversionPatterns.urgencyPatterns.length >= 1) score += 5;

  // Error messages (shows good UX)
  if (copyAnalysis.errorMessages.length > 0) score += 3;

  return Math.min(100, score);
}

function findUniquePatterns(
  result: FullScrapeResult,
  allResults: FullScrapeResult[]
): string[] {
  const unique: string[] = [];
  const otherResults = allResults.filter((r) => r.targetUrl !== result.targetUrl);

  // Unique component types
  const myTypes = new Set(result.components.map((c) => c.type));
  const otherTypes = new Set(otherResults.flatMap((r) => r.components.map((c) => c.type)));
  myTypes.forEach((t) => {
    if (!otherTypes.has(t)) unique.push(`Unique component type: ${t}`);
  });

  // Dark mode
  if (result.darkMode.hasDarkMode && !otherResults.some((r) => r.darkMode.hasDarkMode)) {
    unique.push('Only site with dark mode support');
  }

  // Parallax
  if (result.scrollBehavior.parallaxLayers.length > 0 && !otherResults.some((r) => r.scrollBehavior.parallaxLayers.length > 0)) {
    unique.push('Only site with parallax scrolling');
  }

  // Scroll animations
  if (result.scrollBehavior.scrollAnimations.length > 3 && !otherResults.some((r) => r.scrollBehavior.scrollAnimations.length > 3)) {
    unique.push('Most scroll-triggered animations');
  }

  // Unique tech
  const myTech = new Set([
    ...toolNames(result.thirdPartyStack.frameworks),
    ...toolNames(result.thirdPartyStack.analytics),
  ]);
  const otherTech = new Set(
    otherResults.flatMap((r) => [
      ...toolNames(r.thirdPartyStack.frameworks),
      ...toolNames(r.thirdPartyStack.analytics),
    ])
  );
  myTech.forEach((t) => {
    if (!otherTech.has(t)) unique.push(`Unique technology: ${t}`);
  });

  // Best accessibility
  const myA11y = result.accessibility.overallScore;
  const bestOtherA11y = Math.max(...otherResults.map((r) => r.accessibility.overallScore), 0);
  if (myA11y > bestOtherA11y + 10) {
    unique.push(`Significantly better accessibility (${myA11y} vs next best ${bestOtherA11y})`);
  }

  return unique;
}

// ===== Main Generator =====

export function generateCompetitiveIntel(
  multiSiteResults: FullScrapeResult[]
): CompetitiveIntelReport {
  const sites = multiSiteResults.map((r) => r.targetUrl);

  // Feature matrix
  const allComponentTypes = [
    ...new Set(multiSiteResults.flatMap((r) => r.components.map((c) => c.type))),
  ].sort();

  const featureMatrix: FeatureMatrixRow[] = allComponentTypes.map((type) => ({
    componentType: type,
    sites: multiSiteResults.map((r) => {
      const matching = r.components.filter((c) => c.type === type);
      return {
        url: r.targetUrl,
        found: matching.length > 0,
        count: matching.length,
        quality: matching.length > 0 ? Math.min(100, 50 + matching.length * 10 + Object.keys(matching[0].stateVariants).length * 15) : 0,
      };
    }),
  }));

  // Scorecards
  const scorecards: SiteScorecard[] = multiSiteResults.map((r) => {
    const accessibility = r.accessibility.overallScore;
    const performance = r.lighthouse.performanceScore;
    const conversion = estimateConversionScore(r);
    const visualQuality = estimateVisualQuality(r);
    const overall = Math.round(accessibility * 0.25 + performance * 0.25 + conversion * 0.25 + visualQuality * 0.25);
    return {
      url: r.targetUrl,
      accessibility,
      performance,
      conversion,
      visualQuality,
      overallScore: overall,
      grade: grade(overall),
    };
  });

  // Tech comparison
  const techComparison: TechComparison = {
    sites: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      analytics: toolNames(r.thirdPartyStack.analytics),
      cms: toolNames(r.thirdPartyStack.cms),
      frameworks: toolNames(r.thirdPartyStack.frameworks),
      auth: toolNames(r.thirdPartyStack.auth),
      payment: toolNames(r.thirdPartyStack.payment),
      cdns: toolNames(r.thirdPartyStack.cdns),
      abTesting: toolNames(r.thirdPartyStack.abTesting),
    })),
  };

  // UX Pattern comparison
  const uxPatternComparison: UXPatternComparison = {
    onboarding: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      stepsToConversion: r.flowAnalysis.stepsToConversion,
      cognitiveLoad: r.flowAnalysis.estimatedCognitiveLoad,
      frictionPoints: r.flowAnalysis.frictionPoints.length,
    })),
    navigation: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      menuDepth: r.navigation.menuDepth,
      totalPages: r.navigation.totalPages,
      hasBreadcrumbs: r.navigation.breadcrumbs.length > 0,
      primaryItems: r.navigation.primaryNav.length,
    })),
    forms: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      totalFields: r.conversionPatterns.formFields.length,
      requiredFields: r.conversionPatterns.formFields.filter((f) => f.required).length,
      hasValidation: r.copyAnalysis.errorMessages.length > 0,
    })),
    checkout: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      steps: r.flowAnalysis.stepsToConversion,
      trustBadges: r.conversionPatterns.trustBadges.length,
      socialProof: r.conversionPatterns.socialProof.length,
    })),
  };

  // Performance comparison
  const performanceComparison: PerformanceComparison = {
    sites: multiSiteResults.map((r) => ({
      url: r.targetUrl,
      performanceScore: r.lighthouse.performanceScore,
      lcp: r.lighthouse.lcp,
      cls: r.lighthouse.cls,
      inp: r.lighthouse.inp,
      fcp: r.lighthouse.fcp,
      speedIndex: r.lighthouse.speedIndex,
      tbt: r.lighthouse.totalBlockingTime,
    })),
  };

  // Mobile ranking
  const mobileRanking: MobileRankEntry[] = multiSiteResults
    .map((r) => {
      const breakpoints = r.gridLayout.breakpointBehaviors.length;
      const hasResponsiveImages = r.imageAssets.lazyLoadPercentage > 30;
      const touchFriendly = r.conversionPatterns.ctas.some((c) => {
        const size = parseInt(c.size, 10);
        return size >= 44;
      });
      const mobileScore = Math.min(
        100,
        r.lighthouse.performanceScore * 0.4 +
          breakpoints * 10 +
          (hasResponsiveImages ? 15 : 0) +
          (touchFriendly ? 15 : 0) +
          (r.accessibility.overallScore > 70 ? 10 : 0)
      );
      return {
        rank: 0,
        url: r.targetUrl,
        mobileScore: Math.round(mobileScore),
        breakpointCount: breakpoints,
        touchFriendly,
        responsiveImages: hasResponsiveImages,
      };
    })
    .sort((a, b) => b.mobileScore - a.mobileScore)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  // Innovation index
  const innovationIndex: InnovationEntry[] = multiSiteResults.map((r) => {
    const unique = findUniquePatterns(r, multiSiteResults);
    const standout: string[] = [];
    if (r.darkMode.hasDarkMode) standout.push('Dark mode support');
    if (r.scrollBehavior.parallaxLayers.length > 0) standout.push('Parallax scrolling');
    if (r.animations.cssAnimations.length >= 3) standout.push('Rich animations');
    if (r.components.length >= 15) standout.push('Extensive component library');
    if (r.conversionPatterns.socialProof.length >= 3) standout.push('Strong social proof');

    return {
      url: r.targetUrl,
      uniquePatterns: unique,
      innovationScore: Math.min(100, 30 + unique.length * 15 + standout.length * 8),
      standoutFeatures: standout,
    };
  });

  // SWOT analyses
  const swotAnalyses: SWOTAnalysis[] = multiSiteResults.map((r) => {
    const sc = scorecards.find((s) => s.url === r.targetUrl)!;
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const opportunities: string[] = [];
    const threats: string[] = [];

    // Strengths
    if (sc.accessibility >= 80) strengths.push(`Strong accessibility score (${sc.accessibility})`);
    if (sc.performance >= 80) strengths.push(`High performance score (${sc.performance})`);
    if (sc.conversion >= 75) strengths.push(`Effective conversion optimization (${sc.conversion})`);
    if (sc.visualQuality >= 80) strengths.push(`Premium visual quality (${sc.visualQuality})`);
    if (r.components.length >= 10) strengths.push(`Rich component library (${r.components.length} components)`);
    if (r.darkMode.hasDarkMode) strengths.push('Dark mode available');
    if (r.animations.cssAnimations.length >= 3) strengths.push('Polished micro-interactions');

    // Weaknesses
    if (sc.accessibility < 60) weaknesses.push(`Poor accessibility (${sc.accessibility})`);
    if (sc.performance < 60) weaknesses.push(`Performance issues (${sc.performance})`);
    if (r.lighthouse.lcp > 3000) weaknesses.push(`Slow LCP (${(r.lighthouse.lcp / 1000).toFixed(1)}s)`);
    if (r.lighthouse.cls > 0.15) weaknesses.push(`Layout shift issues (CLS: ${r.lighthouse.cls.toFixed(3)})`);
    if (r.accessibility.contrastIssues.length > 3) weaknesses.push(`${r.accessibility.contrastIssues.length} contrast violations`);
    if (r.flowAnalysis.estimatedCognitiveLoad > 60) weaknesses.push('High cognitive load on key flows');
    if (r.imageAssets.lazyLoadPercentage < 30) weaknesses.push('Images not efficiently lazy-loaded');

    // Opportunities
    if (!r.darkMode.hasDarkMode) opportunities.push('Add dark mode for user preference');
    if (r.conversionPatterns.socialProof.length < 2) opportunities.push('Add more social proof elements');
    if (r.animations.cssAnimations.length < 2) opportunities.push('Enhance micro-interactions');
    if (r.flowAnalysis.stepsToConversion > 4) opportunities.push('Reduce conversion funnel steps');
    if (r.accessibility.overallScore < 80) opportunities.push('Improve accessibility for wider reach');
    if (r.conversionPatterns.trustBadges.length < 2) opportunities.push('Add trust signals and badges');

    // Threats
    const betterSites = scorecards.filter((s) => s.url !== r.targetUrl && s.overallScore > sc.overallScore);
    if (betterSites.length > 0) threats.push(`${betterSites.length} competitor(s) with higher overall scores`);
    const fasterSites = multiSiteResults.filter((s) => s.targetUrl !== r.targetUrl && s.lighthouse.performanceScore > r.lighthouse.performanceScore + 10);
    if (fasterSites.length > 0) threats.push('Competitors loading faster');
    const moreAccessible = multiSiteResults.filter((s) => s.targetUrl !== r.targetUrl && s.accessibility.overallScore > r.accessibility.overallScore + 15);
    if (moreAccessible.length > 0) threats.push('Competitors with better accessibility');

    return { url: r.targetUrl, strengths, weaknesses, opportunities, threats };
  });

  // Category winners
  const categoryWinners: CategoryWinner[] = [];

  const categories: { category: string; getValue: (sc: SiteScorecard) => number }[] = [
    { category: 'Overall', getValue: (sc) => sc.overallScore },
    { category: 'Accessibility', getValue: (sc) => sc.accessibility },
    { category: 'Performance', getValue: (sc) => sc.performance },
    { category: 'Conversion', getValue: (sc) => sc.conversion },
    { category: 'Visual Quality', getValue: (sc) => sc.visualQuality },
  ];

  categories.forEach(({ category, getValue }) => {
    const sorted = [...scorecards].sort((a, b) => getValue(b) - getValue(a));
    if (sorted.length > 0) {
      categoryWinners.push({
        category,
        winner: sorted[0].url,
        score: getValue(sorted[0]),
        runnerUp: sorted[1]?.url,
        runnerUpScore: sorted[1] ? getValue(sorted[1]) : undefined,
      });
    }
  });

  // Additional category: Innovation
  const innovSorted = [...innovationIndex].sort((a, b) => b.innovationScore - a.innovationScore);
  if (innovSorted.length > 0) {
    categoryWinners.push({
      category: 'Innovation',
      winner: innovSorted[0].url,
      score: innovSorted[0].innovationScore,
      runnerUp: innovSorted[1]?.url,
      runnerUpScore: innovSorted[1]?.innovationScore,
    });
  }

  // Additional category: Mobile
  if (mobileRanking.length > 0) {
    categoryWinners.push({
      category: 'Mobile Experience',
      winner: mobileRanking[0].url,
      score: mobileRanking[0].mobileScore,
      runnerUp: mobileRanking[1]?.url,
      runnerUpScore: mobileRanking[1]?.mobileScore,
    });
  }

  // Build markdown report
  const markdownReport = buildMarkdownReport({
    sites,
    featureMatrix,
    scorecards,
    techComparison,
    performanceComparison,
    mobileRanking,
    innovationIndex,
    swotAnalyses,
    categoryWinners,
  });

  return {
    generatedAt: Date.now(),
    sites,
    featureMatrix,
    scorecards,
    techComparison,
    uxPatternComparison,
    performanceComparison,
    mobileRanking,
    innovationIndex,
    swotAnalyses,
    categoryWinners,
    markdownReport,
  };
}

// ===== Markdown Report Builder =====

function buildMarkdownReport(data: {
  sites: string[];
  featureMatrix: FeatureMatrixRow[];
  scorecards: SiteScorecard[];
  techComparison: TechComparison;
  performanceComparison: PerformanceComparison;
  mobileRanking: MobileRankEntry[];
  innovationIndex: InnovationEntry[];
  swotAnalyses: SWOTAnalysis[];
  categoryWinners: CategoryWinner[];
}): string {
  const { sites, scorecards, performanceComparison, mobileRanking, innovationIndex, swotAnalyses, categoryWinners, techComparison } = data;

  const siteHeaders = sites.map(extractDomain);
  const overallWinner = categoryWinners.find((c) => c.category === 'Overall');

  let md = `# Competitive Intelligence Report\n\n`;
  md += `*Generated: ${new Date().toISOString().split('T')[0]}*\n`;
  md += `*Sites analyzed: ${sites.length}*\n\n`;

  if (overallWinner) {
    md += `## Overall Winner: ${extractDomain(overallWinner.winner)} (Score: ${overallWinner.score}/100)\n\n`;
  }

  // Scorecard table
  md += `## Design Quality Scorecard\n\n`;
  md += `| Metric | ${siteHeaders.join(' | ')} |\n`;
  md += `| --- | ${siteHeaders.map(() => '---').join(' | ')} |\n`;
  const metrics = ['overallScore', 'accessibility', 'performance', 'conversion', 'visualQuality'] as const;
  metrics.forEach((metric) => {
    const values = scorecards.map((sc) => {
      const val = sc[metric];
      const best = Math.max(...scorecards.map((s) => s[metric]));
      return val === best ? `**${val}**` : `${val}`;
    });
    const label = metric === 'overallScore' ? 'Overall' : metric.charAt(0).toUpperCase() + metric.slice(1);
    md += `| ${label} | ${values.join(' | ')} |\n`;
  });
  md += `| Grade | ${scorecards.map((sc) => `**${sc.grade}**`).join(' | ')} |\n\n`;

  // Performance
  md += `## Performance Comparison (Core Web Vitals)\n\n`;
  md += `| Metric | ${siteHeaders.join(' | ')} |\n`;
  md += `| --- | ${siteHeaders.map(() => '---').join(' | ')} |\n`;
  const perfMetrics: { label: string; key: keyof PerformanceComparison['sites'][0]; format: (v: number) => string; lowerBetter: boolean }[] = [
    { label: 'Performance Score', key: 'performanceScore', format: (v) => `${v}/100`, lowerBetter: false },
    { label: 'LCP', key: 'lcp', format: (v) => `${(v / 1000).toFixed(1)}s`, lowerBetter: true },
    { label: 'CLS', key: 'cls', format: (v) => v.toFixed(3), lowerBetter: true },
    { label: 'INP', key: 'inp', format: (v) => `${v}ms`, lowerBetter: true },
    { label: 'FCP', key: 'fcp', format: (v) => `${(v / 1000).toFixed(1)}s`, lowerBetter: true },
    { label: 'Speed Index', key: 'speedIndex', format: (v) => `${(v / 1000).toFixed(1)}s`, lowerBetter: true },
    { label: 'TBT', key: 'tbt', format: (v) => `${v}ms`, lowerBetter: true },
  ];
  perfMetrics.forEach(({ label, key, format, lowerBetter }) => {
    const values = performanceComparison.sites.map((s) => {
      const val = s[key] as number;
      const allVals = performanceComparison.sites.map((ps) => ps[key] as number);
      const best = lowerBetter ? Math.min(...allVals) : Math.max(...allVals);
      return val === best ? `**${format(val)}**` : format(val);
    });
    md += `| ${label} | ${values.join(' | ')} |\n`;
  });
  md += '\n';

  // Tech stack
  md += `## Technology Stack Comparison\n\n`;
  md += `| Category | ${siteHeaders.join(' | ')} |\n`;
  md += `| --- | ${siteHeaders.map(() => '---').join(' | ')} |\n`;
  const techCats: { label: string; key: keyof TechComparison['sites'][0] }[] = [
    { label: 'Frameworks', key: 'frameworks' },
    { label: 'Analytics', key: 'analytics' },
    { label: 'CMS', key: 'cms' },
    { label: 'Auth', key: 'auth' },
    { label: 'CDNs', key: 'cdns' },
    { label: 'A/B Testing', key: 'abTesting' },
  ];
  techCats.forEach(({ label, key }) => {
    const values = techComparison.sites.map((s) => {
      const tools = s[key] as string[];
      return tools.length > 0 ? tools.join(', ') : '-';
    });
    md += `| ${label} | ${values.join(' | ')} |\n`;
  });
  md += '\n';

  // Mobile ranking
  md += `## Mobile Experience Ranking\n\n`;
  mobileRanking.forEach((entry) => {
    md += `${entry.rank}. **${extractDomain(entry.url)}** — Score: ${entry.mobileScore}/100`;
    md += ` (${entry.breakpointCount} breakpoints`;
    if (entry.touchFriendly) md += ', touch-friendly';
    if (entry.responsiveImages) md += ', responsive images';
    md += ')\n';
  });
  md += '\n';

  // Innovation
  md += `## Innovation Index\n\n`;
  innovationIndex
    .sort((a, b) => b.innovationScore - a.innovationScore)
    .forEach((entry) => {
      md += `### ${extractDomain(entry.url)} — Innovation Score: ${entry.innovationScore}/100\n`;
      if (entry.standoutFeatures.length > 0) {
        md += `**Standout features:** ${entry.standoutFeatures.join(', ')}\n`;
      }
      if (entry.uniquePatterns.length > 0) {
        md += `**Unique patterns:**\n`;
        entry.uniquePatterns.forEach((p) => (md += `- ${p}\n`));
      }
      md += '\n';
    });

  // SWOT
  md += `## SWOT Analysis\n\n`;
  swotAnalyses.forEach((swot) => {
    md += `### ${extractDomain(swot.url)}\n\n`;
    md += `| Strengths | Weaknesses |\n| --- | --- |\n`;
    const maxLen = Math.max(swot.strengths.length, swot.weaknesses.length);
    for (let i = 0; i < maxLen; i++) {
      md += `| ${swot.strengths[i] || ''} | ${swot.weaknesses[i] || ''} |\n`;
    }
    md += `\n| Opportunities | Threats |\n| --- | --- |\n`;
    const maxLen2 = Math.max(swot.opportunities.length, swot.threats.length);
    for (let i = 0; i < maxLen2; i++) {
      md += `| ${swot.opportunities[i] || ''} | ${swot.threats[i] || ''} |\n`;
    }
    md += '\n';
  });

  // Category winners
  md += `## Category Winners\n\n`;
  categoryWinners.forEach((cw) => {
    md += `- **${cw.category}:** ${extractDomain(cw.winner)} (${cw.score}/100)`;
    if (cw.runnerUp) md += ` | Runner-up: ${extractDomain(cw.runnerUp)} (${cw.runnerUpScore}/100)`;
    md += '\n';
  });
  md += '\n';

  md += `---\n*Report generated by UX Design Scraper — Competitive Intelligence Module*\n`;

  return md;
}
