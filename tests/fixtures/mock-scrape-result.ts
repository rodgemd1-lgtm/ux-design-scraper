import type {
  FullScrapeResult,
  ProjectContext,
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
} from '@shared/types';

// ===== Project Context =====

export const mockProjectContext: ProjectContext = {
  goal: 'Redesign the e-commerce checkout experience to increase conversions by 15%',
  industry: 'ecommerce',
  targetAudience: 'millennial online shoppers, ages 25-40',
  designStyle: 'minimal',
  competitors: ['https://competitor-a.com', 'https://competitor-b.com'],
  specificComponents: ['hero', 'card', 'nav', 'footer', 'button'],
};

// ===== Design Tokens =====

export const mockDesignTokens: DesignTokens = {
  colors: [
    { value: 'rgb(37, 99, 235)', count: 42, contexts: ['button', 'link', 'primary'], property: 'color' },
    { value: 'rgb(255, 255, 255)', count: 150, contexts: ['background', 'body'], property: 'background-color' },
    { value: 'rgb(17, 24, 39)', count: 95, contexts: ['text', 'heading'], property: 'color' },
    { value: 'rgb(239, 68, 68)', count: 8, contexts: ['error', 'danger'], property: 'color' },
    { value: 'rgb(34, 197, 94)', count: 6, contexts: ['success', 'badge'], property: 'color' },
    { value: 'rgb(245, 158, 11)', count: 4, contexts: ['warning', 'alert'], property: 'color' },
    { value: '#6366f1', count: 12, contexts: ['accent', 'badge'], property: 'background-color' },
    { value: 'rgb(148, 163, 184)', count: 28, contexts: ['placeholder', 'muted'], property: 'color' },
    { value: 'rgb(241, 245, 249)', count: 35, contexts: ['background', 'card'], property: 'background-color' },
    { value: '#0ea5e9', count: 9, contexts: ['info', 'link-hover'], property: 'color' },
  ],
  spacing: [
    { value: '4px', count: 30, contexts: ['padding'], property: 'padding' },
    { value: '8px', count: 75, contexts: ['gap', 'padding'], property: 'gap' },
    { value: '12px', count: 40, contexts: ['padding'], property: 'padding' },
    { value: '16px', count: 90, contexts: ['margin', 'padding'], property: 'margin' },
    { value: '24px', count: 55, contexts: ['section-gap'], property: 'gap' },
    { value: '32px', count: 35, contexts: ['section-margin'], property: 'margin' },
    { value: '48px', count: 20, contexts: ['section-padding'], property: 'padding' },
    { value: '64px', count: 12, contexts: ['hero-padding'], property: 'padding' },
  ],
  shadows: [
    { value: '0px 1px 3px 0px rgba(0,0,0,0.1)', count: 25, contexts: ['card'], property: 'box-shadow' },
    { value: '0px 4px 6px -1px rgba(0,0,0,0.1)', count: 18, contexts: ['dropdown'], property: 'box-shadow' },
    { value: '0px 10px 15px -3px rgba(0,0,0,0.1)', count: 8, contexts: ['modal'], property: 'box-shadow' },
  ],
  borderRadii: [
    { value: '4px', count: 40, contexts: ['button', 'input'] },
    { value: '8px', count: 55, contexts: ['card', 'modal'] },
    { value: '12px', count: 20, contexts: ['container'] },
    { value: '9999px', count: 15, contexts: ['pill', 'avatar'] },
  ],
  zIndices: [
    { value: 10, element: '.dropdown' },
    { value: 50, element: '.modal-overlay' },
    { value: 100, element: '.toast' },
  ],
  opacities: [
    { value: 0.5, context: 'disabled button' },
    { value: 0.75, context: 'overlay' },
    { value: 0.1, context: 'hover background' },
  ],
};

// ===== Typography System =====

export const mockTypography: TypographySystem = {
  fontFamilies: [
    { family: 'Inter', count: 180, usage: ['heading', 'body', 'caption'] },
    { family: 'JetBrains Mono', count: 15, usage: ['code', 'monospace'] },
  ],
  fontWeights: [
    { weight: '400', count: 120 },
    { weight: '500', count: 65 },
    { weight: '600', count: 40 },
    { weight: '700', count: 30 },
  ],
  fontSizes: [
    { size: '12px', count: 25, element: 'caption' },
    { size: '14px', count: 70, element: 'body-small' },
    { size: '16px', count: 90, element: 'body' },
    { size: '18px', count: 30, element: 'lead' },
    { size: '20px', count: 20, element: 'h4' },
    { size: '24px', count: 15, element: 'h3' },
    { size: '32px', count: 10, element: 'h2' },
    { size: '48px', count: 5, element: 'h1' },
  ],
  lineHeights: [
    { value: '1.2', count: 35 },
    { value: '1.5', count: 100 },
    { value: '1.75', count: 20 },
  ],
  letterSpacings: [
    { value: '-0.02em', count: 25 },
    { value: '0', count: 80 },
    { value: '0.05em', count: 10 },
  ],
};

// ===== Icons =====

export const mockIcons: IconData[] = [
  { svg: '<svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10" fill="none" stroke="currentColor"/></svg>', viewBox: '0 0 24 24', category: 'navigation', size: { width: 24, height: 24 }, source: '.icon-home' },
  { svg: '<svg viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" fill="none" stroke="currentColor"/></svg>', viewBox: '0 0 24 24', category: 'action', size: { width: 24, height: 24 }, source: '.icon-search' },
];

// ===== Grid Layout =====

export const mockGridLayout: GridLayout = {
  containerMaxWidth: '1280px',
  columns: 12,
  gutterWidth: '24px',
  layoutType: 'grid',
  breakpointBehaviors: [
    { breakpoint: 375, columns: 4, layout: 'stack' },
    { breakpoint: 768, columns: 8, layout: '2-column' },
    { breakpoint: 1280, columns: 12, layout: 'full' },
  ],
};

// ===== Navigation =====

export const mockNavigation: NavigationStructure = {
  primaryNav: [
    { label: 'Home', href: '/', children: [], level: 0 },
    { label: 'Products', href: '/products', children: [
      { label: 'New Arrivals', href: '/products/new', children: [], level: 1 },
      { label: 'Best Sellers', href: '/products/best', children: [], level: 1 },
    ], level: 0 },
    { label: 'About', href: '/about', children: [], level: 0 },
    { label: 'Contact', href: '/contact', children: [], level: 0 },
  ],
  footerNav: [
    { label: 'Privacy', href: '/privacy', children: [], level: 0 },
    { label: 'Terms', href: '/terms', children: [], level: 0 },
  ],
  breadcrumbs: [['Home', 'Products', 'Best Sellers']],
  menuDepth: 2,
  totalPages: 12,
  sitemapTree: { label: 'Home', href: '/', children: [], level: 0 },
};

// ===== Copy Analysis =====

export const mockCopyAnalysis: CopyAnalysis = {
  ctaLabels: [
    { text: 'Add to Cart', element: 'button', count: 8 },
    { text: 'Buy Now', element: 'button', count: 4 },
    { text: 'Learn More', element: 'a', count: 6 },
  ],
  errorMessages: ['Please enter a valid email address', 'This field is required'],
  placeholders: [
    { text: 'Search products...', field: 'search' },
    { text: 'Enter your email', field: 'email' },
  ],
  tooltips: ['Click to add this item to your wishlist'],
  emptyStateText: ['Your cart is empty. Start shopping!'],
  microcopy: [
    { text: 'Free shipping on orders over $50', context: 'banner' },
    { text: '30-day money-back guarantee', context: 'trust-badge' },
  ],
  toneKeywords: ['friendly', 'confident', 'casual', 'action-oriented'],
};

// ===== Accessibility =====

export const mockAccessibility: AccessibilityAudit = {
  contrastIssues: [
    { foreground: '#94a3b8', background: '#f1f5f9', ratio: 2.8, element: 'p.muted', level: 'AA' },
    { foreground: '#cbd5e1', background: '#ffffff', ratio: 1.9, element: 'span.placeholder', level: 'AA' },
  ],
  missingAltText: [
    { element: 'img.hero-bg', src: '/images/hero.jpg' },
  ],
  missingAriaLabels: ['button.icon-only', 'a.social-link'],
  tabOrderIssues: ['Modal focus trap not implemented'],
  semanticIssues: ['Using div instead of nav for navigation', 'No main landmark'],
  focusIndicatorsMissing: ['button.cta', 'a.nav-link'],
  overallScore: 72,
  wcagLevel: 'AA',
};

// ===== Third Party Stack =====

export const mockThirdPartyStack: ThirdPartyStack = {
  analytics: [
    { name: 'Google Analytics', confidence: 0.95, signals: ['gtag(', 'googletagmanager.com'] },
    { name: 'Hotjar', confidence: 0.8, signals: ['static.hotjar.com'] },
  ],
  cms: [{ name: 'Next.js', confidence: 0.9, signals: ['__NEXT_DATA__'] }],
  auth: [{ name: 'Auth0', confidence: 0.85, signals: ['auth0.com'] }],
  payment: [{ name: 'Stripe', confidence: 0.95, signals: ['js.stripe.com'] }],
  chat: [{ name: 'Intercom', confidence: 0.7, signals: ['widget.intercom.io'] }],
  cdns: [{ name: 'Cloudflare', confidence: 0.9, signals: ['cdnjs.cloudflare.com'] }],
  frameworks: [
    { name: 'React', confidence: 0.99, signals: ['__REACT_DEVTOOLS', '_reactRootContainer'] },
    { name: 'Tailwind CSS', confidence: 0.85, signals: ['tailwindcss'] },
  ],
  abTesting: [],
};

// ===== Dark Mode =====

export const mockDarkMode: DarkModeData = {
  hasDarkMode: true,
  method: 'css-variables',
  darkColors: [
    { value: 'rgb(17, 24, 39)', count: 10, contexts: ['dark-background'] },
    { value: 'rgb(243, 244, 246)', count: 8, contexts: ['dark-text'] },
  ],
  toggleSelector: 'button.theme-toggle',
};

// ===== Image Assets =====

export const mockImageAssets: ImageAssetData = {
  images: [
    { src: '/images/hero.webp', alt: 'Hero banner', format: 'webp', width: 1920, height: 1080, lazyLoaded: false, aspectRatio: '16:9', srcset: '/images/hero-375.webp 375w, /images/hero-768.webp 768w' },
    { src: '/images/product-1.webp', alt: 'Product 1', format: 'webp', width: 600, height: 600, lazyLoaded: true, aspectRatio: '1:1' },
    { src: '/images/product-2.jpg', alt: 'Product 2', format: 'jpg', width: 600, height: 600, lazyLoaded: true, aspectRatio: '1:1' },
    { src: '/images/team.png', alt: '', format: 'png', width: 800, height: 500, lazyLoaded: true, aspectRatio: '16:10' },
    { src: '/images/bg-pattern.svg', alt: '', format: 'svg', width: 200, height: 200, lazyLoaded: false, aspectRatio: '1:1' },
  ],
  totalSize: 2560000,
  formatDistribution: { webp: 2, jpg: 1, png: 1, svg: 1 },
  lazyLoadPercentage: 60,
};

// ===== Conversion Patterns =====

export const mockConversionPatterns: ConversionPatterns = {
  ctas: [
    { text: 'Add to Cart', position: 'product-card', size: '48px', color: '#2563eb', prominence: 9 },
    { text: 'Buy Now', position: 'hero', size: '56px', color: '#2563eb', prominence: 10 },
    { text: 'Subscribe', position: 'footer', size: '40px', color: '#6366f1', prominence: 6 },
  ],
  socialProof: [
    { type: 'review-count', content: '4,500+ reviews', position: 'below-hero' },
    { type: 'testimonial', content: 'Best product I have ever used', position: 'mid-page' },
    { type: 'trust-badge', content: 'Trusted by 10,000+ customers', position: 'footer' },
  ],
  formFields: [
    { label: 'Email', type: 'email', required: true },
    { label: 'Password', type: 'password', required: true },
    { label: 'Name', type: 'text', required: true },
    { label: 'Phone', type: 'tel', required: false },
  ],
  urgencyPatterns: [
    { type: 'limited-time', content: 'Sale ends in 24 hours' },
  ],
  trustBadges: ['SSL Secure', '30-Day Money Back', 'Free Shipping'],
};

// ===== Components =====

export const mockComponents: ComponentData[] = [
  {
    name: 'PrimaryButton',
    selector: 'button.btn-primary',
    html: '<button class="btn-primary px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 focus:ring-2">Add to Cart</button>',
    css: '.btn-primary { background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; font-weight: 500; }',
    type: 'button',
    stateVariants: {
      hover: { 'background-color': '#1d4ed8' },
      focus: { 'box-shadow': '0 0 0 3px rgba(37,99,235,0.5)' },
      disabled: { opacity: '0.5', cursor: 'not-allowed' },
    },
  },
  {
    name: 'ProductCard',
    selector: '.product-card',
    html: '<div class="product-card p-4 bg-white rounded-lg shadow-sm"><img src="/product.jpg" alt="Product" /><h3>Product Name</h3><p>$29.99</p></div>',
    css: '.product-card { padding: 16px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }',
    type: 'card',
    stateVariants: {
      hover: { transform: 'translateY(-2px)', 'box-shadow': '0 4px 6px rgba(0,0,0,0.1)' },
    },
  },
  {
    name: 'NavBar',
    selector: 'nav.main-nav',
    html: '<nav class="main-nav flex items-center justify-between px-6 py-4"><a href="/">Logo</a><ul class="flex gap-6"><li>Home</li><li>Products</li></ul></nav>',
    css: 'nav.main-nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; }',
    type: 'nav',
    stateVariants: {},
  },
  {
    name: 'HeroSection',
    selector: '.hero',
    html: '<section class="hero py-24 text-center"><h1 class="text-5xl font-bold">Welcome</h1><p class="mt-4 text-xl">Shop the best</p></section>',
    css: '.hero { padding: 96px 0; text-align: center; }',
    type: 'hero',
    stateVariants: {},
  },
  {
    name: 'SearchInput',
    selector: 'input.search',
    html: '<input class="search px-4 py-2 border rounded-md" placeholder="Search..." />',
    css: '.search { padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 6px; }',
    type: 'input',
    stateVariants: {
      focus: { 'border-color': '#2563eb', 'box-shadow': '0 0 0 3px rgba(37,99,235,0.1)' },
    },
  },
];

// ===== Animations =====

export const mockAnimations: AnimationData = {
  cssTransitions: [
    { property: 'background-color', duration: '0.2s', easing: 'ease-in-out', selector: 'button' },
    { property: 'transform', duration: '0.3s', easing: 'ease', selector: '.card' },
    { property: 'opacity', duration: '0.15s', easing: 'linear', selector: '.dropdown' },
    { property: 'box-shadow', duration: '0.2s', easing: 'ease', selector: '.card' },
  ],
  cssAnimations: [
    { name: 'fadeIn', duration: '0.5s', easing: 'ease-out', keyframes: '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }', selector: '.modal' },
    { name: 'slideUp', duration: '0.4s', easing: 'ease-out', keyframes: '@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }', selector: '.toast' },
    { name: 'pulse', duration: '2s', easing: 'ease-in-out', keyframes: '@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }', selector: '.skeleton' },
  ],
  scrollTriggered: [
    { selector: '.section-heading', triggerType: 'intersection', animation: 'fadeIn' },
    { selector: '.feature-card', triggerType: 'intersection', animation: 'slideUp' },
  ],
};

// ===== Scroll Behavior =====

export const mockScrollBehavior: ScrollBehavior = {
  stickyElements: [
    { selector: 'nav.main-nav', position: 'top' },
    { selector: '.back-to-top', position: 'bottom-right' },
  ],
  parallaxLayers: [
    { selector: '.hero-bg', speed: 0.5 },
  ],
  scrollAnimations: [
    { selector: '.fade-in-section', type: 'fade-in', trigger: 'viewport-enter' },
    { selector: '.slide-up', type: 'slide-up', trigger: 'viewport-enter' },
    { selector: '.count-up', type: 'counter', trigger: 'viewport-enter' },
    { selector: '.progress-bar', type: 'fill', trigger: 'viewport-enter' },
  ],
  pageTransitions: ['fade'],
};

// ===== Flow Analysis =====

export const mockFlowAnalysis: FlowAnalysis = {
  stepsToConversion: 4,
  formFieldCount: 6,
  decisionsPerScreen: [3, 5, 2, 1],
  estimatedCognitiveLoad: 55,
  frictionPoints: [
    { step: 2, description: 'Account creation required before checkout', severity: 7 },
    { step: 3, description: 'Shipping options not clearly compared', severity: 4 },
  ],
};

// ===== Screenshots =====

export const mockScreenshots: ScreenshotData[] = [
  { breakpoint: 375, dataUrl: 'data:image/png;base64,iVBORw==', width: 375, height: 812, timestamp: Date.now() },
  { breakpoint: 768, dataUrl: 'data:image/png;base64,iVBORw==', width: 768, height: 1024, timestamp: Date.now() },
  { breakpoint: 1280, dataUrl: 'data:image/png;base64,iVBORw==', width: 1280, height: 800, timestamp: Date.now() },
  { breakpoint: 1920, dataUrl: 'data:image/png;base64,iVBORw==', width: 1920, height: 1080, timestamp: Date.now() },
];

// ===== Lighthouse =====

export const mockLighthouse: LighthouseData = {
  performanceScore: 78,
  accessibilityScore: 85,
  lcp: 2800,
  cls: 0.12,
  inp: 180,
  fcp: 1600,
  speedIndex: 3200,
  totalBlockingTime: 350,
};

// ===== Wayback Snapshots =====

export const mockWaybackSnapshots: WaybackSnapshot[] = [
  { timestamp: '20240101120000', url: 'https://example-store.com', waybackUrl: 'https://web.archive.org/web/20240101120000/https://example-store.com' },
  { timestamp: '20230601120000', url: 'https://example-store.com', waybackUrl: 'https://web.archive.org/web/20230601120000/https://example-store.com', keyChanges: ['New hero section', 'Updated navigation'] },
];

// ===== Heatmaps =====

export const mockHeatmaps: HeatmapData[] = [
  { type: 'click', source: 'hotjar_api', pageUrl: 'https://example-store.com', data: { clicks: 1500 } },
  { type: 'scroll', source: 'hotjar_api', pageUrl: 'https://example-store.com', data: { avgScrollDepth: 65 } },
];

// ===== SEO Data =====

export const mockSEOData: SEOData = {
  metaTags: [
    { name: 'description', content: 'Shop the best products online at Example Store' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
  ],
  openGraph: [
    { property: 'og:title', content: 'Example Store' },
    { property: 'og:type', content: 'website' },
  ],
  twitterCard: [
    { name: 'twitter:card', content: 'summary_large_image' },
  ],
  structuredData: {
    jsonLd: [{ '@type': 'Organization', name: 'Example Store' }],
    microdata: [],
    rdfa: [],
  },
  canonicalUrl: 'https://example-store.com',
  hreflangTags: [
    { lang: 'en', href: 'https://example-store.com' },
  ],
  schemaTypes: ['Organization', 'Product'],
  headingHierarchy: [
    { level: 1, text: 'Welcome to Example Store', count: 1 },
    { level: 2, text: 'Featured Products', count: 3 },
    { level: 3, text: 'Product Category', count: 6 },
  ],
  linkAnalysis: { totalLinks: 85, internalLinks: 60, externalLinks: 25, ratio: 2.4 },
  imageAltCoverage: { totalImages: 5, imagesWithAlt: 3, imagesWithoutAlt: 2, coveragePercentage: 60 },
  titleInfo: { title: 'Example Store - Shop Online', charCount: 28 },
  metaDescriptionInfo: { description: 'Shop the best products online at Example Store', charCount: 47 },
  faviconUrl: '/favicon.ico',
  robotsMeta: 'index, follow',
  viewportMeta: 'width=device-width, initial-scale=1',
};

// ===== Color Intelligence =====

export const mockColorIntelligence: ColorIntelligence = {
  palette: [
    { value: 'rgb(37, 99, 235)', hex: '#2563eb', hsl: { h: 217, s: 91, l: 60 }, usage: 'brand', count: 42, contexts: ['button', 'link'] },
    { value: 'rgb(17, 24, 39)', hex: '#111827', hsl: { h: 221, s: 39, l: 11 }, usage: 'neutral', count: 95, contexts: ['text'] },
    { value: 'rgb(99, 102, 241)', hex: '#6366f1', hsl: { h: 239, s: 84, l: 67 }, usage: 'accent', count: 12, contexts: ['accent'] },
    { value: 'rgb(239, 68, 68)', hex: '#ef4444', hsl: { h: 0, s: 84, l: 60 }, usage: 'semantic', count: 8, contexts: ['error'] },
  ],
  relationships: [
    { type: 'analogous', colors: ['#2563eb', '#6366f1'], score: 0.85 },
  ],
  harmonyScore: 82,
  brandColors: ['#2563eb'],
  neutralColors: ['#111827', '#94a3b8', '#f1f5f9'],
  accentColors: ['#6366f1'],
  emotionalMapping: [
    { color: '#2563eb', warmth: 0.3, energy: 0.6, luxury: 0.5, associations: ['trust', 'professionalism'] },
  ],
  gradients: [
    { type: 'linear', direction: 'to right', colorStops: [{ color: '#2563eb', position: '0%' }, { color: '#6366f1', position: '100%' }], selector: '.hero-gradient' },
  ],
  contrastMatrix: [
    { foreground: '#111827', background: '#ffffff', ratio: 16.75, passesAA: true, passesAAA: true },
    { foreground: '#94a3b8', background: '#f1f5f9', ratio: 2.8, passesAA: false, passesAAA: false },
  ],
  consistencyScore: 78,
  consistencyIssues: [
    { color: '#94a3b8', usedFor: ['text', 'icon', 'border'], expectedUsage: 'muted text only' },
  ],
  suggestedScale: [
    { shade: 50, hex: '#eff6ff' },
    { shade: 500, hex: '#2563eb' },
    { shade: 900, hex: '#1e3a8a' },
  ],
};

// ===== Whitespace Analysis =====

export const mockWhitespace: WhitespaceAnalysis = {
  verticalRhythm: {
    baseLineHeight: 24,
    commonMultiples: [1, 1.5, 2, 3],
    consistencyScore: 75,
    violations: [
      { element: '.card-body', expected: 24, actual: 20 },
    ],
  },
  baseSpacingUnit: { detectedUnit: 8, confidence: 0.88, gridSystem: '8px grid' },
  densityZones: [
    { selector: '.hero', density: 'airy', whitespaceRatio: 0.7, elementCount: 3, area: { x: 0, y: 0, width: 1280, height: 600 } },
    { selector: '.product-grid', density: 'balanced', whitespaceRatio: 0.45, elementCount: 12, area: { x: 0, y: 600, width: 1280, height: 800 } },
  ],
  paddingMarginConsistency: {
    score: 72,
    commonPaddings: [{ value: '16px', count: 90 }, { value: '24px', count: 55 }],
    commonMargins: [{ value: '16px', count: 45 }, { value: '32px', count: 35 }],
    outliers: [{ element: '.promo-banner', property: 'padding', value: '13px', expected: '16px' }],
  },
  visualGrouping: {
    groups: [
      { elements: ['.product-title', '.product-price'], spacing: '8px', relationship: 'tight' },
      { elements: ['.section-title', '.section-content'], spacing: '24px', relationship: 'related' },
    ],
  },
  sectionSpacing: {
    sections: [
      { selector: '.hero', topMargin: '0px', bottomMargin: '64px' },
      { selector: '.features', topMargin: '64px', bottomMargin: '64px' },
    ],
    averageSpacing: 64,
    consistency: 0.85,
  },
  responsiveSpacing: [
    { breakpoint: 375, changes: [{ selector: '.hero', property: 'padding', oldValue: '96px', newValue: '48px' }] },
  ],
};

// ===== Interaction Patterns =====

export const mockInteractionPatterns: InteractionPatterns = {
  infiniteScroll: { detected: false, containerSelector: '', sentinelSelector: '', loadingIndicator: '' },
  lazyLoading: { detected: true, method: 'intersection-observer', lazyElements: [{ selector: 'img.product-img', type: 'image' }] },
  modals: [{ triggers: [{ selector: 'button.quick-view', text: 'Quick View' }], overlayType: 'centered', closeMethod: ['escape', 'click-outside', 'close-button'] }],
  dropdowns: [{ triggerSelector: '.nav-item-products', contentSelector: '.mega-menu', type: 'mega-menu', triggerEvent: 'hover' }],
  tabPanels: [{ containerSelector: '.product-tabs', tabCount: 3, activeTabSelector: '.tab.active', contentSwitchMethod: 'visibility' }],
  accordions: [{ containerSelector: '.faq-list', itemCount: 5, multiOpen: false, animationType: 'slide' }],
  carousels: [{ containerSelector: '.hero-carousel', slideCount: 3, autoPlay: true, hasArrows: true, hasDots: true, transitionType: 'slide' }],
  toasts: [{ containerSelector: '.toast-container', position: 'top-right', autoDismiss: true }],
  searchAutocomplete: [{ inputSelector: 'input.search', suggestionsSelector: '.search-suggestions', debounceMs: 300 }],
  filterSort: [{ filterType: 'sidebar', filterControls: [{ label: 'Category', type: 'checkbox', selector: '.filter-category' }], sortOptions: ['Price: Low to High', 'Price: High to Low', 'Newest'] }],
  dragDrop: [],
  fileUpload: [],
  steppers: [{ containerSelector: '.checkout-steps', stepCount: 4, currentStep: 1, orientation: 'horizontal', completionIndicator: 'checkmark' }],
};

// ===== Motion Capture =====

export const mockMotionCapture: MotionCaptureData = {
  animations: [
    { name: 'fadeIn', duration: 500, timingFunction: 'ease-out', playbackRate: 1, type: 'css-animation' },
    { name: 'hover-lift', duration: 200, timingFunction: 'ease', playbackRate: 1, type: 'css-transition' },
  ],
  scrollFrames: [],
  loadingAnimations: [{ selector: '.skeleton', animationName: 'pulse', duration: '2s' }],
  hoverAnimations: [{ selector: '.card', properties: ['transform', 'box-shadow'], duration: '0.3s', easing: 'ease' }],
  entranceAnimations: [{ selector: '.section', type: 'fade-in', delay: '0s', duration: '0.5s' }],
  easingCurves: [
    { curve: 'ease', count: 15, usedBy: ['.card', '.button'] },
    { curve: 'ease-out', count: 8, usedBy: ['.modal', '.toast'] },
    { curve: 'ease-in-out', count: 5, usedBy: ['.dropdown'] },
  ],
};

// ===== Full Scrape Result =====

export const mockFullScrapeResult: FullScrapeResult = {
  projectName: 'example-store-redesign',
  targetUrl: 'https://example-store.com',
  projectContext: mockProjectContext,
  timestamp: Date.now(),
  designTokens: mockDesignTokens,
  typography: mockTypography,
  icons: mockIcons,
  gridLayout: mockGridLayout,
  navigation: mockNavigation,
  copyAnalysis: mockCopyAnalysis,
  accessibility: mockAccessibility,
  thirdPartyStack: mockThirdPartyStack,
  darkMode: mockDarkMode,
  imageAssets: mockImageAssets,
  conversionPatterns: mockConversionPatterns,
  components: mockComponents,
  animations: mockAnimations,
  scrollBehavior: mockScrollBehavior,
  flowAnalysis: mockFlowAnalysis,
  screenshots: mockScreenshots,
  lighthouse: mockLighthouse,
  waybackSnapshots: mockWaybackSnapshots,
  heatmaps: mockHeatmaps,
  seo: mockSEOData,
  colorIntelligence: mockColorIntelligence,
  whitespace: mockWhitespace,
  interactionPatterns: mockInteractionPatterns,
  motionCapture: mockMotionCapture,
};

/**
 * Create a secondary mock FullScrapeResult for multi-site/competitive tests
 */
export function createSecondMockScrapeResult(): FullScrapeResult {
  return {
    ...mockFullScrapeResult,
    projectName: 'competitor-site-analysis',
    targetUrl: 'https://competitor-a.com',
    timestamp: Date.now() - 60000,
    lighthouse: {
      performanceScore: 92,
      accessibilityScore: 90,
      lcp: 1800,
      cls: 0.05,
      inp: 120,
      fcp: 1200,
      speedIndex: 2400,
      totalBlockingTime: 150,
    },
    accessibility: {
      ...mockAccessibility,
      overallScore: 90,
      wcagLevel: 'AA',
      contrastIssues: [],
    },
    darkMode: {
      hasDarkMode: false,
      method: 'none',
      darkColors: [],
    },
    components: mockComponents.slice(0, 3),
    animations: {
      cssTransitions: mockAnimations.cssTransitions.slice(0, 1),
      cssAnimations: [],
      scrollTriggered: [],
    },
    scrollBehavior: {
      stickyElements: [],
      parallaxLayers: [],
      scrollAnimations: [],
      pageTransitions: [],
    },
    conversionPatterns: {
      ...mockConversionPatterns,
      socialProof: [],
      trustBadges: [],
    },
  };
}
