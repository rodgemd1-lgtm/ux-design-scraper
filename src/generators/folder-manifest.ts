import type { FullScrapeResult, OutputManifest } from '../shared/types';

export interface FolderFile {
  path: string;
  content: string;
  mimeType: string;
  isBinary: boolean;
}

export function buildFolderManifest(
  projectName: string,
  files: { path: string; type: string; size: number }[]
): OutputManifest {
  return {
    projectName,
    outputPath: `~/Desktop/${projectName}`,
    files,
    syncedToSupabase: false,
    generatedAt: Date.now(),
  };
}

export function getOutputPaths(projectName: string): Record<string, string> {
  const base = projectName;
  return {
    claudeMd: `${base}/CLAUDE.md`,
    readme: `${base}/README.md`,
    masterPrompt: `${base}/prompts/master-prompt.md`,
    workflowChain: `${base}/prompts/workflow-chain.md`,
    colorsJson: `${base}/design-tokens/colors.json`,
    typographyJson: `${base}/design-tokens/typography.json`,
    spacingJson: `${base}/design-tokens/spacing.json`,
    shadowsJson: `${base}/design-tokens/shadows.json`,
    animationsJson: `${base}/design-tokens/animations.json`,
    accessibilityAudit: `${base}/analysis/accessibility-audit.md`,
    performanceReport: `${base}/analysis/performance-report.md`,
    competitorMatrix: `${base}/analysis/competitor-matrix.md`,
    flowAnalysis: `${base}/analysis/flow-analysis.md`,
    conversionPatterns: `${base}/analysis/conversion-patterns.md`,
    copyToneGuide: `${base}/analysis/copy-tone-guide.md`,
    designVersionHistory: `${base}/analysis/design-version-history.md`,
    bestPractices: `${base}/knowledge-base/best-practices.md`,
    designSystemDocs: `${base}/knowledge-base/design-system-docs.md`,
    roleExperience: `${base}/knowledge-base/role-experience.md`,
    patternsLibrary: `${base}/knowledge-base/patterns-library.md`,
    supabaseSyncJson: `${base}/supabase-sync.json`,
  };
}

export function getScreenshotPath(projectName: string, breakpoint: number): string {
  return `${projectName}/assets/screenshots/${breakpoint}px.png`;
}

export function getIconPath(projectName: string, index: number, category: string): string {
  return `${projectName}/assets/icons/${category}-${index}.svg`;
}

export function getComponentHtmlPath(projectName: string, componentName: string): string {
  const safe = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${projectName}/scraped-code/html/${safe}.html`;
}

export function getComponentCssPath(projectName: string, componentName: string): string {
  const safe = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${projectName}/scraped-code/css/${safe}.css`;
}

export function getComponentPromptPath(projectName: string, componentName: string): string {
  const safe = componentName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${projectName}/prompts/component-prompts/${safe}.md`;
}

export function getScreenPromptPath(projectName: string, screenName: string): string {
  const safe = screenName.toLowerCase().replace(/[^a-z0-9]/g, '-');
  return `${projectName}/prompts/screen-prompts/${safe}.md`;
}

export function getHeatmapPath(projectName: string, type: string, index: number): string {
  return `${projectName}/assets/heatmaps/${type}-${index}.png`;
}
