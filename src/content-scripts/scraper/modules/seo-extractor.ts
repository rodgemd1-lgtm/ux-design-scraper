/**
 * SEO & Metadata Extractor
 * Extracts comprehensive SEO metadata including meta tags, OpenGraph, Twitter Card,
 * structured data (JSON-LD, Microdata, RDFa), heading hierarchy, link analysis,
 * image alt text coverage, and favicon detection.
 */

import { BaseExtractor } from './base-extractor';

// Inline types since content scripts cannot use @shared/ path aliases
interface SEOData {
  metaTags: { name: string; content: string; property?: string }[];
  openGraph: { property: string; content: string }[];
  twitterCard: { name: string; content: string }[];
  structuredData: {
    jsonLd: Record<string, unknown>[];
    microdata: { type: string; properties: Record<string, string> }[];
    rdfa: { type: string; properties: Record<string, string> }[];
  };
  canonicalUrl: string;
  hreflangTags: { lang: string; href: string }[];
  schemaTypes: string[];
  headingHierarchy: { level: number; text: string; count: number }[];
  linkAnalysis: {
    totalLinks: number;
    internalLinks: number;
    externalLinks: number;
    ratio: number;
  };
  imageAltCoverage: {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    coveragePercentage: number;
  };
  titleInfo: { title: string; charCount: number };
  metaDescriptionInfo: { description: string; charCount: number };
  faviconUrl: string;
  robotsMeta: string;
  viewportMeta: string;
}

const MAX_ELEMENTS = 2000;

export class SEOExtractor extends BaseExtractor<SEOData> {
  constructor() {
    super('seo');
  }

  protected async doExtract(): Promise<SEOData> {
    const metaTags = this.extractMetaTags();
    const openGraph = this.extractOpenGraph();
    const twitterCard = this.extractTwitterCard();
    const structuredData = this.extractStructuredData();
    const canonicalUrl = this.extractCanonicalUrl();
    const hreflangTags = this.extractHreflangTags();
    const schemaTypes = this.detectSchemaTypes(structuredData);
    const headingHierarchy = this.extractHeadingHierarchy();
    const linkAnalysis = this.analyzeLinkRatio();
    const imageAltCoverage = this.analyzeImageAltCoverage();
    const titleInfo = this.extractTitleInfo();
    const metaDescriptionInfo = this.extractMetaDescriptionInfo();
    const faviconUrl = this.detectFavicon();
    const robotsMeta = this.extractRobotsMeta();
    const viewportMeta = this.extractViewportMeta();

    return {
      metaTags,
      openGraph,
      twitterCard,
      structuredData,
      canonicalUrl,
      hreflangTags,
      schemaTypes,
      headingHierarchy,
      linkAnalysis,
      imageAltCoverage,
      titleInfo,
      metaDescriptionInfo,
      faviconUrl,
      robotsMeta,
      viewportMeta,
    };
  }

  private extractMetaTags(): SEOData['metaTags'] {
    const tags: SEOData['metaTags'] = [];
    const metaElements = document.querySelectorAll('meta');

    for (let i = 0; i < Math.min(metaElements.length, MAX_ELEMENTS); i++) {
      const meta = metaElements[i];
      const name = meta.getAttribute('name') || '';
      const property = meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';
      const httpEquiv = meta.getAttribute('http-equiv') || '';

      // Skip OpenGraph and Twitter which we handle separately
      if (property.startsWith('og:') || name.startsWith('twitter:')) continue;

      const identifier = name || property || httpEquiv;
      if (identifier && content) {
        tags.push({
          name: identifier,
          content,
          property: property || undefined,
        });
      }
    }

    return tags;
  }

  private extractOpenGraph(): SEOData['openGraph'] {
    const ogTags: SEOData['openGraph'] = [];
    const metaElements = document.querySelectorAll('meta[property^="og:"]');

    for (let i = 0; i < metaElements.length; i++) {
      const meta = metaElements[i];
      const property = meta.getAttribute('property') || '';
      const content = meta.getAttribute('content') || '';

      if (property && content) {
        ogTags.push({ property, content });
      }
    }

    return ogTags;
  }

  private extractTwitterCard(): SEOData['twitterCard'] {
    const twitterTags: SEOData['twitterCard'] = [];
    const metaElements = document.querySelectorAll('meta[name^="twitter:"]');

    for (let i = 0; i < metaElements.length; i++) {
      const meta = metaElements[i];
      const name = meta.getAttribute('name') || '';
      const content = meta.getAttribute('content') || '';

      if (name && content) {
        twitterTags.push({ name, content });
      }
    }

    return twitterTags;
  }

  private extractStructuredData(): SEOData['structuredData'] {
    const jsonLd = this.extractJsonLd();
    const microdata = this.extractMicrodata();
    const rdfa = this.extractRdfa();

    return { jsonLd, microdata, rdfa };
  }

  private extractJsonLd(): Record<string, unknown>[] {
    const results: Record<string, unknown>[] = [];
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');

    for (let i = 0; i < scripts.length; i++) {
      try {
        const content = scripts[i].textContent;
        if (content) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              results.push(item as Record<string, unknown>);
            }
          } else {
            results.push(parsed as Record<string, unknown>);
          }
        }
      } catch {
        // Invalid JSON-LD, skip
      }
    }

    return results.slice(0, 20);
  }

  private extractMicrodata(): { type: string; properties: Record<string, string> }[] {
    const results: { type: string; properties: Record<string, string> }[] = [];
    const itemScopes = document.querySelectorAll('[itemscope]');

    for (let i = 0; i < Math.min(itemScopes.length, 50); i++) {
      const scope = itemScopes[i];
      const itemType = scope.getAttribute('itemtype') || 'unknown';

      const properties: Record<string, string> = {};
      const props = scope.querySelectorAll('[itemprop]');

      for (let j = 0; j < Math.min(props.length, 30); j++) {
        const prop = props[j];
        const propName = prop.getAttribute('itemprop') || '';
        let propValue = '';

        if (prop.hasAttribute('content')) {
          propValue = prop.getAttribute('content') || '';
        } else if (prop instanceof HTMLAnchorElement) {
          propValue = prop.href;
        } else if (prop instanceof HTMLImageElement) {
          propValue = prop.src;
        } else if (prop instanceof HTMLTimeElement) {
          propValue = prop.dateTime || prop.textContent || '';
        } else {
          propValue = (prop.textContent || '').trim().slice(0, 200);
        }

        if (propName && propValue) {
          properties[propName] = propValue;
        }
      }

      results.push({ type: itemType, properties });
    }

    return results;
  }

  private extractRdfa(): { type: string; properties: Record<string, string> }[] {
    const results: { type: string; properties: Record<string, string> }[] = [];
    const rdfaElements = document.querySelectorAll('[typeof]');

    for (let i = 0; i < Math.min(rdfaElements.length, 50); i++) {
      const el = rdfaElements[i];
      const type = el.getAttribute('typeof') || 'unknown';

      const properties: Record<string, string> = {};
      const propElements = el.querySelectorAll('[property]');

      for (let j = 0; j < Math.min(propElements.length, 30); j++) {
        const propEl = propElements[j];
        const propName = propEl.getAttribute('property') || '';
        const propValue = propEl.getAttribute('content') ||
          (propEl.textContent || '').trim().slice(0, 200);

        if (propName && propValue) {
          properties[propName] = propValue;
        }
      }

      results.push({ type, properties });
    }

    return results;
  }

  private extractCanonicalUrl(): string {
    const link = document.querySelector('link[rel="canonical"]');
    return link?.getAttribute('href') || '';
  }

  private extractHreflangTags(): SEOData['hreflangTags'] {
    const tags: SEOData['hreflangTags'] = [];
    const links = document.querySelectorAll('link[rel="alternate"][hreflang]');

    for (let i = 0; i < links.length; i++) {
      const link = links[i];
      const lang = link.getAttribute('hreflang') || '';
      const href = link.getAttribute('href') || '';

      if (lang && href) {
        tags.push({ lang, href });
      }
    }

    return tags;
  }

  private detectSchemaTypes(structuredData: SEOData['structuredData']): string[] {
    const types = new Set<string>();

    for (const ld of structuredData.jsonLd) {
      const schemaType = ld['@type'];
      if (typeof schemaType === 'string') {
        types.add(schemaType);
      } else if (Array.isArray(schemaType)) {
        for (const t of schemaType) {
          if (typeof t === 'string') types.add(t);
        }
      }
    }

    for (const item of structuredData.microdata) {
      if (item.type && item.type !== 'unknown') {
        // Extract type name from full URL like "https://schema.org/Product"
        const match = item.type.match(/schema\.org\/(\w+)/);
        if (match) {
          types.add(match[1]);
        } else {
          types.add(item.type);
        }
      }
    }

    for (const item of structuredData.rdfa) {
      if (item.type && item.type !== 'unknown') {
        types.add(item.type);
      }
    }

    return Array.from(types);
  }

  private extractHeadingHierarchy(): SEOData['headingHierarchy'] {
    const headingMap = new Map<string, { level: number; text: string; count: number }>();

    for (let level = 1; level <= 6; level++) {
      const headings = document.querySelectorAll(`h${level}`);
      for (let i = 0; i < Math.min(headings.length, 100); i++) {
        const text = (headings[i].textContent || '').trim().slice(0, 200);
        if (!text) continue;

        const key = `${level}:${text}`;
        const existing = headingMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          headingMap.set(key, { level, text, count: 1 });
        }
      }
    }

    return Array.from(headingMap.values()).sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return b.count - a.count;
    });
  }

  private analyzeLinkRatio(): SEOData['linkAnalysis'] {
    const links = document.querySelectorAll('a[href]');
    const currentHost = window.location.hostname;
    let internalLinks = 0;
    let externalLinks = 0;

    for (let i = 0; i < Math.min(links.length, MAX_ELEMENTS); i++) {
      const href = links[i].getAttribute('href') || '';
      if (!href || href.startsWith('#') || href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      try {
        const url = new URL(href, window.location.origin);
        if (url.hostname === currentHost || url.hostname === '') {
          internalLinks++;
        } else {
          externalLinks++;
        }
      } catch {
        // Relative URL - counts as internal
        internalLinks++;
      }
    }

    const totalLinks = internalLinks + externalLinks;
    const ratio = totalLinks > 0 ? internalLinks / totalLinks : 0;

    return {
      totalLinks,
      internalLinks,
      externalLinks,
      ratio: Math.round(ratio * 100) / 100,
    };
  }

  private analyzeImageAltCoverage(): SEOData['imageAltCoverage'] {
    const images = document.querySelectorAll('img');
    let imagesWithAlt = 0;
    let imagesWithoutAlt = 0;

    for (let i = 0; i < Math.min(images.length, MAX_ELEMENTS); i++) {
      const img = images[i];
      const alt = img.getAttribute('alt');
      // null means attribute is missing, empty string is technically present but poor practice
      if (alt !== null && alt.trim().length > 0) {
        imagesWithAlt++;
      } else {
        imagesWithoutAlt++;
      }
    }

    const totalImages = imagesWithAlt + imagesWithoutAlt;
    const coveragePercentage = totalImages > 0
      ? Math.round((imagesWithAlt / totalImages) * 10000) / 100
      : 100;

    return {
      totalImages,
      imagesWithAlt,
      imagesWithoutAlt,
      coveragePercentage,
    };
  }

  private extractTitleInfo(): SEOData['titleInfo'] {
    const title = document.title || '';
    return {
      title,
      charCount: title.length,
    };
  }

  private extractMetaDescriptionInfo(): SEOData['metaDescriptionInfo'] {
    const meta = document.querySelector('meta[name="description"]');
    const description = meta?.getAttribute('content') || '';
    return {
      description,
      charCount: description.length,
    };
  }

  private detectFavicon(): string {
    // Check standard favicon link tags
    const selectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon"]',
      'link[rel="apple-touch-icon-precomposed"]',
    ];

    for (const selector of selectors) {
      const link = document.querySelector(selector);
      if (link) {
        const href = link.getAttribute('href');
        if (href) {
          try {
            return new URL(href, window.location.origin).href;
          } catch {
            return href;
          }
        }
      }
    }

    // Fallback to default /favicon.ico
    return `${window.location.origin}/favicon.ico`;
  }

  private extractRobotsMeta(): string {
    const meta = document.querySelector('meta[name="robots"]');
    return meta?.getAttribute('content') || '';
  }

  private extractViewportMeta(): string {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta?.getAttribute('content') || '';
  }

  protected emptyResult(): SEOData {
    return {
      metaTags: [],
      openGraph: [],
      twitterCard: [],
      structuredData: { jsonLd: [], microdata: [], rdfa: [] },
      canonicalUrl: '',
      hreflangTags: [],
      schemaTypes: [],
      headingHierarchy: [],
      linkAnalysis: { totalLinks: 0, internalLinks: 0, externalLinks: 0, ratio: 0 },
      imageAltCoverage: { totalImages: 0, imagesWithAlt: 0, imagesWithoutAlt: 0, coveragePercentage: 0 },
      titleInfo: { title: '', charCount: 0 },
      metaDescriptionInfo: { description: '', charCount: 0 },
      faviconUrl: '',
      robotsMeta: '',
      viewportMeta: '',
    };
  }
}
