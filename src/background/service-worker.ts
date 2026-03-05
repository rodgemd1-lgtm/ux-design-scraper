import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import { STORAGE_KEYS, BREAKPOINTS, DEFAULT_SCORING_WEIGHTS } from '@shared/constants';
import type {
  AppSettings,
  ScrapeConfig,
  FullScrapeResult,
  ProjectContext,
  ChatMessage,
} from '@shared/types';

import { ClaudeAPIClient } from './claude-api-client';
import { BraveSearchClient } from './brave-search-client';
import { ScrapeOrchestrator } from './scrape-orchestrator';
import { FileOutputManager } from './file-output-manager';
import { SupabaseSync } from './supabase-sync';
import { ScoringEngine } from './scoring-engine';
import { ScreenshotManager } from './screenshot-manager';
import { WaybackClient } from './wayback-client';
import { HotjarAPIClient } from './hotjar-api-client';
import { FullStoryAPIClient } from './fullstory-api-client';
import { MultiSiteEngine } from './multi-site-engine';
import { ComponentReconstructor } from './component-reconstructor';
import { DesignCritiqueEngine } from './design-critique-engine';
import { PersonaGenerator } from './persona-generator';
import { CopyRewriter } from './copy-rewriter';
import { ABTestEngine } from './ab-test-engine';
import { BraveDeepSearchClient } from './brave-deep-search';
import { KnowledgeEnrichmentEngine } from './knowledge-enrichment';
import { PhaseOrchestrator } from './phase-orchestrator';
import type { WorkflowConfig, WorkflowPhaseId } from '@shared/workflow-types';

import type {
  MultiSiteResult,
  ReconstructedComponent,
  DesignCritique,
  GeneratedPersona,
  RewrittenCopy,
  ABTestPlan,
  HeatmapData,
} from '@shared/types';

const log = createLogger('ServiceWorker');

// ===== Instantiate all service modules =====
const claudeClient = new ClaudeAPIClient();
const braveSearchClient = new BraveSearchClient();
const screenshotManager = new ScreenshotManager();
const waybackClient = new WaybackClient();
const hotjarClient = new HotjarAPIClient();
const fullstoryClient = new FullStoryAPIClient();
const scrapeOrchestrator = new ScrapeOrchestrator(
  screenshotManager,
  waybackClient,
  hotjarClient,
  fullstoryClient
);
const fileOutputManager = new FileOutputManager();
const supabaseSync = new SupabaseSync();
const scoringEngine = new ScoringEngine(claudeClient);
const multiSiteEngine = new MultiSiteEngine(claudeClient, scrapeOrchestrator);
const componentReconstructor = new ComponentReconstructor(claudeClient);
const designCritiqueEngine = new DesignCritiqueEngine(claudeClient);
const personaGenerator = new PersonaGenerator(claudeClient);
const copyRewriter = new CopyRewriter(claudeClient);
const abTestEngine = new ABTestEngine(claudeClient);
const braveDeepSearch = new BraveDeepSearchClient();
const knowledgeEnrichment = new KnowledgeEnrichmentEngine();

// ===== Instantiate Phase Orchestrator =====
const orchestrator = new PhaseOrchestrator({
  claudeClient,
  braveDeepSearch,
  scrapeOrchestrator,
  multiSiteEngine,
  personaGenerator,
  designCritiqueEngine,
  componentReconstructor,
  copyRewriter,
  abTestEngine,
  knowledgeEnrichment,
  fileOutputManager,
  scoringEngine,
});

// Store the latest scrape result for downstream operations
let latestScrapeResult: FullScrapeResult | null = null;
let latestPromptChainResult: unknown = null;
let latestMultiSiteResult: MultiSiteResult | null = null;
let latestCritique: DesignCritique | null = null;
let latestPersonas: GeneratedPersona[] | null = null;
let latestReconstructedComponents: ReconstructedComponent[] | null = null;
let latestRewrittenCopy: RewrittenCopy | null = null;
let latestABTestPlan: ABTestPlan | null = null;

// ===== Side panel behavior =====
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(err => {
  log.error('Failed to set side panel behavior', err);
});

log.info('Service worker initialized');

// ===== Restore workflow session on startup/restart =====
orchestrator.restoreSession().then((session) => {
  if (session) {
    log.info('Workflow session restored on startup', { sessionId: session.id, status: session.status });
  }
}).catch((err) => {
  log.error('Failed to restore workflow session on startup', err);
});

// ===== Message listener =====
chrome.runtime.onMessage.addListener(
  (
    message: { type: string; payload?: unknown },
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean => {
    const { type, payload } = message;

    log.debug('Message received', { type, sender: sender.id || sender.url });

    switch (type) {
      // ===== Chat / Claude AI =====
      case MSG.CHAT_SEND:
        handleChatSend(payload as {
          messages: ChatMessage[];
          context?: ProjectContext;
          sessionId: string;
        }).then(result => sendResponse(result))
          .catch(err => {
            log.error('Chat send error', err);
            sendResponse({ error: err.message });
          });
        return true;

      // ===== Brave Search =====
      case MSG.BRAVE_SEARCH:
        handleBraveSearch(payload as {
          query?: string;
          goal?: string;
          industry?: string;
          competitors?: string[];
          type?: 'search' | 'inspiration' | 'competitors';
        }).then(result => sendResponse({ type: MSG.BRAVE_SEARCH_RESULT, payload: result }))
          .catch(err => {
            log.error('Brave search error', err);
            sendResponse({ type: MSG.BRAVE_SEARCH_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Scrape Pipeline =====
      case MSG.START_SCRAPE:
        handleStartScrape(payload as ScrapeConfig)
          .then(result => sendResponse({ type: MSG.SCRAPE_ALL_COMPLETE, payload: result }))
          .catch(err => {
            log.error('Scrape pipeline error', err);
            sendResponse({ type: MSG.SCRAPE_STEP_ERROR, payload: { error: err.message } });
          });
        return true;

      case MSG.STOP_SCRAPE:
        scrapeOrchestrator.abort();
        sendResponse({ success: true });
        return false;

      // ===== Scraped data from content script =====
      case MSG.SCRAPE_DATA:
        scrapeOrchestrator.handleScrapedData(payload as { stepId: string; data: unknown });
        sendResponse({ received: true });
        return false;

      // ===== Content script signals =====
      case MSG.SCRAPER_READY:
        // Handled internally by the orchestrator via message listener
        log.info('Scraper ready signal from content script');
        return false;

      case MSG.EXTRACTOR_RESULT:
        // Handled internally when content script sends back extraction results
        log.debug('Extractor result received', { module: (payload as { module?: string })?.module });
        return false;

      // ===== Screenshots =====
      case MSG.CAPTURE_SCREENSHOT:
        handleCaptureScreenshot(payload as { tabId: number; url: string })
          .then(result => sendResponse({ type: MSG.SCREENSHOT_CAPTURED, payload: result }))
          .catch(err => {
            log.error('Screenshot capture error', err);
            sendResponse({ type: MSG.SCREENSHOT_CAPTURED, payload: { error: err.message } });
          });
        return true;

      // ===== Lighthouse =====
      case MSG.RUN_LIGHTHOUSE:
        // Forward to offscreen document — handled by offscreen.ts
        // The response comes back through LIGHTHOUSE_RESULT message
        return false;

      case MSG.LIGHTHOUSE_RESULT:
        // Captured by orchestrator or stored
        log.info('Lighthouse result received');
        return false;

      // ===== File Output =====
      case MSG.GENERATE_OUTPUT:
        handleGenerateOutput(payload as {
          scrapeResult?: FullScrapeResult;
          projectName?: string;
        }).then(result => sendResponse({ type: MSG.OUTPUT_COMPLETE, payload: result }))
          .catch(err => {
            log.error('Output generation error', err);
            sendResponse({ type: MSG.OUTPUT_COMPLETE, payload: { error: err.message } });
          });
        return true;

      // ===== Supabase Sync =====
      case MSG.SYNC_TO_SUPABASE:
        handleSupabaseSync(payload as { scrapeResult?: FullScrapeResult })
          .then(result => sendResponse({ type: MSG.SYNC_COMPLETE, payload: result }))
          .catch(err => {
            log.error('Supabase sync error', err);
            sendResponse({ type: MSG.SYNC_COMPLETE, payload: { error: err.message } });
          });
        return true;

      // ===== Analytics / Heatmaps =====
      case MSG.FETCH_HEATMAPS_API:
        handleFetchHeatmaps(payload as { url?: string })
          .then(result => sendResponse({ type: MSG.HEATMAP_DATA, payload: result }))
          .catch(err => {
            log.error('Heatmap fetch error', err);
            sendResponse({ type: MSG.HEATMAP_DATA, payload: { error: err.message } });
          });
        return true;

      case MSG.SCRAPE_HEATMAPS_DOM:
        // DOM heatmap scraping is handled through the orchestrator pipeline
        log.info('DOM heatmap scrape requested');
        return false;

      case MSG.HEATMAP_DATA:
        // Received heatmap data from content script or API
        log.debug('Heatmap data received');
        return false;

      // ===== Scoring =====
      case MSG.SCORE_COMPONENTS:
        handleScoring(payload as {
          scrapeResult?: FullScrapeResult;
          projectContext?: ProjectContext;
        }).then(result => sendResponse({ type: MSG.SCORE_RESULT, payload: result }))
          .catch(err => {
            log.error('Scoring error', err);
            sendResponse({ type: MSG.SCORE_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Wayback Machine =====
      case MSG.FETCH_WAYBACK:
        handleFetchWayback(payload as { url: string; limit?: number })
          .then(result => sendResponse({ type: MSG.WAYBACK_RESULT, payload: result }))
          .catch(err => {
            log.error('Wayback fetch error', err);
            sendResponse({ type: MSG.WAYBACK_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Settings / Status =====
      case MSG.GET_STATUS:
        handleGetStatus()
          .then(result => sendResponse({ type: MSG.STATUS_UPDATE, payload: result }))
          .catch(err => sendResponse({ type: MSG.STATUS_UPDATE, payload: { error: err.message } }));
        return true;

      case MSG.GET_SETTINGS:
        handleGetSettings()
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ error: err.message }));
        return true;

      case MSG.SAVE_SETTINGS:
        handleSaveSettings(payload as Partial<AppSettings>)
          .then(result => sendResponse(result))
          .catch(err => sendResponse({ error: err.message }));
        return true;

      // ===== Multi-Site Scrape =====
      case MSG.MULTI_SITE_SCRAPE:
        handleMultiSiteScrape(payload as {
          urls: string[];
          projectContext: ProjectContext;
          projectName: string;
          breakpoints?: number[];
        }).then(result => sendResponse({ type: MSG.MULTI_SITE_COMPLETE, payload: result }))
          .catch(err => {
            log.error('Multi-site scrape error', err);
            sendResponse({ type: MSG.MULTI_SITE_COMPLETE, payload: { error: err.message } });
          });
        return true;

      // ===== Component Reconstruction =====
      case MSG.RECONSTRUCT_COMPONENTS:
        handleReconstructComponents(payload as {
          scrapeResult?: FullScrapeResult;
          componentNames?: string[];
        }).then(result => sendResponse({ type: MSG.RECONSTRUCT_COMPLETE, payload: result }))
          .catch(err => {
            log.error('Component reconstruction error', err);
            sendResponse({ type: MSG.RECONSTRUCT_COMPLETE, payload: { error: err.message } });
          });
        return true;

      // ===== Design Critique =====
      case MSG.CRITIQUE_DESIGN:
        handleDesignCritique(payload as {
          scrapeResult?: FullScrapeResult;
          projectContext?: ProjectContext;
        }).then(result => sendResponse({ type: MSG.CRITIQUE_RESULT, payload: result }))
          .catch(err => {
            log.error('Design critique error', err);
            sendResponse({ type: MSG.CRITIQUE_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Persona Generation =====
      case MSG.GENERATE_PERSONAS:
        handleGeneratePersonas(payload as {
          scrapeResult?: FullScrapeResult;
          heatmapData?: HeatmapData[];
          projectContext?: ProjectContext;
        }).then(result => sendResponse({ type: MSG.PERSONAS_RESULT, payload: result }))
          .catch(err => {
            log.error('Persona generation error', err);
            sendResponse({ type: MSG.PERSONAS_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Copy Rewriting =====
      case MSG.REWRITE_COPY:
        handleRewriteCopy(payload as {
          scrapeResult?: FullScrapeResult;
          brandVoice?: string;
          industry?: string;
        }).then(result => sendResponse({ type: MSG.COPY_RESULT, payload: result }))
          .catch(err => {
            log.error('Copy rewrite error', err);
            sendResponse({ type: MSG.COPY_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== A/B Test Recommendations =====
      case MSG.GENERATE_AB_TESTS:
        handleGenerateABTests(payload as {
          scrapeResult?: FullScrapeResult;
          projectContext?: ProjectContext;
        }).then(result => sendResponse({ type: MSG.AB_TESTS_RESULT, payload: result }))
          .catch(err => {
            log.error('A/B test generation error', err);
            sendResponse({ type: MSG.AB_TESTS_RESULT, payload: { error: err.message } });
          });
        return true;

      // ===== Workflow Orchestration =====
      case MSG.WORKFLOW_START:
        orchestrator.startWorkflow(payload as WorkflowConfig)
          .then(session => sendResponse({ session }))
          .catch(err => {
            log.error('Workflow start error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_PAUSE:
        orchestrator.pauseWorkflow()
          .then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow pause error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_RESUME:
        orchestrator.resumeWorkflow()
          .then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow resume error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_ABORT:
        orchestrator.abortWorkflow()
          .then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow abort error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_PHASE_APPROVE:
        orchestrator.approvePhase(
          (payload as { phaseId: WorkflowPhaseId; notes?: string }).phaseId,
          (payload as { phaseId: WorkflowPhaseId; notes?: string }).notes,
        ).then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow phase approve error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_PHASE_REJECT:
        orchestrator.rerunPhase(
          (payload as { phaseId: WorkflowPhaseId }).phaseId,
        ).then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow phase reject error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_GATE_CHECK:
        sendResponse({ validation: orchestrator.validateGate() });
        return false;

      case MSG.WORKFLOW_ROLLBACK:
        orchestrator.rollbackToPhase(
          (payload as { phaseId: WorkflowPhaseId }).phaseId,
        ).then(result => sendResponse(result))
          .catch(err => {
            log.error('Workflow rollback error', err);
            sendResponse({ error: err.message });
          });
        return true;

      case MSG.WORKFLOW_STATE_SYNC:
        sendResponse({ session: orchestrator.getSession() });
        return false;

      default:
        log.warn('Unknown message type', { type });
        return false;
    }
  }
);

// ===== Handler implementations =====

async function handleChatSend(payload: {
  messages: ChatMessage[];
  context?: ProjectContext;
  sessionId: string;
}): Promise<{ started: boolean }> {
  log.info('Handling chat send', { sessionId: payload.sessionId, messageCount: payload.messages.length });

  // Fire and forget the streaming — chunks are broadcast via messages
  claudeClient.streamChat(payload).catch(err => {
    log.error('Stream chat failed', err);
    chrome.runtime.sendMessage({
      type: MSG.CHAT_ERROR,
      payload: { sessionId: payload.sessionId, error: err.message },
    }).catch(() => {});
  });

  return { started: true };
}

async function handleBraveSearch(payload: {
  query?: string;
  goal?: string;
  industry?: string;
  competitors?: string[];
  type?: 'search' | 'inspiration' | 'competitors';
}): Promise<unknown> {
  const searchType = payload.type || 'search';

  switch (searchType) {
    case 'inspiration':
      if (!payload.goal || !payload.industry) {
        throw new Error('Goal and industry are required for inspiration search');
      }
      return braveSearchClient.searchDesignInspiration(payload.goal, payload.industry);

    case 'competitors':
      if (!payload.competitors || payload.competitors.length === 0) {
        throw new Error('Competitors list is required for competitor search');
      }
      return braveSearchClient.searchCompetitors(payload.competitors);

    case 'search':
    default:
      if (!payload.query) {
        throw new Error('Query is required for search');
      }
      return braveSearchClient.search(payload.query);
  }
}

async function handleStartScrape(payload: ScrapeConfig): Promise<FullScrapeResult> {
  const config: ScrapeConfig = {
    ...payload,
    breakpoints: payload.breakpoints || [...BREAKPOINTS],
  };

  log.info('Starting scrape', { url: config.targetUrl, project: config.projectName });

  const result = await scrapeOrchestrator.startPipeline(config);
  latestScrapeResult = result;

  // Auto-run prompt chain after scrape completes
  try {
    log.info('Running prompt chain on scrape results');
    latestPromptChainResult = await claudeClient.runPromptChain(result, config.projectContext);
    log.info('Prompt chain complete');
  } catch (err) {
    log.error('Prompt chain failed (non-blocking)', err);
  }

  return result;
}

async function handleCaptureScreenshot(payload: { tabId: number; url: string }): Promise<unknown> {
  return screenshotManager.captureAllBreakpoints(payload.tabId, payload.url);
}

async function handleGenerateOutput(payload: {
  scrapeResult?: FullScrapeResult;
  projectName?: string;
}): Promise<unknown> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  const promptChainResult = latestPromptChainResult as {
    research: { patterns: string[]; suggestedUrls: string[]; insights: string[] };
    analysis: { tokenTaxonomy: Record<string, unknown>; componentTaxonomy: Record<string, unknown>; gaps: string[] };
    generation: { claudeMd: string; masterPrompt: string; analysisDocs: string[] };
  } || {
    research: { patterns: [], suggestedUrls: [], insights: [] },
    analysis: { tokenTaxonomy: {}, componentTaxonomy: {}, gaps: [] },
    generation: { claudeMd: '', masterPrompt: '', analysisDocs: [] },
  };

  // Broadcast progress
  chrome.runtime.sendMessage({
    type: MSG.OUTPUT_PROGRESS,
    payload: { message: 'Generating output files...' },
  }).catch(() => {});

  return fileOutputManager.generateFullOutput({
    scrapeResult,
    promptChainResult,
    projectName: payload.projectName || scrapeResult.projectName,
  });
}

async function handleSupabaseSync(payload: { scrapeResult?: FullScrapeResult }): Promise<unknown> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  chrome.runtime.sendMessage({
    type: MSG.SYNC_PROGRESS,
    payload: { message: 'Syncing to Supabase...' },
  }).catch(() => {});

  return supabaseSync.syncProject(scrapeResult);
}

async function handleFetchHeatmaps(payload: { url?: string }): Promise<unknown> {
  const results = [];

  // Try both Hotjar and FullStory in parallel
  const [hotjarResult, fullstoryResult] = await Promise.allSettled([
    hotjarClient.getHeatmaps(undefined, payload.url),
    fullstoryClient.getHeatmapData(undefined, payload.url),
  ]);

  if (hotjarResult.status === 'fulfilled' && hotjarResult.value) {
    results.push(...hotjarResult.value);
  }

  if (fullstoryResult.status === 'fulfilled' && fullstoryResult.value) {
    results.push(...fullstoryResult.value);
  }

  return results;
}

async function handleScoring(payload: {
  scrapeResult?: FullScrapeResult;
  projectContext?: ProjectContext;
}): Promise<unknown> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  const projectContext = payload.projectContext || scrapeResult.projectContext;

  return scoringEngine.scoreAll({
    scrapeResult,
    projectContext,
  });
}

async function handleFetchWayback(payload: { url: string; limit?: number }): Promise<unknown> {
  return waybackClient.fetchSnapshots(payload.url, payload.limit);
}

async function handleGetStatus(): Promise<unknown> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;

  return {
    hasClaudeKey: !!settings?.claudeApiKey,
    hasBraveKey: !!settings?.braveApiKey,
    hasSupabase: !!settings?.supabaseUrl && !!settings?.supabaseAnonKey,
    hasHotjar: !!settings?.hotjarApiKey && !!settings?.hotjarSiteId,
    hasFullStory: !!settings?.fullstoryApiKey && !!settings?.fullstoryOrgId,
    hasScrapeResult: !!latestScrapeResult,
    lastScrapeUrl: latestScrapeResult?.targetUrl || null,
    lastScrapeTimestamp: latestScrapeResult?.timestamp || null,
  };
}

async function handleGetSettings(): Promise<AppSettings> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;

  return settings || {
    claudeApiKey: '',
    braveApiKey: '',
    supabaseUrl: '',
    supabaseAnonKey: '',
    hotjarApiKey: '',
    hotjarSiteId: '',
    fullstoryApiKey: '',
    fullstoryOrgId: '',
    outputBasePath: '~/Desktop',
    scoringWeights: { ...DEFAULT_SCORING_WEIGHTS },
  };
}

async function handleSaveSettings(partialSettings: Partial<AppSettings>): Promise<{ success: boolean }> {
  const current = await handleGetSettings();
  const updated: AppSettings = { ...current, ...partialSettings };

  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  log.info('Settings saved');

  // Reset Supabase client if credentials changed
  if (partialSettings.supabaseUrl || partialSettings.supabaseAnonKey) {
    try {
      const { resetSupabaseClient } = await import('@shared/supabase-client');
      resetSupabaseClient();
    } catch {
      // May fail if module not loaded yet
    }
  }

  return { success: true };
}

// ===== New AI Intelligence Handlers =====

async function handleMultiSiteScrape(payload: {
  urls: string[];
  projectContext: ProjectContext;
  projectName: string;
  breakpoints?: number[];
}): Promise<MultiSiteResult> {
  log.info('Starting multi-site scrape', { urls: payload.urls, project: payload.projectName });

  const result = await multiSiteEngine.scrapeMultipleSites({
    urls: payload.urls,
    projectContext: payload.projectContext,
    projectName: payload.projectName,
    breakpoints: payload.breakpoints,
  });

  latestMultiSiteResult = result;

  // Store the best site's result as the latest scrape result
  if (result.sites.length > 0) {
    const bestSite = result.sites.reduce((best, current) =>
      current.quality.overallScore > best.quality.overallScore ? current : best
    );
    latestScrapeResult = bestSite.scrapeResult;
  }

  return result;
}

async function handleReconstructComponents(payload: {
  scrapeResult?: FullScrapeResult;
  componentNames?: string[];
}): Promise<ReconstructedComponent[]> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  let components = scrapeResult.components;

  // Filter to specific components if names are provided
  if (payload.componentNames && payload.componentNames.length > 0) {
    components = components.filter(c =>
      payload.componentNames!.includes(c.name) || payload.componentNames!.includes(c.type)
    );
  }

  if (components.length === 0) {
    throw new Error('No components found to reconstruct.');
  }

  log.info('Reconstructing components', { count: components.length });

  const result = await componentReconstructor.reconstructAll(
    components,
    scrapeResult.designTokens
  );

  latestReconstructedComponents = result;
  return result;
}

async function handleDesignCritique(payload: {
  scrapeResult?: FullScrapeResult;
  projectContext?: ProjectContext;
}): Promise<DesignCritique> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  log.info('Running design critique', { url: scrapeResult.targetUrl });

  const result = await designCritiqueEngine.critiqueDesign(
    scrapeResult,
    payload.projectContext
  );

  latestCritique = result;
  return result;
}

async function handleGeneratePersonas(payload: {
  scrapeResult?: FullScrapeResult;
  heatmapData?: HeatmapData[];
  projectContext?: ProjectContext;
}): Promise<GeneratedPersona[]> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  log.info('Generating personas', { url: scrapeResult.targetUrl });

  const result = await personaGenerator.generatePersonas(
    scrapeResult,
    payload.heatmapData,
    payload.projectContext
  );

  latestPersonas = result;
  return result;
}

async function handleRewriteCopy(payload: {
  scrapeResult?: FullScrapeResult;
  brandVoice?: string;
  industry?: string;
}): Promise<RewrittenCopy> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  const brandVoice = payload.brandVoice || scrapeResult.projectContext.designStyle || 'professional';
  const industry = payload.industry || scrapeResult.projectContext.industry;

  log.info('Rewriting copy', { url: scrapeResult.targetUrl, brandVoice, industry });

  const result = await copyRewriter.rewriteCopy(scrapeResult, brandVoice, industry);

  latestRewrittenCopy = result;
  return result;
}

async function handleGenerateABTests(payload: {
  scrapeResult?: FullScrapeResult;
  projectContext?: ProjectContext;
}): Promise<ABTestPlan> {
  const scrapeResult = payload.scrapeResult || latestScrapeResult;
  if (!scrapeResult) {
    throw new Error('No scrape result available. Run a scrape first.');
  }

  log.info('Generating A/B test plan', { url: scrapeResult.targetUrl });

  const result = await abTestEngine.generateTestPlan(
    scrapeResult,
    payload.projectContext
  );

  latestABTestPlan = result;
  return result;
}
