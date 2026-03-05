import type { DesignTokens, TypographySystem, AnimationData } from '../shared/types';

export function generateColorsJson(tokens: DesignTokens): string {
  const palette: Record<string, string[]> = {
    primary: [],
    neutral: [],
    accent: [],
    semantic: [],
    all: [],
  };

  for (const color of tokens.colors) {
    palette.all.push(color.value);

    const lower = color.contexts.join(' ').toLowerCase();
    if (lower.includes('background') || lower.includes('body') || lower.includes('text')) {
      palette.neutral.push(color.value);
    } else if (lower.includes('button') || lower.includes('link') || lower.includes('primary')) {
      palette.primary.push(color.value);
    } else if (lower.includes('error') || lower.includes('success') || lower.includes('warning') || lower.includes('danger')) {
      palette.semantic.push(color.value);
    } else {
      palette.accent.push(color.value);
    }
  }

  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper',
    _totalColors: tokens.colors.length,
    palette: {
      primary: palette.primary.slice(0, 10),
      neutral: palette.neutral.slice(0, 10),
      accent: palette.accent.slice(0, 10),
      semantic: palette.semantic.slice(0, 10),
    },
    allColors: tokens.colors.slice(0, 50).map(c => ({
      value: c.value,
      usageCount: c.count,
      contexts: c.contexts.slice(0, 5),
    })),
  }, null, 2);
}

export function generateTypographyJson(typography: TypographySystem): string {
  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper',
    fontFamilies: typography.fontFamilies.map(f => ({
      family: f.family,
      usageCount: f.count,
      usedIn: f.usage.slice(0, 5),
    })),
    fontSizes: typography.fontSizes.slice(0, 20).map(s => ({
      size: s.size,
      usageCount: s.count,
      element: s.element,
    })),
    fontWeights: typography.fontWeights.map(w => ({
      weight: w.weight,
      usageCount: w.count,
    })),
    lineHeights: typography.lineHeights.slice(0, 10).map(l => ({
      value: l.value,
      usageCount: l.count,
    })),
    letterSpacings: typography.letterSpacings.slice(0, 10).map(l => ({
      value: l.value,
      usageCount: l.count,
    })),
    recommendedScale: {
      heading: typography.fontFamilies[0]?.family || 'system-ui',
      body: typography.fontFamilies[1]?.family || typography.fontFamilies[0]?.family || 'system-ui',
      mono: 'monospace',
    },
  }, null, 2);
}

export function generateSpacingJson(tokens: DesignTokens): string {
  const uniqueSpacing = new Map<string, number>();
  for (const s of tokens.spacing) {
    uniqueSpacing.set(s.value, (uniqueSpacing.get(s.value) || 0) + s.count);
  }

  const sorted = [...uniqueSpacing.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => {
      const aNum = parseFloat(a.value);
      const bNum = parseFloat(b.value);
      if (isNaN(aNum) || isNaN(bNum)) return 0;
      return aNum - bNum;
    });

  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper',
    spacingScale: sorted.slice(0, 20).map((s, i) => ({
      name: `space-${i + 1}`,
      value: s.value,
      usageCount: s.count,
    })),
    borderRadii: tokens.borderRadii.slice(0, 10).map(r => ({
      value: r.value,
      usageCount: r.count,
    })),
  }, null, 2);
}

export function generateShadowsJson(tokens: DesignTokens): string {
  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper',
    shadows: tokens.shadows.slice(0, 10).map((s, i) => ({
      name: `shadow-${i + 1}`,
      value: s.value,
      usageCount: s.count,
    })),
    zIndices: tokens.zIndices.slice(0, 15).map(z => ({
      value: z.value,
      element: z.element,
    })),
    opacities: tokens.opacities.slice(0, 10).map(o => ({
      value: o.value,
      context: o.context,
    })),
  }, null, 2);
}

export function generateAnimationsJson(animations: AnimationData): string {
  return JSON.stringify({
    _generated: new Date().toISOString(),
    _source: 'UX Design Scraper',
    transitions: animations.cssTransitions.slice(0, 20).map(t => ({
      property: t.property,
      duration: t.duration,
      easing: t.easing,
      selector: t.selector,
    })),
    keyframeAnimations: animations.cssAnimations.slice(0, 10).map(a => ({
      name: a.name,
      duration: a.duration,
      easing: a.easing,
      keyframes: a.keyframes,
      selector: a.selector,
    })),
    scrollTriggered: animations.scrollTriggered.slice(0, 10).map(s => ({
      selector: s.selector,
      triggerType: s.triggerType,
      animation: s.animation,
    })),
  }, null, 2);
}
