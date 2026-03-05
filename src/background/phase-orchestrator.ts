/**
 * Phase Orchestrator — Central Workflow State Machine
 *
 * Manages the entire Double Diamond workflow lifecycle:
 * - Session creation, persistence, and recovery
 * - Phase execution with step-level progress tracking
 * - Gate validation and user approval flow
 * - Artifact accumulation across phases
 * - Broadcasting state changes to the UI
 * - Service worker keep-alive via chrome.alarms
 */

import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import { WORKFLOW_PHASES, PHASE_ORDER, PHASE_STEPS, STORAGE_KEYS_WORKFLOW, WORKFLOW_TIMEOUTS } from '@shared/workflow-constants';
import type {
  WorkflowSession,
  WorkflowConfig,
  WorkflowPhaseId,
  PhaseState,
  PhaseStep,
  PhaseArtifacts,
  PhaseExecutor,
  GateValidation,
  WorkflowProgressPayload,
  PhaseStatus,
  DiscoverArtifacts,
  DefineArtifacts,
  GateArtifacts,
} from '@shared/workflow-types';

import type { ClaudeAPIClient } from './claude-api-client';
import type { BraveDeepSearchClient } from './brave-deep-search';
import type { ScrapeOrchestrator } from './scrape-orchestrator';
import type { MultiSiteEngine } from './multi-site-engine';
import type { PersonaGenerator } from './persona-generator';
import type { DesignCritiqueEngine } from './design-critique-engine';
import type { ComponentReconstructor } from './component-reconstructor';
import type { CopyRewriter } from './copy-rewriter';
import type { ABTestEngine } from './ab-test-engine';
import type { KnowledgeEnrichmentEngine } from './knowledge-enrichment';
import type { FileOutputManager } from './file-output-manager';
import type { ScoringEngine } from './scoring-engine';
import type { FirecrawlClient } from './firecrawl-client';
import type { ExaMCPClient } from './exa-mcp-client';
import type { MCPOrchestrator } from './mcp-orchestrator';
import { DiscoverPhaseExecutor } from './phases/discover-phase';
import { DefinePhaseExecutor } from './phases/define-phase';
import { GatePhaseExecutor } from './phases/gate-phase';
import { DivergePhaseExecutor } from './phases/diverge-phase';
import { DevelopPhaseExecutor } from './phases/develop-phase';
import { DeliverPhaseExecutor } from './phases/deliver-phase';
import { MeasurePhaseExecutor } from './phases/measure-phase';

const log = createLogger('PhaseOrch');

const KEEPALIVE_ALARM = 'workflow-keepalive';
const KEEPALIVE_INTERVAL_MINUTES = 0.4; // ~24 seconds to stay under 30s idle limit

export interface PhaseOrchestratorEngines {
  claudeClient: ClaudeAPIClient;
  braveDeepSearch: BraveDeepSearchClient;
  scrapeOrchestrator: ScrapeOrchestrator;
  multiSiteEngine: MultiSiteEngine;
  personaGenerator: PersonaGenerator;
  designCritiqueEngine: DesignCritiqueEngine;
  componentReconstructor: ComponentReconstructor;
  copyRewriter: CopyRewriter;
  abTestEngine: ABTestEngine;
  knowledgeEnrichment: KnowledgeEnrichmentEngine;
  fileOutputManager: FileOutputManager;
  scoringEngine: ScoringEngine;
  firecrawlClient?: FirecrawlClient;
  exaClient?: ExaMCPClient;
  mcpOrchestrator?: MCPOrchestrator;
}

export class PhaseOrchestrator {
  private session: WorkflowSession | null = null;
  private engines: PhaseOrchestratorEngines;
  private executors: Map<WorkflowPhaseId, PhaseExecutor> = new Map();
  private isExecuting: boolean = false;
  private abortController: AbortController | null = null;

  constructor(engines: PhaseOrchestratorEngines) {
    this.engines = engines;

    // Listen for keepalive alarm to prevent service worker termination
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === KEEPALIVE_ALARM) {
        log.debug('Keepalive ping', { sessionActive: !!this.session });
      }
    });
  }

  // ===================================================================
  // Session Lifecycle
  // ===================================================================

  async startWorkflow(config: WorkflowConfig): Promise<WorkflowSession> {
    if (this.session && this.session.status === 'active') {
      throw new Error('A workflow session is already active. Abort or complete it before starting a new one.');
    }

    const sessionId = crypto.randomUUID();
    const now = Date.now();

    // Build initial phase states from constants
    const phases: Record<WorkflowPhaseId, PhaseState> = {} as Record<WorkflowPhaseId, PhaseState>;
    for (const phaseId of PHASE_ORDER) {
      const phaseDef = WORKFLOW_PHASES[phaseId];
      const stepDefs = PHASE_STEPS[phaseId];
      const isSkipped = config.skipPhases?.includes(phaseId) ?? false;

      phases[phaseId] = {
        id: phaseDef.id,
        name: phaseDef.name,
        description: phaseDef.description,
        blackBox: phaseDef.blackBox,
        status: isSkipped ? 'skipped' : 'pending',
        steps: stepDefs.map((sd) => ({
          id: sd.id,
          name: sd.name,
          description: sd.description,
          engineCall: sd.engineCall,
          status: isSkipped ? 'skipped' : 'pending' as PhaseStatus,
          progress: 0,
          outputKey: sd.outputKey,
        })),
        artifacts: {},
      };
    }

    this.session = {
      id: sessionId,
      projectName: config.projectName,
      projectContext: config.projectContext,
      targetUrls: [config.primaryUrl, ...config.competitorUrls],
      phases,
      currentPhase: this.findFirstActivePhase(phases),
      createdAt: now,
      updatedAt: now,
      status: 'active',
      version: 1,
    };

    await this.persistSession();
    this.startKeepalive();
    this.broadcastState();

    log.info('Workflow started', { sessionId, projectName: config.projectName });

    // Begin execution asynchronously so startWorkflow returns immediately
    this.executeFromCurrentPhase(config.autoAdvance ?? false).catch((err) => {
      log.error('Workflow execution error', err);
    });

    return this.session;
  }

  async pauseWorkflow(): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    this.session.status = 'paused';
    this.session.updatedAt = Date.now();
    this.isExecuting = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.stopKeepalive();
    await this.persistSession();
    this.broadcastState();

    log.info('Workflow paused', { sessionId: this.session.id });
    return { success: true };
  }

  async resumeWorkflow(): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    if (this.session.status !== 'paused') {
      throw new Error(`Cannot resume: session is ${this.session.status}`);
    }

    this.session.status = 'active';
    this.session.updatedAt = Date.now();

    this.startKeepalive();
    await this.persistSession();
    this.broadcastState();

    log.info('Workflow resumed', { sessionId: this.session.id, currentPhase: this.session.currentPhase });

    // Resume execution from the current phase
    this.executeFromCurrentPhase(false).catch((err) => {
      log.error('Resume execution error', err);
    });

    return { success: true };
  }

  async abortWorkflow(): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    this.session.status = 'abandoned';
    this.session.updatedAt = Date.now();
    this.isExecuting = false;

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    this.stopKeepalive();
    await this.persistSession();
    this.broadcastState();

    log.info('Workflow aborted', { sessionId: this.session.id });
    return { success: true };
  }

  // ===================================================================
  // Phase Control (user-facing)
  // ===================================================================

  async approvePhase(phaseId: WorkflowPhaseId, notes?: string): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    const phase = this.session.phases[phaseId];
    if (phase.status !== 'reviewing') {
      throw new Error(`Cannot approve phase "${phaseId}": status is "${phase.status}", expected "reviewing"`);
    }

    phase.status = 'completed';
    phase.completedAt = Date.now();
    phase.reviewNotes = notes;
    this.session.updatedAt = Date.now();

    await this.persistSession();

    this.broadcast({
      type: MSG.WORKFLOW_PHASE_COMPLETE,
      payload: { sessionId: this.session.id, phaseId },
    });

    this.broadcastState();

    log.info('Phase approved', { phaseId, notes });

    // Advance to next phase
    await this.advanceToNextPhase();
    return { success: true };
  }

  async rerunPhase(phaseId: WorkflowPhaseId): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    const phase = this.session.phases[phaseId];

    // Clear artifacts and reset all steps
    phase.artifacts = {};
    phase.status = 'pending';
    phase.startedAt = undefined;
    phase.completedAt = undefined;
    phase.reviewNotes = undefined;

    for (const step of phase.steps) {
      step.status = 'pending';
      step.progress = 0;
      step.startedAt = undefined;
      step.completedAt = undefined;
      step.error = undefined;
    }

    this.session.currentPhase = phaseId;
    this.session.updatedAt = Date.now();

    await this.persistSession();
    this.broadcastState();

    log.info('Phase reset for rerun', { phaseId });

    // Re-execute from this phase
    this.executeFromCurrentPhase(false).catch((err) => {
      log.error('Rerun execution error', err);
    });

    return { success: true };
  }

  async rollbackToPhase(phaseId: WorkflowPhaseId): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    const targetIndex = PHASE_ORDER.indexOf(phaseId);
    if (targetIndex === -1) {
      throw new Error(`Unknown phase: ${phaseId}`);
    }

    // Clear all phases after the target (inclusive if not completed)
    for (let i = targetIndex; i < PHASE_ORDER.length; i++) {
      const pid = PHASE_ORDER[i];
      const phase = this.session.phases[pid];

      if (phase.status === 'skipped') continue;

      phase.artifacts = {};
      phase.status = 'pending';
      phase.startedAt = undefined;
      phase.completedAt = undefined;
      phase.reviewNotes = undefined;

      for (const step of phase.steps) {
        step.status = 'pending';
        step.progress = 0;
        step.startedAt = undefined;
        step.completedAt = undefined;
        step.error = undefined;
      }
    }

    this.session.currentPhase = phaseId;
    this.session.updatedAt = Date.now();

    await this.persistSession();
    this.broadcastState();

    log.info('Rolled back to phase', { phaseId });
    return { success: true };
  }

  async approveGate(notes?: string): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    const gatePhase = this.session.phases.gate;
    if (gatePhase.status !== 'reviewing') {
      throw new Error(`Gate is not in reviewing state (current: ${gatePhase.status})`);
    }

    (gatePhase.artifacts as GateArtifacts).gateDecision = 'approved';
    (gatePhase.artifacts as GateArtifacts).gateNotes = notes;

    return this.approvePhase('gate', notes);
  }

  async rejectGate(notes: string): Promise<{ success: boolean }> {
    if (!this.session) {
      throw new Error('No active workflow session');
    }

    const gatePhase = this.session.phases.gate;
    (gatePhase.artifacts as GateArtifacts).gateDecision = 'rejected';
    (gatePhase.artifacts as GateArtifacts).gateNotes = notes;

    gatePhase.status = 'completed';
    gatePhase.completedAt = Date.now();
    this.session.updatedAt = Date.now();

    await this.persistSession();
    this.broadcastState();

    log.info('Gate rejected, rolling back to define', { notes });

    // Roll back to define phase
    return this.rollbackToPhase('define');
  }

  // ===================================================================
  // Artifact Management
  // ===================================================================

  getAllArtifactsUpTo(phaseId: WorkflowPhaseId): PhaseArtifacts {
    if (!this.session) return {};

    const merged: PhaseArtifacts = {};
    const targetIndex = PHASE_ORDER.indexOf(phaseId);

    for (let i = 0; i <= targetIndex; i++) {
      const pid = PHASE_ORDER[i];
      const phase = this.session.phases[pid];
      Object.assign(merged, phase.artifacts);
    }

    return merged;
  }

  getPhaseArtifacts(phaseId: WorkflowPhaseId): PhaseArtifacts {
    if (!this.session) return {};
    return { ...this.session.phases[phaseId].artifacts };
  }

  // ===================================================================
  // Gate Validation
  // ===================================================================

  validateGate(): GateValidation {
    if (!this.session) {
      return { canProceed: false, missingArtifacts: ['No active session'], warnings: [], qualityScores: {}, readinessScore: 0 };
    }

    const discoverArtifacts = this.session.phases.discover.artifacts as DiscoverArtifacts;
    const defineArtifacts = this.session.phases.define.artifacts as DefineArtifacts;

    const missingArtifacts: string[] = [];
    const warnings: string[] = [];
    const qualityScores: Record<string, number> = {};

    // Check discover phase required artifacts
    if (!discoverArtifacts.multiSiteResult) {
      missingArtifacts.push('multiSiteResult');
    } else {
      qualityScores['multiSiteScrape'] = 100;
    }

    if (!discoverArtifacts.deepSearchResult) {
      missingArtifacts.push('deepSearchResult');
    } else {
      const resultCount = discoverArtifacts.deepSearchResult.results?.length ?? 0;
      qualityScores['deepSearch'] = Math.min(100, resultCount * 10);
    }

    if (!discoverArtifacts.researchSynthesis) {
      missingArtifacts.push('researchSynthesis');
    } else {
      const findingsCount = discoverArtifacts.researchSynthesis.keyFindings?.length ?? 0;
      qualityScores['researchSynthesis'] = Math.min(100, findingsCount * 20);
    }

    if (!discoverArtifacts.enrichedKnowledge) {
      warnings.push('Knowledge enrichment not completed - results may be less informed');
    } else {
      qualityScores['knowledgeEnrichment'] = 100;
    }

    if (!discoverArtifacts.heatmapData) {
      warnings.push('No heatmap data available - behavioral insights will be limited');
    }

    if (!discoverArtifacts.trendData) {
      warnings.push('No trend data available');
    }

    // Check define phase required artifacts
    if (!defineArtifacts.personas || defineArtifacts.personas.length === 0) {
      missingArtifacts.push('personas');
    } else {
      qualityScores['personas'] = Math.min(100, defineArtifacts.personas.length * 25);
    }

    if (!defineArtifacts.designBrief) {
      missingArtifacts.push('designBrief');
    } else {
      qualityScores['designBrief'] = 100;
    }

    if (!defineArtifacts.designPrinciples || defineArtifacts.designPrinciples.length === 0) {
      missingArtifacts.push('designPrinciples');
    } else {
      qualityScores['designPrinciples'] = Math.min(100, defineArtifacts.designPrinciples.length * 20);
    }

    if (!defineArtifacts.journeyMaps || defineArtifacts.journeyMaps.length === 0) {
      warnings.push('No journey maps created');
    } else {
      qualityScores['journeyMaps'] = Math.min(100, defineArtifacts.journeyMaps.length * 25);
    }

    if (!defineArtifacts.accessibilityRequirements) {
      warnings.push('No accessibility requirements defined');
    } else {
      qualityScores['accessibilityRequirements'] = 100;
    }

    // Compute readiness score
    const scoreValues = Object.values(qualityScores);
    const readinessScore = scoreValues.length > 0
      ? Math.round(scoreValues.reduce((sum, v) => sum + v, 0) / scoreValues.length)
      : 0;

    const canProceed = missingArtifacts.length === 0 && readinessScore >= 50;

    return { canProceed, missingArtifacts, warnings, qualityScores, readinessScore };
  }

  // ===================================================================
  // Persistence
  // ===================================================================

  async persistSession(): Promise<void> {
    if (!this.session) return;

    try {
      await chrome.storage.local.set({
        [STORAGE_KEYS_WORKFLOW.WORKFLOW_SESSION]: JSON.parse(JSON.stringify(this.session)),
      });
      log.debug('Session persisted', { version: this.session.version });
    } catch (err) {
      log.error('Failed to persist session', err);
    }
  }

  async restoreSession(): Promise<WorkflowSession | null> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS_WORKFLOW.WORKFLOW_SESSION);
      const data = stored[STORAGE_KEYS_WORKFLOW.WORKFLOW_SESSION] as WorkflowSession | undefined;

      if (!data) {
        log.info('No persisted workflow session found');
        return null;
      }

      // If session was active when service worker died, mark it as paused so user can resume
      if (data.status === 'active') {
        data.status = 'paused';
        log.info('Restored active session as paused after service worker restart', { sessionId: data.id });
      }

      this.session = data;
      this.broadcastState();

      log.info('Session restored', {
        sessionId: data.id,
        status: data.status,
        currentPhase: data.currentPhase,
        version: data.version,
      });

      return this.session;
    } catch (err) {
      log.error('Failed to restore session', err);
      return null;
    }
  }

  // ===================================================================
  // Public getters
  // ===================================================================

  getSession(): WorkflowSession | null {
    return this.session ? { ...this.session } : null;
  }

  // ===================================================================
  // Private: Phase Execution
  // ===================================================================

  private async executeFromCurrentPhase(autoAdvance: boolean): Promise<void> {
    if (!this.session || this.session.status !== 'active') return;
    if (this.isExecuting) {
      log.warn('Already executing, skipping duplicate call');
      return;
    }

    this.isExecuting = true;
    this.abortController = new AbortController();

    try {
      let currentPhaseId = this.session.currentPhase;

      while (currentPhaseId && this.session.status === 'active') {
        const phase = this.session.phases[currentPhaseId];

        // Skip already completed or skipped phases
        if (phase.status === 'completed' || phase.status === 'skipped') {
          const next = this.getNextPhaseId(currentPhaseId);
          if (!next) break;
          currentPhaseId = next;
          this.session.currentPhase = currentPhaseId;
          await this.persistSession();
          continue;
        }

        // Execute the phase
        await this.executePhase(currentPhaseId);

        // Check if aborted or paused during execution
        if (this.session.status !== 'active') break;

        const phaseAfter = this.session.phases[currentPhaseId];

        // Gate phase: always stop and wait for user approval
        if (currentPhaseId === 'gate') {
          if (phaseAfter.status === 'reviewing') {
            log.info('Gate phase reviewing - awaiting user decision');
            break;
          }
        }

        // Non-gate phases: set to reviewing
        if (phaseAfter.status === 'reviewing') {
          if (autoAdvance && currentPhaseId !== 'gate') {
            // Auto-approve and continue
            phaseAfter.status = 'completed';
            phaseAfter.completedAt = Date.now();
            this.session.updatedAt = Date.now();
            await this.persistSession();

            this.broadcast({
              type: MSG.WORKFLOW_PHASE_COMPLETE,
              payload: { sessionId: this.session.id, phaseId: currentPhaseId },
            });

            const next = this.getNextPhaseId(currentPhaseId);
            if (!next) {
              this.completeWorkflow();
              break;
            }
            currentPhaseId = next;
            this.session.currentPhase = currentPhaseId;
            await this.persistSession();
            this.broadcastState();
          } else {
            // Wait for manual approval
            log.info('Phase reviewing - awaiting user approval', { phaseId: currentPhaseId });
            break;
          }
        } else if (phaseAfter.status === 'failed') {
          log.error('Phase failed, stopping execution', { phaseId: currentPhaseId });
          break;
        }
      }
    } finally {
      this.isExecuting = false;
      this.abortController = null;
    }
  }

  private async executePhase(phaseId: WorkflowPhaseId): Promise<void> {
    if (!this.session) return;

    const phase = this.session.phases[phaseId];
    phase.status = 'active';
    phase.startedAt = Date.now();
    this.session.updatedAt = Date.now();
    this.session.version++;

    await this.persistSession();

    this.broadcast({
      type: MSG.WORKFLOW_PHASE_START,
      payload: { sessionId: this.session.id, phaseId, phaseName: phase.name },
    });

    this.broadcastState();

    log.info('Executing phase', { phaseId, phaseName: phase.name });

    // Get cumulative artifacts from prior phases
    const phaseIndex = PHASE_ORDER.indexOf(phaseId);
    const priorArtifacts = phaseIndex > 0
      ? this.getAllArtifactsUpTo(PHASE_ORDER[phaseIndex - 1])
      : {};

    // Get executor for this phase and delegate
    const executor = this.getPhaseExecutor(phaseId);

    const onStepProgress = (step: PhaseStep) => {
      if (!this.session) return;
      // Sync executor's step state back to session
      const sessionStep = phase.steps.find(s => s.id === step.id);
      if (sessionStep) {
        sessionStep.status = step.status;
        sessionStep.progress = step.progress;
        sessionStep.startedAt = step.startedAt;
        sessionStep.completedAt = step.completedAt;
        sessionStep.error = step.error;
      }

      if (step.status === 'active') {
        this.broadcast({
          type: MSG.WORKFLOW_PHASE_STEP_START,
          payload: { sessionId: this.session.id, phaseId, stepId: step.id, stepName: step.name },
        });
      } else if (step.status === 'completed') {
        this.broadcast({
          type: MSG.WORKFLOW_PHASE_STEP_COMPLETE,
          payload: { sessionId: this.session.id, phaseId, stepId: step.id, stepName: step.name },
        });
        log.info('Step completed', { phaseId, stepId: step.id });
      } else if (step.status === 'failed') {
        this.broadcast({
          type: MSG.WORKFLOW_PHASE_STEP_ERROR,
          payload: { sessionId: this.session.id, phaseId, stepId: step.id, stepName: step.name, error: step.error },
        });
        log.error('Step failed', { phaseId, stepId: step.id, error: step.error });
      }

      this.broadcastPhaseProgress(phaseId, step);
      this.session.updatedAt = Date.now();
      this.persistSession().catch(err => log.error('Persist error', err));
    };

    try {
      const resultArtifacts = await executor.execute(this.session, priorArtifacts, onStepProgress);

      // Merge executor results into phase artifacts
      for (const [key, value] of Object.entries(resultArtifacts)) {
        if (value !== undefined && value !== null) {
          phase.artifacts[key] = value;
        }
      }

      // Determine outcome
      const hasAnySuccess = phase.steps.some(s => s.status === 'completed');
      if (hasAnySuccess) {
        phase.status = 'reviewing';
        this.broadcast({
          type: MSG.WORKFLOW_PHASE_REVIEWING,
          payload: { sessionId: this.session.id, phaseId, phaseName: phase.name },
        });
      } else {
        phase.status = 'failed';
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error('Phase execution error', { phaseId, error: errorMessage });
      phase.status = 'failed';
    }

    this.session.updatedAt = Date.now();
    await this.persistSession();
    this.broadcastState();
  }

  private getPhaseExecutor(phaseId: WorkflowPhaseId): PhaseExecutor {
    const e = this.engines;
    switch (phaseId) {
      case 'discover':
        return new DiscoverPhaseExecutor(e.braveDeepSearch, e.multiSiteEngine, e.claudeClient, e.knowledgeEnrichment, e.firecrawlClient, e.exaClient, e.mcpOrchestrator);
      case 'define':
        return new DefinePhaseExecutor(e.personaGenerator, e.claudeClient);
      case 'gate':
        return new GatePhaseExecutor(e.claudeClient);
      case 'diverge':
        return new DivergePhaseExecutor(e.designCritiqueEngine, e.claudeClient, e.braveDeepSearch);
      case 'develop':
        return new DevelopPhaseExecutor(e.componentReconstructor, e.copyRewriter, e.claudeClient);
      case 'deliver':
        return new DeliverPhaseExecutor(e.claudeClient, e.fileOutputManager);
      case 'measure':
        return new MeasurePhaseExecutor(e.abTestEngine, e.claudeClient);
      default:
        throw new Error(`No executor for phase: ${phaseId}`);
    }
  }

  private async advanceToNextPhase(): Promise<void> {
    if (!this.session) return;

    const next = this.getNextPhaseId(this.session.currentPhase);

    if (!next) {
      this.completeWorkflow();
      return;
    }

    this.session.currentPhase = next;
    this.session.updatedAt = Date.now();
    await this.persistSession();
    this.broadcastState();

    log.info('Advanced to next phase', { phaseId: next });

    // Continue execution
    this.executeFromCurrentPhase(false).catch((err) => {
      log.error('Advance execution error', err);
    });
  }

  private completeWorkflow(): void {
    if (!this.session) return;

    this.session.status = 'completed';
    this.session.updatedAt = Date.now();
    this.stopKeepalive();

    this.persistSession().catch((err) => log.error('Failed to persist completed session', err));

    this.broadcast({
      type: MSG.WORKFLOW_COMPLETE,
      payload: { sessionId: this.session.id, projectName: this.session.projectName },
    });

    this.broadcastState();
    log.info('Workflow completed', { sessionId: this.session.id });
  }

  // ===================================================================
  // Private: Helpers
  // ===================================================================

  private findFirstActivePhase(phases: Record<WorkflowPhaseId, PhaseState>): WorkflowPhaseId {
    for (const phaseId of PHASE_ORDER) {
      if (phases[phaseId].status !== 'skipped') {
        return phaseId;
      }
    }
    return 'discover';
  }

  private getNextPhaseId(current: WorkflowPhaseId): WorkflowPhaseId | null {
    if (!this.session) return null;

    const currentIndex = PHASE_ORDER.indexOf(current);
    for (let i = currentIndex + 1; i < PHASE_ORDER.length; i++) {
      const nextId = PHASE_ORDER[i];
      if (this.session.phases[nextId].status !== 'skipped') {
        return nextId;
      }
    }
    return null;
  }

  // ===================================================================
  // Private: Broadcasting
  // ===================================================================

  broadcastState(): void {
    if (!this.session) return;

    this.broadcast({
      type: MSG.WORKFLOW_STATE_SYNC,
      payload: { session: JSON.parse(JSON.stringify(this.session)) },
    });
  }

  private broadcastPhaseProgress(phaseId: WorkflowPhaseId, step: PhaseStep): void {
    if (!this.session) return;

    const phase = this.session.phases[phaseId];
    const completedSteps = phase.steps.filter(s => s.status === 'completed' || s.status === 'failed').length;
    const totalSteps = phase.steps.length;
    const overallProgress = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

    const payload: WorkflowProgressPayload = {
      sessionId: this.session.id,
      phaseId,
      stepId: step.id,
      stepName: step.name,
      progress: overallProgress,
      message: `${phase.name}: ${step.name} (${completedSteps}/${totalSteps})`,
    };

    this.broadcast({
      type: MSG.WORKFLOW_PHASE_STEP_PROGRESS,
      payload,
    });
  }

  private broadcast(msg: { type: string; payload: unknown }): void {
    chrome.runtime.sendMessage(msg).catch(() => {
      // Side panel may not be open — suppress error
    });
  }

  // ===================================================================
  // Private: Keep-alive
  // ===================================================================

  private startKeepalive(): void {
    chrome.alarms.create(KEEPALIVE_ALARM, { periodInMinutes: KEEPALIVE_INTERVAL_MINUTES });
    log.debug('Keepalive alarm started');
  }

  private stopKeepalive(): void {
    chrome.alarms.clear(KEEPALIVE_ALARM).catch(() => {});
    log.debug('Keepalive alarm stopped');
  }
}
