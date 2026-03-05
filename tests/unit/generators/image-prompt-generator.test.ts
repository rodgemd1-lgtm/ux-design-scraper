import {
  generateMidjourneyPrompts,
  generateDALLEPrompts,
  generateStableDiffusionPrompts,
} from '@generators/image-prompt-generator';
import type {
  MidjourneyPrompt,
  DALLEPrompt,
  StableDiffusionPrompt,
} from '@generators/image-prompt-generator';

import {
  mockFullScrapeResult,
  mockProjectContext,
} from '../../fixtures/mock-scrape-result';

describe('generateMidjourneyPrompts', () => {
  let prompts: MidjourneyPrompt[];

  beforeAll(() => {
    prompts = generateMidjourneyPrompts(mockFullScrapeResult, mockProjectContext);
  });

  it('should return a non-empty array of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('should generate prompts across multiple categories', () => {
    const categories = new Set(prompts.map((p) => p.category));
    expect(categories.has('hero')).toBe(true);
    expect(categories.has('product')).toBe(true);
    expect(categories.has('background')).toBe(true);
    expect(categories.has('icon')).toBe(true);
    expect(categories.has('people')).toBe(true);
    expect(categories.has('abstract')).toBe(true);
  });

  it('each prompt should have all required fields', () => {
    for (const p of prompts) {
      expect(p.id).toBeDefined();
      expect(p.category).toBeDefined();
      expect(p.prompt).toBeDefined();
      expect(typeof p.prompt).toBe('string');
      expect(p.prompt.length).toBeGreaterThan(0);
      expect(p.negativePrompt).toBeDefined();
      expect(p.aspectRatio).toBeDefined();
      expect(p.style).toBeDefined();
      expect(Array.isArray(p.tags)).toBe(true);
    }
  });

  it('each prompt should have Midjourney-specific fields', () => {
    for (const p of prompts) {
      expect(p.version).toBeDefined();
      expect(typeof p.quality).toBe('number');
      expect(typeof p.stylize).toBe('number');
      expect(typeof p.chaos).toBe('number');
    }
  });

  it('all prompt IDs should be unique', () => {
    const ids = prompts.map((p) => p.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('should include the industry in tags', () => {
    const heroPrompts = prompts.filter((p) => p.category === 'hero');
    expect(heroPrompts.length).toBeGreaterThan(0);
    expect(heroPrompts[0].tags).toContain(mockProjectContext.industry);
  });

  it('prompts should reference the design style aesthetic', () => {
    // At least some prompts should include aesthetic keywords
    const allPromptText = prompts.map((p) => p.prompt).join(' ');
    // minimal design style maps to 'clean', 'whitespace-heavy', 'Swiss design', etc.
    expect(allPromptText.toLowerCase()).toContain('clean');
  });
});

describe('generateDALLEPrompts', () => {
  let prompts: DALLEPrompt[];

  beforeAll(() => {
    prompts = generateDALLEPrompts(mockFullScrapeResult, mockProjectContext);
  });

  it('should return a non-empty array of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('should generate prompts across multiple categories', () => {
    const categories = new Set(prompts.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it('each prompt should have DALL-E specific fields', () => {
    for (const p of prompts) {
      expect(p.model).toBe('dall-e-3');
      expect(['1024x1024', '1792x1024', '1024x1792']).toContain(p.size);
      expect(['standard', 'hd']).toContain(p.quality);
    }
  });

  it('each prompt should have base ImagePrompt fields', () => {
    for (const p of prompts) {
      expect(p.id).toBeDefined();
      expect(p.prompt.length).toBeGreaterThan(10);
      expect(p.negativePrompt).toBeDefined();
      expect(p.aspectRatio).toBeDefined();
    }
  });

  it('all IDs should be unique', () => {
    const ids = new Set(prompts.map((p) => p.id));
    expect(ids.size).toBe(prompts.length);
  });

  it('hero prompts should use wide format', () => {
    const heroPrompts = prompts.filter((p) => p.category === 'hero');
    for (const hp of heroPrompts) {
      expect(hp.size).toBe('1792x1024');
    }
  });
});

describe('generateStableDiffusionPrompts', () => {
  let prompts: StableDiffusionPrompt[];

  beforeAll(() => {
    prompts = generateStableDiffusionPrompts(mockFullScrapeResult, mockProjectContext);
  });

  it('should return a non-empty array of prompts', () => {
    expect(prompts.length).toBeGreaterThan(0);
  });

  it('each prompt should have Stable Diffusion specific fields', () => {
    for (const p of prompts) {
      expect(typeof p.cfgScale).toBe('number');
      expect(p.cfgScale).toBeGreaterThan(0);
      expect(typeof p.steps).toBe('number');
      expect(p.steps).toBeGreaterThan(0);
      expect(typeof p.sampler).toBe('string');
      expect(typeof p.width).toBe('number');
      expect(typeof p.height).toBe('number');
      expect(typeof p.clipSkip).toBe('number');
      expect(typeof p.model).toBe('string');
    }
  });

  it('should generate prompts across multiple categories', () => {
    const categories = new Set(prompts.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it('all IDs should be unique', () => {
    const ids = new Set(prompts.map((p) => p.id));
    expect(ids.size).toBe(prompts.length);
  });

  it('should use SDXL 1.0 as default model', () => {
    for (const p of prompts) {
      expect(p.model).toBe('SDXL 1.0');
    }
  });

  it('prompts should include weighted quality tags', () => {
    // SD prompts typically use (masterpiece, best quality:1.2) syntax
    const allText = prompts.map((p) => p.prompt).join(' ');
    expect(allText).toContain('masterpiece');
    expect(allText).toContain('best quality');
  });

  it('negative prompts should include weighted terms', () => {
    for (const p of prompts) {
      expect(p.negativePrompt).toContain('worst quality');
    }
  });
});
