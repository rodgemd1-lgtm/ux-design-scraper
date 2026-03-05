import type { FullScrapeResult, ProjectContext, ComponentData } from '../shared/types';

export function generateMasterPrompt(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext,
  generatedContent?: string
): string {
  if (generatedContent) return generatedContent;

  const { targetUrl, designTokens, typography, components, accessibility, lighthouse } = scrapeResult;

  return `# Master UX/UI Generation Prompt

> Use this prompt in Claude Code to rebuild the design from ${targetUrl}

## Design Brief
- **Goal**: ${projectContext.goal}
- **Industry**: ${projectContext.industry}
- **Audience**: ${projectContext.targetAudience}
- **Style**: ${projectContext.designStyle}

## Instructions

You are building a production-quality web application that matches the design system scraped from ${targetUrl}.

### 1. Read the Design System
Before writing any code, read these files in order:
- \`design-tokens/colors.json\` — ${designTokens.colors.length} colors extracted
- \`design-tokens/typography.json\` — ${typography.fontFamilies.length} font families
- \`design-tokens/spacing.json\` — ${designTokens.spacing.length} spacing values
- \`design-tokens/shadows.json\` — ${designTokens.shadows.length} shadow values
- \`design-tokens/animations.json\` — Animation timing data

### 2. Configure Tailwind
Create a tailwind.config.js that maps the scraped tokens to Tailwind utilities:
- Colors from colors.json as custom color palette
- Font families from typography.json
- Spacing scale from spacing.json
- Shadow scale from shadows.json
- Custom animation keyframes from animations.json

### 3. Build Components (${components.length} identified)
For each component in \`prompts/component-prompts/\`:
- Read the component specification
- Reference \`scraped-code/components/\` for the original HTML/CSS
- Build a React + Tailwind component with TypeScript
- Include ALL state variants (hover, focus, active, disabled, loading, error)
- Follow accessibility requirements from \`analysis/accessibility-audit.md\`

### 4. Assemble Screens
For each screen in \`prompts/screen-prompts/\`:
- Read the screen specification
- Reference screenshots at all 4 breakpoints (375px, 768px, 1280px, 1920px)
- Use the component library to assemble the screen
- Ensure responsive behavior matches the scraped design

### 5. Add Interactions
- Implement animations matching \`design-tokens/animations.json\`
- Add scroll-triggered animations from the scroll behavior data
- Implement all micro-interactions (hover effects, focus rings, loading states)

### 6. Validate
- Run accessibility checks: target WCAG 2.2 AA
- Current scraped score: ${accessibility.overallScore}/100
- Lighthouse performance target: ${lighthouse.performanceScore}/100
- Ensure all breakpoints render correctly

## Component Priority Order
${components.slice(0, 15).map((c, i) => `${i + 1}. **${c.name}** (${c.type}) — ${Object.keys(c.stateVariants).length} state variants`).join('\n')}

## Key Design Decisions
- Primary font: ${typography.fontFamilies[0]?.family || 'System default'}
- Primary color: ${designTokens.colors[0]?.value || 'Not detected'}
- Layout: ${scrapeResult.gridLayout.layoutType} with ${scrapeResult.gridLayout.columns} columns
- Container max-width: ${scrapeResult.gridLayout.containerMaxWidth}
`;
}

export function generateComponentPrompt(component: ComponentData): string {
  const states = Object.entries(component.stateVariants);
  const stateList = states.length > 0
    ? states.map(([state, styles]) => `- **${state}**: ${Object.entries(styles).map(([prop, val]) => `${prop}: ${val}`).join(', ')}`).join('\n')
    : '- Default state only';

  return `# Component: ${component.name}

## Type
${component.type}

## States
${stateList}

## Reference HTML
\`\`\`html
${component.html.slice(0, 3000)}
\`\`\`

## Reference CSS
\`\`\`css
${component.css.slice(0, 2000)}
\`\`\`

## Implementation Notes
- Build as a React functional component with TypeScript
- Use Tailwind CSS classes matching the design tokens
- Include all state variants listed above
- Ensure accessibility: proper ARIA attributes, keyboard navigation, focus management
- Make responsive across all breakpoints
`;
}

export function generateScreenPrompt(
  screenName: string,
  components: ComponentData[],
  screenshot?: { breakpoint: number }
): string {
  const componentList = components.map(c => `- ${c.name} (${c.type})`).join('\n');

  return `# Screen: ${screenName}

## Components Used
${componentList}

## Layout
Assemble these components into a full screen layout. Reference the screenshot at ${screenshot?.breakpoint || 1280}px viewport for visual guidance.

## Responsive Behavior
- Mobile (375px): Stack components vertically, full-width
- Tablet (768px): 2-column where appropriate
- Desktop (1280px): Full layout as designed
- Ultrawide (1920px): Constrained max-width with centered content

## Implementation
1. Create a page component that imports all listed components
2. Use CSS Grid or Flexbox for layout
3. Match spacing and proportions from the screenshots
4. Add scroll-triggered animations where the source design uses them
`;
}

export function generateWorkflowChain(
  scrapeResult: FullScrapeResult,
  projectContext: ProjectContext,
  generatedContent?: string
): string {
  if (generatedContent) return generatedContent;

  return `# Workflow Prompt Chain

> Step-by-step Claude Code session workflow for implementing ${scrapeResult.projectName}

## Phase 1: Environment Setup
\`\`\`
Create a new Next.js 14 project with TypeScript, Tailwind CSS, and the App Router.
Install dependencies: framer-motion, lucide-react, clsx, tailwind-merge.
\`\`\`

## Phase 2: Design Token Configuration
\`\`\`
Read all files in /design-tokens/ and create:
1. tailwind.config.ts with custom theme from tokens
2. src/styles/globals.css with CSS custom properties
3. src/lib/tokens.ts exporting token values as TypeScript constants
\`\`\`

## Phase 3: Base Component Library
\`\`\`
Read /prompts/component-prompts/ and build each component:
1. Start with atomic components (Button, Input, Badge, Avatar)
2. Then compound components (Card, Modal, Dropdown, Tabs)
3. Then layout components (Header, Footer, Sidebar, Hero)
Each component must support all scraped state variants.
Store in src/components/ with barrel exports.
\`\`\`

## Phase 4: Screen Assembly
\`\`\`
Read /prompts/screen-prompts/ and build each page:
1. Import components from the library
2. Arrange per screenshot reference in /assets/screenshots/
3. Add responsive breakpoint behavior
4. Wire up navigation between screens
\`\`\`

## Phase 5: Motion & Interaction Layer
\`\`\`
Read /design-tokens/animations.json and add:
1. Page transitions with framer-motion
2. Scroll-triggered animations (fade-in, slide-up)
3. Hover micro-interactions on all interactive elements
4. Loading states and skeleton screens
\`\`\`

## Phase 6: Content & Copy
\`\`\`
Read /analysis/copy-tone-guide.md for tone and voice.
Add placeholder content that matches the scraped copy patterns:
- CTA labels matching conversion patterns
- Error messages following the tone guide
- Empty states with helpful messaging
\`\`\`

## Phase 7: Accessibility Hardening
\`\`\`
Read /analysis/accessibility-audit.md and fix:
- All contrast ratio violations
- Missing ARIA labels on interactive elements
- Keyboard navigation for all flows
- Focus indicators on all focusable elements
- Screen reader landmarks and heading hierarchy
\`\`\`

## Phase 8: Performance Optimization
\`\`\`
Read /analysis/performance-report.md and optimize:
- Image formats (WebP/AVIF with fallbacks)
- Lazy loading for below-fold content
- Code splitting per route
- Font loading strategy (font-display: swap)
Target: LCP < 2.5s, CLS < 0.1, INP < 200ms
\`\`\`

## Phase 9: Quality Assurance
\`\`\`
1. Test all breakpoints: 375px, 768px, 1280px, 1920px
2. Test all component states: hover, focus, active, disabled, loading, error
3. Run Lighthouse audit targeting 90+ scores
4. Verify against /assets/screenshots/ for visual accuracy
\`\`\`

## Phase 10: Documentation
\`\`\`
1. Generate Storybook stories for all components
2. Document component API (props, variants, usage)
3. Create a design system README
\`\`\`
`;
}
