import {
  COMPONENT_BLUEPRINTS,
  DESIGN_TOKEN_SPECS,
  QUALITY_CHECKLIST,
  formatBlueprintsForPrompt,
  formatQualityChecklistForPrompt,
} from '@shared/ux-knowledge-base';
import {
  SPACING_SYSTEMS,
  ELEVATION_SYSTEMS,
} from '@shared/industry-design-data';

export const DEVELOP_PHASE_SYSTEM_PROMPT = `You are a Design Systems Engineer executing Phase 05 DEVELOP of the Double Black Box Method. Your mission is to transform the winning design direction into a production-ready design system with normalized tokens, a coherent type scale, spacing system, and all supporting design primitives.

You take the raw design tokens scraped from reference sites, the winning design direction's color and typography choices, and reconstructed components, then normalize everything into a systematic, scalable design system.

Your normalization process:
1. **Color Palette** — Map scraped colors to semantic roles (brand, neutral, accent, semantic). Normalize to a consistent scale (50-950). Ensure all combinations pass WCAG AA contrast.
2. **Typography Scale** — Create a modular type scale with consistent ratios. Map to semantic names (display, heading, body, caption, overline). Include weight, line-height, and letter-spacing for each step.
3. **Spacing Scale** — Derive a base unit and build a consistent spacing scale (4px or 8px base). Map to semantic sizes (xs through 3xl).
4. **Shadow Scale** — Normalize elevation tokens into a consistent depth scale (sm, md, lg, xl).
5. **Border Radius Scale** — Normalize to a consistent scale (none, sm, md, lg, full).
6. **Animation Tokens** — Define duration, easing, and usage patterns for micro-interactions.

## Output Format
Respond with a valid JSON object:
{
  "colorPalette": [
    {
      "name": "string (semantic name like 'primary-500', 'neutral-100', 'error')",
      "value": "string (hex color)",
      "usage": "string (when to use this color)"
    }
  ],
  "typographyScale": [
    {
      "name": "string (semantic name like 'display-lg', 'heading-md', 'body-sm')",
      "size": "string (rem value)",
      "weight": "string (font weight)",
      "lineHeight": "string (unitless ratio or rem)",
      "usage": "string (when to use this step)"
    }
  ],
  "spacingScale": [
    {
      "name": "string (semantic name like 'space-xs', 'space-md', 'space-2xl')",
      "value": "string (rem or px value)"
    }
  ],
  "shadowScale": [
    {
      "name": "string (elevation-sm, elevation-md, etc.)",
      "value": "string (CSS box-shadow value)"
    }
  ],
  "borderRadiusScale": [
    {
      "name": "string (radius-none, radius-sm, radius-md, radius-lg, radius-full)",
      "value": "string (px or rem value)"
    }
  ],
  "animationTokens": [
    {
      "name": "string (semantic name like 'transition-fast', 'ease-in-out-standard')",
      "duration": "string (ms value)",
      "easing": "string (CSS easing function)",
      "usage": "string (when to use this animation)"
    }
  ]
}

Every token must be justified by scraped data or the winning design direction. No arbitrary values.`;

export const buildDevelopUserPrompt = (
  winningDirection: {
    name: string;
    description: string;
    colorDirection: { primary: string; secondary: string; accent: string; rationale: string };
    typographyDirection: { headingFont: string; bodyFont: string; rationale: string };
    layoutApproach: string;
  },
  scrapedTokens: {
    colors: Array<{ value: string; count: number; contexts: string[] }>;
    spacing: Array<{ value: string; count: number }>;
    shadows: Array<{ value: string; count: number }>;
    borderRadii: Array<{ value: string; count: number }>;
  },
  scrapedTypography: {
    fontFamilies: Array<{ family: string; count: number; usage: string[] }>;
    fontSizes: Array<{ size: string; count: number; element: string }>;
    fontWeights: Array<{ weight: string; count: number }>;
    lineHeights: Array<{ value: string; count: number }>;
  },
  componentSummary: string
): string => `Generate a normalized design system based on the winning design direction and scraped reference data.

## Winning Design Direction: "${winningDirection.name}"
${winningDirection.description}

**Color Direction:**
- Primary: ${winningDirection.colorDirection.primary}
- Secondary: ${winningDirection.colorDirection.secondary}
- Accent: ${winningDirection.colorDirection.accent}
- Rationale: ${winningDirection.colorDirection.rationale}

**Typography Direction:**
- Heading Font: ${winningDirection.typographyDirection.headingFont}
- Body Font: ${winningDirection.typographyDirection.bodyFont}
- Rationale: ${winningDirection.typographyDirection.rationale}

**Layout Approach:** ${winningDirection.layoutApproach}

## Scraped Design Tokens (Reference Data)
**Colors (${scrapedTokens.colors.length} unique):**
${scrapedTokens.colors.slice(0, 20).map(c => `- ${c.value} (${c.count}x): ${c.contexts.slice(0, 3).join(', ')}`).join('\n')}

**Spacing (${scrapedTokens.spacing.length} values):**
${scrapedTokens.spacing.slice(0, 15).map(s => `- ${s.value} (${s.count}x)`).join('\n')}

**Shadows (${scrapedTokens.shadows.length}):**
${scrapedTokens.shadows.slice(0, 8).map(s => `- ${s.value} (${s.count}x)`).join('\n')}

**Border Radii (${scrapedTokens.borderRadii.length}):**
${scrapedTokens.borderRadii.map(r => `- ${r.value} (${r.count}x)`).join('\n')}

## Scraped Typography
**Font Families:** ${scrapedTypography.fontFamilies.map(f => `${f.family} (${f.count}x, used in: ${f.usage.slice(0, 3).join(', ')})`).join('; ')}
**Font Sizes:** ${scrapedTypography.fontSizes.slice(0, 12).map(f => `${f.size} on ${f.element}`).join(', ')}
**Font Weights:** ${scrapedTypography.fontWeights.map(w => `${w.weight} (${w.count}x)`).join(', ')}
**Line Heights:** ${scrapedTypography.lineHeights.map(l => `${l.value} (${l.count}x)`).join(', ')}

## Reconstructed Components
${componentSummary}

## Component Blueprints with ARIA and States
Use these blueprints to ensure every component in the system has proper accessibility and interaction states:
${formatBlueprintsForPrompt(COMPONENT_BLUEPRINTS)}

## Design Token Specification Reference
Follow these naming conventions and scale patterns for systematic token generation:
${DESIGN_TOKEN_SPECS.map(spec =>
  `**${spec.category}**: ${spec.description}\n  Naming: ${spec.namingConvention}\n  Scale: ${spec.scalePattern}\n  Examples: ${spec.examples.join(', ')}`
).join('\n\n')}

## Spacing System Reference
${(() => {
  const sys = Object.values(SPACING_SYSTEMS)[0];
  if (!sys) return 'Use an 8px base grid spacing system.';
  return `**${sys.baseUnit}px Grid**\n${Object.entries(sys.scale).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n  Tailwind: ${Object.entries(sys.tailwindMapping).map(([k, v]) => `${k}→${v}`).join(', ')}`;
})()}

## Elevation System Reference
${(() => {
  const sys = Object.values(ELEVATION_SYSTEMS)[0];
  if (!sys) return 'Use a standard 5-level elevation system.';
  return `**${sys.name}**\n${sys.levels.map(l => `  Level ${l.level}: ${l.shadow} — ${l.useCase} (z-index: ${l.zIndex})`).join('\n')}`;
})()}

## Design Quality Self-Verification Checklist
Before finalizing, verify the design system against each item:
${formatQualityChecklistForPrompt(QUALITY_CHECKLIST)}

Normalize these raw tokens into a systematic, scalable design system. Use the winning direction to guide aesthetic choices while grounding values in the scraped data. Ensure WCAG AA contrast compliance for all color combinations. Follow the token specification naming conventions and verify against the quality checklist.`;
