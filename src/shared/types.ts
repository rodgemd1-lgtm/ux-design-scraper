// ===== Settings =====
export interface AppSettings {
  claudeApiKey: string;
  braveApiKey: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  hotjarApiKey: string;
  hotjarSiteId: string;
  fullstoryApiKey: string;
  fullstoryOrgId: string;
  outputBasePath: string; // default: ~/Desktop
  scoringWeights: ScoringWeights;
}

export interface ScoringWeights {
  industryFit: number;
  audienceAlignment: number;
  conversionOptimization: number;
  accessibilityCompliance: number;
  performance: number;
  designTrend: number;
}

// ===== Chat =====
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    braveResults?: BraveSearchResult[];
    suggestedUrls?: string[];
    scrapeAction?: string;
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  projectId?: string;
  createdAt: number;
}

// ===== Brave Search =====
export interface BraveSearchResult {
  title: string;
  url: string;
  description: string;
  thumbnail?: string;
  age?: string;
}

export interface BraveSearchResponse {
  query: string;
  results: BraveSearchResult[];
  totalResults: number;
}

// ===== Scrape Pipeline =====
export type ScrapeStepType = 'content-script' | 'cdp' | 'api' | 'background';
export type ScrapeStepStatus = 'pending' | 'running' | 'complete' | 'error' | 'skipped';

export interface ScrapeStep {
  id: string;
  name: string;
  type: ScrapeStepType;
  module: string;
  dependsOn?: string[];
  timeout: number;
}

export interface ScrapeStepResult {
  stepId: string;
  status: ScrapeStepStatus;
  data?: unknown;
  error?: string;
  duration: number;
}

export interface ScrapeConfig {
  targetUrl: string;
  projectName: string;
  projectContext: ProjectContext;
  enabledSteps?: string[]; // if empty, run all
  breakpoints: number[];
}

export interface ProjectContext {
  goal: string;
  industry: string;
  targetAudience: string;
  designStyle: string; // 'luxury', 'minimal', 'playful', etc.
  competitors?: string[];
  specificComponents?: string[];
}

// ===== Extractor Results =====
export interface ExtractorResult<T> {
  success: boolean;
  data: T;
  errors: string[];
  duration: number;
}

export interface DesignTokens {
  colors: TokenEntry[];
  spacing: TokenEntry[];
  shadows: TokenEntry[];
  borderRadii: TokenEntry[];
  zIndices: { value: number; element: string }[];
  opacities: { value: number; context: string }[];
}

export interface TokenEntry {
  value: string;
  count: number;
  contexts: string[];
  property?: string;
}

export interface TypographySystem {
  fontFamilies: { family: string; count: number; usage: string[] }[];
  fontWeights: { weight: string; count: number }[];
  fontSizes: { size: string; count: number; element: string }[];
  lineHeights: { value: string; count: number }[];
  letterSpacings: { value: string; count: number }[];
}

export interface IconData {
  svg: string;
  viewBox: string;
  category: string;
  size: { width: number; height: number };
  source: string; // selector or URL
}

export interface GridLayout {
  containerMaxWidth: string;
  columns: number;
  gutterWidth: string;
  layoutType: 'grid' | 'flexbox' | 'mixed';
  breakpointBehaviors: { breakpoint: number; columns: number; layout: string }[];
}

export interface NavigationStructure {
  primaryNav: NavItem[];
  footerNav: NavItem[];
  breadcrumbs: string[][];
  menuDepth: number;
  totalPages: number;
  sitemapTree: NavItem;
}

export interface NavItem {
  label: string;
  href: string;
  children: NavItem[];
  level: number;
}

export interface CopyAnalysis {
  ctaLabels: { text: string; element: string; count: number }[];
  errorMessages: string[];
  placeholders: { text: string; field: string }[];
  tooltips: string[];
  emptyStateText: string[];
  microcopy: { text: string; context: string }[];
  toneKeywords: string[];
}

export interface AccessibilityAudit {
  contrastIssues: { foreground: string; background: string; ratio: number; element: string; level: string }[];
  missingAltText: { element: string; src: string }[];
  missingAriaLabels: string[];
  tabOrderIssues: string[];
  semanticIssues: string[];
  focusIndicatorsMissing: string[];
  overallScore: number;
  wcagLevel: 'A' | 'AA' | 'AAA' | 'FAIL';
}

export interface ThirdPartyStack {
  analytics: DetectedTool[];
  cms: DetectedTool[];
  auth: DetectedTool[];
  payment: DetectedTool[];
  chat: DetectedTool[];
  cdns: DetectedTool[];
  frameworks: DetectedTool[];
  abTesting: DetectedTool[];
}

export interface DetectedTool {
  name: string;
  confidence: number; // 0-1
  signals: string[];
}

export interface DarkModeData {
  hasDarkMode: boolean;
  method: 'media-query' | 'css-variables' | 'class-toggle' | 'none';
  darkColors: TokenEntry[];
  toggleSelector?: string;
}

export interface ImageAssetData {
  images: {
    src: string;
    alt: string;
    format: string;
    width: number;
    height: number;
    lazyLoaded: boolean;
    srcset?: string;
    cdnDomain?: string;
    aspectRatio: string;
  }[];
  totalSize: number;
  formatDistribution: Record<string, number>;
  lazyLoadPercentage: number;
}

export interface ConversionPatterns {
  ctas: { text: string; position: string; size: string; color: string; prominence: number }[];
  socialProof: { type: string; content: string; position: string }[];
  formFields: { label: string; type: string; required: boolean }[];
  urgencyPatterns: { type: string; content: string }[];
  trustBadges: string[];
}

export interface ComponentData {
  name: string;
  selector: string;
  html: string;
  css: string;
  type: string; // 'button', 'card', 'form', 'nav', 'modal', 'hero', etc.
  stateVariants: Record<string, Record<string, string>>;
  screenshot?: string; // base64
}

export interface AnimationData {
  cssTransitions: { property: string; duration: string; easing: string; selector: string }[];
  cssAnimations: { name: string; duration: string; easing: string; keyframes: string; selector: string }[];
  scrollTriggered: { selector: string; triggerType: string; animation: string }[];
}

export interface ScrollBehavior {
  stickyElements: { selector: string; position: string }[];
  parallaxLayers: { selector: string; speed: number }[];
  scrollAnimations: { selector: string; type: string; trigger: string }[];
  pageTransitions: string[];
}

export interface FlowAnalysis {
  stepsToConversion: number;
  formFieldCount: number;
  decisionsPerScreen: number[];
  estimatedCognitiveLoad: number; // 0-100
  frictionPoints: { step: number; description: string; severity: number }[];
}

export interface ScreenshotData {
  breakpoint: number;
  dataUrl: string;
  width: number;
  height: number;
  timestamp: number;
}

export interface LighthouseData {
  performanceScore: number;
  accessibilityScore: number;
  lcp: number;
  cls: number;
  inp: number;
  fcp: number;
  speedIndex: number;
  totalBlockingTime: number;
}

export interface WaybackSnapshot {
  timestamp: string;
  url: string;
  waybackUrl: string;
  thumbnail?: string;
  keyChanges?: string[];
}

export interface HeatmapData {
  type: 'click' | 'scroll' | 'attention' | 'movement';
  source: 'hotjar_api' | 'fullstory_api' | 'dom_scrape';
  pageUrl: string;
  data: unknown; // varies by source
  imageDataUrl?: string;
}

// ===== Full Scrape Result =====
export interface FullScrapeResult {
  projectName: string;
  targetUrl: string;
  projectContext: ProjectContext;
  timestamp: number;
  designTokens: DesignTokens;
  typography: TypographySystem;
  icons: IconData[];
  gridLayout: GridLayout;
  navigation: NavigationStructure;
  copyAnalysis: CopyAnalysis;
  accessibility: AccessibilityAudit;
  thirdPartyStack: ThirdPartyStack;
  darkMode: DarkModeData;
  imageAssets: ImageAssetData;
  conversionPatterns: ConversionPatterns;
  components: ComponentData[];
  animations: AnimationData;
  scrollBehavior: ScrollBehavior;
  flowAnalysis: FlowAnalysis;
  screenshots: ScreenshotData[];
  lighthouse: LighthouseData;
  waybackSnapshots: WaybackSnapshot[];
  heatmaps: HeatmapData[];
  seo: SEOData;
  colorIntelligence: ColorIntelligence;
  whitespace: WhitespaceAnalysis;
  interactionPatterns: InteractionPatterns;
  motionCapture: MotionCaptureData;
}

// ===== Scoring =====
export interface ComponentScore {
  componentName: string;
  industryFit: number;
  audienceAlignment: number;
  conversionOptimization: number;
  accessibilityCompliance: number;
  performance: number;
  designTrend: number;
  composite: number;
}

// ===== Output Generation =====
export interface OutputManifest {
  projectName: string;
  outputPath: string;
  files: { path: string; type: string; size: number }[];
  syncedToSupabase: boolean;
  generatedAt: number;
}

// ===== Supabase Sync =====
export interface SyncManifest {
  projectId: string;
  synced: string[];
  failed: string[];
  timestamp: number;
}

// ===== Multi-Site Scrape =====
export interface MultiSiteResult {
  sites: SiteResult[];
  synthesis: DesignSynthesis;
  compositeDesignSystem: CompositeDesignSystem;
  rankings: SiteRanking[];
  timestamp: number;
}

export interface SiteResult {
  url: string;
  scrapeResult: FullScrapeResult;
  quality: SiteRanking;
  scrapeDuration: number;
}

export interface DesignSynthesis {
  bestPatterns: {
    componentType: string;
    bestSiteUrl: string;
    reasoning: string;
    html: string;
    css: string;
  }[];
  commonPatterns: string[];
  uniqueInnovations: { siteUrl: string; innovation: string }[];
  overallRecommendations: string[];
}

export interface CompositeDesignSystem {
  tokens: DesignTokens;
  typography: TypographySystem;
  bestComponents: ComponentData[];
  colorStrategy: string;
  spacingStrategy: string;
  typographyStrategy: string;
}

export interface SiteRanking {
  url: string;
  overallScore: number;
  designQuality: number;
  accessibilityScore: number;
  performanceScore: number;
  conversionScore: number;
  strengths: string[];
  weaknesses: string[];
}

// ===== Reconstructed Component =====
export interface ReconstructedComponent {
  name: string;
  originalType: string;
  tsx: string;
  propsInterface: string;
  storybookStory: string;
  usageExample: string;
  tailwindClasses: string[];
  ariaAttributes: string[];
  stateVariants: string[];
  responsive: boolean;
}

// ===== Design Critique =====
export interface DesignCritique {
  overallScore: number;
  strengths: CritiqueItem[];
  weaknesses: CritiqueWeakness[];
  visualHierarchy: CritiqueSection;
  whitespace: CritiqueSection;
  colorHarmony: CritiqueSection;
  typographyCritique: CritiqueSection;
  ctaEffectiveness: CritiqueSection;
  mobileFirst: CritiqueSection;
  emotionalDesign: CritiqueSection;
  brandConsistency: CritiqueSection;
  microinteractions: CritiqueSection;
  innovationScore: number;
  innovationAssessment: string;
  executiveSummary: string;
}

export interface CritiqueItem {
  title: string;
  evidence: string;
  impact: string;
}

export interface CritiqueWeakness {
  title: string;
  evidence: string;
  severity: 'critical' | 'major' | 'minor' | 'cosmetic';
  recommendation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

export interface CritiqueSection {
  score: number;
  summary: string;
  details: string[];
  recommendations: string[];
}

// ===== Generated Persona =====
export interface GeneratedPersona {
  name: string;
  ageRange: string;
  occupation: string;
  goals: string[];
  frustrations: string[];
  techSavviness: 'low' | 'medium' | 'high' | 'expert';
  behavioralPatterns: string[];
  journeyMap: PersonaJourneyMap;
  jobsToBeDone: string[];
  keyScenarios: PersonaScenario[];
  devicePreferences: string[];
  accessibilityNeeds: string[];
  quote: string;
  bio: string;
}

export interface PersonaJourneyMap {
  discover: JourneyStage;
  evaluate: JourneyStage;
  convert: JourneyStage;
  retain: JourneyStage;
}

export interface JourneyStage {
  actions: string[];
  thoughts: string[];
  emotions: string[];
  touchpoints: string[];
  painPoints: string[];
  opportunities: string[];
}

export interface PersonaScenario {
  title: string;
  context: string;
  steps: string[];
  outcome: string;
}

// ===== Rewritten Copy =====
export interface RewrittenCopy {
  ctaRewrites: CopyVariant[];
  headlineRewrites: CopyVariant[];
  errorMessageRewrites: CopyVariant[];
  emptyStateRewrites: CopyVariant[];
  microcopyRewrites: CopyVariant[];
  onboardingCopy: CopyVariant[];
  socialProofCopy: CopyVariant[];
  brandVoice: string;
  toneGuidelines: string[];
}

export interface CopyVariant {
  original: string;
  context: string;
  variants: {
    formal: string;
    casual: string;
    urgent: string;
  };
  reasoning: string;
}

// ===== SEO Data =====
export interface SEOData {
  metaTags: { name: string; content: string; property?: string }[];
  openGraph: { property: string; content: string }[];
  twitterCard: { name: string; content: string }[];
  structuredData: {
    jsonLd: Record<string, unknown>[];
    microdata: { type: string; properties: Record<string, string> }[];
    rdfa: { type: string; properties: Record<string, string> }[];
  };
  canonicalUrl: string;
  hreflangTags: { lang: string; href: string }[];
  schemaTypes: string[];
  headingHierarchy: { level: number; text: string; count: number }[];
  linkAnalysis: {
    totalLinks: number;
    internalLinks: number;
    externalLinks: number;
    ratio: number;
  };
  imageAltCoverage: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    coveragePercentage: number;
  };
  titleInfo: { title: string; charCount: number };
  metaDescriptionInfo: { description: string; charCount: number };
  faviconUrl: string;
  robotsMeta: string;
  viewportMeta: string;
}

// ===== Motion Capture Data =====
export interface MotionCaptureData {
  animations: {
    name: string;
    duration: number;
    timingFunction: string;
    playbackRate: number;
    type: 'css-animation' | 'css-transition' | 'web-animation';
  }[];
  scrollFrames: {
    scrollY: number;
    screenshotDataUrl: string;
    timestamp: number;
  }[];
  loadingAnimations: {
    selector: string;
    animationName: string;
    duration: string;
  }[];
  hoverAnimations: {
    selector: string;
    properties: string[];
    duration: string;
    easing: string;
  }[];
  entranceAnimations: {
    selector: string;
    type: string;
    delay: string;
    duration: string;
  }[];
  easingCurves: {
    curve: string;
    count: number;
    usedBy: string[];
  }[];
}

// ===== Deep Search Result =====
export interface DeepSearchResult {
  rounds: {
    round: number;
    query: string;
    resultCount: number;
  }[];
  categorized: {
    inspiration: BraveSearchResult[];
    competitors: BraveSearchResult[];
    patterns: BraveSearchResult[];
    blogs: BraveSearchResult[];
    images: BraveImageResult[];
    trends: BraveSearchResult[];
  };
  totalUniqueResults: number;
  searchDuration: number;
}

export interface BraveImageResult {
  title: string;
  url: string;
  thumbnailUrl: string;
  sourceUrl: string;
  width: number;
  height: number;
}

// ===== Batch Queue =====
export interface BatchQueueStatus {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  currentUrl: string;
  isPaused: boolean;
  isRunning: boolean;
  results: BatchQueueItem[];
}

export interface BatchQueueItem {
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  retries: number;
  error?: string;
  result?: FullScrapeResult;
  startedAt?: number;
  completedAt?: number;
}

// ===== Enriched Knowledge =====
export interface EnrichedKnowledge {
  componentType: string;
  bestPractices: {
    source: string;
    guidelines: string[];
  }[];
  accessibilityRequirements: string[];
  performanceConsiderations: string[];
  dosAndDonts: {
    dos: string[];
    donts: string[];
  };
  patternVariations: {
    name: string;
    description: string;
    useCase: string;
  }[];
  industrySpecificNotes: string[];
}

// ===== Color Intelligence =====
export interface ColorIntelligence {
  palette: {
    value: string;
    hex: string;
    hsl: { h: number; s: number; l: number };
    usage: 'brand' | 'neutral' | 'accent' | 'semantic';
    count: number;
    contexts: string[];
  }[];
  relationships: {
    type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic';
    colors: string[];
    score: number;
  }[];
  harmonyScore: number;
  brandColors: string[];
  neutralColors: string[];
  accentColors: string[];
  emotionalMapping: {
    color: string;
    warmth: number;
    energy: number;
    luxury: number;
    associations: string[];
  }[];
  gradients: {
    type: 'linear' | 'radial';
    direction: string;
    colorStops: { color: string; position: string }[];
    selector: string;
  }[];
  contrastMatrix: {
    foreground: string;
    background: string;
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
  }[];
  consistencyScore: number;
  consistencyIssues: {
    color: string;
    usedFor: string[];
    expectedUsage: string;
  }[];
  suggestedScale: {
    shade: number;
    hex: string;
  }[];
}

// ===== Whitespace Analysis =====
export interface WhitespaceAnalysis {
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

// ===== Interaction Patterns =====
export interface InteractionPatterns {
  infiniteScroll: {
    detected: boolean;
    containerSelector: string;
    sentinelSelector: string;
    loadingIndicator: string;
  };
  lazyLoading: {
    detected: boolean;
    method: 'intersection-observer' | 'scroll-based' | 'native-loading' | 'none';
    lazyElements: { selector: string; type: string }[];
  };
  modals: {
    triggers: { selector: string; text: string }[];
    overlayType: 'full-screen' | 'centered' | 'drawer' | 'bottom-sheet';
    closeMethod: string[];
  }[];
  dropdowns: {
    triggerSelector: string;
    contentSelector: string;
    type: 'menu' | 'select' | 'popover' | 'mega-menu';
    triggerEvent: 'click' | 'hover';
  }[];
  tabPanels: {
    containerSelector: string;
    tabCount: number;
    activeTabSelector: string;
    contentSwitchMethod: string;
  }[];
  accordions: {
    containerSelector: string;
    itemCount: number;
    multiOpen: boolean;
    animationType: string;
  }[];
  carousels: {
    containerSelector: string;
    slideCount: number;
    autoPlay: boolean;
    hasArrows: boolean;
    hasDots: boolean;
    transitionType: string;
  }[];
  toasts: {
    containerSelector: string;
    position: string;
    autoDismiss: boolean;
  }[];
  searchAutocomplete: {
    inputSelector: string;
    suggestionsSelector: string;
    debounceMs: number;
  }[];
  filterSort: {
    filterType: 'sidebar' | 'top-bar' | 'modal' | 'dropdown';
    filterControls: { label: string; type: string; selector: string }[];
    sortOptions: string[];
  }[];
  dragDrop: {
    draggableSelector: string;
    dropZoneSelector: string;
    library: string;
  }[];
  fileUpload: {
    inputSelector: string;
    dropZoneSelector: string;
    acceptedTypes: string;
    multipleFiles: boolean;
  }[];
  steppers: {
    containerSelector: string;
    stepCount: number;
    currentStep: number;
    orientation: 'horizontal' | 'vertical';
    completionIndicator: string;
  }[];
}

// ===== Performance Budget =====
export interface PerformanceBudget {
  images: {
    totalBudgetKB: number;
    perImageMaxKB: number;
    requiredFormats: string[];
    currentTotalKB: number;
  };
  javascript: {
    totalBudgetKB: number;
    perBundleMaxKB: number;
    currentTotalKB: number;
  };
  css: {
    totalBudgetKB: number;
    currentTotalKB: number;
  };
  fonts: {
    maxFamilies: number;
    totalBudgetKB: number;
    currentFamilies: number;
    currentTotalKB: number;
  };
  thirdParty: {
    maxCount: number;
    categoriesToKeep: string[];
    currentCount: number;
  };
  coreWebVitals: {
    lcpTarget: number;
    clsTarget: number;
    inpTarget: number;
    fcpTarget: number;
    currentLCP: number;
    currentCLS: number;
    currentINP: number;
    currentFCP: number;
  };
  lighthouseCIConfig: Record<string, unknown>;
  budgetJson: Record<string, unknown>;
}

// ===== Figma Tokens =====
export interface FigmaTokens {
  color: Record<string, FigmaTokenValue>;
  typography: Record<string, FigmaTokenValue>;
  spacing: Record<string, FigmaTokenValue>;
  boxShadow: Record<string, FigmaTokenValue>;
  borderRadius: Record<string, FigmaTokenValue>;
  motion: Record<string, FigmaTokenValue>;
  _metadata: {
    generatedAt: string;
    source: string;
    version: string;
  };
}

export interface FigmaTokenValue {
  value: string | number | Record<string, unknown>;
  type: string;
  description?: string;
}

// ===== A/B Test Plan =====
export interface ABTestPlan {
  summary: string;
  prioritizedTests: ABTest[];
  estimatedTotalLift: string;
  testingTimeline: string;
  prerequisites: string[];
}

export interface ABTest {
  rank: number;
  name: string;
  hypothesis: string;
  control: string;
  variant: string;
  expectedLift: string;
  metricToTrack: string;
  trafficAllocation: string;
  durationEstimate: string;
  category: string;
  confidence: 'low' | 'medium' | 'high';
  implementation: string;
}
