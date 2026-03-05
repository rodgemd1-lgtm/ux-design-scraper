import { createLogger } from '@shared/logger';
import { MSG } from '@shared/message-types';
import {
  RECONSTRUCTION_SYSTEM_PROMPT,
  RECONSTRUCTION_USER_TEMPLATE,
} from '@shared/prompt-templates/reconstruction-prompt';
import type {
  ComponentData,
  DesignTokens,
  ReconstructedComponent,
} from '@shared/types';
import { ClaudeAPIClient } from './claude-api-client';

const log = createLogger('ComponentReconstructor');

export class ComponentReconstructor {
  private claudeClient: ClaudeAPIClient;

  constructor(claudeClient: ClaudeAPIClient) {
    this.claudeClient = claudeClient;
  }

  async reconstructComponent(
    rawComponent: ComponentData,
    designTokens: DesignTokens
  ): Promise<ReconstructedComponent> {
    log.info('Reconstructing component', { name: rawComponent.name, type: rawComponent.type });

    const stateVariantsDescription = Object.keys(rawComponent.stateVariants).length > 0
      ? Object.entries(rawComponent.stateVariants).map(([state, styles]) =>
          `- **${state}**: ${JSON.stringify(styles)}`
        ).join('\n')
      : 'No state variants detected in the original. You must ADD hover, focus, disabled, and loading states.';

    const designTokensContext = this.formatDesignTokensContext(designTokens);

    const userMessage = RECONSTRUCTION_USER_TEMPLATE(
      rawComponent.name,
      rawComponent.type,
      this.truncateContent(rawComponent.html, 3000),
      this.truncateContent(rawComponent.css, 3000),
      stateVariantsDescription,
      designTokensContext
    );

    try {
      const responseText = await this.claudeClient.singleCall(
        RECONSTRUCTION_SYSTEM_PROMPT,
        userMessage
      );

      const parsed = this.parseReconstructionResponse(responseText, rawComponent);
      log.info('Component reconstructed successfully', { name: parsed.name });
      return parsed;
    } catch (err) {
      log.error('Failed to reconstruct component', { name: rawComponent.name, error: err });
      throw new Error(
        `Failed to reconstruct component "${rawComponent.name}": ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  }

  async reconstructAll(
    components: ComponentData[],
    designTokens: DesignTokens
  ): Promise<ReconstructedComponent[]> {
    log.info('Starting batch reconstruction', { componentCount: components.length });

    const results: ReconstructedComponent[] = [];
    const maxConcurrent = 3;

    // Process in batches of maxConcurrent to respect rate limits
    for (let i = 0; i < components.length; i += maxConcurrent) {
      const batch = components.slice(i, i + maxConcurrent);
      const batchIndex = Math.floor(i / maxConcurrent) + 1;
      const totalBatches = Math.ceil(components.length / maxConcurrent);

      log.info(`Processing batch ${batchIndex}/${totalBatches}`, {
        components: batch.map(c => c.name),
      });

      this.broadcastProgress({
        phase: 'reconstructing',
        currentComponent: batch.map(c => c.name).join(', '),
        componentIndex: i,
        totalComponents: components.length,
        message: `Reconstructing components: ${batch.map(c => c.name).join(', ')} (batch ${batchIndex}/${totalBatches})`,
      });

      const batchPromises = batch.map(async (component) => {
        try {
          return await this.reconstructComponent(component, designTokens);
        } catch (err) {
          log.error(`Failed to reconstruct: ${component.name}`, err);
          // Return a fallback with the error noted
          return this.createFallbackReconstruction(component, err);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to avoid rate limiting
      if (i + maxConcurrent < components.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    log.info('Batch reconstruction complete', {
      total: components.length,
      successful: results.filter(r => r.tsx.length > 50).length,
    });

    // Broadcast completion
    chrome.runtime.sendMessage({
      type: MSG.RECONSTRUCT_COMPLETE,
      payload: {
        totalComponents: results.length,
        successfulCount: results.filter(r => r.tsx.length > 50).length,
      },
    }).catch(() => {});

    return results;
  }

  private parseReconstructionResponse(
    responseText: string,
    originalComponent: ComponentData
  ): ReconstructedComponent {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(responseText);

      return {
        name: parsed.name || this.toPascalCase(originalComponent.name),
        originalType: originalComponent.type,
        tsx: parsed.tsx || '',
        propsInterface: parsed.propsInterface || '',
        storybookStory: parsed.storybookStory || '',
        usageExample: parsed.usageExample || '',
        tailwindClasses: parsed.tailwindClasses || [],
        ariaAttributes: parsed.ariaAttributes || [],
        stateVariants: parsed.stateVariants || [],
        responsive: parsed.responsive ?? true,
      };
    } catch {
      // If JSON parsing fails, try to extract code blocks from the response
      log.warn('Failed to parse reconstruction as JSON, extracting code blocks');

      const tsxMatch = responseText.match(/```(?:tsx?|jsx?)\n([\s\S]*?)```/);
      const tsx = tsxMatch ? tsxMatch[1].trim() : responseText;

      // Extract Tailwind classes from the TSX
      const tailwindClasses = this.extractTailwindClasses(tsx);

      // Extract ARIA attributes from the TSX
      const ariaAttributes = this.extractAriaAttributes(tsx);

      return {
        name: this.toPascalCase(originalComponent.name),
        originalType: originalComponent.type,
        tsx,
        propsInterface: this.extractPropsInterface(tsx),
        storybookStory: '',
        usageExample: '',
        tailwindClasses,
        ariaAttributes,
        stateVariants: this.extractStateVariants(tsx),
        responsive: tsx.includes('sm:') || tsx.includes('md:') || tsx.includes('lg:'),
      };
    }
  }

  private createFallbackReconstruction(
    component: ComponentData,
    error: unknown
  ): ReconstructedComponent {
    const name = this.toPascalCase(component.name);
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    return {
      name,
      originalType: component.type,
      tsx: `// Reconstruction failed for ${name}: ${errorMsg}\n// Original HTML and CSS preserved below\n\n/*\nOriginal HTML:\n${component.html.slice(0, 500)}\n\nOriginal CSS:\n${component.css.slice(0, 500)}\n*/\n\nimport React from 'react';\n\ninterface ${name}Props {\n  className?: string;\n}\n\nexport const ${name}: React.FC<${name}Props> = ({ className }) => {\n  return (\n    <div className={className}>\n      {/* TODO: Reconstruct this ${component.type} component */}\n      <p>Component reconstruction pending</p>\n    </div>\n  );\n};\n\nexport default ${name};`,
      propsInterface: `interface ${name}Props {\n  className?: string;\n}`,
      storybookStory: '',
      usageExample: `<${name} />`,
      tailwindClasses: [],
      ariaAttributes: [],
      stateVariants: [],
      responsive: false,
    };
  }

  private formatDesignTokensContext(tokens: DesignTokens): string {
    const sections: string[] = [];

    if (tokens.colors.length > 0) {
      sections.push(`**Colors (${tokens.colors.length} tokens):**\n${
        tokens.colors.slice(0, 15).map(c =>
          `- \`${c.value}\` (used ${c.count}x in: ${c.contexts.slice(0, 3).join(', ')})`
        ).join('\n')
      }`);
    }

    if (tokens.spacing.length > 0) {
      sections.push(`**Spacing (${tokens.spacing.length} values):**\n${
        tokens.spacing.slice(0, 10).map(s =>
          `- \`${s.value}\` (${s.count}x)`
        ).join('\n')
      }`);
    }

    if (tokens.borderRadii.length > 0) {
      sections.push(`**Border Radii:**\n${
        tokens.borderRadii.map(r =>
          `- \`${r.value}\` (${r.count}x)`
        ).join('\n')
      }`);
    }

    if (tokens.shadows.length > 0) {
      sections.push(`**Shadows:**\n${
        tokens.shadows.slice(0, 5).map(s =>
          `- \`${s.value}\` (${s.count}x)`
        ).join('\n')
      }`);
    }

    return sections.join('\n\n') || 'No design tokens context available.';
  }

  private toPascalCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .split(/[\s\-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '\n\n/* ... truncated ... */';
  }

  private extractTailwindClasses(tsx: string): string[] {
    const classMatches = tsx.match(/(?:className|class)=["'{`]([^"'{`]+)["'{`]/g) || [];
    const allClasses = new Set<string>();

    for (const match of classMatches) {
      const classString = match.replace(/(?:className|class)=["'{`]/, '').replace(/["'{`]$/, '');
      const classes = classString.split(/\s+/).filter(Boolean);
      for (const cls of classes) {
        // Filter out template literal expressions
        if (!cls.startsWith('$') && !cls.includes('{')) {
          allClasses.add(cls);
        }
      }
    }

    return [...allClasses];
  }

  private extractAriaAttributes(tsx: string): string[] {
    const ariaMatches = tsx.match(/aria-[a-z-]+=["'{]/g) || [];
    const roleMatches = tsx.match(/role=["'{]/g) || [];
    const allAria = new Set<string>();

    for (const match of ariaMatches) {
      const attr = match.replace(/=["'{]$/, '');
      allAria.add(attr);
    }

    for (const match of roleMatches) {
      allAria.add('role');
    }

    return [...allAria];
  }

  private extractStateVariants(tsx: string): string[] {
    const variants = new Set<string>();

    if (tsx.includes('hover:') || tsx.includes('onMouseEnter')) variants.add('hover');
    if (tsx.includes('focus:') || tsx.includes('onFocus')) variants.add('focus');
    if (tsx.includes('active:') || tsx.includes('onMouseDown')) variants.add('active');
    if (tsx.includes('disabled') || tsx.includes('aria-disabled')) variants.add('disabled');
    if (tsx.includes('loading') || tsx.includes('isLoading') || tsx.includes('aria-busy')) variants.add('loading');
    if (tsx.includes('error') || tsx.includes('isError') || tsx.includes('aria-invalid')) variants.add('error');
    if (tsx.includes('focus-visible:') || tsx.includes('focus-within:')) variants.add('focus-visible');
    if (tsx.includes('dark:')) variants.add('dark');

    return [...variants];
  }

  private extractPropsInterface(tsx: string): string {
    const interfaceMatch = tsx.match(/(?:interface|type)\s+\w+Props\s*(?:=\s*)?\{[\s\S]*?\}/);
    return interfaceMatch ? interfaceMatch[0] : '';
  }

  private broadcastProgress(data: {
    phase: string;
    currentComponent: string;
    componentIndex: number;
    totalComponents: number;
    message: string;
  }): void {
    chrome.runtime.sendMessage({
      type: MSG.RECONSTRUCT_PROGRESS,
      payload: data,
    }).catch(() => {});
  }
}
