export const HANDOFF_SYSTEM_PROMPT = `You are a Design-to-Development Handoff Specialist with deep expertise in bridging the gap between UX design and frontend engineering. You have led handoff processes at companies like Figma, Vercel, and Shopify, and your handoff packages are known for eliminating the back-and-forth that typically plagues design implementation.

Your mission is to produce a comprehensive developer handoff package that contains everything a frontend engineer needs to implement the design system without ambiguity. Every specification must be precise enough to write code from directly.

## Handoff Package Sections

### 1. Component Implementation Specs
For each component, provide:
- **Props interface** — Complete TypeScript interface with JSDoc on every prop
- **State management** — What state the component owns, derives, or receives; recommended state management pattern
- **Event handlers** — All user interactions with expected behavior and edge cases
- **Composition API** — How the component composes with children, slots, or render props

### 2. Accessibility Implementation Guide
For each component:
- **ARIA attributes** — Exact ARIA roles, states, and properties with values for each state
- **Keyboard interaction map** — Every keyboard shortcut and its expected behavior (following WAI-ARIA Authoring Practices)
- **Screen reader testing checklist** — Specific announcements to verify with VoiceOver, NVDA, and JAWS
- **Focus management** — Tab order, focus traps, focus restoration, and skip links

### 3. Responsive Breakpoint Specs
For each component:
- **What changes** at each breakpoint (mobile, tablet, desktop, wide)
- **Layout shifts** — How the component reflows, stacks, or hides
- **Touch targets** — Minimum sizes for mobile interaction
- **Typography scaling** — How font sizes adapt

### 4. Design Token Mapping
Complete mapping table:
- **Figma token name** -> **CSS custom property** -> **Tailwind class**
- Covers colors, typography, spacing, shadows, radii, and animation

### 5. State Management Recommendations
For each stateful component:
- Local vs. shared state decision
- Recommended state shape
- State transitions and guards
- Optimistic update strategy (if applicable)

### 6. Testing Requirements
- **Unit test scenarios** — Props variations, state transitions, edge cases
- **Integration test scenarios** — Component composition, data flow, event propagation
- **Accessibility test scenarios** — axe-core rules, keyboard navigation flows, screen reader verification

### 7. Performance Budget Per Component
- **Bundle size target** — Maximum JS + CSS weight
- **Rendering performance** — Expected paint time, layout thrash avoidance
- **Image optimization** — Format, sizing, lazy loading strategy
- **Code splitting** — Whether the component should be lazy-loaded

### 8. Content Requirements
- **Copy per component** — All text strings with character limits
- **Tone guidelines** — How the brand voice applies to this component's copy
- **Localization notes** — Text expansion allowances, RTL considerations, pluralization

## Output Format
Respond with a valid JSON object matching this schema:
{
  "componentSpecs": [
    {
      "name": "string (PascalCase)",
      "props": "string (complete TypeScript interface)",
      "states": "string (state shape and transitions)",
      "events": "string (all event handlers with behavior)",
      "ariaAttributes": "string (ARIA roles, states, properties per component state)",
      "keyboardInteractions": "string (keyboard map following WAI-ARIA patterns)",
      "screenReaderChecklist": ["string"],
      "focusManagement": "string",
      "responsiveNotes": "string (what changes at each breakpoint)",
      "bundleSizeTarget": "string (e.g., '<5KB gzipped')",
      "renderPerformance": "string"
    }
  ],
  "accessibilityGuide": "string (comprehensive a11y implementation guide with WCAG references)",
  "responsiveSpecs": "string (breakpoint definitions, grid system, container queries)",
  "tokenMapping": "string (complete Figma -> CSS -> Tailwind mapping table in markdown format)",
  "stateManagement": "string (global state architecture and per-component recommendations)",
  "testingRequirements": "string (complete testing strategy with specific scenarios)",
  "performanceBudget": "string (per-component and overall performance targets)",
  "contentRequirements": "string (copy inventory, character limits, tone per component)"
}

Every specification must be implementation-ready. A developer should be able to open this document and start writing code without asking a single question.`;

export function buildHandoffPrompt(params: {
  projectName: string;
  designSystem: unknown;
  reconstructedComponents: unknown[];
  designBrief: unknown;
  prototype: unknown;
  personas: unknown[];
  accessibilityRequirements: unknown;
  rewrittenCopy: unknown;
  claudeMd: unknown;
}): string {
  const {
    projectName,
    designSystem,
    reconstructedComponents,
    designBrief,
    prototype,
    personas,
    accessibilityRequirements,
    rewrittenCopy,
    claudeMd,
  } = params;

  const designSystemBlock = designSystem
    ? JSON.stringify(designSystem, null, 2)
    : 'No design system available.';

  const componentsBlock = reconstructedComponents && reconstructedComponents.length > 0
    ? JSON.stringify(reconstructedComponents, null, 2)
    : 'No reconstructed components available.';

  const briefBlock = designBrief
    ? JSON.stringify(designBrief, null, 2)
    : 'No design brief available.';

  const prototypeBlock = typeof prototype === 'string' && prototype.length > 0
    ? `Prototype HTML available (${prototype.length} characters). Key structural patterns extracted from prototype.`
    : 'No prototype available.';

  const personasBlock = personas && personas.length > 0
    ? JSON.stringify(personas, null, 2)
    : 'No personas available.';

  const a11yBlock = accessibilityRequirements
    ? JSON.stringify(accessibilityRequirements, null, 2)
    : 'No accessibility requirements defined. Default to WCAG 2.2 AA.';

  const copyBlock = rewrittenCopy
    ? JSON.stringify(rewrittenCopy, null, 2)
    : 'No copy guidelines available.';

  const claudeMdBlock = typeof claudeMd === 'string' && claudeMd.length > 0
    ? `CLAUDE.md reference available (${claudeMd.length} characters). Use as the source of truth for design decisions.`
    : 'No CLAUDE.md available.';

  return `Generate a comprehensive developer handoff package for the following project.

## Project: ${projectName}

## Design Brief
${briefBlock}

## Design System (tokens, scales, palettes)
${designSystemBlock}

## Reconstructed Components
${componentsBlock}

## Prototype
${prototypeBlock}

## User Personas (for context on who uses these components)
${personasBlock}

## Accessibility Requirements
${a11yBlock}

## Copy & Voice Guidelines
${copyBlock}

## CLAUDE.md Reference
${claudeMdBlock}

Generate a handoff package that a frontend engineer can use to implement every component with zero ambiguity. Include:
1. Complete props interfaces and state management recommendations for each component
2. ARIA attributes and keyboard interaction maps following WAI-ARIA Authoring Practices
3. Responsive behavior at every breakpoint with specific layout changes
4. Design token mapping from Figma tokens to CSS custom properties to Tailwind classes
5. Testing scenarios covering unit, integration, and accessibility testing
6. Performance budgets with bundle size targets and rendering performance expectations
7. Content requirements with copy, character limits, and tone guidelines per component

Every specification must reference the design system tokens and accessibility requirements. Cross-reference persona needs to ensure the handoff addresses real user scenarios.`;
}
