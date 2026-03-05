/**
 * Integration Test: Fitness App UX/UI Scrape
 *
 * Runs the full pipeline:
 * 1. Brave Search for fitness app websites
 * 2. Playwright scrapes target sites (design tokens, typography, components, etc.)
 * 3. Generators produce complete output folder on Desktop
 */

import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// Configuration
// ============================================================
const BRAVE_API_KEY = 'BSAMzAwCT-JDvUqAecBy6006SLqLqp9';
const PROJECT_NAME = 'fitness-app-design';
const OUTPUT_DIR = path.join(process.env.HOME || '~', 'Desktop', PROJECT_NAME);
const TARGET_URLS = [
  'https://www.nike.com/ntc-app',
  'https://www.myfitnesspal.com',
  'https://www.strava.com',
];

// ============================================================
// Types (inline to avoid import path issues)
// ============================================================
interface TokenEntry { value: string; count: number; contexts: string[]; }
interface DesignTokens {
  colors: TokenEntry[];
  spacing: TokenEntry[];
  shadows: TokenEntry[];
  borderRadii: TokenEntry[];
  zIndices: TokenEntry[];
  opacities: TokenEntry[];
}
interface FontEntry { family: string; count: number; }
interface FontSizeEntry { size: string; element: string; count: number; }
interface FontWeightEntry { weight: string; count: number; }
interface LineHeightEntry { value: string; count: number; }
interface LetterSpacingEntry { value: string; count: number; }
interface TypographySystem {
  fontFamilies: FontEntry[];
  fontSizes: FontSizeEntry[];
  fontWeights: FontWeightEntry[];
  lineHeights: LineHeightEntry[];
  letterSpacings: LetterSpacingEntry[];
}
interface ComponentData {
  componentName: string;
  componentType: string;
  htmlCode: string;
  cssCode: string;
  selector: string;
  stateVariants: Record<string, unknown>;
  accessibilityData: Record<string, unknown>;
  scores: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
interface AccessibilityAudit {
  overallScore: number;
  wcagLevel: string;
  contrastIssues: { element: string; foreground: string; background: string; ratio: number; level: string; }[];
  missingAltText: { element: string; src: string; }[];
  missingAriaLabels: string[];
  tabOrderIssues: string[];
  semanticIssues: string[];
  focusIndicatorsMissing: string[];
}

interface BraveResult {
  title: string;
  url: string;
  description: string;
}

// ============================================================
// Brave Search
// ============================================================
async function braveSearch(query: string): Promise<BraveResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'X-Subscription-Token': BRAVE_API_KEY,
    },
  });
  const data = await res.json() as { web?: { results?: BraveResult[] } };
  return data.web?.results || [];
}

// ============================================================
// DOM Extractors (run inside page context)
// ============================================================
const extractDesignTokensScript = (): DesignTokens => {
  const colorMap = new Map<string, { count: number; contexts: string[] }>();
  const spacingMap = new Map<string, { count: number; contexts: string[] }>();
  const shadowMap = new Map<string, { count: number; contexts: string[] }>();
  const radiusMap = new Map<string, { count: number; contexts: string[] }>();
  const zIndexMap = new Map<string, { count: number; contexts: string[] }>();
  const opacityMap = new Map<string, { count: number; contexts: string[] }>();

  const elements = document.querySelectorAll('*');
  const limit = Math.min(elements.length, 500);

  for (let i = 0; i < limit; i++) {
    const el = elements[i] as HTMLElement;
    let style: CSSStyleDeclaration;
    try {
      style = window.getComputedStyle(el);
    } catch { continue; }

    const tag = el.tagName.toLowerCase();
    const cls = el.className?.toString?.()?.slice(0, 30) || '';
    const desc = `${tag}.${cls}`;

    // Colors
    const colorProps = ['color', 'backgroundColor', 'borderColor'];
    for (const prop of colorProps) {
      const val = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'transparent') {
        const entry = colorMap.get(val);
        if (entry) { entry.count++; entry.contexts.push(desc); }
        else colorMap.set(val, { count: 1, contexts: [desc] });
      }
    }

    // Spacing
    const spacingProps = ['marginTop', 'marginBottom', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'gap'];
    for (const prop of spacingProps) {
      const val = style.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase());
      if (val && val !== '0px' && val !== 'auto' && val !== 'normal') {
        const entry = spacingMap.get(val);
        if (entry) { entry.count++; } else spacingMap.set(val, { count: 1, contexts: [desc] });
      }
    }

    // Shadows
    const shadow = style.boxShadow;
    if (shadow && shadow !== 'none') {
      const entry = shadowMap.get(shadow);
      if (entry) entry.count++; else shadowMap.set(shadow, { count: 1, contexts: [desc] });
    }

    // Border radius
    const radius = style.borderRadius;
    if (radius && radius !== '0px') {
      const entry = radiusMap.get(radius);
      if (entry) entry.count++; else radiusMap.set(radius, { count: 1, contexts: [desc] });
    }

    // Z-index
    const zIndex = style.zIndex;
    if (zIndex && zIndex !== 'auto' && zIndex !== '0') {
      const entry = zIndexMap.get(zIndex);
      if (entry) entry.count++; else zIndexMap.set(zIndex, { count: 1, contexts: [desc] });
    }

    // Opacity
    const opacity = style.opacity;
    if (opacity && opacity !== '1') {
      const entry = opacityMap.get(opacity);
      if (entry) entry.count++; else opacityMap.set(opacity, { count: 1, contexts: [desc] });
    }
  }

  const mapToArray = (map: Map<string, { count: number; contexts: string[] }>): TokenEntry[] => {
    return [...map.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 30)
      .map(([value, data]) => ({ value, count: data.count, contexts: data.contexts.slice(0, 5) }));
  }

  return {
    colors: mapToArray(colorMap),
    spacing: mapToArray(spacingMap),
    shadows: mapToArray(shadowMap),
    borderRadii: mapToArray(radiusMap),
    zIndices: mapToArray(zIndexMap),
    opacities: mapToArray(opacityMap),
  };
}

const extractTypographyScript = (): TypographySystem => {
  const familyMap = new Map<string, number>();
  const sizeMap = new Map<string, { element: string; count: number }>();
  const weightMap = new Map<string, number>();
  const lineHeightMap = new Map<string, number>();
  const letterSpacingMap = new Map<string, number>();

  const textElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, a, li, button, label, input, td, th, blockquote, figcaption');
  const limit = Math.min(textElements.length, 300);

  for (let i = 0; i < limit; i++) {
    const el = textElements[i];
    let style: CSSStyleDeclaration;
    try { style = window.getComputedStyle(el); } catch { continue; }

    const family = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
    familyMap.set(family, (familyMap.get(family) || 0) + 1);

    const size = style.fontSize;
    if (size) {
      const existing = sizeMap.get(size);
      if (existing) existing.count++;
      else sizeMap.set(size, { element: el.tagName.toLowerCase(), count: 1 });
    }

    const weight = style.fontWeight;
    weightMap.set(weight, (weightMap.get(weight) || 0) + 1);

    const lh = style.lineHeight;
    if (lh && lh !== 'normal') lineHeightMap.set(lh, (lineHeightMap.get(lh) || 0) + 1);

    const ls = style.letterSpacing;
    if (ls && ls !== 'normal' && ls !== '0px') letterSpacingMap.set(ls, (letterSpacingMap.get(ls) || 0) + 1);
  }

  return {
    fontFamilies: [...familyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([family, count]) => ({ family, count })),
    fontSizes: [...sizeMap.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 15).map(([size, data]) => ({ size, element: data.element, count: data.count })),
    fontWeights: [...weightMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([weight, count]) => ({ weight, count })),
    lineHeights: [...lineHeightMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([value, count]) => ({ value, count })),
    letterSpacings: [...letterSpacingMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count })),
  };
}

const extractComponentsScript = (): ComponentData[] => {
  const components: ComponentData[] = [];
  const selectors = [
    'nav', 'header', 'footer', 'main', 'section', 'article',
    '[class*="card"]', '[class*="hero"]', '[class*="banner"]', '[class*="cta"]',
    '[class*="button"]', '[class*="nav"]', '[class*="menu"]', '[class*="modal"]',
    '[class*="form"]', '[class*="input"]', '[class*="slider"]', '[class*="carousel"]',
    'form', '.container', '[role="banner"]', '[role="navigation"]', '[role="main"]',
    '[class*="feature"]', '[class*="pricing"]', '[class*="testimonial"]',
    '[class*="workout"]', '[class*="exercise"]', '[class*="fitness"]', '[class*="progress"]',
  ];

  const seen = new Set<string>();

  for (const selector of selectors) {
    const els = document.querySelectorAll(selector);
    for (let i = 0; i < Math.min(els.length, 3); i++) {
      const el = els[i] as HTMLElement;
      const tag = el.tagName.toLowerCase();
      const cls = el.className?.toString?.() || '';
      const id = el.id || '';
      const uniqueKey = `${tag}${id}${cls.slice(0, 50)}`;
      if (seen.has(uniqueKey)) continue;
      seen.add(uniqueKey);

      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();

      if (rect.width < 50 || rect.height < 20) continue;

      const componentName = id || cls.split(' ')[0]?.replace(/[^a-zA-Z0-9-_]/g, '') || `${tag}-component`;
      const componentType = tag === 'nav' ? 'Navigation' :
        tag === 'header' ? 'Header' :
        tag === 'footer' ? 'Footer' :
        tag === 'form' ? 'Form' :
        cls.includes('card') ? 'Card' :
        cls.includes('hero') ? 'Hero' :
        cls.includes('button') || cls.includes('btn') ? 'Button' :
        cls.includes('modal') ? 'Modal' :
        'Section';

      const cssCode = `
width: ${style.width};
height: ${style.height};
background: ${style.backgroundColor};
color: ${style.color};
font-family: ${style.fontFamily};
padding: ${style.padding};
margin: ${style.margin};
border-radius: ${style.borderRadius};
box-shadow: ${style.boxShadow};
display: ${style.display};
`.trim();

      components.push({
        componentName: componentName.slice(0, 60),
        componentType,
        htmlCode: el.outerHTML.slice(0, 3000),
        cssCode,
        selector: id ? `#${id}` : `.${cls.split(' ')[0]}`,
        stateVariants: {},
        accessibilityData: {
          role: el.getAttribute('role'),
          ariaLabel: el.getAttribute('aria-label'),
          tabIndex: el.tabIndex,
        },
        scores: {},
        metadata: {
          width: rect.width,
          height: rect.height,
        },
      });

      if (components.length >= 30) return components;
    }
  }

  return components;
}

const extractAccessibilityScript = (): AccessibilityAudit => {
  const contrastIssues: AccessibilityAudit['contrastIssues'] = [];
  const missingAltText: AccessibilityAudit['missingAltText'] = [];
  const missingAriaLabels: string[] = [];
  const tabOrderIssues: string[] = [];
  const semanticIssues: string[] = [];
  const focusIndicatorsMissing: string[] = [];

  // Missing alt text
  document.querySelectorAll('img').forEach(img => {
    if (!img.alt && !img.getAttribute('aria-hidden')) {
      missingAltText.push({ element: 'img', src: img.src?.slice(0, 100) || '' });
    }
  });

  // Missing ARIA labels on interactive elements
  document.querySelectorAll('button, a, input, select, textarea, [role]').forEach(el => {
    const tag = el.tagName.toLowerCase();
    const hasLabel = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.textContent?.trim();
    if (!hasLabel) missingAriaLabels.push(`${tag}${el.id ? '#' + el.id : ''}`);
  });

  // Check heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(h => {
    const level = parseInt(h.tagName[1]);
    if (level > lastLevel + 1 && lastLevel > 0) {
      semanticIssues.push(`Heading level skipped: h${lastLevel} → h${level}`);
    }
    lastLevel = level;
  });

  // Check for landmarks
  if (!document.querySelector('main, [role="main"]')) semanticIssues.push('No <main> or role="main" element');
  if (!document.querySelector('nav, [role="navigation"]')) semanticIssues.push('No <nav> or role="navigation" element');

  // Simple contrast check (sample text elements)
  const textEls = document.querySelectorAll('p, span, h1, h2, h3, a, button, li');
  for (let i = 0; i < Math.min(textEls.length, 50); i++) {
    const el = textEls[i] as HTMLElement;
    try {
      const style = window.getComputedStyle(el);
      const fg = style.color;
      const bg = style.backgroundColor;
      if (fg && bg && bg !== 'rgba(0, 0, 0, 0)') {
        // Simple luminance check
        const parseFg = fg.match(/\d+/g)?.map(Number);
        const parseBg = bg.match(/\d+/g)?.map(Number);
        if (parseFg && parseBg && parseFg.length >= 3 && parseBg.length >= 3) {
          const lumFg = (0.299 * parseFg[0] + 0.587 * parseFg[1] + 0.114 * parseFg[2]) / 255;
          const lumBg = (0.299 * parseBg[0] + 0.587 * parseBg[1] + 0.114 * parseBg[2]) / 255;
          const ratio = (Math.max(lumFg, lumBg) + 0.05) / (Math.min(lumFg, lumBg) + 0.05);
          if (ratio < 3) {
            contrastIssues.push({
              element: `${el.tagName.toLowerCase()}.${el.className?.toString?.()?.split(' ')[0] || ''}`,
              foreground: fg,
              background: bg,
              ratio,
              level: ratio < 3 ? 'AA-fail' : 'AA-pass',
            });
          }
        }
      }
    } catch { /* skip */ }
  }

  const score = Math.max(0, 100 - contrastIssues.length * 3 - missingAltText.length * 5 - missingAriaLabels.length * 2 - semanticIssues.length * 4);

  return {
    overallScore: Math.min(100, score),
    wcagLevel: score > 80 ? 'AA' : score > 50 ? 'A' : 'Non-conformant',
    contrastIssues: contrastIssues.slice(0, 20),
    missingAltText: missingAltText.slice(0, 10),
    missingAriaLabels: missingAriaLabels.slice(0, 15),
    tabOrderIssues,
    semanticIssues,
    focusIndicatorsMissing,
  };
}

const extractCopyScript = () => {
  const ctaLabels: { text: string; element: string; count: number }[] = [];
  const toneKeywords: string[] = [];
  const microcopy: { context: string; text: string }[] = [];
  const placeholders: { field: string; text: string }[] = [];
  const errorMessages: string[] = [];
  const emptyStateText: string[] = [];
  const tooltips: string[] = [];

  // CTA buttons
  const buttons = document.querySelectorAll('button, a[class*="btn"], a[class*="cta"], [role="button"], input[type="submit"]');
  const ctaMap = new Map<string, { element: string; count: number }>();
  buttons.forEach(btn => {
    const text = btn.textContent?.trim()?.slice(0, 60);
    if (text && text.length > 1 && text.length < 60) {
      const existing = ctaMap.get(text);
      if (existing) existing.count++;
      else ctaMap.set(text, { element: btn.tagName.toLowerCase(), count: 1 });
    }
  });
  ctaMap.forEach((val, key) => ctaLabels.push({ text: key, ...val }));

  // Placeholders
  document.querySelectorAll('input[placeholder], textarea[placeholder]').forEach(el => {
    const p = el.getAttribute('placeholder');
    if (p) placeholders.push({ field: el.getAttribute('name') || el.getAttribute('type') || 'input', text: p });
  });

  // Tooltips
  document.querySelectorAll('[title]').forEach(el => {
    const t = el.getAttribute('title');
    if (t && t.length > 2) tooltips.push(t.slice(0, 100));
  });

  // Tone keywords from headings and key text
  document.querySelectorAll('h1, h2, h3, .hero, [class*="headline"]').forEach(el => {
    const text = el.textContent?.trim();
    if (text) {
      const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      toneKeywords.push(...words.slice(0, 5));
    }
  });

  return {
    ctaLabels: ctaLabels.slice(0, 15),
    toneKeywords: [...new Set(toneKeywords)].slice(0, 20),
    microcopy: microcopy.slice(0, 15),
    placeholders: placeholders.slice(0, 10),
    errorMessages: errorMessages.slice(0, 10),
    emptyStateText: emptyStateText.slice(0, 5),
    tooltips: tooltips.slice(0, 10),
  };
}

const extractMetaScript = () => {
  const title = document.title;
  const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '';

  const images = Array.from(document.querySelectorAll('img')).slice(0, 30).map(img => ({
    src: img.src?.slice(0, 200),
    alt: img.alt,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
    loading: img.loading,
    srcset: img.srcset?.slice(0, 200),
  }));

  const svgIcons = Array.from(document.querySelectorAll('svg')).slice(0, 20).map(svg => ({
    viewBox: svg.getAttribute('viewBox') || '',
    width: svg.getAttribute('width') || '',
    height: svg.getAttribute('height') || '',
    content: svg.outerHTML.slice(0, 500),
  }));

  const navItems = Array.from(document.querySelectorAll('nav a, header a')).slice(0, 20).map(a => ({
    text: a.textContent?.trim()?.slice(0, 50),
    href: a.getAttribute('href')?.slice(0, 100),
  }));

  return { title, metaDesc, ogImage, canonical, images, svgIcons, navItems };
}

// ============================================================
// Screenshot capture
// ============================================================
async function captureScreenshots(page: Page, outputDir: string): Promise<void> {
  const screenshotDir = path.join(outputDir, 'assets', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });

  const breakpoints = [375, 768, 1280, 1920];
  for (const bp of breakpoints) {
    await page.setViewportSize({ width: bp, height: 900 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(screenshotDir, `${bp}px.png`),
      fullPage: true,
    });
  }
  // Reset viewport
  await page.setViewportSize({ width: 1280, height: 900 });
}

// ============================================================
// Main Pipeline
// ============================================================
async function main() {
  console.log('🏋️ Fitness App UX/UI Design Scraper - Integration Test');
  console.log('='.repeat(60));

  // Step 1: Brave Search
  console.log('\n📡 Step 1: Brave Search for fitness app design inspiration...');
  const searchQueries = [
    'fitness workout app website design 2024',
    'gym fitness mobile app UX design inspiration',
    'health wellness app UI design best practices',
  ];

  const allSearchResults: BraveResult[] = [];
  for (const query of searchQueries) {
    try {
      const results = await braveSearch(query);
      allSearchResults.push(...results);
      console.log(`  ✓ "${query}" → ${results.length} results`);
    } catch (e) {
      console.log(`  ✗ "${query}" → error: ${e}`);
    }
  }
  console.log(`  Total: ${allSearchResults.length} search results`);

  // Step 2: Create output directory
  console.log('\n📁 Step 2: Creating output folder structure...');
  const dirs = [
    '', 'design-tokens', 'scraped-code/html', 'scraped-code/css',
    'assets/screenshots', 'assets/icons', 'assets/heatmaps',
    'analysis', 'prompts/component-prompts', 'prompts/screen-prompts',
    'knowledge-base',
  ];
  for (const dir of dirs) {
    fs.mkdirSync(path.join(OUTPUT_DIR, dir), { recursive: true });
  }
  console.log(`  ✓ Created ${dirs.length} directories at ${OUTPUT_DIR}`);

  // Step 3: Scrape target websites
  console.log('\n🔍 Step 3: Scraping fitness app websites...');
  const browser = await chromium.launch({ headless: true });

  const allTokens: DesignTokens = { colors: [], spacing: [], shadows: [], borderRadii: [], zIndices: [], opacities: [] };
  const allTypography: TypographySystem = { fontFamilies: [], fontSizes: [], fontWeights: [], lineHeights: [], letterSpacings: [] };
  const allComponents: ComponentData[] = [];
  let bestAccessibility: AccessibilityAudit = { overallScore: 0, wcagLevel: 'Non-conformant', contrastIssues: [], missingAltText: [], missingAriaLabels: [], tabOrderIssues: [], semanticIssues: [], focusIndicatorsMissing: [] };
  let copyAnalysis = { ctaLabels: [] as any[], toneKeywords: [] as string[], microcopy: [] as any[], placeholders: [] as any[], errorMessages: [] as string[], emptyStateText: [] as string[], tooltips: [] as string[] };
  let siteMetadata: any[] = [];

  for (const url of TARGET_URLS) {
    console.log(`\n  🌐 Scraping: ${url}`);
    const page = await browser.newPage();

    try {
      await page.goto(url, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);
      console.log(`    ✓ Page loaded: ${await page.title()}`);

      // Inject __name polyfill for tsx/esbuild compatibility
      await page.evaluate('if(typeof __name==="undefined"){window.__name=(fn)=>fn}');

      // Extract design tokens
      const tokens = await page.evaluate(extractDesignTokensScript);
      console.log(`    ✓ Design tokens: ${tokens.colors.length} colors, ${tokens.spacing.length} spacing, ${tokens.shadows.length} shadows`);
      allTokens.colors.push(...tokens.colors);
      allTokens.spacing.push(...tokens.spacing);
      allTokens.shadows.push(...tokens.shadows);
      allTokens.borderRadii.push(...tokens.borderRadii);
      allTokens.zIndices.push(...tokens.zIndices);
      allTokens.opacities.push(...tokens.opacities);

      // Extract typography
      const typography = await page.evaluate(extractTypographyScript);
      console.log(`    ✓ Typography: ${typography.fontFamilies.length} families, ${typography.fontSizes.length} sizes`);
      allTypography.fontFamilies.push(...typography.fontFamilies);
      allTypography.fontSizes.push(...typography.fontSizes);
      allTypography.fontWeights.push(...typography.fontWeights);
      allTypography.lineHeights.push(...typography.lineHeights);
      allTypography.letterSpacings.push(...typography.letterSpacings);

      // Extract components
      const components = await page.evaluate(extractComponentsScript);
      console.log(`    ✓ Components: ${components.length} identified`);
      allComponents.push(...components);

      // Extract accessibility
      const accessibility = await page.evaluate(extractAccessibilityScript);
      console.log(`    ✓ Accessibility: score ${accessibility.overallScore}/100 (${accessibility.wcagLevel})`);
      if (accessibility.overallScore > bestAccessibility.overallScore) {
        bestAccessibility = accessibility;
      }

      // Extract copy
      const copy = await page.evaluate(extractCopyScript);
      console.log(`    ✓ Copy: ${copy.ctaLabels.length} CTAs, ${copy.toneKeywords.length} keywords`);
      copyAnalysis.ctaLabels.push(...copy.ctaLabels);
      copyAnalysis.toneKeywords.push(...copy.toneKeywords);
      copyAnalysis.placeholders.push(...copy.placeholders);
      copyAnalysis.tooltips.push(...copy.tooltips);

      // Extract metadata
      const meta = await page.evaluate(extractMetaScript);
      console.log(`    ✓ Meta: ${meta.images.length} images, ${meta.svgIcons.length} icons, ${meta.navItems.length} nav items`);
      siteMetadata.push({ url, ...meta });

      // Screenshots
      await captureScreenshots(page, OUTPUT_DIR);
      console.log(`    ✓ Screenshots captured at 4 breakpoints`);

    } catch (err: any) {
      console.log(`    ✗ Error: ${err.message?.slice(0, 100)}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // Deduplicate tokens
  const dedup = <T extends { value: string; count: number }>(arr: T[]): T[] => {
    const map = new Map<string, T>();
    for (const item of arr) {
      const existing = map.get(item.value);
      if (existing) existing.count += item.count;
      else map.set(item.value, { ...item });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 30);
  };

  allTokens.colors = dedup(allTokens.colors);
  allTokens.spacing = dedup(allTokens.spacing);
  allTokens.shadows = dedup(allTokens.shadows);
  allTokens.borderRadii = dedup(allTokens.borderRadii);

  // Dedup typography
  const dedupFont = <T extends { count: number }>(arr: T[], key: keyof T): T[] => {
    const map = new Map<unknown, T>();
    for (const item of arr) {
      const k = item[key];
      const existing = map.get(k);
      if (existing) existing.count += item.count;
      else map.set(k, { ...item });
    }
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 10);
  };

  allTypography.fontFamilies = dedupFont(allTypography.fontFamilies, 'family');
  allTypography.fontSizes = dedupFont(allTypography.fontSizes, 'size');
  allTypography.fontWeights = dedupFont(allTypography.fontWeights, 'weight');
  copyAnalysis.toneKeywords = [...new Set(copyAnalysis.toneKeywords)].slice(0, 20);

  // Step 4: Generate all output files
  console.log('\n📝 Step 4: Generating output files...');

  // Design tokens
  const colorsJson = {
    _generated: new Date().toISOString(),
    palette: allTokens.colors.map(c => ({ value: c.value, frequency: c.count, contexts: c.contexts })),
    total: allTokens.colors.length,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'design-tokens', 'colors.json'), JSON.stringify(colorsJson, null, 2));
  console.log(`  ✓ colors.json (${allTokens.colors.length} colors)`);

  const typographyJson = {
    _generated: new Date().toISOString(),
    fontFamilies: allTypography.fontFamilies,
    fontSizes: allTypography.fontSizes,
    fontWeights: allTypography.fontWeights,
    lineHeights: allTypography.lineHeights,
    letterSpacings: allTypography.letterSpacings,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'design-tokens', 'typography.json'), JSON.stringify(typographyJson, null, 2));
  console.log(`  ✓ typography.json (${allTypography.fontFamilies.length} families)`);

  const spacingJson = {
    _generated: new Date().toISOString(),
    spacing: allTokens.spacing,
    borderRadii: allTokens.borderRadii,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'design-tokens', 'spacing.json'), JSON.stringify(spacingJson, null, 2));
  console.log(`  ✓ spacing.json`);

  const shadowsJson = {
    _generated: new Date().toISOString(),
    shadows: allTokens.shadows,
    zIndices: allTokens.zIndices,
    opacities: allTokens.opacities,
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'design-tokens', 'shadows.json'), JSON.stringify(shadowsJson, null, 2));
  console.log(`  ✓ shadows.json`);

  // Components - HTML/CSS
  for (const comp of allComponents.slice(0, 20)) {
    const safeName = comp.componentName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'scraped-code', 'html', `${safeName}.html`), comp.htmlCode);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'scraped-code', 'css', `${safeName}.css`), comp.cssCode);
  }
  console.log(`  ✓ Scraped code: ${Math.min(allComponents.length, 20)} components`);

  // Analysis reports
  const accessibilityReport = `# Accessibility Audit Report

> Fitness App Design Analysis
> Generated: ${new Date().toISOString()}
> Sources: ${TARGET_URLS.join(', ')}

## Overall Score: ${bestAccessibility.overallScore}/100
## WCAG Level: ${bestAccessibility.wcagLevel}

---

## Contrast Issues (${bestAccessibility.contrastIssues.length})

${bestAccessibility.contrastIssues.map(c => `| \`${c.element}\` | FG: ${c.foreground} | BG: ${c.background} | Ratio: ${c.ratio.toFixed(2)}:1 | ${c.level} |`).join('\n')}

## Missing Alt Text (${bestAccessibility.missingAltText.length})

${bestAccessibility.missingAltText.map(m => `- \`${m.element}\` — src: ${m.src}`).join('\n')}

## Missing ARIA Labels (${bestAccessibility.missingAriaLabels.length})

${bestAccessibility.missingAriaLabels.map(l => `- ${l}`).join('\n')}

## Semantic Issues (${bestAccessibility.semanticIssues.length})

${bestAccessibility.semanticIssues.map(s => `- ${s}`).join('\n')}

## Action Items

1. Fix all contrast ratio violations (priority: critical)
2. Add alt text to all meaningful images
3. Add ARIA labels to all interactive elements
4. Use semantic HTML elements (nav, main, header, footer)
5. Ensure heading hierarchy (h1 → h2 → h3, no skipping)
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis', 'accessibility-audit.md'), accessibilityReport);
  console.log(`  ✓ accessibility-audit.md`);

  // Copy & Tone Guide
  const copyGuide = `# Copy & Tone Guide — Fitness App Design

> Generated: ${new Date().toISOString()}
> Sources: ${TARGET_URLS.join(', ')}

## CTA Language

${copyAnalysis.ctaLabels.slice(0, 15).map(l => `- "${l.text}" (${l.element}, used ${l.count}x)`).join('\n')}

## Tone Keywords

${copyAnalysis.toneKeywords.map(k => `\`${k}\``).join(', ')}

## Placeholders

${copyAnalysis.placeholders.map(p => `- ${p.field}: "${p.text}"`).join('\n') || 'None detected'}

## Tooltips

${copyAnalysis.tooltips.map(t => `- "${t}"`).join('\n') || 'None detected'}
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis', 'copy-tone-guide.md'), copyGuide);
  console.log(`  ✓ copy-tone-guide.md`);

  // Flow Analysis
  const flowAnalysis = `# User Flow Analysis — Fitness App Design

> Generated: ${new Date().toISOString()}

## Navigation Structure

${siteMetadata.map(s => `### ${s.url}\n${s.navItems.map((n: any) => `- [${n.text}](${n.href})`).join('\n')}`).join('\n\n')}

## Key Observations

- **Primary Font**: ${allTypography.fontFamilies[0]?.family || 'System'}
- **Color Count**: ${allTokens.colors.length} unique colors
- **Component Count**: ${allComponents.length} identified components
- **CTA Count**: ${copyAnalysis.ctaLabels.length} call-to-action elements
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis', 'flow-analysis.md'), flowAnalysis);
  console.log(`  ✓ flow-analysis.md`);

  // Brave search results reference
  const competitorMatrix = `# Competitor & Inspiration Matrix — Fitness App Design

> Generated: ${new Date().toISOString()}

## Search Results

${allSearchResults.slice(0, 15).map((r, i) => `${i + 1}. **[${r.title}](${r.url})**\n   ${r.description?.slice(0, 150)}`).join('\n\n')}

## Scraped Sites

| Site | Components | Colors | Typography | A11y Score |
|------|-----------|--------|-----------|-----------|
${TARGET_URLS.map(url => {
  const meta = siteMetadata.find(s => s.url === url);
  return `| ${url} | ${allComponents.filter(c => true).length} | ${allTokens.colors.length} | ${allTypography.fontFamilies.length} families | ${bestAccessibility.overallScore}/100 |`;
}).join('\n')}
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'analysis', 'competitor-matrix.md'), competitorMatrix);
  console.log(`  ✓ competitor-matrix.md`);

  // CLAUDE.md
  const claudeMd = `# CLAUDE.md — Fitness App Design Intelligence Package

> Generated by UX Design Scraper
> Double Black Box AI Design Intelligence Platform
> ${new Date().toISOString()}

## Design Team Personas

### 🎨 VP / Head of Design — "The Visionary"
- 15+ years leading design for fitness/health brands
- Expert in brand strategy, design systems, and design leadership
- Drives design excellence across product, marketing, and brand
- **Key skills**: Design strategy, stakeholder management, design ops

### 🔬 UX Research Lead — "The Scientist"
- Specializes in fitness app user behavior and engagement patterns
- Expert in qualitative/quantitative research, analytics, heatmaps
- **Key skills**: User interviews, A/B testing, behavioral analytics, journey mapping

### 🖌️ Senior UX Designer — "The Architect"
- 8+ years designing workout flows, progress tracking, social features
- Expert in information architecture, interaction design, prototyping
- **Key skills**: Wireframing, user flows, IA, usability testing

### 🎯 UI / Visual Designer — "The Craftsperson"
- Expert in fitness brand aesthetics: energy, motivation, achievement
- Dark mode specialist, data visualization, gamification UI
- **Key skills**: Visual design, iconography, illustration, motion principles

### ✨ Interaction / Motion Designer — "The Choreographer"
- Creates fluid workout transitions, progress animations, celebration moments
- Expert in micro-interactions that drive engagement and habit formation
- **Key skills**: Animation, transitions, gesture design, haptic feedback

### 🏗️ Design Systems Engineer — "The Builder"
- Builds component libraries for React Native / React fitness apps
- Expert in design tokens, Storybook, accessibility, responsive design
- **Key skills**: Component architecture, design tokens, a11y, performance

---

## Double Black Box Methodology

### Phase 01: DISCOVER
- Research fitness app market, user needs, behavioral data
- Analyze competitors: ${TARGET_URLS.join(', ')}
- Collect heatmaps, session recordings, analytics
- **Output**: Research synthesis, user insights

### Phase 02: DEFINE
- Define target personas (fitness beginners, gym regulars, athletes)
- Create user journey maps for key flows (onboarding, workout, tracking)
- Write design brief with success metrics
- **Output**: Personas, journey maps, design brief

### Phase 03: GATE
- Review and approve design brief
- Align stakeholders on direction
- **Output**: Approved brief, go/no-go decision

### Phase 04: DIVERGE
- Explore 3-5 design directions
- Create mood boards, style tiles, concept sketches
- **Output**: Design explorations, style options

### Phase 05: DEVELOP
- High-fidelity prototypes
- Design system and component library
- Interaction specifications
- **Output**: Figma prototypes, component specs

### Phase 06: DELIVER
- Developer handoff with design tokens
- Component documentation
- Animation specifications
- **Output**: This folder! Ready for Claude Code implementation

### Phase 07: MEASURE
- Track engagement metrics
- Analyze heatmaps and session recordings
- Iterate based on data
- **Output**: Analytics report, iteration plan

---

## Workflow Prompt Chain

### Step 1: Foundation Setup
\`\`\`
Read the design tokens in /design-tokens/ and set up your project with:
- Colors from colors.json
- Typography from typography.json
- Spacing scale from spacing.json
- Shadow system from shadows.json
\`\`\`

### Step 2: Component Library
\`\`\`
Reference the scraped components in /scraped-code/ to build:
- Navigation component (bottom tabs for mobile)
- Workout card component
- Exercise list item
- Progress ring / chart
- CTA buttons with fitness-specific copy
- User profile header
\`\`\`

### Step 3: Screen Implementation
\`\`\`
Build these core screens using the component library:
1. Onboarding flow (3-5 steps)
2. Home / Dashboard (today's workout, progress, stats)
3. Workout library (browse, search, filter)
4. Active workout (timer, exercise guide, rest periods)
5. Progress tracking (charts, achievements, streaks)
6. Profile / Settings
\`\`\`

### Step 4: Interaction & Animation
\`\`\`
Add micro-interactions based on the scraped animation data:
- Page transitions
- Button press feedback
- Progress animations
- Achievement celebrations
- Pull-to-refresh
\`\`\`

### Step 5: Accessibility Audit
\`\`\`
Review against the accessibility audit in /analysis/accessibility-audit.md
Ensure WCAG AA compliance:
- Contrast ratios ≥ 4.5:1
- All images have alt text
- Keyboard navigation works
- Screen reader compatible
\`\`\`

---

## File Reference

| File | Description |
|------|-------------|
| \`design-tokens/colors.json\` | ${allTokens.colors.length} extracted colors |
| \`design-tokens/typography.json\` | ${allTypography.fontFamilies.length} font families |
| \`design-tokens/spacing.json\` | ${allTokens.spacing.length} spacing values |
| \`design-tokens/shadows.json\` | ${allTokens.shadows.length} shadow values |
| \`scraped-code/\` | ${Math.min(allComponents.length, 20)} component HTML/CSS |
| \`assets/screenshots/\` | Screenshots at 375px, 768px, 1280px, 1920px |
| \`analysis/\` | Accessibility, flow, copy, competitor reports |
| \`prompts/\` | Master prompt + workflow chain |
| \`knowledge-base/\` | Best practices + design system docs |

---

## Project Context

| Field | Value |
|-------|-------|
| Goal | Build a world-class fitness app UX/UI |
| Industry | Health & Fitness |
| Target Audience | Fitness enthusiasts, gym-goers, beginners |
| Design Style | Modern, energetic, motivational |
| Competitors | Nike Training Club, MyFitnessPal, Strava |
| Key Features | Workouts, tracking, social, gamification |
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'CLAUDE.md'), claudeMd);
  console.log(`  ✓ CLAUDE.md`);

  // README.md
  const readme = `# ${PROJECT_NAME}

> UX/UI Design Intelligence Package — Fitness App Design
> Scraped from: ${TARGET_URLS.join(', ')}
> Generated: ${new Date().toISOString()}

## What Is This?

This folder contains a complete UX/UI design intelligence package generated by the **UX Design Scraper** Chrome extension. It includes design tokens, component specifications, analysis reports, and prompt chains ready for use in a **Claude Code** session to rebuild this design.

## Quick Start

1. Open this folder in your Claude Code project
2. Read \`CLAUDE.md\` for the full design team personas and workflow
3. Follow the workflow chain steps in \`CLAUDE.md\`
4. Reference design tokens in \`/design-tokens/\` for exact values

## Contents

- \`/design-tokens/\` — Colors, typography, spacing, shadows
- \`/scraped-code/\` — ${Math.min(allComponents.length, 20)} component HTML/CSS files
- \`/assets/screenshots/\` — Full-page screenshots at 4 breakpoints
- \`/analysis/\` — Accessibility audit, flow analysis, copy guide, competitor matrix
- \`/knowledge-base/\` — Best practices and design system docs
- \`/prompts/\` — Prompt templates for Claude Code

## Methodology

Generated using the **Double Black Box Method** — a 6-phase UX design process:
1. Discover → 2. Define → 3. Gate → 4. Diverge → 5. Develop → 6. Deliver → 7. Measure
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readme);
  console.log(`  ✓ README.md`);

  // Master Prompt
  const masterPrompt = `# Master Prompt — Fitness App UX/UI Generation

You are a senior full-stack developer and UX/UI designer building a fitness app.

## Design System

Use these exact design tokens extracted from leading fitness apps:

### Primary Colors
${allTokens.colors.slice(0, 5).map(c => `- \`${c.value}\` (used ${c.count}x)`).join('\n')}

### Typography
${allTypography.fontFamilies.slice(0, 3).map(f => `- \`${f.family}\` (used ${f.count}x)`).join('\n')}

### Font Sizes
${allTypography.fontSizes.slice(0, 8).map(f => `- \`${f.size}\` on \`${f.element}\``).join('\n')}

### Spacing Scale
${allTokens.spacing.slice(0, 8).map(s => `- \`${s.value}\` (used ${s.count}x)`).join('\n')}

### Shadows
${allTokens.shadows.slice(0, 5).map(s => `- \`${s.value}\``).join('\n')}

## Component Reference

${allComponents.slice(0, 10).map(c => `### ${c.componentName} (${c.componentType})\nSelector: \`${c.selector}\`\n`).join('\n')}

## CTA Copy Patterns
${copyAnalysis.ctaLabels.slice(0, 10).map(l => `- "${l.text}"`).join('\n')}

## Implementation Notes

- Use React + TypeScript + Tailwind CSS
- Mobile-first responsive design
- Dark mode support
- WCAG AA accessibility
- Target score: ${bestAccessibility.overallScore}/100 accessibility
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'prompts', 'master-prompt.md'), masterPrompt);
  console.log(`  ✓ master-prompt.md`);

  // Knowledge base
  const bestPractices = `# Fitness App UX Best Practices

## 1. Onboarding
- Keep it to 3-5 screens maximum
- Ask for fitness goals, experience level, preferred workouts
- Show immediate value (sample workout) before requiring sign-up
- Use progressive profiling instead of long forms

## 2. Workout Experience
- Large, touch-friendly buttons during active workout
- Clear timer with rest period countdowns
- Exercise demonstration images/videos
- Easy skip/modify options
- Haptic feedback on key actions

## 3. Progress & Motivation
- Streak tracking with visual rewards
- Achievement badges and milestones
- Social sharing capabilities
- Weekly/monthly progress charts
- Personal records and PRs

## 4. Navigation
- Bottom tab navigation for mobile (max 5 tabs)
- Quick-access to "Start Workout" from any screen
- Recent workouts easily accessible
- Search with smart filters (duration, muscle group, equipment)

## 5. Visual Design
- High contrast for gym environments (often poorly lit)
- Dark mode as default (matches gym ambiance)
- Energy-focused color palette (bold, vibrant accents)
- Large text for readability during exercise
- Minimal UI during active workouts

## 6. Data Visualization
- Progress rings for daily/weekly goals
- Muscle group heatmaps
- Calendar view for workout history
- Charts for weight, reps, distance trends

## 7. Accessibility
- Voice controls for hands-free workout tracking
- High contrast mode for outdoor use
- Large touch targets (min 44x44px)
- Screen reader support for all workout instructions
- Colorblind-safe charts and indicators

## 8. Engagement & Retention
- Push notifications for workout reminders (configurable)
- Rest day suggestions to prevent burnout
- Social challenges and leaderboards
- Personalized workout recommendations
- Integration with wearables (Apple Watch, Fitbit)
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'knowledge-base', 'best-practices.md'), bestPractices);
  console.log(`  ✓ best-practices.md`);

  const designSystemDocs = `# Fitness App Design System Documentation

## Color System

### Primary Palette
${allTokens.colors.slice(0, 8).map((c, i) => `| Token ${i + 1} | \`${c.value}\` | Used ${c.count}x |`).join('\n')}

### Semantic Colors
- **Success**: Green tones for completed workouts, achieved goals
- **Warning**: Orange/yellow for rest periods, form warnings
- **Error**: Red for missed targets, form errors
- **Info**: Blue for tips, new features

## Typography Scale

### Font Families
${allTypography.fontFamilies.map(f => `- **${f.family}** (${f.count} uses)`).join('\n')}

### Type Scale
${allTypography.fontSizes.map(f => `| ${f.element} | ${f.size} | ${f.count} uses |`).join('\n')}

## Spacing

### Base Unit
${allTokens.spacing.slice(0, 1).map(s => `Base: \`${s.value}\``).join('\n')}

### Scale
${allTokens.spacing.slice(0, 10).map((s, i) => `| Step ${i + 1} | \`${s.value}\` |`).join('\n')}

## Elevation (Shadows)
${allTokens.shadows.map((s, i) => `| Level ${i + 1} | \`${s.value}\` |`).join('\n')}

## Border Radius
${allTokens.borderRadii.map((r, i) => `| Size ${i + 1} | \`${r.value}\` | ${r.count} uses |`).join('\n')}

## Components

${allComponents.slice(0, 15).map(c => `### ${c.componentName}
- **Type**: ${c.componentType}
- **Selector**: \`${c.selector}\``).join('\n\n')}
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'knowledge-base', 'design-system-docs.md'), designSystemDocs);
  console.log(`  ✓ design-system-docs.md`);

  // Supabase sync manifest
  const syncManifest = {
    projectName: PROJECT_NAME,
    targetUrls: TARGET_URLS,
    generatedAt: new Date().toISOString(),
    stats: {
      colors: allTokens.colors.length,
      fontFamilies: allTypography.fontFamilies.length,
      fontSizes: allTypography.fontSizes.length,
      spacing: allTokens.spacing.length,
      shadows: allTokens.shadows.length,
      components: allComponents.length,
      accessibilityScore: bestAccessibility.overallScore,
      ctaLabels: copyAnalysis.ctaLabels.length,
      searchResults: allSearchResults.length,
    },
    braveSearchResults: allSearchResults.slice(0, 15).map(r => ({ title: r.title, url: r.url })),
  };
  fs.writeFileSync(path.join(OUTPUT_DIR, 'supabase-sync.json'), JSON.stringify(syncManifest, null, 2));
  console.log(`  ✓ supabase-sync.json`);

  // Save icons
  for (const meta of siteMetadata) {
    for (let i = 0; i < Math.min(meta.svgIcons?.length || 0, 5); i++) {
      const icon = meta.svgIcons[i];
      if (icon.content) {
        const safeName = new URL(meta.url).hostname.replace(/\./g, '-');
        fs.writeFileSync(path.join(OUTPUT_DIR, 'assets', 'icons', `${safeName}-${i}.svg`), icon.content);
      }
    }
  }
  console.log(`  ✓ SVG icons saved`);

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('✅ COMPLETE — Fitness App Design Intelligence Package');
  console.log('='.repeat(60));
  console.log(`\n📁 Output: ${OUTPUT_DIR}`);

  // Count files
  let fileCount = 0;
  function countFiles(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) fileCount++;
      else if (entry.isDirectory()) countFiles(path.join(dir, entry.name));
    }
  }
  countFiles(OUTPUT_DIR);

  console.log(`📊 Total files generated: ${fileCount}`);
  console.log(`\n📋 Summary:`);
  console.log(`  • ${allTokens.colors.length} unique colors`);
  console.log(`  • ${allTypography.fontFamilies.length} font families`);
  console.log(`  • ${allTokens.spacing.length} spacing values`);
  console.log(`  • ${allTokens.shadows.length} shadow values`);
  console.log(`  • ${allComponents.length} components scraped`);
  console.log(`  • ${copyAnalysis.ctaLabels.length} CTA patterns`);
  console.log(`  • ${bestAccessibility.overallScore}/100 accessibility score`);
  console.log(`  • ${allSearchResults.length} Brave search results`);
  console.log(`  • 4 responsive screenshots per site`);
  console.log(`\n🚀 Ready to use in Claude Code!`);
  console.log(`   Open the folder and read CLAUDE.md to get started.`);
}

main().catch(console.error);
