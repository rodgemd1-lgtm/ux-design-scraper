/**
 * Icon Extractor
 * Extracts all SVG icons from the page: inline SVGs, SVG images, and CSS SVG backgrounds.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';
import type { IconData } from '@shared/types';

const MAX_ELEMENTS = 2000;

type IconCategory = 'navigation' | 'action' | 'social' | 'decorative' | 'status';

const SOCIAL_KEYWORDS = ['facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'github', 'social', 'share', 'tiktok', 'pinterest', 'reddit', 'discord', 'slack', 'x-twitter', 'mastodon'];
const NAV_KEYWORDS = ['menu', 'hamburger', 'arrow', 'chevron', 'caret', 'back', 'forward', 'home', 'search', 'nav', 'breadcrumb', 'expand', 'collapse'];
const ACTION_KEYWORDS = ['close', 'delete', 'edit', 'add', 'remove', 'save', 'download', 'upload', 'copy', 'paste', 'refresh', 'reload', 'send', 'submit', 'play', 'pause', 'stop', 'settings', 'gear', 'filter', 'sort', 'plus', 'minus', 'trash', 'bin'];
const STATUS_KEYWORDS = ['check', 'success', 'error', 'warning', 'info', 'alert', 'notification', 'bell', 'loading', 'spinner', 'done', 'complete', 'verified', 'star', 'heart', 'like', 'flag'];

export class IconExtractor extends BaseExtractor<IconData[]> {
  constructor() {
    super('icons');
  }

  protected async doExtract(): Promise<IconData[]> {
    const icons: IconData[] = [];

    // 1. Inline SVG elements
    const svgElements = document.querySelectorAll('svg');
    for (let i = 0; i < Math.min(svgElements.length, 500); i++) {
      const svg = svgElements[i];
      const viewBox = svg.getAttribute('viewBox') || '';
      const width = svg.getAttribute('width') || svg.getBoundingClientRect().width.toString();
      const height = svg.getAttribute('height') || svg.getBoundingClientRect().height.toString();

      // Skip large SVGs that are likely illustrations, not icons
      const rect = svg.getBoundingClientRect();
      if (rect.width > 200 || rect.height > 200) continue;
      if (rect.width === 0 && rect.height === 0) continue;

      const category = this.categorizeIcon(svg);
      const outerHTML = svg.outerHTML;
      // Limit SVG source size
      const svgSource = outerHTML.length > 5000 ? outerHTML.slice(0, 5000) : outerHTML;

      icons.push({
        svg: svgSource,
        viewBox,
        category,
        size: { width: parseFloat(width) || rect.width, height: parseFloat(height) || rect.height },
        source: this.buildSelector(svg),
      });
    }

    // 2. <img> elements with .svg extension or SVG data URIs
    const imgElements = document.querySelectorAll('img');
    for (let i = 0; i < Math.min(imgElements.length, 500); i++) {
      const img = imgElements[i] as HTMLImageElement;
      const src = img.src || '';

      const isSvg = src.endsWith('.svg') ||
                    src.includes('.svg?') ||
                    src.startsWith('data:image/svg+xml');

      if (!isSvg) continue;

      const rect = img.getBoundingClientRect();
      // Skip large SVG images (likely illustrations)
      if (rect.width > 200 || rect.height > 200) continue;
      if (rect.width === 0 && rect.height === 0) continue;

      const category = this.categorizeIcon(img);

      icons.push({
        svg: src.startsWith('data:image/svg+xml') ? decodeURIComponent(src.split(',')[1] || '') : `<img src="${src}" />`,
        viewBox: '',
        category,
        size: { width: img.naturalWidth || rect.width, height: img.naturalHeight || rect.height },
        source: src,
      });
    }

    // 3. Elements with background-image SVGs (CSS url())
    const allElements = document.querySelectorAll('*');
    const elemLimit = Math.min(allElements.length, MAX_ELEMENTS);
    for (let i = 0; i < elemLimit; i++) {
      const el = allElements[i];
      try {
        const style = getCachedStyle(el);
        const bgImage = style.backgroundImage;
        if (!bgImage || bgImage === 'none') continue;

        // Check for SVG in background-image
        const svgDataMatch = bgImage.match(/url\(["']?(data:image\/svg\+xml[^"')]+)["']?\)/);
        const svgUrlMatch = bgImage.match(/url\(["']?([^"')]+\.svg[^"')]*?)["']?\)/);

        if (svgDataMatch || svgUrlMatch) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 200 || rect.height > 200) continue;
          if (rect.width === 0 && rect.height === 0) continue;

          const src = svgDataMatch ? svgDataMatch[1] : svgUrlMatch![1];
          const category = this.categorizeIcon(el);

          let svgContent = '';
          if (svgDataMatch) {
            try {
              svgContent = decodeURIComponent(src.split(',')[1] || '');
            } catch {
              svgContent = src;
            }
          } else {
            svgContent = `<css-bg url="${src}" />`;
          }

          icons.push({
            svg: svgContent.slice(0, 5000),
            viewBox: '',
            category,
            size: { width: rect.width, height: rect.height },
            source: `css-bg: ${src}`,
          });
        }
      } catch {
        continue;
      }
    }

    return icons;
  }

  private categorizeIcon(el: Element): IconCategory {
    // Gather context: aria-label, parent classes, nearby text
    const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
    const title = (el.querySelector('title')?.textContent || '').toLowerCase();
    const parentClasses = (el.parentElement?.className || '').toString().toLowerCase();
    const elClasses = (typeof el.className === 'string' ? el.className : '').toLowerCase();
    const context = `${ariaLabel} ${title} ${parentClasses} ${elClasses}`;

    // Check categories by keyword matching
    if (SOCIAL_KEYWORDS.some(kw => context.includes(kw))) return 'social';
    if (NAV_KEYWORDS.some(kw => context.includes(kw))) return 'navigation';
    if (ACTION_KEYWORDS.some(kw => context.includes(kw))) return 'action';
    if (STATUS_KEYWORDS.some(kw => context.includes(kw))) return 'status';

    // Check if inside a nav element
    if (el.closest('nav') || el.closest('[role="navigation"]')) return 'navigation';

    // Check if it's a button's icon
    if (el.closest('button') || el.closest('[role="button"]') || el.closest('a')) return 'action';

    // Check for role="img" with aria-hidden (decorative)
    if (el.getAttribute('aria-hidden') === 'true' || el.getAttribute('role') === 'presentation') {
      return 'decorative';
    }

    return 'decorative';
  }

  private buildSelector(el: Element): string {
    if (el.id) return `#${el.id}`;
    const tag = el.tagName.toLowerCase();
    const parent = el.parentElement;
    if (parent) {
      const parentDesc = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
      const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(el) + 1;
        return `${parentDesc} > ${tag}:nth-of-type(${index})`;
      }
      return `${parentDesc} > ${tag}`;
    }
    return tag;
  }

  protected emptyResult(): IconData[] {
    return [];
  }
}
