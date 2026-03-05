/**
 * Knowledge Enrichment Engine
 * Uses Brave Search + Claude to generate best practice guides and pattern libraries
 * for scraped component types:
 * - Searches for UX best practices per component
 * - Searches for Nielsen Norman Group guidelines
 * - Searches for accessibility best practices (WCAG)
 * - Claude synthesizes search results into actionable guides
 * - Generates a pattern library document with dos/don'ts, accessibility, and performance notes
 */

import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, STORAGE_KEYS } from '@shared/constants';
import type { AppSettings, EnrichedKnowledge, BraveSearchResult } from '@shared/types';
import type { ExaSearchResult } from '@shared/types';
import type { ExaMCPClient } from './exa-mcp-client';

const log = createLogger('KnowledgeEnrich');

const DELAY_BETWEEN_SEARCHES_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class KnowledgeEnrichmentEngine {
  private braveApiKey: string = '';
  private claudeApiKey: string = '';
  private initialized: boolean = false;
  private exaClient: ExaMCPClient | null = null;

  setExaClient(client: ExaMCPClient): void {
    this.exaClient = client;
  }

  constructor() {
    this.loadApiKeys();
  }

  private async loadApiKeys(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.braveApiKey) {
        this.braveApiKey = settings.braveApiKey;
      }
      if (settings?.claudeApiKey) {
        this.claudeApiKey = settings.claudeApiKey;
      }
      if (this.braveApiKey && this.claudeApiKey) {
        this.initialized = true;
        log.info('API keys loaded');
      } else {
        log.warn('Missing API keys', {
          hasBrave: !!this.braveApiKey,
          hasClaude: !!this.claudeApiKey,
        });
      }
    } catch (err) {
      log.error('Failed to load API keys', err);
    }
  }

  private async ensureApiKeys(): Promise<void> {
    if (!this.initialized) {
      await this.loadApiKeys();
    }
    if (!this.braveApiKey) {
      throw new Error('Brave Search API key not configured. Please set it in Settings.');
    }
    if (!this.claudeApiKey) {
      throw new Error('Claude API key not configured. Please set it in Settings.');
    }
  }

  /**
   * Enrich component data with best practices from search + AI synthesis.
   */
  async enrichWithBestPractices(
    industry: string,
    components: string[]
  ): Promise<EnrichedKnowledge[]> {
    await this.ensureApiKeys();

    log.info('Enriching with best practices', { industry, componentCount: components.length });

    const results: EnrichedKnowledge[] = [];

    for (const componentType of components) {
      try {
        log.info('Enriching component', { componentType });

        // Run three parallel search queries per component
        const searchQueries = [
          `${componentType} UX best practices ${industry}`,
          `Nielsen Norman Group ${componentType} guidelines`,
          `${componentType} accessibility best practices WCAG`,
        ];

        const searchResults: BraveSearchResult[] = [];

        for (const query of searchQueries) {
          try {
            const results = await this.braveSearch(query, 5);
            searchResults.push(...results);
            await sleep(DELAY_BETWEEN_SEARCHES_MS);
          } catch (err) {
            log.warn('Search query failed', { query, error: err });
          }
        }

        // Deduplicate search results
        const seenUrls = new Set<string>();
        const uniqueResults = searchResults.filter(r => {
          const normalized = r.url.replace(/\/$/, '').toLowerCase();
          if (seenUrls.has(normalized)) return false;
          seenUrls.add(normalized);
          return true;
        });

        // Synthesize search results into actionable best practices using Claude
        const enriched = await this.synthesizeBestPractices(
          componentType,
          industry,
          uniqueResults
        );

        results.push(enriched);

      } catch (err) {
        log.error('Failed to enrich component', { componentType, error: err });

        // Return a minimal result for this component
        results.push({
          componentType,
          bestPractices: [],
          accessibilityRequirements: [],
          performanceConsiderations: [],
          dosAndDonts: { dos: [], donts: [] },
          patternVariations: [],
          industrySpecificNotes: [],
        });
      }
    }

    log.info('Enrichment complete', { enrichedCount: results.length });
    return results;
  }

  /**
   * Generate a comprehensive pattern library document for the given components.
   */
  async enrichWithPatternLibrary(components: string[]): Promise<EnrichedKnowledge[]> {
    await this.ensureApiKeys();

    log.info('Generating pattern library', { componentCount: components.length });

    const systemPrompt = `You are a senior UX design systems engineer. Generate a comprehensive pattern library entry for each UI component type. Be specific and actionable.

For each component type, provide a JSON object matching this exact schema:
{
  "componentType": "<type>",
  "bestPractices": [
    { "source": "Pattern Library", "guidelines": ["<guideline>", ...] }
  ],
  "accessibilityRequirements": ["<requirement>", ...],
  "performanceConsiderations": ["<consideration>", ...],
  "dosAndDonts": {
    "dos": ["<do>", ...],
    "donts": ["<dont>", ...]
  },
  "patternVariations": [
    { "name": "<variation>", "description": "<desc>", "useCase": "<when to use>" }
  ],
  "industrySpecificNotes": ["<note>", ...]
}

Respond with a JSON array of these objects, one per component type.`;

    const userMessage = `Generate a comprehensive pattern library for these UI component types:

${components.map((c, i) => `${i + 1}. ${c}`).join('\n')}

For each component:
1. Document the common pattern variations (e.g., for buttons: primary, secondary, ghost, icon-only, loading)
2. Include dos and don'ts (be specific, not generic)
3. Include accessibility requirements (ARIA roles, keyboard navigation, screen reader text)
4. Include performance considerations (animation costs, lazy loading, virtualization)
5. Reference established patterns from Material Design, Apple HIG, or other design systems`;

    try {
      const response = await this.claudeCall(systemPrompt, userMessage);
      const parsed = this.parseJsonResponse<EnrichedKnowledge[]>(response);

      if (Array.isArray(parsed)) {
        return parsed;
      }

      log.warn('Pattern library response was not an array, wrapping');
      return [parsed as unknown as EnrichedKnowledge];
    } catch (err) {
      log.error('Failed to generate pattern library', err);

      // Return minimal results
      return components.map(componentType => ({
        componentType,
        bestPractices: [],
        accessibilityRequirements: [],
        performanceConsiderations: [],
        dosAndDonts: { dos: [], donts: [] },
        patternVariations: [],
        industrySpecificNotes: [],
      }));
    }
  }

  async enrichWithExaKnowledge(
    componentType: string,
    context: string
  ): Promise<EnrichedKnowledge & { exaResearchSources?: ExaSearchResult[] }> {
    log.info('Enriching with Exa knowledge', { componentType, context });

    let exaResults: ExaSearchResult[] = [];

    if (this.exaClient) {
      const queries = [
        `${componentType} UX research 2024 2025`,
        `${componentType} conversion rate optimization study`,
        `${componentType} accessibility patterns`,
      ];

      for (const query of queries) {
        try {
          const results = await this.exaClient.searchUXPatterns(query, {
            numResults: 5,
            includeText: true,
            category: 'research paper',
          });
          exaResults.push(...results);
          await sleep(300);
        } catch (err) {
          log.warn('Exa search query failed', { query, error: err });
        }
      }
    }

    // Merge with existing Brave-based enrichment
    const braveEnriched = await this.enrichWithBestPractices(context, [componentType]);
    const base = braveEnriched[0] || {
      componentType,
      bestPractices: [],
      accessibilityRequirements: [],
      performanceConsiderations: [],
      dosAndDonts: { dos: [], donts: [] },
      patternVariations: [],
      industrySpecificNotes: [],
    };

    // Add Exa-sourced best practices
    if (exaResults.length > 0) {
      base.bestPractices.push({
        source: 'Exa Neural Search',
        guidelines: exaResults
          .filter(r => r.highlights && r.highlights.length > 0)
          .flatMap(r => r.highlights || [])
          .slice(0, 10),
      });
    }

    return {
      ...base,
      exaResearchSources: exaResults,
    };
  }

  // ===== Private Methods =====

  private async synthesizeBestPractices(
    componentType: string,
    industry: string,
    searchResults: BraveSearchResult[]
  ): Promise<EnrichedKnowledge> {
    const systemPrompt = `You are a senior UX researcher synthesizing search results into actionable best practice guides. Analyze the search results provided and generate a comprehensive best practice document for the specified UI component.

Respond with a JSON object matching this exact schema:
{
  "componentType": "<type>",
  "bestPractices": [
    { "source": "<source name or URL>", "guidelines": ["<guideline>", ...] }
  ],
  "accessibilityRequirements": ["<requirement>", ...],
  "performanceConsiderations": ["<consideration>", ...],
  "dosAndDonts": {
    "dos": ["<do>", ...],
    "donts": ["<dont>", ...]
  },
  "patternVariations": [
    { "name": "<variation>", "description": "<desc>", "useCase": "<when to use>" }
  ],
  "industrySpecificNotes": ["<note specific to the given industry>", ...]
}`;

    const searchSummary = searchResults.slice(0, 10).map(r =>
      `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.description}`
    ).join('\n\n');

    const userMessage = `Component Type: ${componentType}
Industry: ${industry}

Search Results to Synthesize:
${searchSummary || 'No search results available. Generate best practices from your knowledge.'}

Please synthesize these search results (and your own knowledge) into actionable best practices for the ${componentType} component in the ${industry} industry.`;

    try {
      const response = await this.claudeCall(systemPrompt, userMessage);
      return this.parseJsonResponse<EnrichedKnowledge>(response);
    } catch (err) {
      log.error('Failed to synthesize best practices', { componentType, error: err });

      return {
        componentType,
        bestPractices: searchResults.slice(0, 3).map(r => ({
          source: r.url,
          guidelines: [r.description],
        })),
        accessibilityRequirements: [],
        performanceConsiderations: [],
        dosAndDonts: { dos: [], donts: [] },
        patternVariations: [],
        industrySpecificNotes: [],
      };
    }
  }

  private async braveSearch(query: string, count: number = 5): Promise<BraveSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
      search_lang: 'en',
    });

    const url = `${API_ENDPOINTS.BRAVE_SEARCH}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.braveApiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Brave Search API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const results: BraveSearchResult[] = [];

    if (data.web?.results) {
      for (const item of data.web.results) {
        results.push({
          title: item.title || '',
          url: item.url || '',
          description: item.description || '',
          thumbnail: item.thumbnail?.src || undefined,
          age: item.age || undefined,
        });
      }
    }

    return results;
  }

  private async claudeCall(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(API_ENDPOINTS.CLAUDE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Claude API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.content && data.content.length > 0) {
      const textBlock = data.content.find((b: { type: string }) => b.type === 'text');
      if (textBlock) {
        return textBlock.text;
      }
    }

    throw new Error('No text content in Claude response');
  }

  private parseJsonResponse<T>(response: string): T {
    // Try to extract JSON from the response (Claude sometimes wraps it in markdown code blocks)
    let jsonStr = response.trim();

    // Remove markdown code block markers
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr);
    } catch {
      // Try to find JSON array or object in the response
      const jsonMatch = jsonStr.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch {
          throw new Error('Failed to parse JSON from Claude response');
        }
      }
      throw new Error('No valid JSON found in Claude response');
    }
  }
}
