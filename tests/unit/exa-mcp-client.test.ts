import { ExaMCPClient } from '../../src/background/exa-mcp-client';

const mockSettings = {
  ux_scraper_settings: {
    exaApiKey: 'exa-test-key-123',
  },
};

const mockFetchResponse = (data: unknown) => ({
  ok: true,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
});

describe('ExaMCPClient', () => {
  let client: ExaMCPClient;

  beforeEach(() => {
    (chrome.storage.local.get as jest.Mock).mockResolvedValue(mockSettings);
    client = new ExaMCPClient();
    jest.clearAllMocks();
    (chrome.storage.local.get as jest.Mock).mockResolvedValue(mockSettings);
  });

  describe('searchUXPatterns', () => {
    it('should return ExaSearchResult array', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          results: [
            { url: 'https://nngroup.com/article', title: 'UX Best Practices', score: 0.95, text: 'Research paper content', highlights: ['Key finding 1'] },
            { url: 'https://smashingmagazine.com/article', title: 'Design Patterns', score: 0.88, text: 'Article content' },
          ],
        })
      );

      const results = await client.searchUXPatterns('navigation patterns for SaaS');

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('url', 'https://nngroup.com/article');
      expect(results[0]).toHaveProperty('title', 'UX Best Practices');
      expect(results[0]).toHaveProperty('score', 0.95);
      expect(results[0]).toHaveProperty('text');
      expect(results[0]).toHaveProperty('highlights');
    });

    it('should throw when API key is missing', async () => {
      (chrome.storage.local.get as jest.Mock).mockResolvedValue({});

      const noKeyClient = new ExaMCPClient();
      await expect(noKeyClient.searchUXPatterns('test query')).rejects.toThrow('Exa API key not configured');
    });
  });

  describe('findSimilarDesigns', () => {
    it('should use correct referenceUrl', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({
          results: [
            { url: 'https://similar-site.com', title: 'Similar Design', score: 0.82 },
          ],
        })
      );

      const results = await client.findSimilarDesigns('https://example.com');

      expect(results).toHaveLength(1);
      expect(results[0].url).toBe('https://similar-site.com');

      // Verify the URL was passed to the API
      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.url).toBe('https://example.com');
    });
  });

  describe('searchCompetitorIntelligence', () => {
    it('should filter by date range (last 90 days)', async () => {
      globalThis.fetch = jest.fn().mockResolvedValue(
        mockFetchResponse({ results: [] })
      );

      await client.searchCompetitorIntelligence('Figma', 'redesign announcement');

      const fetchCall = (globalThis.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.startPublishedDate).toBeDefined();

      // Verify date is approximately 90 days ago
      const startDate = new Date(body.startPublishedDate);
      const now = new Date();
      const daysDiff = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysDiff).toBeGreaterThanOrEqual(89);
      expect(daysDiff).toBeLessThanOrEqual(91);
    });
  });
});
