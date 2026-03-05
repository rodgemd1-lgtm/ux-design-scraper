/**
 * Image Asset Extractor
 * Extracts metadata for all images: src, alt, dimensions, formats,
 * CDN detection, lazy-load status, srcset, and aspect ratios.
 */

import { BaseExtractor } from './base-extractor';
import type { ImageAssetData } from '@shared/types';

const CDN_DOMAINS = [
  'cloudinary.com', 'res.cloudinary.com',
  'imgix.net',
  'cloudfront.net',
  'cdn.shopify.com',
  'images.unsplash.com',
  'images.pexels.com',
  'fastly.net',
  'akamaized.net',
  'cdn.sanity.io',
  'ctfassets.net',
  'wp.com', 'i0.wp.com', 'i1.wp.com', 'i2.wp.com',
  'twimg.com',
  'fbcdn.net',
  'googleusercontent.com',
  'amazonaws.com',
  'azureedge.net',
  'imagekit.io',
  'uploadcare.com',
  'imgbb.com',
  'sirv.com',
  'bunny.net', 'b-cdn.net',
];

function getFormat(src: string): string {
  if (!src) return 'unknown';

  // Check data URIs
  if (src.startsWith('data:image/')) {
    const match = src.match(/data:image\/(\w+)/);
    return match ? match[1] : 'unknown';
  }

  // Extract extension from URL
  try {
    const url = new URL(src, window.location.origin);
    const pathname = url.pathname.toLowerCase();

    if (pathname.endsWith('.webp') || pathname.includes('.webp')) return 'webp';
    if (pathname.endsWith('.avif') || pathname.includes('.avif')) return 'avif';
    if (pathname.endsWith('.svg') || pathname.includes('.svg')) return 'svg';
    if (pathname.endsWith('.png') || pathname.includes('.png')) return 'png';
    if (pathname.endsWith('.gif') || pathname.includes('.gif')) return 'gif';
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg') || pathname.includes('.jpg') || pathname.includes('.jpeg')) return 'jpg';
    if (pathname.endsWith('.ico')) return 'ico';
    if (pathname.endsWith('.bmp')) return 'bmp';

    // Check query params (some CDNs use format params)
    const formatParam = url.searchParams.get('fm') || url.searchParams.get('format') || url.searchParams.get('f');
    if (formatParam) return formatParam.toLowerCase();
  } catch {
    // Try basic extension check
    const extMatch = src.match(/\.(\w{3,4})(?:\?|$)/);
    if (extMatch) return extMatch[1].toLowerCase();
  }

  return 'unknown';
}

function detectCDN(src: string): string | undefined {
  if (!src) return undefined;
  for (const domain of CDN_DOMAINS) {
    if (src.includes(domain)) return domain;
  }
  return undefined;
}

function calculateAspectRatio(width: number, height: number): string {
  if (width <= 0 || height <= 0) return 'unknown';

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const w = Math.round(width / divisor);
  const h = Math.round(height / divisor);

  // Simplify common ratios
  if (w === h) return '1:1';
  if (Math.abs(w / h - 16 / 9) < 0.05) return '16:9';
  if (Math.abs(w / h - 4 / 3) < 0.05) return '4:3';
  if (Math.abs(w / h - 3 / 2) < 0.05) return '3:2';
  if (Math.abs(w / h - 21 / 9) < 0.05) return '21:9';

  return `${w}:${h}`;
}

export class ImageAssetExtractor extends BaseExtractor<ImageAssetData> {
  constructor() {
    super('image-assets');
  }

  protected async doExtract(): Promise<ImageAssetData> {
    const images: ImageAssetData['images'] = [];
    const formatCounts: Record<string, number> = {};
    let lazyLoadCount = 0;
    let totalImages = 0;

    // 1. <img> elements
    const imgElements = document.querySelectorAll('img');
    for (const img of Array.from(imgElements)) {
      const htmlImg = img as HTMLImageElement;
      const src = htmlImg.currentSrc || htmlImg.src || '';
      if (!src || src === 'about:blank') continue;

      totalImages++;

      const alt = htmlImg.getAttribute('alt') || '';
      const format = getFormat(src);
      const width = htmlImg.naturalWidth || htmlImg.width || 0;
      const height = htmlImg.naturalHeight || htmlImg.height || 0;
      const loading = htmlImg.getAttribute('loading') || '';
      const srcset = htmlImg.getAttribute('srcset') || undefined;
      const sizes = htmlImg.getAttribute('sizes') || undefined;
      const lazyLoaded = loading === 'lazy' ||
        htmlImg.hasAttribute('data-src') ||
        htmlImg.hasAttribute('data-lazy') ||
        htmlImg.classList.contains('lazyload') ||
        htmlImg.classList.contains('lazy');

      if (lazyLoaded) lazyLoadCount++;

      // Track format distribution
      formatCounts[format] = (formatCounts[format] || 0) + 1;

      const cdnDomain = detectCDN(src);
      const aspectRatio = calculateAspectRatio(width, height);

      images.push({
        src: src.length > 500 ? src.slice(0, 500) : src,
        alt,
        format,
        width,
        height,
        lazyLoaded,
        srcset,
        cdnDomain,
        aspectRatio,
      });
    }

    // 2. <picture> elements with <source>
    const pictureElements = document.querySelectorAll('picture');
    for (const picture of Array.from(pictureElements)) {
      const sources = picture.querySelectorAll('source');
      for (const source of Array.from(sources)) {
        const srcset = source.getAttribute('srcset') || '';
        const type = source.getAttribute('type') || '';
        if (!srcset) continue;

        // Extract first URL from srcset
        const firstSrc = srcset.split(',')[0].trim().split(' ')[0];
        if (!firstSrc) continue;

        const format = type ? type.replace('image/', '') : getFormat(firstSrc);
        formatCounts[format] = (formatCounts[format] || 0) + 1;

        // Don't duplicate if the img inside the picture was already counted
      }
    }

    // 3. Background images (for completeness, check first 500 elements)
    const allElements = document.querySelectorAll('*');
    const elemLimit = Math.min(allElements.length, 500);
    for (let i = 0; i < elemLimit; i++) {
      const el = allElements[i];
      try {
        const style = window.getComputedStyle(el);
        const bgImage = style.backgroundImage;
        if (!bgImage || bgImage === 'none') continue;

        const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
        if (!urlMatch) continue;

        const src = urlMatch[1];
        // Skip SVGs and data URIs for inline styles (already handled by icon extractor)
        if (src.startsWith('data:image/svg')) continue;

        // Only track actual image backgrounds
        const format = getFormat(src);
        if (format === 'unknown' || format === 'svg') continue;

        totalImages++;
        formatCounts[format] = (formatCounts[format] || 0) + 1;

        const rect = el.getBoundingClientRect();
        const cdnDomain = detectCDN(src);

        images.push({
          src: src.length > 500 ? src.slice(0, 500) : src,
          alt: '',
          format,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          lazyLoaded: false,
          cdnDomain,
          aspectRatio: calculateAspectRatio(rect.width, rect.height),
        });
      } catch {
        continue;
      }
    }

    const lazyLoadPercentage = totalImages > 0
      ? Math.round((lazyLoadCount / totalImages) * 100)
      : 0;

    return {
      images,
      totalSize: 0, // Cannot calculate without network info
      formatDistribution: formatCounts,
      lazyLoadPercentage,
    };
  }

  protected emptyResult(): ImageAssetData {
    return {
      images: [],
      totalSize: 0,
      formatDistribution: {},
      lazyLoadPercentage: 0,
    };
  }
}
