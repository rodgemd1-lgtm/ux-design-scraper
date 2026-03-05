import { createLogger } from '@shared/logger';
import type {
  ExaSearchResult,
  ScreenshotData,
  PlaywrightAction,
} from '@shared/types';
import type { ExaMCPClient } from './exa-mcp-client';
import type { FirecrawlClient } from './firecrawl-client';

const log = createLogger('MCPOrchestrator');

export class MCPOrchestrator {
  private exaClient: ExaMCPClient | null = null;
  private firecrawlClient: FirecrawlClient | null = null;
  private initialized: boolean = false;

  constructor(
    exaClient?: ExaMCPClient,
    firecrawlClient?: FirecrawlClient,
  ) {
    this.exaClient = exaClient || null;
    this.firecrawlClient = firecrawlClient || null;
  }

  async initializeMCPStack(): Promise<void> {
    log.info('Initializing MCP stack');

    const connections: string[] = [];

    if (this.exaClient) {
      connections.push('Exa MCP (semantic search)');
    }

    if (this.firecrawlClient) {
      connections.push('Firecrawl MCP (structured extraction)');
    }

    // Playwright MCP runs as external Node.js process — log availability
    connections.push('Playwright MCP (interaction states) — requires external bridge');

    this.initialized = true;
    log.info('MCP stack initialized', { connections });
  }

  async runExaSearch(query: string): Promise<ExaSearchResult[]> {
    if (!this.exaClient) {
      log.warn('Exa client not configured, returning empty results');
      return [];
    }

    try {
      return await this.exaClient.searchUXPatterns(query);
    } catch (err) {
      log.error('Exa search via MCP failed', err);
      return [];
    }
  }

  async runFirecrawlExtract(url: string, _schema: object): Promise<object> {
    if (!this.firecrawlClient) {
      log.warn('Firecrawl client not configured, returning empty result');
      return {};
    }

    try {
      return await this.firecrawlClient.extractStructuredUXData(url);
    } catch (err) {
      log.error('Firecrawl extract via MCP failed', err);
      return {};
    }
  }

  async runPlaywrightCapture(url: string, actions?: PlaywrightAction[]): Promise<ScreenshotData | null> {
    log.info('Playwright capture requested', { url, actionCount: actions?.length || 0 });

    // Playwright MCP requires an external Node.js bridge process
    // In the Chrome extension context, we send a message to the companion process
    // For now, fall back to Firecrawl screenshot as a complementary source
    if (this.firecrawlClient) {
      try {
        const result = await this.firecrawlClient.scrapeUrl(url, { formats: ['screenshot'] });
        if (result.screenshot) {
          return {
            breakpoint: 1280,
            dataUrl: result.screenshot.startsWith('data:')
              ? result.screenshot
              : `data:image/png;base64,${result.screenshot}`,
            width: 1280,
            height: 900,
            timestamp: Date.now(),
          };
        }
      } catch (err) {
        log.error('Firecrawl screenshot fallback failed', err);
      }
    }

    log.warn('Playwright MCP not available and Firecrawl fallback failed', { url });
    return null;
  }
}
