/**
 * Color Intelligence Module
 * Deep color analysis: palette extraction, harmony scoring, brand/neutral/accent
 * classification, emotional mapping, gradient detection, contrast matrix,
 * consistency analysis, and color scale generation.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';

// Inline types since content scripts cannot use @shared/ path aliases
interface ColorIntelligence {
  palette: {
    value: string;
    hex: string;
    hsl: { h: number; s: number; l: number };
    usage: 'brand' | 'neutral' | 'accent' | 'semantic';
    count: number;
    contexts: string[];
  }[];
  relationships: {
    type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'monochromatic';
    colors: string[];
    score: number;
  }[];
  harmonyScore: number;
  brandColors: string[];
  neutralColors: string[];
  accentColors: string[];
  emotionalMapping: {
    color: string;
    warmth: number;
    energy: number;
    luxury: number;
    associations: string[];
  }[];
  gradients: {
    type: 'linear' | 'radial';
    direction: string;
    colorStops: { color: string; position: string }[];
    selector: string;
  }[];
  contrastMatrix: {
    foreground: string;
    background: string;
    ratio: number;
    passesAA: boolean;
    passesAAA: boolean;
  }[];
  consistencyScore: number;
  consistencyIssues: {
    color: string;
    usedFor: string[];
    expectedUsage: string;
  }[];
  suggestedScale: {
    shade: number;
    hex: string;
  }[];
}

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

const MAX_ELEMENTS = 2000;

function describeElement(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id ? `#${el.id}` : '';
  const classes = el.className && typeof el.className === 'string'
    ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
    : '';
  return `${tag}${id}${classes}`;
}

function parseColor(color: string): ParsedColor | null {
  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return null;

  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3]),
      a: rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    };
  }
  return null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function luminance(c: ParsedColor): number {
  const [rs, gs, bs] = [c.r, c.g, c.b].map(v => {
    v = v / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(c1: ParsedColor, c2: ParsedColor): number {
  const l1 = luminance(c1);
  const l2 = luminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function hueDiff(h1: number, h2: number): number {
  const diff = Math.abs(h1 - h2);
  return diff > 180 ? 360 - diff : diff;
}

export class ColorIntelligenceExtractor extends BaseExtractor<ColorIntelligence> {
  constructor() {
    super('color-intelligence');
  }

  protected async doExtract(): Promise<ColorIntelligence> {
    const rawColors = this.collectColors();
    const palette = this.buildPalette(rawColors);
    const brandColors = palette.filter(c => c.usage === 'brand').map(c => c.hex);
    const neutralColors = palette.filter(c => c.usage === 'neutral').map(c => c.hex);
    const accentColors = palette.filter(c => c.usage === 'accent').map(c => c.hex);
    const relationships = this.detectRelationships(palette);
    const harmonyScore = this.calculateHarmonyScore(palette, relationships);
    const emotionalMapping = this.mapEmotions(palette);
    const gradients = this.extractGradients();
    const contrastMatrix = this.buildContrastMatrix(palette);
    const { consistencyScore, consistencyIssues } = this.analyzeConsistency(rawColors);
    const suggestedScale = this.generateColorScale(brandColors[0] || palette[0]?.hex || '#3b82f6');

    return {
      palette,
      relationships,
      harmonyScore,
      brandColors,
      neutralColors,
      accentColors,
      emotionalMapping,
      gradients,
      contrastMatrix,
      consistencyScore,
      consistencyIssues,
      suggestedScale,
    };
  }

  private collectColors(): Map<string, { count: number; contexts: Set<string>; property: string }> {
    const colorMap = new Map<string, { count: number; contexts: Set<string>; property: string }>();
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);

    const colorProps = [
      { prop: 'backgroundColor', name: 'background' },
      { prop: 'color', name: 'text' },
      { prop: 'borderTopColor', name: 'border' },
      { prop: 'outlineColor', name: 'outline' },
      { prop: 'textDecorationColor', name: 'decoration' },
    ];

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      const desc = describeElement(el);

      let style: CSSStyleDeclaration;
      try {
        style = getCachedStyle(el);
      } catch {
        continue;
      }

      for (const { prop, name } of colorProps) {
        const value = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
        if (value && value !== 'transparent' && value !== 'rgba(0, 0, 0, 0)') {
          const existing = colorMap.get(value);
          if (existing) {
            existing.count++;
            existing.contexts.add(`${name}:${desc}`);
          } else {
            colorMap.set(value, { count: 1, contexts: new Set([`${name}:${desc}`]), property: name });
          }
        }
      }
    }

    return colorMap;
  }

  private buildPalette(colorMap: Map<string, { count: number; contexts: Set<string>; property: string }>): ColorIntelligence['palette'] {
    const palette: ColorIntelligence['palette'] = [];

    for (const [value, data] of colorMap) {
      const parsed = parseColor(value);
      if (!parsed || parsed.a < 0.1) continue;

      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      const contexts = Array.from(data.contexts).slice(0, 10);
      const usage = this.classifyColorUsage(hsl, data.property, contexts);

      palette.push({
        value,
        hex,
        hsl,
        usage,
        count: data.count,
        contexts,
      });
    }

    palette.sort((a, b) => b.count - a.count);
    return palette.slice(0, 100);
  }

  private classifyColorUsage(
    hsl: HSL,
    property: string,
    contexts: string[]
  ): 'brand' | 'neutral' | 'accent' | 'semantic' {
    const contextStr = contexts.join(' ').toLowerCase();

    // Semantic colors (error, success, warning)
    if (contextStr.includes('error') || contextStr.includes('danger') ||
        contextStr.includes('success') || contextStr.includes('warning') ||
        contextStr.includes('info') || contextStr.includes('alert')) {
      return 'semantic';
    }

    // Neutral colors: very low saturation or very high/low lightness
    if (hsl.s < 10 || hsl.l > 95 || hsl.l < 5) {
      return 'neutral';
    }

    // Brand colors: high usage, used in buttons, links, primary elements
    if (contextStr.includes('button') || contextStr.includes('link') ||
        contextStr.includes('primary') || contextStr.includes('nav') ||
        contextStr.includes('header') || contextStr.includes('logo')) {
      return 'brand';
    }

    // Accent colors: medium-low usage, used for highlights
    if (hsl.s > 50) {
      return 'accent';
    }

    return 'neutral';
  }

  private detectRelationships(palette: ColorIntelligence['palette']): ColorIntelligence['relationships'] {
    const relationships: ColorIntelligence['relationships'] = [];
    const saturatedColors = palette.filter(c => c.hsl.s > 15 && c.hsl.l > 10 && c.hsl.l < 90);

    if (saturatedColors.length < 2) return relationships;

    // Take top saturated colors for relationship detection
    const topColors = saturatedColors.slice(0, 10);

    for (let i = 0; i < topColors.length; i++) {
      for (let j = i + 1; j < topColors.length; j++) {
        const c1 = topColors[i];
        const c2 = topColors[j];
        const hDiff = hueDiff(c1.hsl.h, c2.hsl.h);

        // Complementary: ~180 degrees apart
        if (hDiff >= 150 && hDiff <= 210) {
          relationships.push({
            type: 'complementary',
            colors: [c1.hex, c2.hex],
            score: Math.round((1 - Math.abs(hDiff - 180) / 30) * 100),
          });
        }
        // Analogous: ~30 degrees apart
        else if (hDiff >= 10 && hDiff <= 50) {
          relationships.push({
            type: 'analogous',
            colors: [c1.hex, c2.hex],
            score: Math.round((1 - Math.abs(hDiff - 30) / 20) * 100),
          });
        }
        // Triadic: ~120 degrees apart
        else if (hDiff >= 100 && hDiff <= 140) {
          relationships.push({
            type: 'triadic',
            colors: [c1.hex, c2.hex],
            score: Math.round((1 - Math.abs(hDiff - 120) / 20) * 100),
          });
        }
        // Split-complementary: ~150 degrees apart
        else if ((hDiff >= 130 && hDiff < 150) || (hDiff > 210 && hDiff <= 230)) {
          relationships.push({
            type: 'split-complementary',
            colors: [c1.hex, c2.hex],
            score: Math.round((1 - Math.abs(hDiff - 150) / 30) * 100),
          });
        }
        // Monochromatic: same hue, different lightness
        else if (hDiff < 10 && Math.abs(c1.hsl.l - c2.hsl.l) > 15) {
          relationships.push({
            type: 'monochromatic',
            colors: [c1.hex, c2.hex],
            score: Math.round(Math.min(100, Math.abs(c1.hsl.l - c2.hsl.l) * 2)),
          });
        }
      }
    }

    // Sort by score and limit
    relationships.sort((a, b) => b.score - a.score);
    return relationships.slice(0, 20);
  }

  private calculateHarmonyScore(
    palette: ColorIntelligence['palette'],
    relationships: ColorIntelligence['relationships']
  ): number {
    if (palette.length === 0) return 0;

    let score = 50; // Base score

    // Bonus for having color relationships
    const hasComplementary = relationships.some(r => r.type === 'complementary');
    const hasAnalogous = relationships.some(r => r.type === 'analogous');
    const hasTriadic = relationships.some(r => r.type === 'triadic');

    if (hasComplementary) score += 15;
    if (hasAnalogous) score += 10;
    if (hasTriadic) score += 10;

    // Penalty for too many unique hues (chaotic palette)
    const uniqueHues = new Set(palette.filter(c => c.hsl.s > 15).map(c => Math.round(c.hsl.h / 30) * 30));
    if (uniqueHues.size <= 3) score += 15;
    else if (uniqueHues.size <= 5) score += 5;
    else score -= 10;

    // Bonus for limited palette size
    const saturatedCount = palette.filter(c => c.hsl.s > 15).length;
    if (saturatedCount <= 6) score += 10;
    else if (saturatedCount > 15) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  private mapEmotions(palette: ColorIntelligence['palette']): ColorIntelligence['emotionalMapping'] {
    return palette.slice(0, 15).filter(c => c.hsl.s > 10).map(c => {
      const hsl = c.hsl;
      const associations: string[] = [];

      // Warmth: reds/oranges/yellows are warm, blues/greens are cool
      let warmth = 50;
      if (hsl.h >= 0 && hsl.h < 60) { warmth = 80 + (hsl.s / 5); associations.push('warm'); }
      else if (hsl.h >= 60 && hsl.h < 150) { warmth = 40; associations.push('natural'); }
      else if (hsl.h >= 150 && hsl.h < 270) { warmth = 20; associations.push('cool'); }
      else { warmth = 70; associations.push('warm'); }

      // Energy: high saturation + medium lightness = energetic
      let energy = (hsl.s / 100) * 60 + (50 - Math.abs(hsl.l - 50)) / 50 * 40;

      // Luxury: dark + low saturation, or deep jewel tones
      let luxury = 0;
      if (hsl.l < 30 && hsl.s < 30) { luxury = 80; associations.push('sophisticated'); }
      else if (hsl.l < 40 && hsl.s > 50) { luxury = 70; associations.push('rich'); }
      else if (hsl.l > 85) { luxury = 30; associations.push('light'); }
      else { luxury = 40; }

      // Hue-based associations
      if (hsl.h >= 0 && hsl.h < 15) associations.push('passionate', 'urgent');
      else if (hsl.h >= 15 && hsl.h < 45) associations.push('energetic', 'creative');
      else if (hsl.h >= 45 && hsl.h < 70) associations.push('optimistic', 'cheerful');
      else if (hsl.h >= 70 && hsl.h < 160) associations.push('natural', 'growth');
      else if (hsl.h >= 160 && hsl.h < 250) associations.push('trustworthy', 'calm');
      else if (hsl.h >= 250 && hsl.h < 310) associations.push('creative', 'luxury');
      else associations.push('romantic', 'playful');

      return {
        color: c.hex,
        warmth: Math.round(Math.max(0, Math.min(100, warmth))),
        energy: Math.round(Math.max(0, Math.min(100, energy))),
        luxury: Math.round(Math.max(0, Math.min(100, luxury))),
        associations: associations.slice(0, 4),
      };
    });
  }

  private extractGradients(): ColorIntelligence['gradients'] {
    const gradients: ColorIntelligence['gradients'] = [];
    const allElements = document.querySelectorAll('*');
    const limit = Math.min(allElements.length, MAX_ELEMENTS);
    const seen = new Set<string>();

    for (let i = 0; i < limit; i++) {
      const el = allElements[i];
      let style: CSSStyleDeclaration;
      try {
        style = getCachedStyle(el);
      } catch {
        continue;
      }

      const bgImage = style.backgroundImage;
      if (!bgImage || bgImage === 'none') continue;

      // Parse linear-gradient and radial-gradient
      const gradientMatches = bgImage.matchAll(/(linear-gradient|radial-gradient)\(([^)]+)\)/g);

      for (const match of gradientMatches) {
        const fullMatch = match[0];
        if (seen.has(fullMatch)) continue;
        seen.add(fullMatch);

        const type = match[1] === 'linear-gradient' ? 'linear' as const : 'radial' as const;
        const params = match[2];

        let direction = '';
        const colorStops: { color: string; position: string }[] = [];

        // Parse direction and color stops
        const parts = this.splitGradientParams(params);

        for (let j = 0; j < parts.length; j++) {
          const part = parts[j].trim();
          if (j === 0 && (part.includes('deg') || part.includes('to ') || part.includes('at '))) {
            direction = part;
          } else {
            // Parse color stop: "color position" or just "color"
            const colorStopMatch = part.match(/^(.+?)\s+([\d.]+%?)$/);
            if (colorStopMatch) {
              colorStops.push({ color: colorStopMatch[1].trim(), position: colorStopMatch[2] });
            } else {
              colorStops.push({ color: part, position: '' });
            }
          }
        }

        if (colorStops.length >= 2) {
          const selector = this.buildQuickSelector(el);
          gradients.push({ type, direction, colorStops, selector });
        }
      }

      if (gradients.length >= 20) break;
    }

    return gradients;
  }

  private splitGradientParams(params: string): string[] {
    const parts: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (const char of params) {
      if (char === '(') parenDepth++;
      if (char === ')') parenDepth--;
      if (char === ',' && parenDepth === 0) {
        parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());
    return parts;
  }

  private buildContrastMatrix(palette: ColorIntelligence['palette']): ColorIntelligence['contrastMatrix'] {
    const matrix: ColorIntelligence['contrastMatrix'] = [];

    // Get text colors and background colors
    const textColors = palette.filter(c => c.contexts.some(ctx => ctx.startsWith('text:'))).slice(0, 8);
    const bgColors = palette.filter(c => c.contexts.some(ctx => ctx.startsWith('background:'))).slice(0, 8);

    // If we don't have clear text/bg separation, use all top colors
    const fgSet = textColors.length > 0 ? textColors : palette.slice(0, 6);
    const bgSet = bgColors.length > 0 ? bgColors : palette.slice(0, 6);

    for (const fg of fgSet) {
      const fgParsed = parseColor(fg.value);
      if (!fgParsed) continue;

      for (const bg of bgSet) {
        if (fg.hex === bg.hex) continue;

        const bgParsed = parseColor(bg.value);
        if (!bgParsed) continue;

        const ratio = contrastRatio(fgParsed, bgParsed);

        matrix.push({
          foreground: fg.hex,
          background: bg.hex,
          ratio: Math.round(ratio * 100) / 100,
          passesAA: ratio >= 4.5,
          passesAAA: ratio >= 7,
        });
      }
    }

    matrix.sort((a, b) => b.ratio - a.ratio);
    return matrix.slice(0, 50);
  }

  private analyzeConsistency(
    colorMap: Map<string, { count: number; contexts: Set<string>; property: string }>
  ): { consistencyScore: number; consistencyIssues: ColorIntelligence['consistencyIssues'] } {
    const issues: ColorIntelligence['consistencyIssues'] = [];

    // Group similar colors (colors within 10 hue degrees and similar lightness)
    const parsedColors: { hex: string; hsl: HSL; contexts: string[]; property: string }[] = [];

    for (const [value, data] of colorMap) {
      const parsed = parseColor(value);
      if (!parsed || parsed.a < 0.1) continue;

      const hex = rgbToHex(parsed.r, parsed.g, parsed.b);
      const hsl = rgbToHsl(parsed.r, parsed.g, parsed.b);
      parsedColors.push({
        hex,
        hsl,
        contexts: Array.from(data.contexts).slice(0, 5),
        property: data.property,
      });
    }

    // Detect near-duplicate colors that should probably be the same
    let inconsistencies = 0;
    const checked = new Set<string>();

    for (let i = 0; i < Math.min(parsedColors.length, 50); i++) {
      for (let j = i + 1; j < Math.min(parsedColors.length, 50); j++) {
        const c1 = parsedColors[i];
        const c2 = parsedColors[j];
        const key = `${c1.hex}-${c2.hex}`;
        if (checked.has(key)) continue;
        checked.add(key);

        const hDiff = hueDiff(c1.hsl.h, c2.hsl.h);
        const sDiff = Math.abs(c1.hsl.s - c2.hsl.s);
        const lDiff = Math.abs(c1.hsl.l - c2.hsl.l);

        // Very similar but not identical
        if (c1.hex !== c2.hex && hDiff < 8 && sDiff < 10 && lDiff < 10) {
          inconsistencies++;
          issues.push({
            color: c1.hex,
            usedFor: [...c1.contexts.slice(0, 2), ...c2.contexts.slice(0, 2)],
            expectedUsage: `These colors are very similar (${c1.hex} vs ${c2.hex}) and may represent inconsistent use. Consider consolidating.`,
          });
        }
      }
    }

    // Score: fewer inconsistencies = higher score
    const totalColors = parsedColors.length;
    const inconsistencyRatio = totalColors > 0 ? inconsistencies / totalColors : 0;
    const score = Math.round(Math.max(0, Math.min(100, 100 - inconsistencyRatio * 200)));

    return { consistencyScore: score, consistencyIssues: issues.slice(0, 15) };
  }

  private generateColorScale(primaryHex: string): ColorIntelligence['suggestedScale'] {
    // Parse the primary color
    let h = 220, s = 80, l = 50;

    if (primaryHex.startsWith('#') && primaryHex.length === 7) {
      const r = parseInt(primaryHex.slice(1, 3), 16);
      const g = parseInt(primaryHex.slice(3, 5), 16);
      const b = parseInt(primaryHex.slice(5, 7), 16);
      const hsl = rgbToHsl(r, g, b);
      h = hsl.h;
      s = hsl.s;
      l = hsl.l;
    }

    // Generate a scale from 50 (lightest) to 950 (darkest)
    const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
    const lightnessMap: Record<number, number> = {
      50: 97, 100: 93, 200: 85, 300: 75, 400: 62,
      500: 50, 600: 42, 700: 35, 800: 25, 900: 18, 950: 10,
    };
    const saturationMap: Record<number, number> = {
      50: Math.max(20, s * 0.3), 100: Math.max(30, s * 0.5),
      200: Math.max(40, s * 0.7), 300: Math.max(50, s * 0.85),
      400: s * 0.95, 500: s, 600: Math.min(100, s * 1.05),
      700: Math.min(100, s * 1.05), 800: Math.min(100, s * 1.0),
      900: Math.min(100, s * 0.95), 950: Math.min(100, s * 0.9),
    };

    return shades.map(shade => {
      const shadeL = lightnessMap[shade];
      const shadeS = saturationMap[shade];
      const rgb = hslToRgb(h, shadeS, shadeL);
      return {
        shade,
        hex: rgbToHex(rgb.r, rgb.g, rgb.b),
      };
    });
  }

  private buildQuickSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const classes = el.className && typeof el.className === 'string'
      ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
      : '';
    return `${tag}${classes}`;
  }

  protected emptyResult(): ColorIntelligence {
    return {
      palette: [],
      relationships: [],
      harmonyScore: 0,
      brandColors: [],
      neutralColors: [],
      accentColors: [],
      emotionalMapping: [],
      gradients: [],
      contrastMatrix: [],
      consistencyScore: 0,
      consistencyIssues: [],
      suggestedScale: [],
    };
  }
}
