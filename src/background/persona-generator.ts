import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import {
  PERSONA_SYSTEM_PROMPT,
  PERSONA_USER_TEMPLATE,
} from '@shared/prompt-templates/persona-prompt';
import type {
  FullScrapeResult,
  ProjectContext,
  HeatmapData,
  GeneratedPersona,
  PersonaJourneyMap,
  JourneyStage,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('PersonaGenerator');

export class PersonaGenerator {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async generatePersonas(
    scrapeResult: FullScrapeResult,
    heatmapData?: HeatmapData[],
    projectContext?: ProjectContext
  ): Promise<GeneratedPersona[]> {
    log.info('Starting persona generation', { url: scrapeResult.targetUrl });

    const context = projectContext || scrapeResult.projectContext;
    const heatmaps = heatmapData || scrapeResult.heatmaps;

    const projectContextSummary = `
- Goal: ${context.goal}
- Industry: ${context.industry}
- Target Audience: ${context.targetAudience}
- Design Style: ${context.designStyle}
${context.competitors?.length ? `- Competitors: ${context.competitors.join(', ')}` : ''}`;

    const navigationSummary = this.formatNavigation(scrapeResult);
    const copySummary = this.formatCopy(scrapeResult);
    const conversionSummary = this.formatConversion(scrapeResult);
    const accessibilitySummary = this.formatAccessibility(scrapeResult);
    const componentsSummary = this.formatComponents(scrapeResult);
    const designTokensSummary = this.formatDesignTokens(scrapeResult);
    const heatmapSummary = this.formatHeatmaps(heatmaps);
    const flowSummary = this.formatFlow(scrapeResult);

    const userMessage = PERSONA_USER_TEMPLATE(
      scrapeResult.targetUrl,
      projectContextSummary,
      navigationSummary,
      copySummary,
      conversionSummary,
      accessibilitySummary,
      componentsSummary,
      designTokensSummary,
      heatmapSummary,
      flowSummary
    );

    try {
      const responseText = await this.claudeClient.singleCall(PERSONA_SYSTEM_PROMPT, userMessage);
      const personas = this.parsePersonaResponse(responseText);

      log.info('Persona generation complete', { personaCount: personas.length });

      // Broadcast the result
      chrome.runtime.sendMessage({
        type: MSG.PERSONAS_RESULT,
        payload: { personas },
      }).catch(() => {});

      return personas;
    } catch (err) {
      log.error('Persona generation failed', err);
      throw new Error(
        `Persona generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  private parsePersonaResponse(responseText: string): GeneratedPersona[] {
    try {
      const parsed = JSON.parse(responseText);
      const personaArray = Array.isArray(parsed) ? parsed : (parsed.personas || [parsed]);

      return personaArray.map((raw: Record<string, unknown>) => this.validatePersona(raw));
    } catch {
      log.warn('Failed to parse persona response as JSON, attempting extraction');

      // Try to find JSON array in the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed.map((raw: Record<string, unknown>) => this.validatePersona(raw));
        } catch {
          log.error('Failed to extract JSON array from persona response');
        }
      }

      return [this.createFallbackPersona(responseText)];
    }
  }

  private validatePersona(raw: Record<string, unknown>): GeneratedPersona {
    const defaultJourneyStage: JourneyStage = {
      actions: [],
      thoughts: [],
      emotions: [],
      touchpoints: [],
      painPoints: [],
      opportunities: [],
    };

    const defaultJourneyMap: PersonaJourneyMap = {
      discover: defaultJourneyStage,
      evaluate: defaultJourneyStage,
      convert: defaultJourneyStage,
      retain: defaultJourneyStage,
    };

    const rawJourneyMap = raw.journeyMap as Record<string, Record<string, unknown>> | undefined;

    return {
      name: (raw.name as string) || 'Unnamed Persona',
      ageRange: (raw.ageRange as string) || '25-35',
      occupation: (raw.occupation as string) || 'Professional',
      goals: this.ensureStringArray(raw.goals),
      frustrations: this.ensureStringArray(raw.frustrations),
      techSavviness: this.validateTechSavviness(raw.techSavviness),
      behavioralPatterns: this.ensureStringArray(raw.behavioralPatterns),
      journeyMap: rawJourneyMap
        ? this.parseJourneyMap(rawJourneyMap)
        : defaultJourneyMap,
      jobsToBeDone: this.ensureStringArray(raw.jobsToBeDone),
      keyScenarios: this.parseScenarios(raw.keyScenarios),
      devicePreferences: this.ensureStringArray(raw.devicePreferences),
      accessibilityNeeds: this.ensureStringArray(raw.accessibilityNeeds),
      quote: (raw.quote as string) || '',
      bio: (raw.bio as string) || '',
    };
  }

  private parseJourneyMap(raw: Record<string, Record<string, unknown>>): PersonaJourneyMap {
    const parseStage = (stage: Record<string, unknown> | undefined): JourneyStage => {
      if (!stage) {
        return {
          actions: [],
          thoughts: [],
          emotions: [],
          touchpoints: [],
          painPoints: [],
          opportunities: [],
        };
      }

      return {
        actions: this.ensureStringArray(stage.actions),
        thoughts: this.ensureStringArray(stage.thoughts),
        emotions: this.ensureStringArray(stage.emotions),
        touchpoints: this.ensureStringArray(stage.touchpoints),
        painPoints: this.ensureStringArray(stage.painPoints),
        opportunities: this.ensureStringArray(stage.opportunities),
      };
    };

    return {
      discover: parseStage(raw.discover as Record<string, unknown>),
      evaluate: parseStage(raw.evaluate as Record<string, unknown>),
      convert: parseStage(raw.convert as Record<string, unknown>),
      retain: parseStage(raw.retain as Record<string, unknown>),
    };
  }

  private parseScenarios(raw: unknown): GeneratedPersona['keyScenarios'] {
    if (!Array.isArray(raw)) return [];

    return raw.map((s: Record<string, unknown>) => ({
      title: (s.title as string) || 'Untitled Scenario',
      context: (s.context as string) || '',
      steps: this.ensureStringArray(s.steps),
      outcome: (s.outcome as string) || '',
    }));
  }

  private ensureStringArray(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value === 'string') return [value];
    return [];
  }

  private validateTechSavviness(value: unknown): 'low' | 'medium' | 'high' | 'expert' {
    const valid = ['low', 'medium', 'high', 'expert'];
    if (typeof value === 'string' && valid.includes(value)) {
      return value as 'low' | 'medium' | 'high' | 'expert';
    }
    return 'medium';
  }

  private createFallbackPersona(rawText: string): GeneratedPersona {
    const defaultStage: JourneyStage = {
      actions: ['Visit the website'],
      thoughts: ['Is this what I need?'],
      emotions: ['Curious'],
      touchpoints: ['Homepage'],
      painPoints: ['Unknown'],
      opportunities: ['To be determined'],
    };

    return {
      name: 'Primary User',
      ageRange: '25-45',
      occupation: 'Professional',
      goals: ['Complete primary task efficiently'],
      frustrations: ['Complex navigation', 'Slow loading'],
      techSavviness: 'medium',
      behavioralPatterns: ['Goal-oriented browsing'],
      journeyMap: {
        discover: defaultStage,
        evaluate: defaultStage,
        convert: defaultStage,
        retain: defaultStage,
      },
      jobsToBeDone: ['When I need to accomplish my goal, I want a simple tool, so I can save time'],
      keyScenarios: [{
        title: 'Primary Task',
        context: 'User visits the site to accomplish their main goal',
        steps: ['Navigate to the site', 'Find relevant information', 'Take action'],
        outcome: 'Goal accomplished',
      }],
      devicePreferences: ['Desktop', 'Mobile'],
      accessibilityNeeds: [],
      quote: 'See raw analysis for details.',
      bio: rawText.slice(0, 200),
    };
  }

  private formatNavigation(scrapeResult: FullScrapeResult): string {
    const nav = scrapeResult.navigation;
    return `
**Menu Depth:** ${nav.menuDepth} levels
**Total Pages:** ${nav.totalPages}
**Primary Nav Items (${nav.primaryNav.length}):**
${nav.primaryNav.slice(0, 10).map(item =>
  `- "${item.label}" -> ${item.href} (${item.children.length} children)`
).join('\n')}

**Footer Nav Items:** ${nav.footerNav.length}
**Breadcrumbs:** ${nav.breadcrumbs.length > 0 ? nav.breadcrumbs.map(b => b.join(' > ')).join('; ') : 'None'}`;
  }

  private formatCopy(scrapeResult: FullScrapeResult): string {
    const c = scrapeResult.copyAnalysis;
    return `
**CTA Labels:** ${c.ctaLabels.map(l => `"${l.text}" (${l.count}x)`).join(', ')}
**Tone Keywords:** ${c.toneKeywords.join(', ')}
**Error Messages:** ${c.errorMessages.length > 0 ? c.errorMessages.slice(0, 3).join('; ') : 'None visible'}
**Tooltips:** ${c.tooltips.length}
**Placeholders:** ${c.placeholders.slice(0, 5).map(p => `"${p.text}" in ${p.field}`).join(', ')}
**Empty States:** ${c.emptyStateText.length > 0 ? c.emptyStateText.slice(0, 3).join('; ') : 'None'}
**Microcopy Examples:** ${c.microcopy.slice(0, 5).map(m => `"${m.text}" (${m.context})`).join(', ')}`;
  }

  private formatConversion(scrapeResult: FullScrapeResult): string {
    const cp = scrapeResult.conversionPatterns;
    return `
**CTAs (${cp.ctas.length}):**
${cp.ctas.slice(0, 8).map(c =>
  `- "${c.text}" at ${c.position}, prominence ${c.prominence}/10`
).join('\n')}

**Social Proof:** ${cp.socialProof.map(s => `${s.type}: "${s.content.slice(0, 60)}"`).join('; ') || 'None'}
**Form Fields:** ${cp.formFields.length} (${cp.formFields.filter(f => f.required).length} required)
**Trust Badges:** ${cp.trustBadges.join(', ') || 'None'}
**Urgency Patterns:** ${cp.urgencyPatterns.map(u => `${u.type}: "${u.content}"`).join('; ') || 'None'}`;
  }

  private formatAccessibility(scrapeResult: FullScrapeResult): string {
    const a = scrapeResult.accessibility;
    return `
**Score:** ${a.overallScore}/100 (WCAG ${a.wcagLevel})
**Contrast Issues:** ${a.contrastIssues.length}
**Missing Alt Text:** ${a.missingAltText.length}
**Missing ARIA Labels:** ${a.missingAriaLabels.length}
**Tab Order Issues:** ${a.tabOrderIssues.length}
**Focus Indicators Missing:** ${a.focusIndicatorsMissing.length}
**Semantic Issues:** ${a.semanticIssues.length}`;
  }

  private formatComponents(scrapeResult: FullScrapeResult): string {
    const componentTypes = [...new Set(scrapeResult.components.map(c => c.type))];
    return `
**Component Types (${componentTypes.length}):** ${componentTypes.join(', ')}
**Total Components:** ${scrapeResult.components.length}
${scrapeResult.components.slice(0, 15).map(c =>
  `- ${c.name} (${c.type}): ${Object.keys(c.stateVariants).length} states`
).join('\n')}`;
  }

  private formatDesignTokens(scrapeResult: FullScrapeResult): string {
    const dt = scrapeResult.designTokens;
    return `
**Colors:** ${dt.colors.length} unique values (primary: ${dt.colors.slice(0, 5).map(c => c.value).join(', ')})
**Spacing:** ${dt.spacing.length} values
**Shadows:** ${dt.shadows.length} values
**Border Radii:** ${dt.borderRadii.map(r => r.value).join(', ')}
**Typography Families:** ${scrapeResult.typography.fontFamilies.map(f => f.family).join(', ')}

Visual Language Signals:
- ${dt.borderRadii.length > 0 && parseInt(dt.borderRadii[0].value) > 8 ? 'Rounded, friendly aesthetic' : 'Sharp, professional aesthetic'}
- ${dt.shadows.length > 3 ? 'Heavy use of elevation/depth' : 'Flat design tendency'}
- ${dt.colors.length > 15 ? 'Rich, diverse color palette' : 'Minimal, restrained palette'}`;
  }

  private formatHeatmaps(heatmaps: HeatmapData[]): string {
    if (!heatmaps || heatmaps.length === 0) {
      return 'No heatmap data available. Infer user behavior from the design patterns and conversion funnel instead.';
    }

    return `
**Heatmap Sources:** ${heatmaps.map(h => `${h.type} (${h.source})`).join(', ')}
**Pages Covered:** ${[...new Set(heatmaps.map(h => h.pageUrl))].join(', ')}

Heatmap Types Available:
${heatmaps.map(h => `- ${h.type} heatmap from ${h.source} for ${h.pageUrl}`).join('\n')}

Note: Interpret click density patterns, scroll depth data, and attention maps to understand where users focus, what they ignore, and where they struggle.`;
  }

  private formatFlow(scrapeResult: FullScrapeResult): string {
    const f = scrapeResult.flowAnalysis;
    return `
**Steps to Conversion:** ${f.stepsToConversion}
**Form Field Count:** ${f.formFieldCount}
**Decisions Per Screen:** ${f.decisionsPerScreen.join(', ')}
**Estimated Cognitive Load:** ${f.estimatedCognitiveLoad}/100
**Friction Points (${f.frictionPoints.length}):**
${f.frictionPoints.map(fp =>
  `- Step ${fp.step}: ${fp.description} (severity: ${fp.severity}/10)`
).join('\n')}`;
  }
}
