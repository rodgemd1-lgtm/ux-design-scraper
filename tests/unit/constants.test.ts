import {
  BREAKPOINTS,
  API_ENDPOINTS,
  STORAGE_KEYS,
  DEFAULT_SCORING_WEIGHTS,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS,
  SCRAPE_TIMEOUTS,
  COMPONENT_TYPES,
  THIRD_PARTY_SIGNATURES,
} from '@shared/constants';

describe('BREAKPOINTS', () => {
  it('should be a readonly array of 4 breakpoints', () => {
    expect(BREAKPOINTS).toHaveLength(4);
  });

  it('should contain standard responsive breakpoints in ascending order', () => {
    for (let i = 1; i < BREAKPOINTS.length; i++) {
      expect(BREAKPOINTS[i]).toBeGreaterThan(BREAKPOINTS[i - 1]);
    }
  });

  it('should include mobile, tablet, desktop, and ultrawide sizes', () => {
    expect(BREAKPOINTS[0]).toBeLessThanOrEqual(480); // mobile
    expect(BREAKPOINTS[1]).toBeGreaterThanOrEqual(700); // tablet
    expect(BREAKPOINTS[2]).toBeGreaterThanOrEqual(1200); // desktop
    expect(BREAKPOINTS[3]).toBeGreaterThanOrEqual(1900); // ultrawide
  });

  it('should contain the specific expected values', () => {
    expect(BREAKPOINTS).toEqual([375, 768, 1280, 1920]);
  });
});

describe('API_ENDPOINTS', () => {
  it('should have all required endpoint keys', () => {
    expect(API_ENDPOINTS.CLAUDE).toBeDefined();
    expect(API_ENDPOINTS.BRAVE_SEARCH).toBeDefined();
    expect(API_ENDPOINTS.WAYBACK_CDX).toBeDefined();
    expect(API_ENDPOINTS.WAYBACK_WEB).toBeDefined();
    expect(API_ENDPOINTS.HOTJAR_API).toBeDefined();
    expect(API_ENDPOINTS.FULLSTORY_API).toBeDefined();
  });

  it('should contain valid HTTPS URLs', () => {
    for (const [key, url] of Object.entries(API_ENDPOINTS)) {
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it('CLAUDE endpoint should point to Anthropic API', () => {
    expect(API_ENDPOINTS.CLAUDE).toContain('anthropic.com');
  });

  it('BRAVE_SEARCH endpoint should point to Brave Search API', () => {
    expect(API_ENDPOINTS.BRAVE_SEARCH).toContain('search.brave.com');
  });
});

describe('STORAGE_KEYS', () => {
  it('should have all required storage keys', () => {
    expect(STORAGE_KEYS.SETTINGS).toBeDefined();
    expect(STORAGE_KEYS.CURRENT_SESSION).toBeDefined();
    expect(STORAGE_KEYS.CHAT_HISTORY).toBeDefined();
    expect(STORAGE_KEYS.PROJECT_CACHE).toBeDefined();
  });

  it('all storage keys should be non-empty strings', () => {
    for (const [key, value] of Object.entries(STORAGE_KEYS)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });

  it('all storage keys should be unique', () => {
    const values = Object.values(STORAGE_KEYS);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });

  it('storage keys should follow naming convention with ux_scraper_ prefix', () => {
    for (const value of Object.values(STORAGE_KEYS)) {
      expect(value).toMatch(/^ux_scraper_/);
    }
  });
});

describe('DEFAULT_SCORING_WEIGHTS', () => {
  it('should have all six scoring categories', () => {
    expect(DEFAULT_SCORING_WEIGHTS.industryFit).toBeDefined();
    expect(DEFAULT_SCORING_WEIGHTS.audienceAlignment).toBeDefined();
    expect(DEFAULT_SCORING_WEIGHTS.conversionOptimization).toBeDefined();
    expect(DEFAULT_SCORING_WEIGHTS.accessibilityCompliance).toBeDefined();
    expect(DEFAULT_SCORING_WEIGHTS.performance).toBeDefined();
    expect(DEFAULT_SCORING_WEIGHTS.designTrend).toBeDefined();
  });

  it('all weights should be positive numbers', () => {
    for (const value of Object.values(DEFAULT_SCORING_WEIGHTS)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    }
  });

  it('weights should sum to 100', () => {
    const total = Object.values(DEFAULT_SCORING_WEIGHTS).reduce(
      (sum, w) => sum + w,
      0
    );
    expect(total).toBe(100);
  });
});

describe('SCRAPE_TIMEOUTS', () => {
  it('all timeouts should be positive numbers in milliseconds', () => {
    for (const [key, value] of Object.entries(SCRAPE_TIMEOUTS)) {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThanOrEqual(120000); // max 2 minutes
    }
  });

  it('INJECTION timeout should be the shortest', () => {
    expect(SCRAPE_TIMEOUTS.INJECTION).toBeLessThanOrEqual(SCRAPE_TIMEOUTS.DOM_EXTRACTION);
  });
});

describe('COMPONENT_TYPES', () => {
  it('should be a non-empty array of strings', () => {
    expect(COMPONENT_TYPES.length).toBeGreaterThan(0);
    for (const type of COMPONENT_TYPES) {
      expect(typeof type).toBe('string');
    }
  });

  it('should contain common UI component types', () => {
    expect(COMPONENT_TYPES).toContain('button');
    expect(COMPONENT_TYPES).toContain('card');
    expect(COMPONENT_TYPES).toContain('form');
    expect(COMPONENT_TYPES).toContain('nav');
    expect(COMPONENT_TYPES).toContain('modal');
  });

  it('all types should be unique', () => {
    const unique = new Set(COMPONENT_TYPES);
    expect(unique.size).toBe(COMPONENT_TYPES.length);
  });
});

describe('CLAUDE_MODEL', () => {
  it('should be a non-empty string', () => {
    expect(typeof CLAUDE_MODEL).toBe('string');
    expect(CLAUDE_MODEL.length).toBeGreaterThan(0);
  });
});

describe('CLAUDE_MAX_TOKENS', () => {
  it('should be a positive integer', () => {
    expect(typeof CLAUDE_MAX_TOKENS).toBe('number');
    expect(CLAUDE_MAX_TOKENS).toBeGreaterThan(0);
    expect(Number.isInteger(CLAUDE_MAX_TOKENS)).toBe(true);
  });
});
