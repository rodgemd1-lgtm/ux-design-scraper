describe('Module Import Smoke Tests', () => {
  describe('Shared modules', () => {
    it('should import types without errors', () => {
      expect(() => require('../../src/shared/types')).not.toThrow();
    });

    it('should import constants without errors', () => {
      const constants = require('../../src/shared/constants');
      expect(constants).toBeDefined();
      expect(constants.BREAKPOINTS).toBeDefined();
    });

    it('should import message-types without errors', () => {
      const msgTypes = require('../../src/shared/message-types');
      expect(msgTypes).toBeDefined();
      expect(msgTypes.MSG).toBeDefined();
    });

    it('should import utils without errors', () => {
      const utils = require('../../src/shared/utils');
      expect(utils).toBeDefined();
      expect(typeof utils.generateId).toBe('function');
      expect(typeof utils.truncate).toBe('function');
    });
  });

  describe('Generator modules', () => {
    it('should import token-json-generator without errors', () => {
      const mod = require('../../src/generators/token-json-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateColorsJson).toBe('function');
      expect(typeof mod.generateTypographyJson).toBe('function');
      expect(typeof mod.generateSpacingJson).toBe('function');
      expect(typeof mod.generateShadowsJson).toBe('function');
      expect(typeof mod.generateAnimationsJson).toBe('function');
    });

    it('should import analysis-generator without errors', () => {
      const mod = require('../../src/generators/analysis-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateAccessibilityAudit).toBe('function');
      expect(typeof mod.generatePerformanceReport).toBe('function');
      expect(typeof mod.generateFlowAnalysis).toBe('function');
    });

    it('should import prompt-generator without errors', () => {
      const mod = require('../../src/generators/prompt-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateMasterPrompt).toBe('function');
      expect(typeof mod.generateComponentPrompt).toBe('function');
      expect(typeof mod.generateWorkflowChain).toBe('function');
    });

    it('should import folder-manifest without errors', () => {
      const mod = require('../../src/generators/folder-manifest');
      expect(mod).toBeDefined();
      expect(typeof mod.buildFolderManifest).toBe('function');
      expect(typeof mod.getOutputPaths).toBe('function');
      expect(typeof mod.getScreenshotPath).toBe('function');
      expect(typeof mod.getComponentHtmlPath).toBe('function');
    });

    it('should import readme-generator without errors', () => {
      const mod = require('../../src/generators/readme-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateReadme).toBe('function');
    });

    it('should import figma-token-generator without errors', () => {
      const mod = require('../../src/generators/figma-token-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateFigmaTokens).toBe('function');
      expect(typeof mod.exportFigmaTokensJson).toBe('function');
    });

    it('should import competitive-intel-generator without errors', () => {
      const mod = require('../../src/generators/competitive-intel-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateCompetitiveIntel).toBe('function');
    });

    it('should import image-prompt-generator without errors', () => {
      const mod = require('../../src/generators/image-prompt-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generateMidjourneyPrompts).toBe('function');
      expect(typeof mod.generateDALLEPrompts).toBe('function');
      expect(typeof mod.generateStableDiffusionPrompts).toBe('function');
    });

    it('should import performance-budget-generator without errors', () => {
      const mod = require('../../src/generators/performance-budget-generator');
      expect(mod).toBeDefined();
      expect(typeof mod.generatePerformanceBudget).toBe('function');
      expect(typeof mod.exportPerformanceBudgetJson).toBe('function');
    });
  });

  describe('Fixture data', () => {
    it('should import mock-scrape-result without errors', () => {
      const fixtures = require('../fixtures/mock-scrape-result');
      expect(fixtures).toBeDefined();
      expect(fixtures.mockFullScrapeResult).toBeDefined();
      expect(fixtures.mockFullScrapeResult.projectName).toBe('example-store-redesign');
    });
  });
});
