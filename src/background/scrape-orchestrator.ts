import { createLogger } from '@shared/logger';
import { generateId, sleep } from '@shared/utils';
import { MSG } from '@shared/message-types';
import { SCRAPE_TIMEOUTS, BREAKPOINTS } from '@shared/constants';
import type {
  ScrapeStep,
  ScrapeStepResult,
  ScrapeStepStatus,
  ScrapeConfig,
  FullScrapeResult,
  DesignTokens,
  TypographySystem,
  IconData,
  GridLayout,
  NavigationStructure,
  CopyAnalysis,
  AccessibilityAudit,
  ThirdPartyStack,
  DarkModeData,
  ImageAssetData,
  ConversionPatterns,
  ComponentData,
  AnimationData,
  ScrollBehavior,
  FlowAnalysis,
  ScreenshotData,
  LighthouseData,
  WaybackSnapshot,
  HeatmapData,
  SEOData,
  ColorIntelligence,
  WhitespaceAnalysis,
  InteractionPatterns,
  MotionCaptureData,
  FirecrawlPageResult,
  FirecrawlStructuredUXData,
  ExaSearchResult,
  WorkflowScreenshotSequence,
} from '@shared/types';
import { ScreenshotManager } from './screenshot-manager';
import { WaybackClient } from './wayback-client';
import { HotjarAPIClient } from './hotjar-api-client';
import { FullStoryAPIClient } from './fullstory-api-client';
import { MotionCaptureManager } from './motion-capture';
import { FirecrawlClient } from './firecrawl-client';
import { ExaMCPClient } from './exa-mcp-client';
import { MCPOrchestrator } from './mcp-orchestrator';

const log = createLogger('ScrapeOrch');

const PIPELINE_STEPS: ScrapeStep[] = [
  // Wave 0: Injection
  { id: 'inject', name: 'Inject Content Script', type: 'content-script', module: 'inject', timeout: SCRAPE_TIMEOUTS.INJECTION },

  // Wave 1: Independent DOM extractors (all depend on inject)
  { id: 'tokens', name: 'Design Tokens', type: 'content-script', module: 'tokens', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'typography', name: 'Typography System', type: 'content-script', module: 'typography', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'icons', name: 'Icon Extraction', type: 'content-script', module: 'icons', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'grid', name: 'Grid Layout', type: 'content-script', module: 'grid', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'nav', name: 'Navigation Structure', type: 'content-script', module: 'nav', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'copy', name: 'Copy Analysis', type: 'content-script', module: 'copy', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'a11y', name: 'Accessibility Audit', type: 'content-script', module: 'a11y', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'thirdparty', name: 'Third-Party Stack', type: 'content-script', module: 'thirdparty', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'darkmode', name: 'Dark Mode Detection', type: 'content-script', module: 'darkmode', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'images', name: 'Image Assets', type: 'content-script', module: 'images', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'conversion', name: 'Conversion Patterns', type: 'content-script', module: 'conversion', dependsOn: ['inject'], timeout: 10000 },
  { id: 'seo', name: 'SEO & Metadata', type: 'content-script', module: 'seo', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'whitespace', name: 'Whitespace Analysis', type: 'content-script', module: 'whitespace', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },

  // Wave 2: Dependent DOM extractors
  { id: 'components', name: 'Component Extraction', type: 'content-script', module: 'components', dependsOn: ['tokens', 'typography'], timeout: SCRAPE_TIMEOUTS.COMPONENT_EXTRACT },
  { id: 'states', name: 'State Variants', type: 'content-script', module: 'states', dependsOn: ['components'], timeout: SCRAPE_TIMEOUTS.INTERACTIVE },
  { id: 'animations', name: 'Animations', type: 'content-script', module: 'animations', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'scroll', name: 'Scroll Behavior', type: 'content-script', module: 'scroll', dependsOn: ['inject'], timeout: 20000 },
  { id: 'flow', name: 'Flow Analysis', type: 'content-script', module: 'flow', dependsOn: ['nav'], timeout: 20000 },
  { id: 'color-intelligence', name: 'Color Intelligence', type: 'content-script', module: 'color-intelligence', dependsOn: ['tokens'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },
  { id: 'interaction-patterns', name: 'Interaction Patterns', type: 'content-script', module: 'interaction-patterns', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.DOM_EXTRACTION },

  // Wave 3: CDP and background tasks (depend on inject for tab to be ready)
  { id: 'screenshots', name: 'Multi-Breakpoint Screenshots', type: 'cdp', module: 'screenshots', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.SCREENSHOT },
  { id: 'motion-capture', name: 'Motion Capture', type: 'cdp', module: 'motion-capture', dependsOn: ['screenshots'], timeout: SCRAPE_TIMEOUTS.SCREENSHOT },
  { id: 'lighthouse', name: 'Lighthouse Audit', type: 'background', module: 'lighthouse', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.LIGHTHOUSE },

  // Wave 4: External API calls (no DOM dependency)
  { id: 'wayback', name: 'Wayback Machine', type: 'api', module: 'wayback', timeout: SCRAPE_TIMEOUTS.API_CALL },
  { id: 'hotjar_api', name: 'Hotjar Heatmaps', type: 'api', module: 'hotjar_api', timeout: SCRAPE_TIMEOUTS.API_CALL },
  { id: 'fullstory_api', name: 'FullStory Sessions', type: 'api', module: 'fullstory_api', timeout: SCRAPE_TIMEOUTS.API_CALL },

  // Wave 5: Fallback heatmap (only if API fails)
  { id: 'heatmap_dom', name: 'DOM Heatmap Scrape', type: 'content-script', module: 'heatmap_dom', dependsOn: ['hotjar_api', 'fullstory_api'], timeout: SCRAPE_TIMEOUTS.HEATMAP_DOM },

  // Wave 6: Enhanced Data Layer (Firecrawl + Exa + MCP)
  { id: 'firecrawl_page', name: 'Firecrawl Full-Page Extract', type: 'api' as const, module: 'firecrawl_page', dependsOn: ['inject'], timeout: SCRAPE_TIMEOUTS.API_CALL },
  { id: 'firecrawl_screenshot', name: 'Firecrawl Full-Page Screenshot', type: 'api' as const, module: 'firecrawl_screenshot', dependsOn: ['firecrawl_page'], timeout: SCRAPE_TIMEOUTS.SCREENSHOT },
  { id: 'exa_similar', name: 'Exa Similar Design Discovery', type: 'api' as const, module: 'exa_similar', dependsOn: ['firecrawl_page'], timeout: SCRAPE_TIMEOUTS.API_CALL },
  { id: 'mcp_playwright', name: 'MCP Playwright Interaction States', type: 'api' as const, module: 'mcp_playwright', dependsOn: ['firecrawl_screenshot'], timeout: SCRAPE_TIMEOUTS.SCREENSHOT * 2 },
];

export class ScrapeOrchestrator {
  private screenshotManager: ScreenshotManager;
  private waybackClient: WaybackClient;
  private hotjarClient: HotjarAPIClient;
  private fullstoryClient: FullStoryAPIClient;
  private motionCaptureManager: MotionCaptureManager;
  private firecrawlClient: FirecrawlClient;
  private exaClient: ExaMCPClient;
  private mcpOrchestrator: MCPOrchestrator;

  private aborted: boolean = false;
  private activeTabId: number | null = null;
  private stepResults: Map<string, ScrapeStepResult> = new Map();
  private stepData: Map<string, unknown> = new Map();

  constructor(
    screenshotManager: ScreenshotManager,
    waybackClient: WaybackClient,
    hotjarClient: HotjarAPIClient,
    fullstoryClient: FullStoryAPIClient,
    motionCaptureManager?: MotionCaptureManager,
    firecrawlClient?: FirecrawlClient,
    exaClient?: ExaMCPClient,
  ) {
    this.screenshotManager = screenshotManager;
    this.waybackClient = waybackClient;
    this.hotjarClient = hotjarClient;
    this.fullstoryClient = fullstoryClient;
    this.motionCaptureManager = motionCaptureManager || new MotionCaptureManager();
    this.firecrawlClient = firecrawlClient || new FirecrawlClient();
    this.exaClient = exaClient || new ExaMCPClient();
    this.mcpOrchestrator = new MCPOrchestrator(this.exaClient, this.firecrawlClient);
  }

  async startPipeline(config: ScrapeConfig): Promise<FullScrapeResult> {
    this.aborted = false;
    this.stepResults.clear();
    this.stepData.clear();

    log.info('Starting scrape pipeline', { url: config.targetUrl, projectName: config.projectName });

    // Filter steps if specific ones are enabled
    let activeSteps = PIPELINE_STEPS;
    if (config.enabledSteps && config.enabledSteps.length > 0) {
      const enabledSet = new Set(config.enabledSteps);
      // Always include inject
      enabledSet.add('inject');
      activeSteps = PIPELINE_STEPS.filter(s => enabledSet.has(s.id));
    }

    // Build execution waves via topological sort
    const waves = this.buildExecutionWaves(activeSteps);
    log.info('Execution waves built', { waveCount: waves.length, waves: waves.map(w => w.map(s => s.id)) });

    // Execute each wave
    for (let waveIndex = 0; waveIndex < waves.length; waveIndex++) {
      if (this.aborted) {
        log.warn('Pipeline aborted');
        break;
      }

      const wave = waves[waveIndex];
      log.info(`Executing wave ${waveIndex}`, { steps: wave.map(s => s.id) });

      const wavePromises = wave.map(step => this.executeStep(step, config));
      const results = await Promise.allSettled(wavePromises);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        const step = wave[i];

        if (result.status === 'fulfilled') {
          this.stepResults.set(step.id, result.value);
          if (result.value.data !== undefined) {
            this.stepData.set(step.id, result.value.data);
          }
        } else {
          this.stepResults.set(step.id, {
            stepId: step.id,
            status: 'error',
            error: String(result.reason),
            duration: 0,
          });
          log.error(`Step ${step.id} failed`, result.reason);
        }

        this.broadcastProgress(step, this.stepResults.get(step.id)!);
      }
    }

    const fullResult = this.assembleResults(config);

    this.broadcast({
      type: MSG.SCRAPE_ALL_COMPLETE,
      payload: {
        projectName: config.projectName,
        targetUrl: config.targetUrl,
        stepResults: Object.fromEntries(this.stepResults),
        fullResult,
      },
    });

    log.info('Pipeline complete', {
      total: activeSteps.length,
      completed: [...this.stepResults.values()].filter(r => r.status === 'complete').length,
      errors: [...this.stepResults.values()].filter(r => r.status === 'error').length,
    });

    return fullResult;
  }

  abort(): void {
    log.warn('Aborting pipeline');
    this.aborted = true;
  }

  handleScrapedData(payload: { stepId: string; data: unknown }): void {
    log.info('Received scraped data from content script', { stepId: payload.stepId });
    this.stepData.set(payload.stepId, payload.data);
  }

  private buildExecutionWaves(steps: ScrapeStep[]): ScrapeStep[][] {
    const stepMap = new Map(steps.map(s => [s.id, s]));
    const waves: ScrapeStep[][] = [];
    const placed = new Set<string>();

    // Keep building waves until all steps are placed
    let safetyCounter = 0;
    while (placed.size < steps.length && safetyCounter < 20) {
      safetyCounter++;
      const currentWave: ScrapeStep[] = [];

      for (const step of steps) {
        if (placed.has(step.id)) continue;

        // Check if all dependencies are met
        const deps = step.dependsOn || [];
        const allDepsMet = deps.every(dep => {
          // Dependency met if it has been placed OR if the step is not in our active list
          return placed.has(dep) || !stepMap.has(dep);
        });

        if (allDepsMet) {
          currentWave.push(step);
        }
      }

      if (currentWave.length === 0) {
        // Deadlock - place remaining steps with unmet dependencies
        log.warn('Dependency deadlock detected, forcing remaining steps');
        const remaining = steps.filter(s => !placed.has(s.id));
        waves.push(remaining);
        remaining.forEach(s => placed.add(s.id));
        break;
      }

      waves.push(currentWave);
      currentWave.forEach(s => placed.add(s.id));
    }

    return waves;
  }

  private async executeStep(step: ScrapeStep, config: ScrapeConfig): Promise<ScrapeStepResult> {
    if (this.aborted) {
      return { stepId: step.id, status: 'skipped', duration: 0 };
    }

    // Special handling: heatmap_dom only runs if API heatmap steps failed
    if (step.id === 'heatmap_dom') {
      const hotjarResult = this.stepResults.get('hotjar_api');
      const fullstoryResult = this.stepResults.get('fullstory_api');
      const hotjarOk = hotjarResult?.status === 'complete' && hotjarResult.data;
      const fullstoryOk = fullstoryResult?.status === 'complete' && fullstoryResult.data;

      if (hotjarOk || fullstoryOk) {
        log.info('Skipping heatmap_dom: API data available');
        return { stepId: step.id, status: 'skipped', duration: 0 };
      }
    }

    this.broadcast({
      type: MSG.SCRAPE_STEP_START,
      payload: { stepId: step.id, name: step.name },
    });

    const startTime = Date.now();

    try {
      const result = await this.withTimeout(
        this.runStep(step, config),
        step.timeout,
        `Step ${step.id} timed out after ${step.timeout}ms`
      );

      const duration = Date.now() - startTime;
      return {
        stepId: step.id,
        status: 'complete',
        data: result,
        duration,
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Step ${step.id} failed`, { error: errorMessage, duration });

      return {
        stepId: step.id,
        status: 'error',
        error: errorMessage,
        duration,
      };
    }
  }

  private async runStep(step: ScrapeStep, config: ScrapeConfig): Promise<unknown> {
    switch (step.type) {
      case 'content-script':
        if (step.id === 'inject') {
          return this.injectContentScript(config);
        }
        return this.runContentScriptModule(step, config);

      case 'cdp':
        return this.runCDPModule(step, config);

      case 'api':
        return this.runAPIModule(step, config);

      case 'background':
        return this.runBackgroundModule(step, config);

      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  private async injectContentScript(config: ScrapeConfig): Promise<void> {
    // Get the active tab or create one for the target URL
    const tabs = await chrome.tabs.query({ url: config.targetUrl });
    let tabId: number;

    if (tabs.length > 0 && tabs[0].id) {
      tabId = tabs[0].id;
    } else {
      // Navigate to the URL in a new tab
      const tab = await chrome.tabs.create({ url: config.targetUrl, active: false });
      if (!tab.id) throw new Error('Failed to create tab');
      tabId = tab.id;

      // Wait for the tab to finish loading
      await this.waitForTabLoad(tabId);
    }

    this.activeTabId = tabId;

    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/scraper/index.js'],
    });

    // Wait for SCRAPER_READY message from content script
    await this.waitForMessage(MSG.SCRAPER_READY, SCRAPE_TIMEOUTS.INJECTION);

    log.info('Content script injected and ready', { tabId });
  }

  private async runContentScriptModule(step: ScrapeStep, config: ScrapeConfig): Promise<unknown> {
    if (!this.activeTabId) {
      throw new Error('No active tab - injection step must run first');
    }

    log.info('Running content script module', { stepId: step.id, module: step.module });

    // Send the extraction command to the content script
    const response = await chrome.tabs.sendMessage(this.activeTabId, {
      type: MSG.RUN_EXTRACTOR,
      payload: {
        module: step.module,
        config: {
          targetUrl: config.targetUrl,
          breakpoints: config.breakpoints,
          projectContext: config.projectContext,
        },
      },
    });

    if (response && response.type === MSG.EXTRACTOR_RESULT) {
      if (response.payload.success) {
        return response.payload.data;
      } else {
        throw new Error(response.payload.errors?.join('; ') || `Extractor ${step.module} failed`);
      }
    }

    // If no immediate response, wait for the data to arrive via message
    return this.waitForStepData(step.id, step.timeout);
  }

  private async runCDPModule(step: ScrapeStep, config: ScrapeConfig): Promise<unknown> {
    if (step.id === 'screenshots') {
      if (!this.activeTabId) {
        throw new Error('No active tab for screenshot capture');
      }
      return this.screenshotManager.captureAllBreakpoints(this.activeTabId, config.targetUrl);
    }

    if (step.id === 'motion-capture') {
      if (!this.activeTabId) {
        throw new Error('No active tab for motion capture');
      }
      return this.motionCaptureManager.captureAnimations(this.activeTabId, config.targetUrl);
    }

    throw new Error(`Unknown CDP module: ${step.module}`);
  }

  private async runAPIModule(step: ScrapeStep, config: ScrapeConfig): Promise<unknown> {
    switch (step.id) {
      case 'wayback':
        return this.waybackClient.fetchSnapshots(config.targetUrl);

      case 'hotjar_api':
        try {
          return await this.hotjarClient.getHeatmaps(undefined, config.targetUrl);
        } catch (err) {
          log.warn('Hotjar API call failed (may not be configured)', err);
          return null;
        }

      case 'fullstory_api':
        try {
          return await this.fullstoryClient.searchSessions(undefined, config.targetUrl);
        } catch (err) {
          log.warn('FullStory API call failed (may not be configured)', err);
          return null;
        }

      case 'firecrawl_page':
        try {
          return await this.firecrawlClient.scrapeUrl(config.targetUrl, {
            formats: ['markdown', 'html', 'screenshot'],
            includeScreenshot: true,
          });
        } catch (err) {
          log.warn('Firecrawl page scrape failed (may not be configured)', err);
          return null;
        }

      case 'firecrawl_screenshot':
        try {
          return await this.firecrawlClient.captureWorkflowScreenshots([config.targetUrl]);
        } catch (err) {
          log.warn('Firecrawl screenshot failed (may not be configured)', err);
          return null;
        }

      case 'exa_similar':
        try {
          return await this.exaClient.findSimilarDesigns(config.targetUrl);
        } catch (err) {
          log.warn('Exa similar designs search failed (may not be configured)', err);
          return null;
        }

      case 'mcp_playwright':
        try {
          return await this.mcpOrchestrator.runPlaywrightCapture(config.targetUrl, [
            { type: 'hover', selector: 'nav a' },
            { type: 'scroll' },
          ]);
        } catch (err) {
          log.warn('MCP Playwright capture failed', err);
          return null;
        }

      default:
        throw new Error(`Unknown API module: ${step.module}`);
    }
  }

  private async runBackgroundModule(step: ScrapeStep, config: ScrapeConfig): Promise<unknown> {
    if (step.id === 'lighthouse') {
      return this.runLighthouse(config.targetUrl);
    }

    throw new Error(`Unknown background module: ${step.module}`);
  }

  private async runLighthouse(url: string): Promise<LighthouseData> {
    log.info('Running Lighthouse via offscreen document', { url });

    // Ensure offscreen document exists
    try {
      await chrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Run Lighthouse audit via PageSpeed Insights API',
      });
    } catch {
      // Document may already exist
    }

    // Send message to offscreen document
    const response = await chrome.runtime.sendMessage({
      type: MSG.RUN_LIGHTHOUSE,
      payload: { url },
      target: 'offscreen',
    });

    if (response?.type === MSG.LIGHTHOUSE_RESULT && response.payload) {
      return response.payload as LighthouseData;
    }

    // Wait for the result via message if the offscreen handler is async
    return this.waitForMessage(MSG.LIGHTHOUSE_RESULT, SCRAPE_TIMEOUTS.LIGHTHOUSE) as Promise<LighthouseData>;
  }

  private broadcastProgress(step: ScrapeStep, result: ScrapeStepResult): void {
    const msgType = result.status === 'complete'
      ? MSG.SCRAPE_STEP_COMPLETE
      : result.status === 'error'
        ? MSG.SCRAPE_STEP_ERROR
        : MSG.SCRAPE_STEP_PROGRESS;

    this.broadcast({
      type: msgType,
      payload: {
        stepId: step.id,
        name: step.name,
        status: result.status,
        duration: result.duration,
        error: result.error,
      },
    });
  }

  private assembleResults(config: ScrapeConfig): FullScrapeResult {
    log.info('Assembling final results');

    return {
      projectName: config.projectName,
      targetUrl: config.targetUrl,
      projectContext: config.projectContext,
      timestamp: Date.now(),
      designTokens: (this.stepData.get('tokens') as DesignTokens) || this.emptyDesignTokens(),
      typography: (this.stepData.get('typography') as TypographySystem) || this.emptyTypography(),
      icons: (this.stepData.get('icons') as IconData[]) || [],
      gridLayout: (this.stepData.get('grid') as GridLayout) || this.emptyGridLayout(),
      navigation: (this.stepData.get('nav') as NavigationStructure) || this.emptyNavigation(),
      copyAnalysis: (this.stepData.get('copy') as CopyAnalysis) || this.emptyCopyAnalysis(),
      accessibility: (this.stepData.get('a11y') as AccessibilityAudit) || this.emptyAccessibility(),
      thirdPartyStack: (this.stepData.get('thirdparty') as ThirdPartyStack) || this.emptyThirdPartyStack(),
      darkMode: (this.stepData.get('darkmode') as DarkModeData) || this.emptyDarkMode(),
      imageAssets: (this.stepData.get('images') as ImageAssetData) || this.emptyImageAssets(),
      conversionPatterns: (this.stepData.get('conversion') as ConversionPatterns) || this.emptyConversionPatterns(),
      components: this.assembleComponents(),
      animations: (this.stepData.get('animations') as AnimationData) || this.emptyAnimations(),
      scrollBehavior: (this.stepData.get('scroll') as ScrollBehavior) || this.emptyScrollBehavior(),
      flowAnalysis: (this.stepData.get('flow') as FlowAnalysis) || this.emptyFlowAnalysis(),
      screenshots: (this.stepData.get('screenshots') as ScreenshotData[]) || [],
      lighthouse: (this.stepData.get('lighthouse') as LighthouseData) || this.emptyLighthouse(),
      waybackSnapshots: (this.stepData.get('wayback') as WaybackSnapshot[]) || [],
      heatmaps: this.assembleHeatmaps(),
      seo: (this.stepData.get('seo') as SEOData) || this.emptySEO(),
      colorIntelligence: (this.stepData.get('color-intelligence') as ColorIntelligence) || this.emptyColorIntelligence(),
      whitespace: (this.stepData.get('whitespace') as WhitespaceAnalysis) || this.emptyWhitespace(),
      interactionPatterns: (this.stepData.get('interaction-patterns') as InteractionPatterns) || this.emptyInteractionPatterns(),
      motionCapture: (this.stepData.get('motion-capture') as MotionCaptureData) || this.emptyMotionCapture(),
      firecrawlPage: (this.stepData.get('firecrawl_page') as FirecrawlPageResult) || null,
      firecrawlScreenshots: (this.stepData.get('firecrawl_screenshot') as WorkflowScreenshotSequence) || null,
      exaSimilarDesigns: (this.stepData.get('exa_similar') as ExaSearchResult[]) || [],
    };
  }

  private assembleComponents(): ComponentData[] {
    const components = (this.stepData.get('components') as ComponentData[]) || [];
    const states = this.stepData.get('states') as Record<string, Record<string, Record<string, string>>> | undefined;

    if (states && components.length > 0) {
      for (const component of components) {
        if (states[component.name]) {
          component.stateVariants = { ...component.stateVariants, ...states[component.name] };
        }
      }
    }

    return components;
  }

  private assembleHeatmaps(): HeatmapData[] {
    const heatmaps: HeatmapData[] = [];

    const hotjarData = this.stepData.get('hotjar_api');
    if (Array.isArray(hotjarData)) {
      heatmaps.push(...(hotjarData as HeatmapData[]));
    }

    const fullstoryData = this.stepData.get('fullstory_api');
    if (Array.isArray(fullstoryData)) {
      heatmaps.push(...(fullstoryData as HeatmapData[]));
    }

    const domHeatmapData = this.stepData.get('heatmap_dom');
    if (Array.isArray(domHeatmapData)) {
      heatmaps.push(...(domHeatmapData as HeatmapData[]));
    }

    return heatmaps;
  }

  // ===== Helper methods =====

  private async waitForTabLoad(tabId: number): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(listener);
        reject(new Error('Tab load timed out'));
      }, 30000);

      const listener = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId === tabId && changeInfo.status === 'complete') {
          clearTimeout(timeout);
          chrome.tabs.onUpdated.removeListener(listener);
          resolve();
        }
      };

      chrome.tabs.onUpdated.addListener(listener);
    });
  }

  private async waitForMessage(messageType: string, timeout: number): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        reject(new Error(`Timed out waiting for ${messageType}`));
      }, timeout);

      const listener = (message: { type: string; payload?: unknown }) => {
        if (message.type === messageType) {
          clearTimeout(timer);
          chrome.runtime.onMessage.removeListener(listener);
          resolve(message.payload);
        }
      };

      chrome.runtime.onMessage.addListener(listener);
    });
  }

  private async waitForStepData(stepId: string, timeout: number): Promise<unknown> {
    const startTime = Date.now();
    const pollInterval = 200;

    while (Date.now() - startTime < timeout) {
      if (this.stepData.has(stepId)) {
        return this.stepData.get(stepId);
      }
      await sleep(pollInterval);
    }

    throw new Error(`Timed out waiting for data from step ${stepId}`);
  }

  private withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private broadcast(msg: { type: string; payload: unknown }): void {
    chrome.runtime.sendMessage(msg).catch(() => {
      // Side panel may not be open
    });
  }

  // ===== Empty defaults for assembly =====

  private emptyDesignTokens(): DesignTokens {
    return { colors: [], spacing: [], shadows: [], borderRadii: [], zIndices: [], opacities: [] };
  }

  private emptyTypography(): TypographySystem {
    return { fontFamilies: [], fontWeights: [], fontSizes: [], lineHeights: [], letterSpacings: [] };
  }

  private emptyGridLayout(): GridLayout {
    return { containerMaxWidth: '', columns: 12, gutterWidth: '', layoutType: 'mixed', breakpointBehaviors: [] };
  }

  private emptyNavigation(): NavigationStructure {
    return { primaryNav: [], footerNav: [], breadcrumbs: [], menuDepth: 0, totalPages: 0, sitemapTree: { label: '', href: '', children: [], level: 0 } };
  }

  private emptyCopyAnalysis(): CopyAnalysis {
    return { ctaLabels: [], errorMessages: [], placeholders: [], tooltips: [], emptyStateText: [], microcopy: [], toneKeywords: [] };
  }

  private emptyAccessibility(): AccessibilityAudit {
    return { contrastIssues: [], missingAltText: [], missingAriaLabels: [], tabOrderIssues: [], semanticIssues: [], focusIndicatorsMissing: [], overallScore: 0, wcagLevel: 'FAIL' };
  }

  private emptyThirdPartyStack(): ThirdPartyStack {
    return { analytics: [], cms: [], auth: [], payment: [], chat: [], cdns: [], frameworks: [], abTesting: [] };
  }

  private emptyDarkMode(): DarkModeData {
    return { hasDarkMode: false, method: 'none', darkColors: [] };
  }

  private emptyImageAssets(): ImageAssetData {
    return { images: [], totalSize: 0, formatDistribution: {}, lazyLoadPercentage: 0 };
  }

  private emptyConversionPatterns(): ConversionPatterns {
    return { ctas: [], socialProof: [], formFields: [], urgencyPatterns: [], trustBadges: [] };
  }

  private emptyAnimations(): AnimationData {
    return { cssTransitions: [], cssAnimations: [], scrollTriggered: [] };
  }

  private emptyScrollBehavior(): ScrollBehavior {
    return { stickyElements: [], parallaxLayers: [], scrollAnimations: [], pageTransitions: [] };
  }

  private emptyFlowAnalysis(): FlowAnalysis {
    return { stepsToConversion: 0, formFieldCount: 0, decisionsPerScreen: [], estimatedCognitiveLoad: 0, frictionPoints: [] };
  }

  private emptyLighthouse(): LighthouseData {
    return { performanceScore: 0, accessibilityScore: 0, lcp: 0, cls: 0, inp: 0, fcp: 0, speedIndex: 0, totalBlockingTime: 0 };
  }

  private emptySEO(): SEOData {
    return {
      metaTags: [], openGraph: [], twitterCard: [],
      structuredData: { jsonLd: [], microdata: [], rdfa: [] },
      canonicalUrl: '', hreflangTags: [], schemaTypes: [],
      headingHierarchy: [],
      linkAnalysis: { totalLinks: 0, internalLinks: 0, externalLinks: 0, ratio: 0 },
      imageAltCoverage: { totalImages: 0, imagesWithAlt: 0, imagesWithoutAlt: 0, coveragePercentage: 0 },
      titleInfo: { title: '', charCount: 0 },
      metaDescriptionInfo: { description: '', charCount: 0 },
      faviconUrl: '', robotsMeta: '', viewportMeta: '',
    };
  }

  private emptyColorIntelligence(): ColorIntelligence {
    return {
      palette: [], relationships: [], harmonyScore: 0,
      brandColors: [], neutralColors: [], accentColors: [],
      emotionalMapping: [], gradients: [], contrastMatrix: [],
      consistencyScore: 0, consistencyIssues: [], suggestedScale: [],
    };
  }

  private emptyWhitespace(): WhitespaceAnalysis {
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

  private emptyInteractionPatterns(): InteractionPatterns {
    return {
      infiniteScroll: { detected: false, containerSelector: '', sentinelSelector: '', loadingIndicator: '' },
      lazyLoading: { detected: false, method: 'none', lazyElements: [] },
      modals: [], dropdowns: [], tabPanels: [], accordions: [],
      carousels: [], toasts: [], searchAutocomplete: [],
      filterSort: [], dragDrop: [], fileUpload: [], steppers: [],
    };
  }

  private emptyMotionCapture(): MotionCaptureData {
    return {
      animations: [], scrollFrames: [], loadingAnimations: [],
      hoverAnimations: [], entranceAnimations: [], easingCurves: [],
    };
  }
}
