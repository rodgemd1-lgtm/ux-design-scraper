/**
 * Storybook Story Generator
 * Generates complete Storybook story files for reconstructed components:
 * - Default story with all props
 * - Variant stories for each state (hover, focus, disabled, loading, error)
 * - Responsive stories (mobile, tablet, desktop viewports)
 * - Accessibility addon configuration
 * - Controls for all props
 * - MDX documentation page
 */

import type { ReconstructedComponent } from '../shared/types';

/**
 * Generate a complete Storybook CSF3 story file for a reconstructed component.
 */
export function generateStory(component: ReconstructedComponent): string {
  const componentName = sanitizeName(component.name);
  const propsInterface = component.propsInterface || generateDefaultPropsInterface(component);
  const propNames = extractPropNames(propsInterface);
  const stateVariants = component.stateVariants || [];
  const tailwindClasses = component.tailwindClasses || [];
  const ariaAttributes = component.ariaAttributes || [];

  const lines: string[] = [];

  // ===== Imports =====
  lines.push(`import type { Meta, StoryObj } from '@storybook/react';`);
  lines.push(`import { within, userEvent, expect } from '@storybook/test';`);
  lines.push(`import { ${componentName} } from './${componentName}';`);
  lines.push('');

  // ===== Meta Configuration =====
  lines.push(`const meta: Meta<typeof ${componentName}> = {`);
  lines.push(`  title: 'Components/${categorizeComponent(component.originalType)}/${componentName}',`);
  lines.push(`  component: ${componentName},`);
  lines.push(`  tags: ['autodocs'],`);
  lines.push(`  parameters: {`);
  lines.push(`    layout: '${getLayoutForType(component.originalType)}',`);
  lines.push(`    docs: {`);
  lines.push(`      description: {`);
  lines.push(`        component: \`${componentName} component extracted from ${component.originalType} pattern.`);
  if (tailwindClasses.length > 0) {
    lines.push(`Uses Tailwind CSS classes: ${tailwindClasses.slice(0, 5).join(', ')}${tailwindClasses.length > 5 ? '...' : ''}.`);
  }
  if (ariaAttributes.length > 0) {
    lines.push(`Includes accessibility attributes: ${ariaAttributes.join(', ')}.`);
  }
  lines.push(`\`,`);
  lines.push(`      },`);
  lines.push(`    },`);
  lines.push(`    a11y: {`);
  lines.push(`      config: {`);
  lines.push(`        rules: [`);
  lines.push(`          { id: 'color-contrast', enabled: true },`);
  lines.push(`          { id: 'label', enabled: true },`);
  lines.push(`          { id: 'button-name', enabled: true },`);
  lines.push(`          { id: 'image-alt', enabled: true },`);
  lines.push(`        ],`);
  lines.push(`      },`);
  lines.push(`    },`);
  lines.push(`  },`);

  // ===== ArgTypes (Controls) =====
  lines.push(`  argTypes: {`);
  for (const prop of propNames) {
    const controlConfig = getControlConfig(prop, propsInterface);
    lines.push(`    ${prop.name}: ${controlConfig},`);
  }
  lines.push(`  },`);
  lines.push(`};`);
  lines.push('');
  lines.push(`export default meta;`);
  lines.push(`type Story = StoryObj<typeof ${componentName}>;`);
  lines.push('');

  // ===== Default Story =====
  lines.push(`// ===== Default Story =====`);
  lines.push(`export const Default: Story = {`);
  lines.push(`  args: {`);
  for (const prop of propNames) {
    const defaultValue = getDefaultValue(prop, component);
    if (defaultValue !== undefined) {
      lines.push(`    ${prop.name}: ${defaultValue},`);
    }
  }
  lines.push(`  },`);
  lines.push(`};`);
  lines.push('');

  // ===== State Variant Stories =====
  const states = ['hover', 'focus', 'disabled', 'loading', 'error', 'active', 'selected'];

  for (const state of states) {
    if (stateVariants.includes(state) || isCommonState(state, component.originalType)) {
      lines.push(`// ===== ${capitalize(state)} State =====`);
      lines.push(`export const ${capitalize(state)}: Story = {`);
      lines.push(`  args: {`);
      lines.push(`    ...Default.args,`);

      // Add state-specific props
      switch (state) {
        case 'disabled':
          lines.push(`    disabled: true,`);
          break;
        case 'loading':
          lines.push(`    loading: true,`);
          break;
        case 'error':
          lines.push(`    error: true,`);
          lines.push(`    errorMessage: 'Something went wrong. Please try again.',`);
          break;
        case 'active':
        case 'selected':
          lines.push(`    ${state}: true,`);
          break;
      }

      lines.push(`  },`);

      // Add interaction for hover/focus states
      if (state === 'hover' || state === 'focus') {
        lines.push(`  play: async ({ canvasElement }) => {`);
        lines.push(`    const canvas = within(canvasElement);`);
        lines.push(`    const element = canvas.getByRole('${getRoleForType(component.originalType)}') || canvasElement.firstElementChild;`);
        if (state === 'hover') {
          lines.push(`    if (element) await userEvent.hover(element);`);
        } else {
          lines.push(`    if (element) await userEvent.tab();`);
        }
        lines.push(`  },`);
      }

      lines.push(`};`);
      lines.push('');
    }
  }

  // ===== Responsive Stories =====
  lines.push(`// ===== Responsive Variants =====`);

  const viewports = [
    { name: 'Mobile', width: 375, height: 812 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    lines.push(`export const ${viewport.name}: Story = {`);
    lines.push(`  args: { ...Default.args },`);
    lines.push(`  parameters: {`);
    lines.push(`    viewport: {`);
    lines.push(`      defaultViewport: '${viewport.name.toLowerCase()}',`);
    lines.push(`    },`);
    lines.push(`    chromatic: {`);
    lines.push(`      viewports: [${viewport.width}],`);
    lines.push(`    },`);
    lines.push(`  },`);
    if (component.responsive) {
      lines.push(`  decorators: [`);
      lines.push(`    (Story) => (`);
      lines.push(`      <div style={{ width: '${viewport.width}px', margin: '0 auto' }}>`);
      lines.push(`        <Story />`);
      lines.push(`      </div>`);
      lines.push(`    ),`);
      lines.push(`  ],`);
    }
    lines.push(`};`);
    lines.push('');
  }

  // ===== Interaction Test Story =====
  lines.push(`// ===== Interaction Test =====`);
  lines.push(`export const WithInteraction: Story = {`);
  lines.push(`  args: { ...Default.args },`);
  lines.push(`  play: async ({ canvasElement }) => {`);
  lines.push(`    const canvas = within(canvasElement);`);
  lines.push(`    // Verify the component renders`);
  lines.push(`    const element = canvasElement.querySelector('[class]');`);
  lines.push(`    await expect(element).toBeTruthy();`);

  // Add type-specific interactions
  const interactions = getInteractionsForType(component.originalType);
  for (const interaction of interactions) {
    lines.push(`    ${interaction}`);
  }

  lines.push(`  },`);
  lines.push(`};`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate an MDX documentation page for the component.
 */
export function generateStoryMdx(component: ReconstructedComponent): string {
  const componentName = sanitizeName(component.name);
  const lines: string[] = [];

  lines.push(`import { Meta, Story, Canvas, ArgsTable, Source } from '@storybook/blocks';`);
  lines.push(`import * as ${componentName}Stories from './${componentName}.stories';`);
  lines.push('');
  lines.push(`<Meta of={${componentName}Stories} />`);
  lines.push('');
  lines.push(`# ${componentName}`);
  lines.push('');
  lines.push(`The \`${componentName}\` component was extracted from a \`${component.originalType}\` UI pattern.`);
  lines.push('');

  // Overview
  lines.push(`## Overview`);
  lines.push('');
  lines.push(`<Canvas of={${componentName}Stories.Default} />`);
  lines.push('');

  // Props table
  lines.push(`## Props`);
  lines.push('');
  lines.push(`<ArgsTable of={${componentName}Stories} />`);
  lines.push('');

  // States
  if (component.stateVariants.length > 0) {
    lines.push(`## States`);
    lines.push('');
    for (const state of component.stateVariants) {
      const storyName = capitalize(state);
      lines.push(`### ${storyName}`);
      lines.push('');
      lines.push(`<Canvas of={${componentName}Stories.${storyName}} />`);
      lines.push('');
    }
  }

  // Responsive behavior
  if (component.responsive) {
    lines.push(`## Responsive Behavior`);
    lines.push('');
    lines.push(`This component is responsive and adapts to different viewport sizes.`);
    lines.push('');
    lines.push(`### Mobile`);
    lines.push(`<Canvas of={${componentName}Stories.Mobile} />`);
    lines.push('');
    lines.push(`### Tablet`);
    lines.push(`<Canvas of={${componentName}Stories.Tablet} />`);
    lines.push('');
    lines.push(`### Desktop`);
    lines.push(`<Canvas of={${componentName}Stories.Desktop} />`);
    lines.push('');
  }

  // Accessibility
  if (component.ariaAttributes.length > 0) {
    lines.push(`## Accessibility`);
    lines.push('');
    lines.push(`This component includes the following ARIA attributes:`);
    lines.push('');
    for (const attr of component.ariaAttributes) {
      lines.push(`- \`${attr}\``);
    }
    lines.push('');
  }

  // Usage example
  if (component.usageExample) {
    lines.push(`## Usage`);
    lines.push('');
    lines.push('```tsx');
    lines.push(component.usageExample);
    lines.push('```');
    lines.push('');
  }

  // Tailwind classes
  if (component.tailwindClasses.length > 0) {
    lines.push(`## Tailwind Classes`);
    lines.push('');
    lines.push(`Key Tailwind classes used:`);
    lines.push('');
    for (const cls of component.tailwindClasses.slice(0, 15)) {
      lines.push(`- \`${cls}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ===== Helper Functions =====

function sanitizeName(name: string): string {
  // Convert to PascalCase
  return name
    .replace(/[^a-zA-Z0-9\s_-]/g, '')
    .split(/[\s_-]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

interface PropInfo {
  name: string;
  type: string;
  optional: boolean;
}

function extractPropNames(propsInterface: string): PropInfo[] {
  const props: PropInfo[] = [];
  const lines = propsInterface.split('\n');

  for (const line of lines) {
    const match = line.match(/^\s*(\w+)(\?)?:\s*(.+);?\s*$/);
    if (match) {
      props.push({
        name: match[1],
        type: match[3].replace(';', '').trim(),
        optional: !!match[2],
      });
    }
  }

  return props;
}

function generateDefaultPropsInterface(component: ReconstructedComponent): string {
  const lines: string[] = [];
  lines.push(`interface ${sanitizeName(component.name)}Props {`);

  // Infer common props based on component type
  const type = component.originalType.toLowerCase();

  if (['button', 'link', 'badge', 'tab'].includes(type)) {
    lines.push(`  children: React.ReactNode;`);
    lines.push(`  variant?: 'primary' | 'secondary' | 'ghost';`);
    lines.push(`  size?: 'sm' | 'md' | 'lg';`);
    lines.push(`  disabled?: boolean;`);
    lines.push(`  onClick?: () => void;`);
  } else if (['input', 'select', 'textarea'].includes(type)) {
    lines.push(`  label?: string;`);
    lines.push(`  placeholder?: string;`);
    lines.push(`  value?: string;`);
    lines.push(`  error?: boolean;`);
    lines.push(`  errorMessage?: string;`);
    lines.push(`  disabled?: boolean;`);
    lines.push(`  onChange?: (value: string) => void;`);
  } else if (['card', 'hero', 'pricing'].includes(type)) {
    lines.push(`  title: string;`);
    lines.push(`  description?: string;`);
    lines.push(`  image?: string;`);
    lines.push(`  children?: React.ReactNode;`);
  } else if (['modal', 'dialog'].includes(type)) {
    lines.push(`  open: boolean;`);
    lines.push(`  title?: string;`);
    lines.push(`  children: React.ReactNode;`);
    lines.push(`  onClose: () => void;`);
  } else if (['nav', 'header', 'footer'].includes(type)) {
    lines.push(`  children: React.ReactNode;`);
    lines.push(`  className?: string;`);
  } else {
    lines.push(`  children?: React.ReactNode;`);
    lines.push(`  className?: string;`);
  }

  if (component.stateVariants.includes('loading')) {
    lines.push(`  loading?: boolean;`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

function getControlConfig(prop: PropInfo, propsInterface: string): string {
  const type = prop.type.toLowerCase();

  // Boolean props
  if (type === 'boolean') {
    return `{ control: 'boolean' }`;
  }

  // String union types (variants)
  const unionMatch = prop.type.match(/^'([^']+)'(\s*\|\s*'[^']+')+$/);
  if (unionMatch) {
    const options = prop.type.match(/'([^']+)'/g)?.map(s => s.replace(/'/g, '')) || [];
    return `{ control: 'select', options: [${options.map(o => `'${o}'`).join(', ')}] }`;
  }

  // Function props
  if (type.includes('=>') || type.includes('function')) {
    return `{ action: '${prop.name}' }`;
  }

  // React.ReactNode
  if (type.includes('reactnode') || type.includes('react.reactnode')) {
    return `{ control: 'text' }`;
  }

  // Number
  if (type === 'number') {
    return `{ control: { type: 'number' } }`;
  }

  // Default to text control
  return `{ control: 'text' }`;
}

function getDefaultValue(prop: PropInfo, component: ReconstructedComponent): string | undefined {
  const type = component.originalType.toLowerCase();
  const name = prop.name.toLowerCase();

  // Common defaults based on prop name
  if (name === 'children') return `'${sanitizeName(component.name)}'`;
  if (name === 'variant') return `'primary'`;
  if (name === 'size') return `'md'`;
  if (name === 'disabled') return `false`;
  if (name === 'loading') return `false`;
  if (name === 'error') return `false`;
  if (name === 'open') return `true`;
  if (name === 'active') return `false`;
  if (name === 'selected') return `false`;

  if (name === 'title') return `'${sanitizeName(component.name)} Title'`;
  if (name === 'description') return `'A brief description of this ${type} component.'`;
  if (name === 'label') return `'Label'`;
  if (name === 'placeholder') return `'Enter value...'`;
  if (name === 'errormessage') return `'This field has an error.'`;
  if (name === 'value') return `''`;
  if (name === 'image') return `'https://via.placeholder.com/400x300'`;
  if (name === 'classname') return `''`;

  // Skip function props (they become actions)
  if (prop.type.includes('=>') || prop.type.includes('Function')) return undefined;

  return undefined;
}

function categorizeComponent(type: string): string {
  const atomTypes = ['button', 'badge', 'avatar', 'input', 'select', 'textarea', 'icon', 'link', 'progress', 'skeleton', 'tooltip'];
  const moleculeTypes = ['card', 'form', 'dropdown', 'tabs', 'accordion', 'alert', 'toast', 'breadcrumb', 'pagination', 'list'];
  const organismTypes = ['nav', 'header', 'footer', 'hero', 'sidebar', 'table', 'modal', 'dialog', 'carousel', 'gallery', 'pricing'];

  const lower = type.toLowerCase();
  if (atomTypes.includes(lower)) return 'Atoms';
  if (moleculeTypes.includes(lower)) return 'Molecules';
  if (organismTypes.includes(lower)) return 'Organisms';
  return 'Components';
}

function getLayoutForType(type: string): string {
  const centeredTypes = ['button', 'badge', 'avatar', 'input', 'select', 'alert', 'toast', 'card'];
  const fullscreenTypes = ['nav', 'header', 'footer', 'hero', 'modal'];
  const lower = type.toLowerCase();

  if (centeredTypes.includes(lower)) return 'centered';
  if (fullscreenTypes.includes(lower)) return 'fullscreen';
  return 'padded';
}

function getRoleForType(type: string): string {
  const roleMap: Record<string, string> = {
    button: 'button',
    link: 'link',
    nav: 'navigation',
    header: 'banner',
    footer: 'contentinfo',
    modal: 'dialog',
    dialog: 'dialog',
    input: 'textbox',
    select: 'combobox',
    alert: 'alert',
    tabs: 'tablist',
    table: 'table',
    list: 'list',
  };
  return roleMap[type.toLowerCase()] || 'region';
}

function isCommonState(state: string, type: string): boolean {
  const lower = type.toLowerCase();
  const stateMap: Record<string, string[]> = {
    button: ['hover', 'focus', 'disabled', 'loading', 'active'],
    input: ['hover', 'focus', 'disabled', 'error'],
    select: ['hover', 'focus', 'disabled', 'error'],
    textarea: ['hover', 'focus', 'disabled', 'error'],
    link: ['hover', 'focus', 'active'],
    card: ['hover'],
    modal: ['loading'],
    form: ['loading', 'error'],
    tab: ['hover', 'focus', 'active', 'selected'],
  };

  return stateMap[lower]?.includes(state) || false;
}

function getInteractionsForType(type: string): string[] {
  const lower = type.toLowerCase();

  switch (lower) {
    case 'button':
      return [
        `// Click the button`,
        `const button = canvas.getByRole('button');`,
        `await userEvent.click(button);`,
      ];
    case 'input':
    case 'textarea':
      return [
        `// Type into the input`,
        `const input = canvas.getByRole('textbox');`,
        `await userEvent.clear(input);`,
        `await userEvent.type(input, 'Test input value');`,
        `await expect(input).toHaveValue('Test input value');`,
      ];
    case 'select':
      return [
        `// Interact with the select`,
        `const select = canvas.getByRole('combobox');`,
        `await userEvent.click(select);`,
      ];
    case 'modal':
    case 'dialog':
      return [
        `// Verify dialog is visible`,
        `const dialog = canvas.getByRole('dialog');`,
        `await expect(dialog).toBeVisible();`,
      ];
    case 'tabs':
      return [
        `// Click a tab`,
        `const tabs = canvas.getAllByRole('tab');`,
        `if (tabs.length > 1) await userEvent.click(tabs[1]);`,
      ];
    default:
      return [
        `// Verify component is in the DOM`,
        `await expect(canvasElement.querySelector('[class]')).toBeTruthy();`,
      ];
  }
}
