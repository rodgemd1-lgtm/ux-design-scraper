import { MCPOrchestrator } from '../../src/background/mcp-orchestrator';
import type { ExaMCPClient } from '../../src/background/exa-mcp-client';
import type { FirecrawlClient } from '../../src/background/firecrawl-client';

describe('MCPOrchestrator', () => {
  describe('initialization', () => {
    it('should initialize with mock MCP server connections', async () => {
      const mockExaClient = {} as ExaMCPClient;
      const mockFirecrawlClient = {} as FirecrawlClient;

      const orchestrator = new MCPOrchestrator(mockExaClient, mockFirecrawlClient);
      await orchestrator.initializeMCPStack();

      // Should not throw
      expect(orchestrator).toBeDefined();
    });

    it('should handle missing clients gracefully', async () => {
      const orchestrator = new MCPOrchestrator();
      await orchestrator.initializeMCPStack();
      expect(orchestrator).toBeDefined();
    });
  });

  describe('runExaSearch', () => {
    it('should route to Exa client', async () => {
      const mockSearchResults = [
        { url: 'https://test.com', title: 'Test', score: 0.9 },
      ];
      const mockExaClient = {
        searchUXPatterns: jest.fn().mockResolvedValue(mockSearchResults),
      } as unknown as ExaMCPClient;

      const orchestrator = new MCPOrchestrator(mockExaClient);
      const results = await orchestrator.runExaSearch('test query');

      expect(results).toEqual(mockSearchResults);
      expect(mockExaClient.searchUXPatterns).toHaveBeenCalledWith('test query');
    });

    it('should return empty array when Exa client is not configured', async () => {
      const orchestrator = new MCPOrchestrator();
      const results = await orchestrator.runExaSearch('test query');

      expect(results).toEqual([]);
    });
  });

  describe('runFirecrawlExtract', () => {
    it('should route to Firecrawl client', async () => {
      const mockExtractResult = { navigation: { items: ['Home'], depth: 1, type: 'horizontal' } };
      const mockFirecrawlClient = {
        extractStructuredUXData: jest.fn().mockResolvedValue(mockExtractResult),
      } as unknown as FirecrawlClient;

      const orchestrator = new MCPOrchestrator(undefined, mockFirecrawlClient);
      const result = await orchestrator.runFirecrawlExtract('https://example.com', {});

      expect(result).toEqual(mockExtractResult);
    });

    it('should return empty object when Firecrawl client is not configured', async () => {
      const orchestrator = new MCPOrchestrator();
      const result = await orchestrator.runFirecrawlExtract('https://example.com', {});

      expect(result).toEqual({});
    });
  });

  describe('runPlaywrightCapture', () => {
    it('should fall back to Firecrawl screenshot when Playwright unavailable', async () => {
      const mockFirecrawlClient = {
        scrapeUrl: jest.fn().mockResolvedValue({
          screenshot: 'base64screenshotdata',
          metadata: { title: 'Test' },
        }),
      } as unknown as FirecrawlClient;

      const orchestrator = new MCPOrchestrator(undefined, mockFirecrawlClient);
      const result = await orchestrator.runPlaywrightCapture('https://example.com', [
        { type: 'hover', selector: 'nav a' },
      ]);

      expect(result).not.toBeNull();
      expect(result).toHaveProperty('dataUrl');
      expect(result).toHaveProperty('breakpoint', 1280);
      expect(result).toHaveProperty('timestamp');
    });
  });
});
