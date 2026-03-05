import { FirecrawlClient } from '../../src/background/firecrawl-client';

// Mock chrome.storage.local
const mockSettings = {
  ux_scraper_settings: {
    firecrawlApiKey: 'fc-test-key-123',
  },
};

// Mock fetch
const mockFetchResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

describe('FirecrawlClient', () => {
  let client: FirecrawlClient;

  beforeEach(() => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue(mockSettings);
    client = new FirecrawlClient();
    jest.clearAllMocks();
    (chrome.storage.local.get as jest.Mock).mockResolvedValue(mockSettings);
  });

  describe('scrapeUrl', () => {
    it('should return FirecrawlPageResult shape', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          data: {
            markdown: '# Test Page',
            html: '<h1>Test Page</h1>',
            screenshot: 'base64data',
            metadata: { title: 'Test', description: 'A test page' },
          },
        })
      );

      const result = await client.scrapeUrl('https://example.com');

      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('markdown');
      expect(result).toHaveProperty('html');
      expect(result).toHaveProperty('screenshot');
      expect(result).toHaveProperty('metadata');
      expect(result.metadata).toHaveProperty('title');
      expect(result.metadata).toHaveProperty('description');
      expect(result).toHaveProperty('structuredData');
      expect(result).toHaveProperty('capturedAt');
    });

    it('should throw when API key is missing', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      const noKeyClient = new FirecrawlClient();
      await expect(noKeyClient.scrapeUrl('https://example.com')).rejects.toThrow('Firecrawl API key not configured');
    });
  });

  describe('extractStructuredUXData', () => {
    it('should return FirecrawlStructuredUXData shape', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          data: {
            extract: {
              navigation: { items: ['Home', 'About'], depth: 2, type: 'horizontal' },
              ctaElements: [{ text: 'Sign Up', type: 'button', position: 'hero' }],
              formPatterns: [],
              socialProof: { testimonials: true, ratings: false, logos: true },
              pricingMentions: ['$9.99/mo'],
              keyMessages: ['Fast and reliable'],
              designSystem: { primaryColors: ['#FF0000'], fontFamilies: ['Inter'] },
              contentSections: [{ name: 'Hero', type: 'hero' }],
              interactionPatterns: ['hover-expand'],
            },
          },
        })
      );

      const result = await client.extractStructuredUXData('https://example.com');

      expect(result).toHaveProperty('navigation');
      expect(result.navigation.items).toEqual(['Home', 'About']);
      expect(result).toHaveProperty('ctaElements');
      expect(result.ctaElements).toHaveLength(1);
      expect(result).toHaveProperty('socialProof');
      expect(result).toHaveProperty('designSystem');
      expect(result.designSystem.primaryColors).toContain('#FF0000');
    });
  });

  describe('captureWorkflowScreenshots', () => {
    it('should return WorkflowScreenshotSequence shape', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          data: {
            screenshot: 'base64screenshot',
            metadata: { title: 'Step 1' },
          },
        })
      );

      const result = await client.captureWorkflowScreenshots(['https://example.com/step1', 'https://example.com/step2']);

      expect(result).toHaveProperty('workflowName');
      expect(result).toHaveProperty('steps');
      expect(result.steps).toHaveLength(2);
      expect(result).toHaveProperty('totalSteps', 2);
      expect(result).toHaveProperty('capturedAt');
      expect(result).toHaveProperty('source', 'firecrawl');
      expect(result.steps[0]).toHaveProperty('stepNumber', 1);
      expect(result.steps[0]).toHaveProperty('url');
      expect(result.steps[0]).toHaveProperty('screenshot');
    });
  });
});
