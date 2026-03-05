/**
 * Third-Party Detector
 * Detects third-party tools, frameworks, analytics, CMS, auth, payment,
 * and chat providers by scanning scripts, links, meta tags, and window globals.
 */

import { BaseExtractor } from './base-extractor';
import type { ThirdPartyStack, DetectedTool } from '@shared/types';

// Inline THIRD_PARTY_SIGNATURES from constants since content scripts
// are bundled via webpack and can use @shared alias
const SIGNATURES = {
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

export class ThirdPartyDetector extends BaseExtractor<ThirdPartyStack> {
  constructor() {
    super('third-party');
  }

  protected async doExtract(): Promise<ThirdPartyStack> {
    // Build a text corpus of all detectable signals
    const scriptSources = this.collectScriptSources();
    const linkHrefs = this.collectLinkHrefs();
    const metaContent = this.collectMetaContent();
    const inlineScriptContent = this.collectInlineScriptContent();
    const htmlContent = document.documentElement.outerHTML.slice(0, 100000); // First 100KB of HTML

    const corpus = [
      ...scriptSources,
      ...linkHrefs,
      ...metaContent,
      ...inlineScriptContent,
      htmlContent,
    ].join('\n');

    const windowGlobals = this.checkWindowGlobals();

    const result: ThirdPartyStack = {
      analytics: [],
      cms: [],
      auth: [],
      payment: [],
      chat: [],
      cdns: [],
      frameworks: [],
      abTesting: [],
    };

    // Scan each category
    for (const [category, signatures] of Object.entries(SIGNATURES)) {
      for (const sig of signatures) {
        const matchedSignals: string[] = [];

        for (const signal of sig.signals) {
          // Check corpus
          if (corpus.includes(signal)) {
            matchedSignals.push(`found "${signal}" in page source`);
          }

          // Check window globals
          if (windowGlobals.includes(signal)) {
            matchedSignals.push(`found "${signal}" as window global`);
          }
        }

        if (matchedSignals.length > 0) {
          const confidence = Math.min(1, matchedSignals.length / sig.signals.length + 0.2);
          const tool: DetectedTool = {
            name: sig.name,
            confidence: Math.round(confidence * 100) / 100,
            signals: matchedSignals,
          };

          const key = category as keyof ThirdPartyStack;
          if (key in result) {
            (result[key] as DetectedTool[]).push(tool);
          }
        }
      }
    }

    // Detect CDNs
    result.cdns = this.detectCDNs(scriptSources, linkHrefs);

    // Detect A/B testing
    result.abTesting = this.detectABTesting(corpus, windowGlobals);

    return result;
  }

  private collectScriptSources(): string[] {
    const sources: string[] = [];
    const scripts = document.querySelectorAll('script[src]');
    for (const script of Array.from(scripts)) {
      const src = script.getAttribute('src') || '';
      if (src) sources.push(src);
    }
    return sources;
  }

  private collectLinkHrefs(): string[] {
    const hrefs: string[] = [];
    const links = document.querySelectorAll('link[href]');
    for (const link of Array.from(links)) {
      const href = link.getAttribute('href') || '';
      if (href) hrefs.push(href);
    }
    return hrefs;
  }

  private collectMetaContent(): string[] {
    const content: string[] = [];
    const metas = document.querySelectorAll('meta');
    for (const meta of Array.from(metas)) {
      const c = meta.getAttribute('content') || '';
      const name = meta.getAttribute('name') || '';
      const prop = meta.getAttribute('property') || '';
      if (c) content.push(c);
      if (name) content.push(name);
      if (prop) content.push(prop);

      // Check generator meta
      if (name.toLowerCase() === 'generator' && c) {
        content.push(`generator:${c}`);
      }
    }
    return content;
  }

  private collectInlineScriptContent(): string[] {
    const content: string[] = [];
    const scripts = document.querySelectorAll('script:not([src])');
    for (const script of Array.from(scripts)) {
      const text = script.textContent || '';
      // Only take first 5000 chars per script to limit processing
      if (text) content.push(text.slice(0, 5000));
    }
    return content;
  }

  private checkWindowGlobals(): string[] {
    const globals: string[] = [];
    const keysToCheck = [
      '__REACT_DEVTOOLS_GLOBAL_HOOK__', '_reactRootContainer',
      '__NEXT_DATA__', '__vue__', '__nuxt', '__NUXT__',
      '__svelte', '_ng',
      'ga', 'gtag', '_gaq', '_hjSettings', 'hj',
      '_fs_debug', 'FS',
      'mixpanel', 'amplitude',
      'analytics', 'posthog',
      'Intercom', 'drift', '$crisp',
      'Stripe', '__firebase',
      'Shopify', 'Webflow',
    ];

    for (const key of keysToCheck) {
      try {
        if ((window as any)[key] !== undefined) {
          globals.push(key);
        }
      } catch {
        // Some globals throw on access
      }
    }

    // Check for React root
    try {
      const root = document.getElementById('root') || document.getElementById('__next') || document.getElementById('app');
      if (root) {
        if ((root as any)._reactRootContainer) globals.push('_reactRootContainer');
        if ((root as any).__vue__) globals.push('__vue__');
      }
    } catch {
      // Skip
    }

    // Check for Angular version attribute
    const ngVersion = document.querySelector('[ng-version]');
    if (ngVersion) globals.push('ng-version');

    // Check for data-reactroot
    const reactRoot = document.querySelector('[data-reactroot]');
    if (reactRoot) globals.push('data-reactroot');

    // Check for Vue data attributes
    const vueEl = document.querySelector('[data-v-]') || document.querySelector(`[class*="data-v-"]`);
    if (vueEl) globals.push('data-v-');

    return globals;
  }

  private detectCDNs(scriptSources: string[], linkHrefs: string[]): DetectedTool[] {
    const cdns: DetectedTool[] = [];
    const allSources = [...scriptSources, ...linkHrefs];

    const cdnSignatures = [
      { name: 'Cloudflare', domains: ['cdnjs.cloudflare.com', 'cdn.cloudflare.com'] },
      { name: 'CloudFront (AWS)', domains: ['cloudfront.net', 'd1.awsstatic.com'] },
      { name: 'Google CDN', domains: ['ajax.googleapis.com', 'fonts.googleapis.com', 'cdn.googleapis.com'] },
      { name: 'jsDelivr', domains: ['cdn.jsdelivr.net'] },
      { name: 'unpkg', domains: ['unpkg.com'] },
      { name: 'Fastly', domains: ['fastly.net', 'global.ssl.fastly.net'] },
      { name: 'Akamai', domains: ['akamaized.net', 'akadns.net'] },
      { name: 'Vercel', domains: ['vercel.app', 'vercel.com', '_vercel'] },
      { name: 'Netlify', domains: ['netlify.app', 'netlify.com'] },
    ];

    for (const cdn of cdnSignatures) {
      const matchedSignals: string[] = [];
      for (const domain of cdn.domains) {
        for (const src of allSources) {
          if (src.includes(domain)) {
            matchedSignals.push(`found "${domain}" in resource URL`);
            break;
          }
        }
      }
      if (matchedSignals.length > 0) {
        cdns.push({
          name: cdn.name,
          confidence: Math.min(1, matchedSignals.length * 0.4 + 0.3),
          signals: matchedSignals,
        });
      }
    }

    return cdns;
  }

  private detectABTesting(corpus: string, windowGlobals: string[]): DetectedTool[] {
    const tools: DetectedTool[] = [];

    const abTestSignatures = [
      { name: 'Google Optimize', signals: ['googleoptimize.com', 'optimize.google.com', 'gtag.*optimize'] },
      { name: 'Optimizely', signals: ['optimizely.com', 'cdn.optimizely.com', 'optimizely'] },
      { name: 'VWO', signals: ['visualwebsiteoptimizer.com', 'vwo_', 'dev.visualwebsiteoptimizer.com'] },
      { name: 'LaunchDarkly', signals: ['launchdarkly.com', 'ld-client-sdk'] },
      { name: 'Split.io', signals: ['split.io', 'cdn.split.io'] },
      { name: 'AB Tasty', signals: ['abtasty.com', 'try.abtasty.com'] },
    ];

    for (const sig of abTestSignatures) {
      const matchedSignals: string[] = [];
      for (const signal of sig.signals) {
        if (corpus.includes(signal)) {
          matchedSignals.push(`found "${signal}" in page source`);
        }
      }
      if (matchedSignals.length > 0) {
        tools.push({
          name: sig.name,
          confidence: Math.min(1, matchedSignals.length * 0.3 + 0.3),
          signals: matchedSignals,
        });
      }
    }

    return tools;
  }

  protected emptyResult(): ThirdPartyStack {
    return {
      analytics: [],
      cms: [],
      auth: [],
      payment: [],
      chat: [],
      cdns: [],
      frameworks: [],
      abTesting: [],
    };
  }
}
