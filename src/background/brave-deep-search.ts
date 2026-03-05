/**
 * Enhanced Brave Search Pipeline (Multi-Round)
 * Runs 5 rounds of searches for comprehensive design research:
 * Round 1: Industry + style website searches
 * Round 2: Pattern-based searches derived from Round 1 results
 * Round 3: Image search for visual inspiration
 * Round 4: Competitor deep-dive
 * Round 5: Design blog/resource search
 *
 * Deduplicates across all rounds, scores results by relevance.
 */

import { createLogger } from '@shared/logger';
import { API_ENDPOINTS, STORAGE_KEYS } from '@shared/constants';
import type {
  AppSettings,
  BraveSearchResult,
  BraveImageResult,
  DeepSearchResult,
} from '@shared/types';

const log = createLogger('DeepSearch');

const MAX_RESULTS_PER_QUERY = 10;
const DELAY_BETWEEN_QUERIES_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class BraveDeepSearchClient {
  private apiKey: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.braveApiKey) {
        this.apiKey = settings.braveApiKey;
        this.initialized = true;
        log.info('API key loaded');
      } else {
        log.warn('No Brave Search API key found in settings');
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
      throw new Error('Brave Search API key not configured. Please set it in Settings.');
    }
  }

  async deepSearch(
    goal: string,
    industry: string,
    style: string,
    audience: string
  ): Promise<DeepSearchResult> {
    await this.ensureApiKey();

    const startTime = Date.now();
    const seenUrls = new Set<string>();
    const rounds: DeepSearchResult['rounds'] = [];
    const categorized: DeepSearchResult['categorized'] = {
      inspiration: [],
      competitors: [],
      patterns: [],
      blogs: [],
      images: [],
      trends: [],
    };

    log.info('Starting deep search', { goal, industry, style, audience });

    // ===== Round 1: Industry + Style Searches =====
    log.info('Round 1: Industry + style searches');
    const round1Queries = [
      `${industry} best website design 2025 2026`,
      `${style} website examples ${industry}`,
    ];

    const round1Results = await this.executeQueries(round1Queries, seenUrls);
    categorized.inspiration.push(...round1Results);
    rounds.push({ round: 1, query: round1Queries.join(' | '), resultCount: round1Results.length });

    await sleep(DELAY_BETWEEN_QUERIES_MS);

    // ===== Round 2: Pattern-Based Searches =====
    log.info('Round 2: Pattern-based searches from Round 1');
    const patterns = this.extractPatternsFromResults(round1Results);
    const round2Queries = patterns.slice(0, 3).map(
      pattern => `${pattern} design pattern ${industry}`
    );

    if (round2Queries.length > 0) {
      const round2Results = await this.executeQueries(round2Queries, seenUrls);
      categorized.patterns.push(...round2Results);
      rounds.push({ round: 2, query: round2Queries.join(' | '), resultCount: round2Results.length });
    }

    await sleep(DELAY_BETWEEN_QUERIES_MS);

    // ===== Round 3: Image Search for Visual Inspiration =====
    log.info('Round 3: Image search for moodboard');
    const round3ImageQueries = [
      `${style} UI design moodboard`,
      `${industry} luxury branding`,
    ];

    const imageResults = await this.executeImageQueries(round3ImageQueries);
    categorized.images.push(...imageResults);
    rounds.push({ round: 3, query: round3ImageQueries.join(' | '), resultCount: imageResults.length });

    await sleep(DELAY_BETWEEN_QUERIES_MS);

    // ===== Round 4: Competitor Deep-Dive =====
    log.info('Round 4: Competitor analysis');
    // Extract potential competitor names from Round 1 results
    const competitors = this.extractCompetitorNames(round1Results, industry);
    const round4Queries = competitors.slice(0, 4).map(
      comp => `${comp} website design analysis`
    );

    if (round4Queries.length > 0) {
      const round4Results = await this.executeQueries(round4Queries, seenUrls);
      categorized.competitors.push(...round4Results);
      rounds.push({ round: 4, query: round4Queries.join(' | '), resultCount: round4Results.length });
    }

    await sleep(DELAY_BETWEEN_QUERIES_MS);

    // ===== Round 5: Design Blog/Resource Search =====
    log.info('Round 5: Design blogs and resources');
    const round5Queries = [
      `site:dribbble.com ${industry} ${style}`,
      `site:behance.net ${industry} UI`,
      `${industry} UX design trends ${new Date().getFullYear()}`,
    ];

    const round5Results = await this.executeQueries(round5Queries, seenUrls);

    // Categorize Round 5 results
    for (const result of round5Results) {
      const url = result.url.toLowerCase();
      if (url.includes('dribbble.com') || url.includes('behance.net')) {
        categorized.blogs.push(result);
      } else if (result.title.toLowerCase().includes('trend') || result.description.toLowerCase().includes('trend')) {
        categorized.trends.push(result);
      } else {
        categorized.blogs.push(result);
      }
    }
    rounds.push({ round: 5, query: round5Queries.join(' | '), resultCount: round5Results.length });

    // Calculate total unique results
    const totalUniqueResults = categorized.inspiration.length +
      categorized.competitors.length +
      categorized.patterns.length +
      categorized.blogs.length +
      categorized.images.length +
      categorized.trends.length;

    const searchDuration = Date.now() - startTime;

    log.info('Deep search complete', {
      rounds: rounds.length,
      totalUniqueResults,
      searchDuration: `${searchDuration}ms`,
      categories: {
        inspiration: categorized.inspiration.length,
        competitors: categorized.competitors.length,
        patterns: categorized.patterns.length,
        blogs: categorized.blogs.length,
        images: categorized.images.length,
        trends: categorized.trends.length,
      },
    });

    return {
      rounds,
      categorized,
      totalUniqueResults,
      searchDuration,
    };
  }

  async searchImages(query: string): Promise<BraveImageResult[]> {
    await this.ensureApiKey();
    return this.executeImageQuery(query);
  }

  async searchNews(query: string): Promise<BraveSearchResult[]> {
    await this.ensureApiKey();

    log.info('News search', { query });

    const params = new URLSearchParams({
      q: query,
      count: '10',
      search_lang: 'en',
      freshness: 'pw', // Past week
    });

    const url = `${API_ENDPOINTS.BRAVE_SEARCH}?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Brave Search API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const results: BraveSearchResult[] = [];

      if (data.news?.results) {
        for (const item of data.news.results) {
          results.push({
            title: item.title || '',
            url: item.url || '',
            description: item.description || '',
            thumbnail: item.thumbnail?.src || undefined,
            age: item.age || undefined,
          });
        }
      }

      // Fallback to web results if no news results
      if (results.length === 0 && data.web?.results) {
        for (const item of data.web.results.slice(0, 5)) {
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
    } catch (err) {
      log.error('News search failed', err);
      return [];
    }
  }

  // ===== Private Helpers =====

  private async executeQueries(
    queries: string[],
    seenUrls: Set<string>
  ): Promise<BraveSearchResult[]> {
    const allResults: BraveSearchResult[] = [];

    for (const query of queries) {
      try {
        const results = await this.webSearch(query);

        for (const result of results) {
          const normalizedUrl = result.url.replace(/\/$/, '').toLowerCase();
          if (!seenUrls.has(normalizedUrl)) {
            seenUrls.add(normalizedUrl);
            allResults.push(result);
          }
        }

        await sleep(DELAY_BETWEEN_QUERIES_MS);
      } catch (err) {
        log.warn('Query failed', { query, error: err });
      }
    }

    return allResults;
  }

  private async webSearch(query: string): Promise<BraveSearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(MAX_RESULTS_PER_QUERY),
      search_lang: 'en',
    });

    const url = `${API_ENDPOINTS.BRAVE_SEARCH}?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': this.apiKey,
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

  private async executeImageQueries(queries: string[]): Promise<BraveImageResult[]> {
    const allResults: BraveImageResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      try {
        const results = await this.executeImageQuery(query);

        for (const result of results) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            allResults.push(result);
          }
        }

        await sleep(DELAY_BETWEEN_QUERIES_MS);
      } catch (err) {
        log.warn('Image query failed', { query, error: err });
      }
    }

    return allResults;
  }

  private async executeImageQuery(query: string): Promise<BraveImageResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: '10',
      search_lang: 'en',
    });

    // Brave Image Search API endpoint
    const url = `https://api.search.brave.com/res/v1/images/search?${params.toString()}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        // Image search may not be available on all API plans
        log.warn('Image search API returned non-OK', { status: response.status });
        return [];
      }

      const data = await response.json();
      const results: BraveImageResult[] = [];

      if (data.results) {
        for (const item of data.results) {
          results.push({
            title: item.title || '',
            url: item.url || '',
            thumbnailUrl: item.thumbnail?.src || item.properties?.url || '',
            sourceUrl: item.source || '',
            width: item.properties?.width || 0,
            height: item.properties?.height || 0,
          });
        }
      }

      return results;
    } catch (err) {
      log.warn('Image search failed', { query, error: err });
      return [];
    }
  }

  private extractPatternsFromResults(results: BraveSearchResult[]): string[] {
    const patterns: string[] = [];
    const componentKeywords = [
      'hero', 'navigation', 'footer', 'pricing', 'testimonial', 'cta',
      'form', 'card', 'modal', 'carousel', 'dashboard', 'onboarding',
      'search', 'filter', 'sidebar', 'checkout', 'landing page',
    ];

    for (const result of results) {
      const combined = `${result.title} ${result.description}`.toLowerCase();

      for (const keyword of componentKeywords) {
        if (combined.includes(keyword) && !patterns.includes(keyword)) {
          patterns.push(keyword);
        }
      }
    }

    // If we didn't find enough patterns, add some general design pattern searches
    if (patterns.length < 2) {
      patterns.push('hero section', 'navigation', 'landing page');
    }

    return patterns;
  }

  private extractCompetitorNames(results: BraveSearchResult[], industry: string): string[] {
    const competitors: string[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      try {
        const url = new URL(result.url);
        const domain = url.hostname.replace('www.', '');
        const name = domain.split('.')[0];

        // Filter out generic/non-competitor domains
        const genericDomains = new Set([
          'google', 'youtube', 'medium', 'wikipedia', 'pinterest',
          'dribbble', 'behance', 'awwwards', 'cssdesignawards',
          'twitter', 'facebook', 'linkedin', 'instagram',
        ]);

        if (!genericDomains.has(name) && !seen.has(name) && name.length > 2) {
          seen.add(name);
          competitors.push(name);
        }
      } catch {
        // Invalid URL, skip
      }
    }

    return competitors;
  }
}
