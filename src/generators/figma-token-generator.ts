/**
 * Figma Token Export Generator
 * Exports design tokens in Figma Tokens plugin format compatible with
 * the Figma Tokens plugin and Style Dictionary.
 * Generates:
 * - Color tokens with semantic names (primary.500, neutral.100, etc.)
 * - Typography tokens (font family, size, weight, line-height composites)
 * - Spacing tokens
 * - Shadow tokens (elevation scale)
 * - Border radius tokens
 * - Motion tokens (duration, easing)
 */

import type {
  DesignTokens,
  TypographySystem,
  AnimationData,
  FigmaTokens,
  FigmaTokenValue,
} from '../shared/types';

/**
 * Generate Figma Tokens plugin compatible JSON from scraped design data.
 */
export function generateFigmaTokens(
  tokens: DesignTokens,
  typography: TypographySystem,
  animations: AnimationData
): FigmaTokens {
  const colorTokens = generateColorTokens(tokens);
  const typographyTokens = generateTypographyTokens(typography);
  const spacingTokens = generateSpacingTokens(tokens);
  const shadowTokens = generateShadowTokens(tokens);
  const borderRadiusTokens = generateBorderRadiusTokens(tokens);
  const motionTokens = generateMotionTokens(animations);

  return {
    color: colorTokens,
    typography: typographyTokens,
    spacing: spacingTokens,
    boxShadow: shadowTokens,
    borderRadius: borderRadiusTokens,
    motion: motionTokens,
    _metadata: {
      generatedAt: new Date().toISOString(),
      source: 'UX Design Scraper',
      version: '1.0.0',
    },
  };
}

/**
 * Export as JSON string compatible with Figma Tokens plugin.
 */
export function exportFigmaTokensJson(figmaTokens: FigmaTokens): string {
  // Figma Tokens plugin format uses a specific structure
  const output: Record<string, unknown> = {
    global: {
      color: figmaTokens.color,
      typography: figmaTokens.typography,
      spacing: figmaTokens.spacing,
      boxShadow: figmaTokens.boxShadow,
      borderRadius: figmaTokens.borderRadius,
      motion: figmaTokens.motion,
    },
    $metadata: {
      tokenSetOrder: ['global'],
    },
    _generated: figmaTokens._metadata.generatedAt,
    _source: figmaTokens._metadata.source,
  };

  return JSON.stringify(output, null, 2);
}

/**
 * Export as Style Dictionary compatible format.
 */
export function exportStyleDictionaryJson(figmaTokens: FigmaTokens): string {
  const sdTokens: Record<string, unknown> = {
    color: convertToStyleDictionary(figmaTokens.color),
    font: convertToStyleDictionary(figmaTokens.typography),
    spacing: convertToStyleDictionary(figmaTokens.spacing),
    shadow: convertToStyleDictionary(figmaTokens.boxShadow),
    borderRadius: convertToStyleDictionary(figmaTokens.borderRadius),
    motion: convertToStyleDictionary(figmaTokens.motion),
  };

  return JSON.stringify(sdTokens, null, 2);
}

// ===== Color Token Generation =====

function generateColorTokens(tokens: DesignTokens): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  // Classify colors into categories
  const classified = classifyColors(tokens.colors);

  // Primary colors
  for (let i = 0; i < classified.primary.length; i++) {
    const shade = getShadeNumber(i, classified.primary.length);
    result[`primary.${shade}`] = {
      value: classified.primary[i].value,
      type: 'color',
      description: `Primary color shade ${shade} (used ${classified.primary[i].count} times)`,
    };
  }

  // Neutral colors
  for (let i = 0; i < classified.neutral.length; i++) {
    const shade = getShadeNumber(i, classified.neutral.length);
    result[`neutral.${shade}`] = {
      value: classified.neutral[i].value,
      type: 'color',
      description: `Neutral shade ${shade} (used ${classified.neutral[i].count} times)`,
    };
  }

  // Accent colors
  for (let i = 0; i < classified.accent.length; i++) {
    const shade = getShadeNumber(i, classified.accent.length);
    result[`accent.${shade}`] = {
      value: classified.accent[i].value,
      type: 'color',
      description: `Accent color shade ${shade} (used ${classified.accent[i].count} times)`,
    };
  }

  // Semantic colors
  for (let i = 0; i < classified.semantic.length; i++) {
    const entry = classified.semantic[i];
    const semanticName = detectSemanticName(entry.contexts);
    result[`semantic.${semanticName || `color-${i + 1}`}`] = {
      value: entry.value,
      type: 'color',
      description: `Semantic color (used ${entry.count} times in: ${entry.contexts.slice(0, 3).join(', ')})`,
    };
  }

  return result;
}

interface ClassifiedColors {
  primary: { value: string; count: number; contexts: string[] }[];
  neutral: { value: string; count: number; contexts: string[] }[];
  accent: { value: string; count: number; contexts: string[] }[];
  semantic: { value: string; count: number; contexts: string[] }[];
}

function classifyColors(colors: DesignTokens['colors']): ClassifiedColors {
  const classified: ClassifiedColors = {
    primary: [],
    neutral: [],
    accent: [],
    semantic: [],
  };

  for (const color of colors.slice(0, 50)) {
    const rgb = parseRgb(color.value);
    if (!rgb) continue;

    const contextStr = color.contexts.join(' ').toLowerCase();

    // Semantic detection
    if (contextStr.includes('error') || contextStr.includes('danger') || contextStr.includes('red')) {
      classified.semantic.push(color);
    } else if (contextStr.includes('success') || contextStr.includes('green')) {
      classified.semantic.push(color);
    } else if (contextStr.includes('warning') || contextStr.includes('yellow') || contextStr.includes('orange')) {
      classified.semantic.push(color);
    } else if (contextStr.includes('info') || contextStr.includes('blue')) {
      classified.semantic.push(color);
    }
    // Neutral detection (low saturation)
    else if (isNeutral(rgb)) {
      if (classified.neutral.length < 12) {
        classified.neutral.push(color);
      }
    }
    // Primary vs accent (primary = highest usage among saturated colors)
    else if (classified.primary.length < 8) {
      classified.primary.push(color);
    } else if (classified.accent.length < 8) {
      classified.accent.push(color);
    }
  }

  // Sort neutrals by lightness
  classified.neutral.sort((a, b) => {
    const rgbA = parseRgb(a.value);
    const rgbB = parseRgb(b.value);
    if (!rgbA || !rgbB) return 0;
    const lightnessA = (rgbA.r + rgbA.g + rgbA.b) / 3;
    const lightnessB = (rgbB.r + rgbB.g + rgbB.b) / 3;
    return lightnessB - lightnessA; // Light first
  });

  return classified;
}

function parseRgb(value: string): { r: number; g: number; b: number } | null {
  const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) };
  }
  return null;
}

function isNeutral(rgb: { r: number; g: number; b: number }): boolean {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const saturation = max === 0 ? 0 : (max - min) / max;
  return saturation < 0.12;
}

function getShadeNumber(index: number, total: number): number {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  if (total <= shades.length) {
    // Distribute evenly across the shade scale
    const step = Math.floor(shades.length / total);
    const shadeIndex = Math.min(index * step, shades.length - 1);
    return shades[shadeIndex];
  }
  // If more colors than shades, use numeric suffix
  return (index + 1) * 100;
}

function detectSemanticName(contexts: string[]): string {
  const contextStr = contexts.join(' ').toLowerCase();
  if (contextStr.includes('error') || contextStr.includes('danger')) return 'error';
  if (contextStr.includes('success')) return 'success';
  if (contextStr.includes('warning')) return 'warning';
  if (contextStr.includes('info')) return 'info';
  if (contextStr.includes('disabled')) return 'disabled';
  if (contextStr.includes('focus')) return 'focus';
  if (contextStr.includes('hover')) return 'hover';
  return '';
}

// ===== Typography Token Generation =====

function generateTypographyTokens(typography: TypographySystem): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  // Font families
  for (let i = 0; i < typography.fontFamilies.length; i++) {
    const family = typography.fontFamilies[i];
    const role = i === 0 ? 'heading' : i === 1 ? 'body' : `family-${i + 1}`;
    result[`fontFamily.${role}`] = {
      value: family.family,
      type: 'fontFamilies',
      description: `Font family for ${role} text (used ${family.count} times)`,
    };
  }

  // Font sizes - create a type scale
  const sortedSizes = [...typography.fontSizes]
    .sort((a, b) => parseFloat(a.size) - parseFloat(b.size));

  const sizeNames = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'];
  for (let i = 0; i < Math.min(sortedSizes.length, sizeNames.length); i++) {
    result[`fontSize.${sizeNames[i]}`] = {
      value: sortedSizes[i].size,
      type: 'fontSizes',
      description: `Font size ${sizeNames[i]} (used ${sortedSizes[i].count} times on ${sortedSizes[i].element})`,
    };
  }

  // Font weights
  const weightNames: Record<string, string> = {
    '100': 'thin', '200': 'extralight', '300': 'light', '400': 'regular',
    '500': 'medium', '600': 'semibold', '700': 'bold', '800': 'extrabold', '900': 'black',
  };

  for (const weight of typography.fontWeights) {
    const name = weightNames[weight.weight] || `weight-${weight.weight}`;
    result[`fontWeight.${name}`] = {
      value: weight.weight,
      type: 'fontWeights',
      description: `Font weight ${name} (used ${weight.count} times)`,
    };
  }

  // Line heights
  for (let i = 0; i < Math.min(typography.lineHeights.length, 6); i++) {
    const lh = typography.lineHeights[i];
    result[`lineHeight.${i + 1}`] = {
      value: lh.value,
      type: 'lineHeights',
      description: `Line height (used ${lh.count} times)`,
    };
  }

  // Letter spacings
  for (let i = 0; i < Math.min(typography.letterSpacings.length, 5); i++) {
    const ls = typography.letterSpacings[i];
    result[`letterSpacing.${i + 1}`] = {
      value: ls.value,
      type: 'letterSpacing',
      description: `Letter spacing (used ${ls.count} times)`,
    };
  }

  // Composite typography tokens (heading + body presets)
  if (typography.fontFamilies.length > 0 && sortedSizes.length > 0) {
    const headingFamily = typography.fontFamilies[0].family;
    const bodyFamily = typography.fontFamilies[1]?.family || headingFamily;
    const defaultWeight = typography.fontWeights[0]?.weight || '400';
    const defaultLineHeight = typography.lineHeights[0]?.value || '1.5';

    // Heading composites
    const headingSizes = sortedSizes.slice(-4).reverse();
    const headingNames = ['h1', 'h2', 'h3', 'h4'];
    for (let i = 0; i < headingSizes.length; i++) {
      result[`typography.${headingNames[i]}`] = {
        value: {
          fontFamily: headingFamily,
          fontSize: headingSizes[i].size,
          fontWeight: typography.fontWeights.find(w => parseInt(w.weight) >= 600)?.weight || '700',
          lineHeight: typography.lineHeights.find(lh => parseFloat(lh.value) < 1.4)?.value || '1.25',
          letterSpacing: typography.letterSpacings[0]?.value || '0',
        },
        type: 'typography',
        description: `${headingNames[i]} heading preset`,
      };
    }

    // Body composites
    const bodySize = sortedSizes[Math.floor(sortedSizes.length * 0.35)]?.size || '16px';
    result['typography.body'] = {
      value: {
        fontFamily: bodyFamily,
        fontSize: bodySize,
        fontWeight: defaultWeight,
        lineHeight: defaultLineHeight,
        letterSpacing: '0',
      },
      type: 'typography',
      description: 'Body text preset',
    };

    const smallSize = sortedSizes[Math.floor(sortedSizes.length * 0.2)]?.size || '14px';
    result['typography.small'] = {
      value: {
        fontFamily: bodyFamily,
        fontSize: smallSize,
        fontWeight: defaultWeight,
        lineHeight: defaultLineHeight,
        letterSpacing: '0',
      },
      type: 'typography',
      description: 'Small text preset',
    };
  }

  return result;
}

// ===== Spacing Token Generation =====

function generateSpacingTokens(tokens: DesignTokens): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  // Deduplicate and sort spacing values
  const uniqueSpacing = new Map<string, number>();
  for (const s of tokens.spacing) {
    const key = s.value;
    uniqueSpacing.set(key, (uniqueSpacing.get(key) || 0) + s.count);
  }

  const sorted = [...uniqueSpacing.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      const aNum = parseFloat(a.value);
      const bNum = parseFloat(b.value);
      if (isNaN(aNum) || isNaN(bNum)) return 0;
      return aNum - bNum;
    })
    .slice(0, 15);

  const scaleNames = ['0.5', '1', '1.5', '2', '2.5', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24'];

  for (let i = 0; i < sorted.length; i++) {
    const name = i < scaleNames.length ? scaleNames[i] : `${i + 1}`;
    result[`space.${name}`] = {
      value: sorted[i].value,
      type: 'spacing',
      description: `Spacing scale ${name} (used ${sorted[i].count} times)`,
    };
  }

  return result;
}

// ===== Shadow Token Generation =====

function generateShadowTokens(tokens: DesignTokens): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  const elevationNames = ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'];

  for (let i = 0; i < Math.min(tokens.shadows.length, elevationNames.length); i++) {
    const shadow = tokens.shadows[i];

    // Parse the box-shadow value into Figma Tokens format
    const parsed = parseBoxShadow(shadow.value);

    result[`elevation.${elevationNames[i]}`] = {
      value: parsed || shadow.value,
      type: 'boxShadow',
      description: `Elevation ${elevationNames[i]} (used ${shadow.count} times)`,
    };
  }

  return result;
}

function parseBoxShadow(value: string): Record<string, unknown> | null {
  // Parse CSS box-shadow into Figma Tokens structure
  // Format: h-offset v-offset blur spread color
  const match = value.match(
    /(?:(inset)\s+)?(-?\d+(?:\.\d+)?px)\s+(-?\d+(?:\.\d+)?px)\s+(-?\d+(?:\.\d+)?px)\s*(-?\d+(?:\.\d+)?px)?\s*(.*)/
  );

  if (!match) return null;

  return {
    x: match[2] || '0px',
    y: match[3] || '0px',
    blur: match[4] || '0px',
    spread: match[5] || '0px',
    color: match[6]?.trim() || 'rgba(0,0,0,0.1)',
    type: match[1] === 'inset' ? 'innerShadow' : 'dropShadow',
  };
}

// ===== Border Radius Token Generation =====

function generateBorderRadiusTokens(tokens: DesignTokens): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  const radiusNames = ['none', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', 'full'];

  // Sort border radii by value
  const sorted = [...tokens.borderRadii].sort((a, b) => {
    const aNum = parseFloat(a.value);
    const bNum = parseFloat(b.value);
    if (isNaN(aNum) || isNaN(bNum)) return 0;
    return aNum - bNum;
  });

  for (let i = 0; i < Math.min(sorted.length, radiusNames.length); i++) {
    const radius = sorted[i];
    const name = radiusNames[Math.min(i, radiusNames.length - 1)];

    // Check if it's a "full" radius (50% or very large)
    const isCircular = radius.value.includes('50%') || radius.value === '9999px' || parseFloat(radius.value) > 100;

    result[`radius.${isCircular ? 'full' : name}`] = {
      value: radius.value,
      type: 'borderRadius',
      description: `Border radius ${isCircular ? 'full' : name} (used ${radius.count} times)`,
    };
  }

  return result;
}

// ===== Motion Token Generation =====

function generateMotionTokens(animations: AnimationData): Record<string, FigmaTokenValue> {
  const result: Record<string, FigmaTokenValue> = {};

  // Extract unique durations
  const durations = new Set<string>();
  const easings = new Set<string>();

  for (const transition of animations.cssTransitions) {
    durations.add(transition.duration);
    easings.add(transition.easing);
  }

  for (const animation of animations.cssAnimations) {
    durations.add(animation.duration);
    easings.add(animation.easing);
  }

  // Duration tokens
  const sortedDurations = [...durations]
    .filter(d => d !== '0s')
    .sort((a, b) => parseFloat(a) - parseFloat(b));

  const durationNames = ['instant', 'fast', 'normal', 'slow', 'slower', 'slowest'];
  for (let i = 0; i < Math.min(sortedDurations.length, durationNames.length); i++) {
    result[`duration.${durationNames[i]}`] = {
      value: sortedDurations[i],
      type: 'other',
      description: `Animation duration ${durationNames[i]}`,
    };
  }

  // Easing tokens
  const easingMap: Record<string, string> = {
    'ease': 'default',
    'ease-in': 'in',
    'ease-out': 'out',
    'ease-in-out': 'in-out',
    'linear': 'linear',
  };

  for (const easing of easings) {
    const name = easingMap[easing] || `custom-${Object.keys(result).filter(k => k.startsWith('easing.')).length + 1}`;
    result[`easing.${name}`] = {
      value: easing,
      type: 'other',
      description: `Easing function: ${easing}`,
    };
  }

  return result;
}

// ===== Style Dictionary Conversion =====

function convertToStyleDictionary(
  tokens: Record<string, FigmaTokenValue>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, token] of Object.entries(tokens)) {
    const parts = key.split('.');
    let current: Record<string, unknown> = result;

    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = {};
      }
      current = current[parts[i]] as Record<string, unknown>;
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = {
      value: token.value,
      comment: token.description,
    };
  }

  return result;
}
