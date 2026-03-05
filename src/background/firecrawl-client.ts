import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, STORAGE_KEYS } from '@shared/constants';
import type {
  AppSettings,
  FirecrawlPageResult,
  FirecrawlStructuredUXData,
  FirecrawlCrawlResult,
  WorkflowScreenshotSequence,
} from '@shared/types';

const log = createLogger('FirecrawlClient');

export interface FirecrawlScrapeOptions {
  includeScreenshot?: boolean;
  formats?: ('markdown' | 'html' | 'screenshot')[];
  waitFor?: number;
  mobile?: boolean;
}

export class FirecrawlClient {
  private apiKey: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.firecrawlApiKey) {
        this.apiKey = settings.firecrawlApiKey;
        this.initialized = true;
        log.info('API key loaded');
      } else {
        log.warn('No Firecrawl API key found in settings');
      }
    } catch (err) {
      log.error('Failed to load API key', err);
    }
  }

  private async ensureApiKey(): Promise<void> {
    if (!this.initialized || !this.apiKey) {
      await this.loadApiKey();
    }
    if (!this.apiKey) {
      throw new Error('Firecrawl API key not configured. Please set it in Settings.');
    }
  }

  async scrapeUrl(url: string, options?: FirecrawlScrapeOptions): Promise<FirecrawlPageResult> {
    await this.ensureApiKey();
    log.info('Scraping URL', { url });

    const formats = options?.formats || ['markdown', 'html', 'screenshot'];
    const body: Record<string, unknown> = {
      url,
      formats,
    };
    if (options?.waitFor) body.waitFor = options.waitFor;
    if (options?.mobile) body.mobile = options.mobile;

    const response = await fetch(`${API_ENDPOINTS.FIRECRAWL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Firecrawl API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const result = data.data || data;

    const pageResult: FirecrawlPageResult = {
      url,
      markdown: result.markdown || '',
      html: result.html || '',
      screenshot: result.screenshot || '',
      metadata: {
        title: result.metadata?.title || '',
        description: result.metadata?.description || '',
        ogImage: result.metadata?.ogImage,
        keywords: result.metadata?.keywords,
        canonicalUrl: result.metadata?.canonicalUrl || result.metadata?.sourceURL,
      },
      structuredData: {
        navigation: { items: [], depth: 0, type: 'unknown' },
        ctaElements: [],
        formPatterns: [],
        socialProof: { testimonials: false, ratings: false, logos: false },
        pricingMentions: [],
        keyMessages: [],
        designSystem: { primaryColors: [], fontFamilies: [] },
        contentSections: [],
        interactionPatterns: [],
      },
      capturedAt: new Date().toISOString(),
    };

    log.info('Scrape complete', { url, markdownLength: pageResult.markdown.length, hasScreenshot: !!pageResult.screenshot });
    return pageResult;
  }

  async extractStructuredUXData(url: string): Promise<FirecrawlStructuredUXData> {
    await this.ensureApiKey();
    log.info('Extracting structured UX data', { url });

    const schema = {
      type: 'object',
      properties: {
        navigation: {
          type: 'object',
          properties: {
            items: { type: 'array', items: { type: 'string' } },
            depth: { type: 'number' },
            type: { type: 'string' },
          },
        },
        ctaElements: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              type: { type: 'string' },
              position: { type: 'string' },
            },
          },
        },
        formPatterns: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              fields: { type: 'array', items: { type: 'string' } },
              validation: { type: 'string' },
            },
          },
        },
        socialProof: {
          type: 'object',
          properties: {
            testimonials: { type: 'boolean' },
            ratings: { type: 'boolean' },
            logos: { type: 'boolean' },
          },
        },
        pricingMentions: { type: 'array', items: { type: 'string' } },
        keyMessages: { type: 'array', items: { type: 'string' } },
        designSystem: {
          type: 'object',
          properties: {
            primaryColors: { type: 'array', items: { type: 'string' } },
            fontFamilies: { type: 'array', items: { type: 'string' } },
          },
        },
        contentSections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
            },
          },
        },
        interactionPatterns: { type: 'array', items: { type: 'string' } },
      },
    };

    const response = await fetch(`${API_ENDPOINTS.FIRECRAWL}/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        formats: ['extract'],
        extract: {
          schema,
          prompt: 'Extract all UX-relevant structured data from this page including navigation structure, CTA elements, form patterns, social proof elements, pricing mentions, key messages, design system tokens (colors and fonts), content sections, and interaction patterns.',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Firecrawl extract error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const extracted = data.data?.extract || data.extract || {};

    const result: FirecrawlStructuredUXData = {
      navigation: extracted.navigation || { items: [], depth: 0, type: 'unknown' },
      ctaElements: extracted.ctaElements || [],
      formPatterns: extracted.formPatterns || [],
      socialProof: extracted.socialProof || { testimonials: false, ratings: false, logos: false },
      pricingMentions: extracted.pricingMentions || [],
      keyMessages: extracted.keyMessages || [],
      designSystem: extracted.designSystem || { primaryColors: [], fontFamilies: [] },
      contentSections: extracted.contentSections || [],
      interactionPatterns: extracted.interactionPatterns || [],
    };

    log.info('UX data extracted', { url, ctaCount: result.ctaElements.length, sectionCount: result.contentSections.length });
    return result;
  }

  async crawlSiteForUXPatterns(url: string, maxPages: number = 10): Promise<FirecrawlCrawlResult> {
    await this.ensureApiKey();
    log.info('Crawling site for UX patterns', { url, maxPages });

    const response = await fetch(`${API_ENDPOINTS.FIRECRAWL}/crawl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        url,
        limit: maxPages,
        scrapeOptions: {
          formats: ['markdown', 'screenshot'],
        },
        includePaths: ['/pricing', '/features', '/about', '/product', '/solutions', '/customers'],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Firecrawl crawl error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    // Firecrawl crawl is async — poll for results
    const crawlId = data.id;
    if (!crawlId) {
      throw new Error('No crawl ID returned from Firecrawl');
    }

    log.info('Crawl initiated, polling for results', { crawlId });

    const pages: FirecrawlPageResult[] = [];
    let completed = false;
    const maxPolls = 30;
    let pollCount = 0;

    while (!completed && pollCount < maxPolls) {
      pollCount++;
      await new Promise(resolve => setTimeout(resolve, 2000));

      const statusResponse = await fetch(`${API_ENDPOINTS.FIRECRAWL}/crawl/${crawlId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();

      if (statusData.status === 'completed') {
        completed = true;
        const results = statusData.data || [];
        for (const item of results) {
          pages.push({
            url: item.metadata?.sourceURL || item.url || url,
            markdown: item.markdown || '',
            html: item.html || '',
            screenshot: item.screenshot || '',
            metadata: {
              title: item.metadata?.title || '',
              description: item.metadata?.description || '',
              ogImage: item.metadata?.ogImage,
              keywords: item.metadata?.keywords,
              canonicalUrl: item.metadata?.canonicalUrl,
            },
            structuredData: {
              navigation: { items: [], depth: 0, type: 'unknown' },
              ctaElements: [],
              formPatterns: [],
              socialProof: { testimonials: false, ratings: false, logos: false },
              pricingMentions: [],
              keyMessages: [],
              designSystem: { primaryColors: [], fontFamilies: [] },
              contentSections: [],
              interactionPatterns: [],
            },
            capturedAt: new Date().toISOString(),
          });
        }
      } else if (statusData.status === 'failed') {
        throw new Error(`Crawl failed: ${statusData.error || 'Unknown error'}`);
      }
    }

    if (!completed) {
      log.warn('Crawl polling timed out', { crawlId, pollCount });
    }

    log.info('Crawl complete', { url, pageCount: pages.length });
    return {
      baseUrl: url,
      pages,
      totalPages: pages.length,
      crawledAt: new Date().toISOString(),
    };
  }

  async captureWorkflowScreenshots(urls: string[]): Promise<WorkflowScreenshotSequence> {
    await this.ensureApiKey();
    log.info('Capturing workflow screenshots', { urlCount: urls.length });

    const steps: WorkflowScreenshotSequence['steps'] = [];

    for (let i = 0; i < urls.length; i++) {
      try {
        const desktopResult = await this.scrapeUrl(urls[i], {
          formats: ['screenshot'],
          includeScreenshot: true,
        });

        let mobileScreenshot: string | undefined;
        try {
          const mobileResult = await this.scrapeUrl(urls[i], {
            formats: ['screenshot'],
            includeScreenshot: true,
            mobile: true,
          });
          mobileScreenshot = mobileResult.screenshot || undefined;
        } catch {
          log.warn('Mobile screenshot failed', { url: urls[i] });
        }

        steps.push({
          url: urls[i],
          screenshot: desktopResult.screenshot || '',
          mobileScreenshot,
          title: desktopResult.metadata.title || `Step ${i + 1}`,
          stepNumber: i + 1,
        });

        log.info('Workflow step captured', { stepNumber: i + 1, url: urls[i] });
      } catch (err) {
        log.error('Failed to capture workflow step', { stepNumber: i + 1, url: urls[i], error: err });
        steps.push({
          url: urls[i],
          screenshot: '',
          title: `Step ${i + 1} (failed)`,
          stepNumber: i + 1,
        });
      }
    }

    return {
      workflowName: 'Workflow Capture',
      steps,
      totalSteps: steps.length,
      capturedAt: new Date().toISOString(),
      source: 'firecrawl',
    };
  }
}
