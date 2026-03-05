import type { ProjectContext, FullScrapeResult, GeneratedPersona, DesignCritique, ReconstructedComponent, ABTestPlan, MultiSiteResult, DesignSynthesis, FirecrawlStructuredUXData, WorkflowScreenshotSequence, ExaSearchResult, ScreenshotData } from './types';

// ===== Phase Identifiers =====
export type WorkflowPhaseId =
  | 'discover'
  | 'define'
  | 'gate'
  | 'diverge'
  | 'develop'
  | 'deliver'
  | 'measure';

// ===== Phase Status =====
export type PhaseStatus =
  | 'pending'      // Not yet started
  | 'active'       // Currently executing steps
  | 'reviewing'    // All steps complete, awaiting user review
  | 'approved'     // User has approved this phase's outputs
  | 'completed'    // Phase finalized and locked
  | 'failed'       // Unrecoverable error
  | 'skipped';     // User elected to skip

// ===== Phase Step =====
export interface PhaseStep {
  id: string;
  name: string;
  description: string;
  engineCall: string;          // Which engine method to invoke
  status: PhaseStatus;
  progress: number;            // 0-100
  startedAt?: number;
  completedAt?: number;
  error?: string;
  outputKey: string;           // Key to store result in PhaseArtifacts
}

// ===== Phase Artifacts =====
export interface PhaseArtifacts {
  [key: string]: unknown;
}

// ===== Spec-Driven Artifact Types =====
export interface SpecRequirements {
  userStories: Array<{ role: string; want: string; benefit: string; acceptanceCriteria: string[] }>;
  nonFunctional: { performance: string[]; security: string[]; reliability: string[]; usability: string[] };
  generatedAt: number;
}

export interface SpecDesign {
  architecture: string;
  components: Array<{ name: string; purpose: string; interfaces: string; dependencies: string[] }>;
  dataModels: string;
  errorHandling: Array<{ scenario: string; detection: string; handling: string; userImpact: string }>;
  testingStrategy: { unit: string[]; integration: string[]; e2e: string[] };
  generatedAt: number;
}

export interface SpecTasks {
  tasks: Array<{ id: string; title: string; files: string[]; description: string; requirements: string[]; estimatedMinutes: number }>;
  generatedAt: number;
}

export interface HandoffPackage {
  componentSpecs: Array<{ name: string; props: string; states: string; events: string; ariaAttributes: string; keyboardInteractions: string }>;
  accessibilityGuide: string;
  responsiveSpecs: string;
  tokenMapping: string;
  testingRequirements: string;
  performanceBudget: string;
  contentRequirements: string;
  generatedAt: number;
}

export interface InspirationAnalysis {
  visualThemes: string[];
  colorStrategy: string;
  typographyStrategy: string;
  layoutPatterns: string[];
  interactionPatterns: string[];
  componentPatterns: string[];
  accessibilityApproaches: string[];
  differentiationOpportunities: string[];
  generatedAt: number;
}

// ===== Discover Phase Outputs =====
export interface DiscoverArtifacts extends PhaseArtifacts {
  deepSearchResult?: { queries: string[]; results: Array<{ title: string; url: string; description: string }> };
  multiSiteResult?: MultiSiteResult;
  heatmapData?: unknown;
  trendData?: Array<{ title: string; url: string; description: string }>;
  enrichedKnowledge?: { bestPractices: string[]; patterns: string[] };
  researchSynthesis?: {
    keyFindings: string[];
    competitorLandscape: Array<{ url: string; strengths: string[]; weaknesses: string[] }>;
    designTrendInsights: string[];
    userBehaviorPatterns: string[];
    recommendations: string[];
  };
  inspirationAnalysis?: InspirationAnalysis;
  firecrawlExtract?: FirecrawlStructuredUXData;
  firecrawlScreenshots?: WorkflowScreenshotSequence;
  exaSimilarDesigns?: ExaSearchResult[];
  interactionStateScreenshots?: ScreenshotData[];
}

// ===== Define Phase Outputs =====
export interface DefineArtifacts extends PhaseArtifacts {
  personas?: GeneratedPersona[];
  journeyMaps?: Array<{
    personaName: string;
    phases: Array<{
      name: string;
      touchpoints: string[];
      thoughts: string[];
      emotions: string;
      painPoints: string[];
      opportunities: string[];
    }>;
  }>;
  designPrinciples?: Array<{ name: string; description: string; rationale: string }>;
  designBrief?: {
    projectName: string;
    goal: string;
    targetPersonas: string[];
    constraints: string[];
    successMetrics: string[];
    scope: string[];
    timeline: string;
    designDirection: string;
  };
  accessibilityRequirements?: {
    wcagLevel: 'A' | 'AA' | 'AAA';
    specificNeeds: string[];
    assistiveTechSupport: string[];
    colorBlindConsiderations: string[];
    motionSensitivity: string;
  };
  specRequirements?: SpecRequirements;
}

// ===== Gate Phase Outputs =====
export interface GateArtifacts extends PhaseArtifacts {
  reviewPackage?: {
    researchSummary: string;
    personaSummary: string;
    briefSummary: string;
    qualityChecks: Array<{ check: string; passed: boolean; details: string }>;
  };
  qualityValidation?: {
    readinessScore: number;    // 0-100
    missingElements: string[];
    warnings: string[];
    qualityScores: Record<string, number>;
  };
  gateDecision?: 'approved' | 'rejected' | 'revision-needed';
  gateNotes?: string;
}

// ===== Diverge Phase Outputs =====
export interface DesignDirection {
  name: string;
  description: string;
  moodKeywords: string[];
  colorDirection: { primary: string; secondary: string; accent: string; rationale: string };
  typographyDirection: { headingFont: string; bodyFont: string; rationale: string };
  layoutApproach: string;
  differentiator: string;
  riskAssessment: string;
  score?: number;
}

export interface DivergeArtifacts extends PhaseArtifacts {
  designDirections?: DesignDirection[];
  moodboards?: Array<{
    directionName: string;
    imagePrompts: string[];
    styleDescription: string;
    colorPalette: string[];
    referenceUrls: string[];
  }>;
  designCritique?: DesignCritique;
  competitivePositioning?: {
    marketGaps: string[];
    uniqueOpportunities: string[];
    riskAreas: string[];
    positioningStatement: string;
  };
  directionRankings?: Array<{ name: string; rank: number; score: number; rationale: string }>;
}

// ===== Develop Phase Outputs =====
export interface DevelopArtifacts extends PhaseArtifacts {
  reconstructedComponents?: ReconstructedComponent[];
  designSystem?: {
    colorPalette: Array<{ name: string; value: string; usage: string }>;
    typographyScale: Array<{ name: string; size: string; weight: string; lineHeight: string; usage: string }>;
    spacingScale: Array<{ name: string; value: string }>;
    shadowScale: Array<{ name: string; value: string }>;
    borderRadiusScale: Array<{ name: string; value: string }>;
    animationTokens: Array<{ name: string; duration: string; easing: string; usage: string }>;
  };
  rewrittenCopy?: {
    variants: Array<{ tone: string; ctas: string[]; headlines: string[]; microcopy: string[] }>;
    brandVoice: string;
    toneGuidelines: string;
  };
  storybookStories?: Array<{ componentName: string; storyCode: string }>;
  prototype?: string; // HTML string
  specDesign?: SpecDesign;
  specTasks?: SpecTasks;
  designReview?: DesignReviewResult;
}

// ===== Deliver Phase Outputs =====
export interface DeliverArtifacts extends PhaseArtifacts {
  claudeMd?: string;
  figmaTokens?: unknown;
  performanceBudget?: unknown;
  accessibilityReport?: string;
  handoffPackage?: HandoffPackage;
  finalDesignReview?: DesignReviewResult;
  outputManifest?: {
    totalFiles: number;
    outputPath: string;
    files: string[];
  };
  analysisDocs?: Record<string, string>;
}

// ===== Measure Phase Outputs =====
export interface MeasureArtifacts extends PhaseArtifacts {
  abTestPlan?: ABTestPlan;
  heatmapAnalysis?: {
    findings: string[];
    hotspots: string[];
    deadZones: string[];
    recommendations: string[];
  };
  performanceMonitoring?: {
    metricsToTrack: string[];
    toolSetup: string;
    alertThresholds: Record<string, number>;
    dashboardConfig: string;
  };
  iterationRoadmap?: Array<{
    priority: number;
    experiment: string;
    hypothesis: string;
    expectedImpact: string;
    complexity: 'low' | 'medium' | 'high';
    metrics: string[];
    duration: string;
  }>;
}

// ===== Design Review Outputs =====
export interface DesignReviewFinding {
  phase: string;
  severity: 'blocker' | 'high' | 'medium' | 'nitpick';
  title: string;
  description: string;
  impact: string;
  affectedComponents: string[];
}

export interface DesignReviewResult {
  overallScore: number;
  findings: DesignReviewFinding[];
  phaseScores: Record<string, number>;
  summary: string;
  strengths: string[];
  criticalIssues: string[];
  recommendations: string[];
  accessibilityScore: number;
  responsiveScore: number;
  visualPolishScore: number;
  interactionScore: number;
  reviewedAt: number;
}

// ===== Phase State =====
export interface PhaseState {
  id: WorkflowPhaseId;
  name: string;
  description: string;
  blackBox: 1 | 2 | 'gate' | 'measure';
  status: PhaseStatus;
  steps: PhaseStep[];
  artifacts: PhaseArtifacts;
  startedAt?: number;
  completedAt?: number;
  reviewNotes?: string;
}

// ===== Workflow Session =====
export interface WorkflowSession {
  id: string;
  projectName: string;
  projectContext: ProjectContext;
  targetUrls: string[];
  phases: Record<WorkflowPhaseId, PhaseState>;
  currentPhase: WorkflowPhaseId;
  createdAt: number;
  updatedAt: number;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  version: number;
}

// ===== Workflow Config =====
export interface WorkflowConfig {
  projectName: string;
  projectContext: ProjectContext;
  primaryUrl: string;
  competitorUrls: string[];
  skipPhases?: WorkflowPhaseId[];
  autoAdvance?: boolean;
}

// ===== Gate Validation =====
export interface GateValidation {
  canProceed: boolean;
  missingArtifacts: string[];
  warnings: string[];
  qualityScores: Record<string, number>;
  readinessScore: number;
}

// ===== Phase Executor Interface =====
export interface PhaseExecutor {
  execute(
    session: WorkflowSession,
    priorArtifacts: PhaseArtifacts,
    onStepProgress: (step: PhaseStep) => void,
  ): Promise<PhaseArtifacts>;
}

// ===== Workflow Progress Broadcast =====
export interface WorkflowProgressPayload {
  sessionId: string;
  phaseId: WorkflowPhaseId;
  stepId?: string;
  stepName?: string;
  progress: number;
  message: string;
}
