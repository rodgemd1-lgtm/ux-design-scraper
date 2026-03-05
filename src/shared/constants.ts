export const BREAKPOINTS = [375, 768, 1280, 1920] as const;

export const API_ENDPOINTS = {
  CLAUDE: 'https://api.anthropic.com/v1/messages',
  BRAVE_SEARCH: 'https://api.search.brave.com/res/v1/web/search',
  WAYBACK_CDX: 'https://web.archive.org/cdx/search/cdx',
  WAYBACK_WEB: 'https://web.archive.org/web',
  HOTJAR_API: 'https://insights.hotjar.com/api/v2',
  FULLSTORY_API: 'https://api.fullstory.com/v2',
  FIRECRAWL: 'https://api.firecrawl.dev/v1',
  EXA: 'https://api.exa.ai',
} as const;

export const CLAUDE_MODEL = 'claude-sonnet-4-20250514';
export const CLAUDE_MAX_TOKENS = 8192;

export const SCRAPE_TIMEOUTS = {
  INJECTION: 5000,
  DOM_EXTRACTION: 30000,
  INTERACTIVE: 45000,
  COMPONENT_EXTRACT: 60000,
  SCREENSHOT: 60000,
  LIGHTHOUSE: 90000,
  API_CALL: 30000,
  HEATMAP_DOM: 45000,
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'ux_scraper_settings',
  CURRENT_SESSION: 'ux_scraper_current_session',
  CHAT_HISTORY: 'ux_scraper_chat_history',
  PROJECT_CACHE: 'ux_scraper_project_cache',
  WORKFLOW_SESSION: 'ux_scraper_workflow_session',
} as const;

export const DEFAULT_SCORING_WEIGHTS = {
  industryFit: 20,
  audienceAlignment: 20,
  conversionOptimization: 20,
  accessibilityCompliance: 15,
  performance: 15,
  designTrend: 10,
} as const;

export const COMPONENT_TYPES = [
  'button', 'card', 'form', 'input', 'select', 'modal', 'dialog',
  'nav', 'header', 'footer', 'hero', 'sidebar', 'table', 'list',
  'tabs', 'accordion', 'dropdown', 'tooltip', 'badge', 'avatar',
  'breadcrumb', 'pagination', 'progress', 'skeleton', 'alert',
  'toast', 'banner', 'carousel', 'gallery', 'pricing',
] as const;

export const THIRD_PARTY_SIGNATURES = {
  analytics: [
    { name: 'Google Analytics', signals: ['ga(', 'gtag(', '_gaq', 'google-analytics.com', 'googletagmanager.com'] },
    { name: 'Hotjar', signals: ['hotjar', 'hj(', '_hjSettings', 'static.hotjar.com'] },
    { name: 'FullStory', signals: ['fullstory', '_fs_debug', 'fullstory.com', 'edge.fullstory.com'] },
    { name: 'Mixpanel', signals: ['mixpanel', 'mp_', 'cdn.mxpnl.com'] },
    { name: 'Segment', signals: ['analytics.js', 'segment.com', 'analytics.track', 'cdn.segment.com'] },
    { name: 'Amplitude', signals: ['amplitude', 'amplitude.com', 'cdn.amplitude.com'] },
    { name: 'Heap', signals: ['heap', 'heapanalytics.com'] },
    { name: 'PostHog', signals: ['posthog', 'app.posthog.com'] },
  ],
  cms: [
    { name: 'WordPress', signals: ['wp-content', 'wp-includes', 'wp-json'] },
    { name: 'Webflow', signals: ['webflow.com', 'assets-global.website-files.com'] },
    { name: 'Contentful', signals: ['contentful.com', 'ctfassets.net'] },
    { name: 'Sanity', signals: ['sanity.io', 'cdn.sanity.io'] },
    { name: 'Shopify', signals: ['cdn.shopify.com', 'shopify.com', 'myshopify.com'] },
    { name: 'Squarespace', signals: ['squarespace.com', 'sqsp.com', 'static1.squarespace.com'] },
  ],
  frameworks: [
    { name: 'React', signals: ['__REACT_DEVTOOLS', '_reactRootContainer', 'data-reactroot', '__NEXT_DATA__'] },
    { name: 'Next.js', signals: ['__NEXT_DATA__', '_next/', 'next/image'] },
    { name: 'Vue.js', signals: ['__vue__', 'Vue.js', 'data-v-'] },
    { name: 'Nuxt', signals: ['__nuxt', '__NUXT__', '_nuxt/'] },
    { name: 'Angular', signals: ['ng-version', 'ng-app', '_ng'] },
    { name: 'Svelte', signals: ['__svelte', 'svelte'] },
    { name: 'Tailwind CSS', signals: ['tailwindcss', 'class="tw-'] },
  ],
  auth: [
    { name: 'Auth0', signals: ['auth0.com', 'auth0-js'] },
    { name: 'Firebase Auth', signals: ['firebase.google.com', 'firebaseapp.com', '__firebase'] },
    { name: 'Clerk', signals: ['clerk.com', 'clerk.dev'] },
    { name: 'Supabase Auth', signals: ['supabase.co', 'supabase.com'] },
  ],
  payment: [
    { name: 'Stripe', signals: ['js.stripe.com', 'stripe.com', 'Stripe('] },
    { name: 'PayPal', signals: ['paypal.com', 'paypalobjects.com'] },
    { name: 'Square', signals: ['squareup.com', 'square.com'] },
  ],
  chat: [
    { name: 'Intercom', signals: ['intercom.com', 'widget.intercom.io', 'Intercom('] },
    { name: 'Drift', signals: ['drift.com', 'js.driftt.com'] },
    { name: 'Crisp', signals: ['crisp.chat', 'client.crisp.chat'] },
    { name: 'Zendesk', signals: ['zendesk.com', 'zdassets.com'] },
    { name: 'HubSpot Chat', signals: ['hubspot.com', 'js.hs-scripts.com'] },
  ],
} as const;
