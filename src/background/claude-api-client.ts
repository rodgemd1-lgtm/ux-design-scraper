import { createLogger } from '@shared/logger';
import { generateId, sleep } from '@shared/utils';
import { MSG } from '@shared/message-types';
import { API_ENDPOINTS, CLAUDE_MODEL, CLAUDE_MAX_TOKENS, STORAGE_KEYS } from '@shared/constants';
import type {
  AppSettings,
  ChatMessage,
  ProjectContext,
  FullScrapeResult,
  DesignCritique,
  ReconstructedComponent,
  GeneratedPersona,
  RewrittenCopy,
  ABTestPlan,
} from '@shared/types';

const log = createLogger('ClaudeAPI');

interface StreamChatPayload {
  messages: ChatMessage[];
  context?: ProjectContext;
  sessionId: string;
}

interface PromptChainResult {
  research: {
    patterns: string[];
    suggestedUrls: string[];
    insights: string[];
  };
  analysis: {
    tokenTaxonomy: Record<string, unknown>;
    componentTaxonomy: Record<string, unknown>;
    gaps: string[];
  };
  generation: {
    claudeMd: string;
    masterPrompt: string;
    analysisDocs: string[];
  };
}

export interface EnhancedPromptChainResult extends PromptChainResult {
  critique: DesignCritique | null;
  reconstruction: ReconstructedComponent[] | null;
}

interface BatchPrompt {
  system: string;
  user: string;
}

const DOUBLE_BLACK_BOX_SYSTEM_PROMPT = `You are an AI UX Research Director embedded in the Double Black Box design process. The Double Black Box runs in 6 phases: (1) Discover - open Black Box 1, assume nothing, observe everything; (2) Define - close Black Box 1, lock the problem, define the human; (3) GATE - Design Brief locked, no design without sign-off; (4) Diverge - open Black Box 2, explore wide before going deep; (5) Develop - build, test, prove it; (6) Deliver - close Black Box 2, hand off to ship; (7) Measure - data closes the box, feed the loop.

Your role is to help users extract, analyze, and synthesize UX design intelligence from live websites. You work alongside a scraping pipeline that captures design tokens, typography, components, layout grids, navigation, copy, accessibility data, animations, screenshots, and performance metrics from real sites.

You provide actionable analysis including:
- Design pattern identification and best-practice recommendations
- Component taxonomy and gap analysis
- Industry-specific UX benchmarking
- Accessibility compliance assessment
- Conversion optimization insights
- Design system generation from scraped artifacts
- Multi-site competitive intelligence and cross-site pattern synthesis
- AI-powered component reconstruction (React + Tailwind)
- Design critique with visual hierarchy, whitespace, and color harmony analysis
- User persona generation from design pattern inference
- A/B test recommendation engine with prioritized experiments
- Copy rewriting with brand voice variants (formal, casual, urgent)

Always ground your analysis in real, scraped data. Reference specific tokens, measurements, and patterns. Avoid generic advice - be precise and evidence-based.`;

export class ClaudeAPIClient {
  private apiKey: string = '';
  private initialized: boolean = false;

  constructor() {
    this.loadApiKey();
  }

  private async loadApiKey(): Promise<void> {
    try {
      const stored = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
      const settings = stored[STORAGE_KEYS.SETTINGS] as AppSettings | undefined;
      if (settings?.claudeApiKey) {
        this.apiKey = settings.claudeApiKey;
        this.initialized = true;
        log.info('API key loaded');
      } else {
        log.warn('No Claude API key found in settings');
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
      throw new Error('Claude API key not configured. Please set it in Settings.');
    }
  }

  async streamChat(payload: StreamChatPayload): Promise<void> {
    await this.ensureApiKey();

    const { messages, context, sessionId } = payload;
    const systemPrompt = this.buildSystemPrompt(context);

    const apiMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    log.info('Starting streaming chat', { sessionId, messageCount: apiMessages.length });

    let response: Response;
    try {
      response = await fetch(API_ENDPOINTS.CLAUDE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: CLAUDE_MAX_TOKENS,
          stream: true,
          system: systemPrompt,
          messages: apiMessages,
        }),
      });
    } catch (err) {
      log.error('Fetch failed', err);
      this.broadcast({ type: MSG.CHAT_ERROR, payload: { sessionId, error: 'Network error connecting to Claude API' } });
      return;
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      log.error('API error response', { status: response.status, body: errorText });
      this.broadcast({ type: MSG.CHAT_ERROR, payload: { sessionId, error: `Claude API error ${response.status}: ${errorText}` } });
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) {
      this.broadcast({ type: MSG.CHAT_ERROR, payload: { sessionId, error: 'No response body stream' } });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();

          if (data === '[DONE]') continue;

          try {
            const event = JSON.parse(data);

            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              const text = event.delta.text;
              fullContent += text;
              this.broadcast({
                type: MSG.CHAT_STREAM_CHUNK,
                payload: { sessionId, chunk: text, fullContent },
              });
            }

            if (event.type === 'message_stop') {
              this.broadcast({
                type: MSG.CHAT_STREAM_DONE,
                payload: {
                  sessionId,
                  fullContent,
                  messageId: generateId(),
                },
              });
            }

            if (event.type === 'error') {
              log.error('Stream error event', event.error);
              this.broadcast({
                type: MSG.CHAT_ERROR,
                payload: { sessionId, error: event.error?.message || 'Stream error' },
              });
            }
          } catch {
            // Non-JSON line, skip
          }
        }
      }

      // If message_stop was not received, still signal done
      if (fullContent) {
        this.broadcast({
          type: MSG.CHAT_STREAM_DONE,
          payload: {
            sessionId,
            fullContent,
            messageId: generateId(),
          },
        });
      }
    } catch (err) {
      log.error('Stream reading error', err);
      this.broadcast({
        type: MSG.CHAT_ERROR,
        payload: { sessionId, error: 'Stream interrupted' },
      });
    } finally {
      reader.releaseLock();
    }
  }

  async runPromptChain(
    scrapeData: FullScrapeResult,
    projectContext: ProjectContext
  ): Promise<PromptChainResult> {
    await this.ensureApiKey();

    log.info('Starting prompt chain', { projectName: scrapeData.projectName });

    // Step 1: Research - identify patterns, suggest additional URLs
    const researchSystemPrompt = `${DOUBLE_BLACK_BOX_SYSTEM_PROMPT}

TASK: Research Phase. You are analyzing scraped design data to identify the best design patterns and suggest additional reference URLs to scrape.

Respond with a JSON object matching this exact schema:
{
  "patterns": ["<pattern description>", ...],
  "suggestedUrls": ["<url>", ...],
  "insights": ["<insight>", ...]
}`;

    const researchUserMessage = `Analyze this scraped design data from ${scrapeData.targetUrl}:

Project Context:
- Goal: ${projectContext.goal}
- Industry: ${projectContext.industry}
- Target Audience: ${projectContext.targetAudience}
- Design Style: ${projectContext.designStyle}
${projectContext.competitors?.length ? `- Competitors: ${projectContext.competitors.join(', ')}` : ''}

Design Tokens Summary:
- Colors: ${scrapeData.designTokens.colors.length} unique colors
- Spacing values: ${scrapeData.designTokens.spacing.length} unique
- Border radii: ${scrapeData.designTokens.borderRadii.length} unique
- Shadows: ${scrapeData.designTokens.shadows.length} unique

Typography:
- Font families: ${scrapeData.typography.fontFamilies.map(f => f.family).join(', ')}
- Font sizes: ${scrapeData.typography.fontSizes.length} unique sizes

Components Found: ${scrapeData.components.map(c => c.type).join(', ')}

Navigation: ${scrapeData.navigation.menuDepth} depth, ${scrapeData.navigation.totalPages} pages

Accessibility Score: ${scrapeData.accessibility.overallScore}/100 (${scrapeData.accessibility.wcagLevel})

Lighthouse Performance: ${scrapeData.lighthouse.performanceScore}/100

Third-party Stack:
${Object.entries(scrapeData.thirdPartyStack).map(([cat, tools]) =>
  (tools as { name: string }[]).length > 0 ? `- ${cat}: ${(tools as { name: string }[]).map((t: { name: string }) => t.name).join(', ')}` : ''
).filter(Boolean).join('\n')}

Identify the strongest design patterns, suggest 5-10 additional URLs to scrape for design inspiration in the ${projectContext.industry} space, and provide key insights.`;

    const researchResult = await this.singleCall(researchSystemPrompt, researchUserMessage);
    let research: PromptChainResult['research'];
    try {
      research = JSON.parse(researchResult);
    } catch {
      log.warn('Failed to parse research result as JSON, using fallback');
      research = { patterns: [], suggestedUrls: [], insights: [researchResult] };
    }

    log.info('Research phase complete', { patterns: research.patterns.length, suggestedUrls: research.suggestedUrls.length });

    // Step 2: Analysis - normalize tokens, build taxonomy, identify gaps
    const analysisSystemPrompt = `${DOUBLE_BLACK_BOX_SYSTEM_PROMPT}

TASK: Analysis Phase. You are normalizing design tokens, building a component taxonomy, and identifying gaps in the design system.

Respond with a JSON object matching this exact schema:
{
  "tokenTaxonomy": {
    "colors": { "primary": [], "secondary": [], "neutral": [], "accent": [], "semantic": {} },
    "spacing": { "scale": [], "baseUnit": 0 },
    "typography": { "scale": [], "families": {} }
  },
  "componentTaxonomy": {
    "atoms": [],
    "molecules": [],
    "organisms": [],
    "templates": []
  },
  "gaps": ["<gap description>", ...]
}`;

    const analysisUserMessage = `Based on the research insights and raw scraped data, build a normalized design system taxonomy.

Research Insights:
${research.patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Raw Design Tokens:
Colors: ${JSON.stringify(scrapeData.designTokens.colors.slice(0, 20))}
Spacing: ${JSON.stringify(scrapeData.designTokens.spacing.slice(0, 15))}
Shadows: ${JSON.stringify(scrapeData.designTokens.shadows.slice(0, 10))}
Border Radii: ${JSON.stringify(scrapeData.designTokens.borderRadii.slice(0, 10))}

Typography System:
${JSON.stringify(scrapeData.typography, null, 2)}

Components (${scrapeData.components.length} total):
${scrapeData.components.map(c => `- ${c.type}: ${c.name} (states: ${Object.keys(c.stateVariants).join(', ') || 'none'})`).join('\n')}

Grid Layout: ${JSON.stringify(scrapeData.gridLayout)}

Dark Mode: ${scrapeData.darkMode.hasDarkMode ? `Yes (${scrapeData.darkMode.method})` : 'No'}

Normalize the tokens into a coherent design system taxonomy, classify components using atomic design (atoms, molecules, organisms, templates), and identify any gaps where common components are missing.`;

    const analysisResult = await this.singleCall(analysisSystemPrompt, analysisUserMessage);
    let analysis: PromptChainResult['analysis'];
    try {
      analysis = JSON.parse(analysisResult);
    } catch {
      log.warn('Failed to parse analysis result as JSON, using fallback');
      analysis = { tokenTaxonomy: {}, componentTaxonomy: {}, gaps: [analysisResult] };
    }

    log.info('Analysis phase complete', { gaps: analysis.gaps.length });

    // Step 3: Generation - produce CLAUDE.md, master prompt, analysis docs
    const generationSystemPrompt = `${DOUBLE_BLACK_BOX_SYSTEM_PROMPT}

TASK: Generation Phase. You are producing deliverables: a CLAUDE.md file for AI-assisted development, a master design prompt, and analysis documents.

Respond with a JSON object matching this exact schema:
{
  "claudeMd": "<full CLAUDE.md content as a string>",
  "masterPrompt": "<master design prompt that can be given to any AI to recreate this design system>",
  "analysisDocs": ["<analysis document content>", ...]
}

The CLAUDE.md should be a comprehensive reference for AI coding assistants that includes:
- Project overview and design philosophy
- Complete design token reference (colors, spacing, typography, etc.)
- Component specifications with usage guidelines
- Accessibility requirements
- Performance budgets
- Key design patterns and rules

The master prompt should be self-contained and enable any AI to produce designs consistent with the analyzed system.`;

    const generationUserMessage = `Generate the final deliverables based on research and analysis.

Project: ${scrapeData.projectName}
URL: ${scrapeData.targetUrl}
Industry: ${projectContext.industry}
Goal: ${projectContext.goal}
Audience: ${projectContext.targetAudience}
Style: ${projectContext.designStyle}

Research Patterns:
${research.patterns.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Token Taxonomy:
${JSON.stringify(analysis.tokenTaxonomy, null, 2)}

Component Taxonomy:
${JSON.stringify(analysis.componentTaxonomy, null, 2)}

Gaps Identified:
${analysis.gaps.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Accessibility: Score ${scrapeData.accessibility.overallScore}/100, Level ${scrapeData.accessibility.wcagLevel}
- Contrast issues: ${scrapeData.accessibility.contrastIssues.length}
- Missing alt text: ${scrapeData.accessibility.missingAltText.length}
- Missing ARIA labels: ${scrapeData.accessibility.missingAriaLabels.length}

Performance: Score ${scrapeData.lighthouse.performanceScore}/100
- LCP: ${scrapeData.lighthouse.lcp}ms
- CLS: ${scrapeData.lighthouse.cls}
- INP: ${scrapeData.lighthouse.inp}ms

Conversion Patterns:
- CTAs: ${scrapeData.conversionPatterns.ctas.length}
- Social proof elements: ${scrapeData.conversionPatterns.socialProof.length}
- Trust badges: ${scrapeData.conversionPatterns.trustBadges.length}

Copy Analysis:
- Tone keywords: ${scrapeData.copyAnalysis.toneKeywords.join(', ')}
- CTA labels: ${scrapeData.copyAnalysis.ctaLabels.map(c => c.text).join(', ')}

Generate a comprehensive CLAUDE.md, a self-contained master design prompt, and detailed analysis documents.`;

    const generationResult = await this.singleCall(generationSystemPrompt, generationUserMessage);
    let generation: PromptChainResult['generation'];
    try {
      generation = JSON.parse(generationResult);
    } catch {
      log.warn('Failed to parse generation result as JSON, using fallback');
      generation = {
        claudeMd: generationResult,
        masterPrompt: '',
        analysisDocs: [],
      };
    }

    log.info('Generation phase complete');

    return { research, analysis, generation };
  }

  async runEnhancedPromptChain(
    scrapeData: FullScrapeResult,
    projectContext: ProjectContext
  ): Promise<EnhancedPromptChainResult> {
    await this.ensureApiKey();

    log.info('Starting enhanced 5-step prompt chain', { projectName: scrapeData.projectName });

    // Steps 1-3: Run the original 3-step chain (Research -> Analysis -> Generation)
    const baseResult = await this.runPromptChain(scrapeData, projectContext);

    // Step 4: Critique — Senior Design Director evaluates the design
    log.info('Enhanced chain step 4: Design Critique');
    let critique: DesignCritique | null = null;
    try {
      const critiqueSystemPrompt = `You are a world-class Design Director with 20 years of experience at luxury brands. Provide a brutally honest design critique based on the scraped data. Score overall design maturity 1-10, identify top 5 strengths and top 10 weaknesses with severity levels, and assess visual hierarchy, whitespace, color harmony, typography, CTA effectiveness, mobile-first quality, emotional design, brand consistency, microinteractions, and innovation.

Respond with valid JSON matching DesignCritique schema with fields: overallScore (1-10), strengths [{title, evidence, impact}], weaknesses [{title, evidence, severity (critical|major|minor|cosmetic), recommendation, estimatedEffort (low|medium|high)}], visualHierarchy/whitespace/colorHarmony/typographyCritique/ctaEffectiveness/mobileFirst/emotionalDesign/brandConsistency/microinteractions (each: {score 1-10, summary, details[], recommendations[]}), innovationScore (1-10), innovationAssessment, executiveSummary.`;

      const critiqueUserMessage = `Critique the design of ${scrapeData.targetUrl}.

Context: ${projectContext.industry} / ${projectContext.goal} / ${projectContext.targetAudience}

Design Tokens: ${scrapeData.designTokens.colors.length} colors, ${scrapeData.designTokens.spacing.length} spacing, ${scrapeData.designTokens.shadows.length} shadows
Typography: ${scrapeData.typography.fontFamilies.map(f => f.family).join(', ')}, ${scrapeData.typography.fontSizes.length} sizes
Components: ${scrapeData.components.length} (${[...new Set(scrapeData.components.map(c => c.type))].join(', ')})
Accessibility: ${scrapeData.accessibility.overallScore}/100 (WCAG ${scrapeData.accessibility.wcagLevel}), ${scrapeData.accessibility.contrastIssues.length} contrast issues
Performance: Lighthouse ${scrapeData.lighthouse.performanceScore}/100, LCP ${scrapeData.lighthouse.lcp}ms
CTAs: ${scrapeData.conversionPatterns.ctas.map(c => `"${c.text}"`).join(', ')}
Animations: ${scrapeData.animations.cssTransitions.length} transitions, ${scrapeData.animations.cssAnimations.length} animations
Grid: ${scrapeData.gridLayout.columns} col ${scrapeData.gridLayout.layoutType}, max-width ${scrapeData.gridLayout.containerMaxWidth}
Dark Mode: ${scrapeData.darkMode.hasDarkMode}
Navigation: depth ${scrapeData.navigation.menuDepth}, ${scrapeData.navigation.totalPages} pages

Research findings: ${baseResult.research.patterns.slice(0, 5).join('; ')}
Gaps identified: ${baseResult.analysis.gaps.slice(0, 5).join('; ')}`;

      const critiqueResult = await this.singleCall(critiqueSystemPrompt, critiqueUserMessage);
      critique = JSON.parse(critiqueResult) as DesignCritique;
      log.info('Critique phase complete', { overallScore: critique.overallScore });
    } catch (err) {
      log.error('Critique step failed (non-blocking)', err);
    }

    // Step 5: Reconstruction — reconstruct top 3 components as React+Tailwind
    log.info('Enhanced chain step 5: Component Reconstruction (top 3)');
    let reconstruction: ReconstructedComponent[] | null = null;
    try {
      const topComponents = scrapeData.components.slice(0, 3);
      if (topComponents.length > 0) {
        const reconstructionPromises = topComponents.map(async (comp) => {
          const reconstructionSystemPrompt = `You are a Senior Frontend Engineer. Convert this raw HTML/CSS to a production-quality React + Tailwind component. Output valid JSON: { "name": "PascalCase", "tsx": "complete .tsx file", "propsInterface": "TypeScript interface", "storybookStory": "Storybook story", "usageExample": "usage code", "tailwindClasses": [], "ariaAttributes": [], "stateVariants": [], "responsive": boolean }`;

          const reconstructionUserMessage = `Reconstruct this ${comp.type} component named "${comp.name}":

HTML:
${comp.html.slice(0, 2000)}

CSS:
${comp.css.slice(0, 2000)}

States: ${Object.keys(comp.stateVariants).join(', ') || 'none detected — add hover, focus, disabled, loading'}

Design context: ${scrapeData.designTokens.colors.slice(0, 5).map(c => c.value).join(', ')} colors, ${scrapeData.typography.fontFamilies.map(f => f.family).join(', ')} fonts`;

          const result = await this.singleCall(reconstructionSystemPrompt, reconstructionUserMessage);
          try {
            return JSON.parse(result) as ReconstructedComponent;
          } catch {
            return {
              name: comp.name,
              originalType: comp.type,
              tsx: result,
              propsInterface: '',
              storybookStory: '',
              usageExample: '',
              tailwindClasses: [],
              ariaAttributes: [],
              stateVariants: [],
              responsive: false,
            } as ReconstructedComponent;
          }
        });

        reconstruction = await Promise.all(reconstructionPromises);
        log.info('Reconstruction phase complete', { componentCount: reconstruction.length });
      }
    } catch (err) {
      log.error('Reconstruction step failed (non-blocking)', err);
    }

    return {
      ...baseResult,
      critique,
      reconstruction,
    };
  }

  async batchClaude(prompts: BatchPrompt[]): Promise<string[]> {
    await this.ensureApiKey();

    log.info('Starting batch Claude calls', { promptCount: prompts.length });

    const maxConcurrent = 3;
    const results: string[] = [];
    const errors: (Error | null)[] = new Array(prompts.length).fill(null);

    // Process in chunks of maxConcurrent
    for (let i = 0; i < prompts.length; i += maxConcurrent) {
      const chunk = prompts.slice(i, i + maxConcurrent);
      const chunkStartIndex = i;

      log.debug(`Processing batch chunk ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(prompts.length / maxConcurrent)}`, {
        chunkSize: chunk.length,
      });

      const chunkPromises = chunk.map(async (prompt, localIndex) => {
        const globalIndex = chunkStartIndex + localIndex;
        try {
          const result = await this.singleCall(prompt.system, prompt.user);
          return { index: globalIndex, result, error: null };
        } catch (err) {
          log.error(`Batch call ${globalIndex} failed`, err);
          return {
            index: globalIndex,
            result: '',
            error: err instanceof Error ? err : new Error('Unknown error'),
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);

      for (const { index, result, error } of chunkResults) {
        results[index] = result;
        errors[index] = error;
      }

      // Rate limiting delay between chunks
      if (i + maxConcurrent < prompts.length) {
        await sleep(1500);
      }
    }

    const successCount = errors.filter(e => e === null).length;
    log.info('Batch Claude calls complete', {
      total: prompts.length,
      successful: successCount,
      failed: prompts.length - successCount,
    });

    return results;
  }

  async singleCall(systemPrompt: string, userMessage: string): Promise<string> {
    await this.ensureApiKey();

    const response = await fetch(API_ENDPOINTS.CLAUDE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
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

  private broadcast(msg: { type: string; payload: unknown }): void {
    chrome.runtime.sendMessage(msg).catch(() => {
      // Side panel may not be open
    });
  }

  private buildSystemPrompt(context?: ProjectContext): string {
    let prompt = DOUBLE_BLACK_BOX_SYSTEM_PROMPT;

    if (context) {
      prompt += `\n\nCurrent Project Context:
- Goal: ${context.goal}
- Industry: ${context.industry}
- Target Audience: ${context.targetAudience}
- Design Style: ${context.designStyle}`;

      if (context.competitors?.length) {
        prompt += `\n- Key Competitors: ${context.competitors.join(', ')}`;
      }
      if (context.specificComponents?.length) {
        prompt += `\n- Focus Components: ${context.specificComponents.join(', ')}`;
      }

      prompt += `

When the user references scraping or analysis, you have access to a pipeline that captures:
- Design tokens (colors, spacing, shadows, border-radii, z-indices, opacities)
- Typography systems (families, weights, sizes, line heights, letter spacing)
- Icons (SVG extraction with categorization)
- Grid layouts (container widths, columns, gutters, breakpoint behaviors)
- Navigation structures (primary, footer, breadcrumbs, sitemap tree)
- Copy/microcopy analysis (CTAs, error messages, placeholders, tooltips, tone)
- Accessibility audits (contrast, alt text, ARIA, tab order, focus indicators, WCAG level)
- Third-party stack detection (analytics, CMS, frameworks, auth, payment, chat)
- Dark mode analysis (method detection, dark color palette)
- Image assets (format, dimensions, lazy loading, CDN usage, srcset)
- Conversion patterns (CTAs, social proof, form fields, urgency, trust badges)
- Component extraction (HTML/CSS with state variants)
- Animations (CSS transitions, keyframes, scroll-triggered)
- Scroll behavior (sticky elements, parallax, page transitions)
- User flow analysis (steps to conversion, cognitive load, friction points)
- Multi-breakpoint screenshots (375, 768, 1280, 1920px)
- Lighthouse performance metrics
- Wayback Machine historical snapshots
- Heatmap data (Hotjar, FullStory, or DOM-scraped)

Use this data context when providing analysis and recommendations.`;
    }

    return prompt;
  }
}
