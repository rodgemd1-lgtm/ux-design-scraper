/**
 * Navigation Extractor
 * Extracts navigation structure, link hierarchy, breadcrumbs, footer nav,
 * and builds a sitemap tree.
 */

import { BaseExtractor } from './base-extractor';
import type { NavigationStructure, NavItem } from '@shared/types';

export class NavigationExtractor extends BaseExtractor<NavigationStructure> {
  constructor() {
    super('navigation');
  }

  protected async doExtract(): Promise<NavigationStructure> {
    const primaryNav = this.extractPrimaryNav();
    const footerNav = this.extractFooterNav();
    const breadcrumbs = this.extractBreadcrumbs();
    const menuDepth = this.calculateMenuDepth(primaryNav);
    const allLinks = this.collectUniqueInternalLinks();
    const sitemapTree = this.buildSitemapTree(allLinks);

    return {
      primaryNav,
      footerNav,
      breadcrumbs,
      menuDepth,
      totalPages: allLinks.length,
      sitemapTree,
    };
  }

  private extractPrimaryNav(): NavItem[] {
    const navs = document.querySelectorAll('nav');
    if (navs.length === 0) {
      // Fall back to header area navigation
      const header = document.querySelector('header, [role="banner"]');
      if (header) {
        return this.extractLinksFromElement(header, 0);
      }
      return [];
    }

    // Find the primary nav: typically the first one, or one in the header,
    // or one with the most links
    let primaryNavEl: Element | null = null;
    let maxLinks = 0;

    for (const nav of Array.from(navs)) {
      // Skip footer nav
      if (nav.closest('footer') || nav.closest('[role="contentinfo"]')) continue;

      // Check if it looks like breadcrumb
      const ariaLabel = (nav.getAttribute('aria-label') || '').toLowerCase();
      if (ariaLabel.includes('breadcrumb')) continue;

      const linkCount = nav.querySelectorAll('a').length;
      if (linkCount > maxLinks) {
        maxLinks = linkCount;
        primaryNavEl = nav;
      }
    }

    if (!primaryNavEl) {
      // Use first non-footer nav
      for (const nav of Array.from(navs)) {
        if (!nav.closest('footer') && !nav.closest('[role="contentinfo"]')) {
          primaryNavEl = nav;
          break;
        }
      }
    }

    if (!primaryNavEl) return [];

    return this.extractLinksFromElement(primaryNavEl, 0);
  }

  private extractFooterNav(): NavItem[] {
    const footer = document.querySelector('footer, [role="contentinfo"]');
    if (!footer) return [];

    // Check for nav elements inside footer
    const footerNavs = footer.querySelectorAll('nav');
    if (footerNavs.length > 0) {
      const items: NavItem[] = [];
      for (const nav of Array.from(footerNavs)) {
        items.push(...this.extractLinksFromElement(nav, 0));
      }
      return items;
    }

    // Fall back to direct link extraction
    return this.extractLinksFromElement(footer, 0);
  }

  private extractLinksFromElement(container: Element, level: number): NavItem[] {
    const items: NavItem[] = [];
    const processed = new Set<Element>();

    // Look for list-based navigation first (ul/ol > li > a)
    const lists = container.querySelectorAll(':scope > ul, :scope > ol, :scope > div > ul, :scope > div > ol');

    if (lists.length > 0) {
      for (const list of Array.from(lists)) {
        const listItems = list.querySelectorAll(':scope > li');
        for (const li of Array.from(listItems)) {
          const link = li.querySelector(':scope > a, :scope > button, :scope > span > a');
          if (!link || processed.has(link)) continue;
          processed.add(link);

          const label = (link.textContent || '').trim();
          const href = (link as HTMLAnchorElement).href || '';

          // Check for nested submenu
          const submenu = li.querySelector(':scope > ul, :scope > ol, :scope > div > ul');
          const children: NavItem[] = [];
          if (submenu && level < 5) {
            const subItems = submenu.querySelectorAll(':scope > li');
            for (const subLi of Array.from(subItems)) {
              const subLink = subLi.querySelector(':scope > a, :scope > button');
              if (subLink && !processed.has(subLink)) {
                processed.add(subLink);
                const subChildren = this.extractSubNavItems(subLi, level + 2, processed);
                children.push({
                  label: (subLink.textContent || '').trim(),
                  href: (subLink as HTMLAnchorElement).href || '',
                  children: subChildren,
                  level: level + 1,
                });
              }
            }
          }

          if (label) {
            items.push({ label, href, children, level });
          }
        }
      }
    }

    // If no list-based nav found, extract direct links
    if (items.length === 0) {
      const links = container.querySelectorAll('a');
      for (const link of Array.from(links)) {
        if (processed.has(link)) continue;
        processed.add(link);
        const label = (link.textContent || '').trim();
        const href = link.href || '';
        if (label && label.length < 100) {
          items.push({ label, href, children: [], level });
        }
      }
    }

    return items;
  }

  private extractSubNavItems(li: Element, level: number, processed: Set<Element>): NavItem[] {
    if (level > 5) return [];
    const items: NavItem[] = [];
    const submenu = li.querySelector(':scope > ul, :scope > ol');
    if (!submenu) return items;

    const subItems = submenu.querySelectorAll(':scope > li');
    for (const subLi of Array.from(subItems)) {
      const subLink = subLi.querySelector(':scope > a, :scope > button');
      if (subLink && !processed.has(subLink)) {
        processed.add(subLink);
        const children = this.extractSubNavItems(subLi, level + 1, processed);
        items.push({
          label: (subLink.textContent || '').trim(),
          href: (subLink as HTMLAnchorElement).href || '',
          children,
          level,
        });
      }
    }
    return items;
  }

  private extractBreadcrumbs(): string[][] {
    const breadcrumbs: string[][] = [];

    // Method 1: ARIA breadcrumb navigation
    const ariaNavs = document.querySelectorAll('nav[aria-label]');
    for (const nav of Array.from(ariaNavs)) {
      const label = (nav.getAttribute('aria-label') || '').toLowerCase();
      if (label.includes('breadcrumb')) {
        const links = nav.querySelectorAll('a, span, li');
        const crumbs: string[] = [];
        for (const link of Array.from(links)) {
          const text = (link.textContent || '').trim();
          if (text && !crumbs.includes(text)) {
            crumbs.push(text);
          }
        }
        if (crumbs.length > 0) breadcrumbs.push(crumbs);
      }
    }

    // Method 2: Class-based breadcrumb detection
    const breadcrumbEls = document.querySelectorAll(
      '[class*="breadcrumb"], [class*="Breadcrumb"], [role="navigation"][class*="bread"], ol.breadcrumb'
    );
    for (const el of Array.from(breadcrumbEls)) {
      // Skip if already captured via aria
      if (el.tagName === 'NAV' && (el.getAttribute('aria-label') || '').toLowerCase().includes('breadcrumb')) {
        continue;
      }

      const links = el.querySelectorAll('a, span, li');
      const crumbs: string[] = [];
      for (const link of Array.from(links)) {
        const text = (link.textContent || '').trim();
        if (text && text.length < 100 && !crumbs.includes(text)) {
          crumbs.push(text);
        }
      }
      if (crumbs.length > 1) breadcrumbs.push(crumbs);
    }

    return breadcrumbs;
  }

  private calculateMenuDepth(items: NavItem[]): number {
    if (items.length === 0) return 0;

    let maxDepth = 1;
    for (const item of items) {
      if (item.children.length > 0) {
        const childDepth = this.calculateMenuDepth(item.children) + 1;
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }
    return maxDepth;
  }

  private collectUniqueInternalLinks(): string[] {
    const links = document.querySelectorAll('a[href]');
    const currentHost = window.location.hostname;
    const uniqueLinks = new Set<string>();

    for (const link of Array.from(links)) {
      const href = (link as HTMLAnchorElement).href;
      try {
        const url = new URL(href);
        if (url.hostname === currentHost || url.hostname === '') {
          // Normalize: remove hash and trailing slash
          const normalized = url.origin + url.pathname.replace(/\/$/, '') + url.search;
          uniqueLinks.add(normalized);
        }
      } catch {
        // Relative URL or invalid
        if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
          uniqueLinks.add(href);
        }
      }
    }

    return Array.from(uniqueLinks);
  }

  private buildSitemapTree(links: string[]): NavItem {
    const root: NavItem = {
      label: window.location.hostname,
      href: window.location.origin,
      children: [],
      level: 0,
    };

    const pathMap = new Map<string, NavItem>();
    pathMap.set('/', root);

    for (const link of links) {
      try {
        const url = new URL(link, window.location.origin);
        const path = url.pathname;
        const segments = path.split('/').filter(Boolean);

        let currentPath = '';
        let parent = root;

        for (let i = 0; i < segments.length; i++) {
          currentPath += '/' + segments[i];

          let node = pathMap.get(currentPath);
          if (!node) {
            node = {
              label: decodeURIComponent(segments[i]).replace(/-/g, ' '),
              href: window.location.origin + currentPath,
              children: [],
              level: i + 1,
            };
            pathMap.set(currentPath, node);
            parent.children.push(node);
          }
          parent = node;
        }
      } catch {
        // Skip invalid URLs
      }
    }

    return root;
  }

  protected emptyResult(): NavigationStructure {
    return {
      primaryNav: [],
      footerNav: [],
      breadcrumbs: [],
      menuDepth: 0,
      totalPages: 0,
      sitemapTree: {
        label: '',
        href: '',
        children: [],
        level: 0,
      },
    };
  }
}
