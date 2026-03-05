/**
 * Interaction Pattern Detector
 * Detects advanced interaction patterns: infinite scroll, lazy loading, modals,
 * dropdowns, tabs, accordions, carousels, toasts, search autocomplete, filter/sort,
 * drag and drop, file upload, and multi-step wizard/stepper patterns.
 */

import { BaseExtractor } from './base-extractor';
import { getCachedStyle } from '../utils/computed-style-reader';

// Inline types since content scripts cannot use @shared/ path aliases
interface InteractionPatterns {
  infiniteScroll: {
    detected: boolean;
    containerSelector: string;
    sentinelSelector: string;
    loadingIndicator: string;
  };
  lazyLoading: {
    detected: boolean;
    method: 'intersection-observer' | 'scroll-based' | 'native-loading' | 'none';
    lazyElements: { selector: string; type: string }[];
  };
  modals: {
    triggers: { selector: string; text: string }[];
    overlayType: 'full-screen' | 'centered' | 'drawer' | 'bottom-sheet';
    closeMethod: string[];
  }[];
  dropdowns: {
    triggerSelector: string;
    contentSelector: string;
    type: 'menu' | 'select' | 'popover' | 'mega-menu';
    triggerEvent: 'click' | 'hover';
  }[];
  tabPanels: {
    containerSelector: string;
    tabCount: number;
    activeTabSelector: string;
    contentSwitchMethod: string;
  }[];
  accordions: {
    containerSelector: string;
    itemCount: number;
    multiOpen: boolean;
    animationType: string;
  }[];
  carousels: {
    containerSelector: string;
    slideCount: number;
    autoPlay: boolean;
    hasArrows: boolean;
    hasDots: boolean;
    transitionType: string;
  }[];
  toasts: {
    containerSelector: string;
    position: string;
    autoDismiss: boolean;
  }[];
  searchAutocomplete: {
    inputSelector: string;
    suggestionsSelector: string;
    debounceMs: number;
  }[];
  filterSort: {
    filterType: 'sidebar' | 'top-bar' | 'modal' | 'dropdown';
    filterControls: { label: string; type: string; selector: string }[];
    sortOptions: string[];
  }[];
  dragDrop: {
    draggableSelector: string;
    dropZoneSelector: string;
    library: string;
  }[];
  fileUpload: {
    inputSelector: string;
    dropZoneSelector: string;
    acceptedTypes: string;
    multipleFiles: boolean;
  }[];
  steppers: {
    containerSelector: string;
    stepCount: number;
    currentStep: number;
    orientation: 'horizontal' | 'vertical';
    completionIndicator: string;
  }[];
}

const MAX_ELEMENTS = 2000;

function buildSelector(el: Element): string {
  if (el.id) return `#${el.id}`;
  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (parent) {
    const parentId = parent.id ? `#${parent.id}` : parent.tagName.toLowerCase();
    const siblings = Array.from(parent.children).filter(c => c.tagName === el.tagName);
    if (siblings.length > 1) {
      const index = siblings.indexOf(el) + 1;
      return `${parentId} > ${tag}:nth-of-type(${index})`;
    }
    return `${parentId} > ${tag}`;
  }
  return tag;
}

function getElementText(el: Element): string {
  return (el.textContent || '').trim().slice(0, 100);
}

export class InteractionPatternDetector extends BaseExtractor<InteractionPatterns> {
  constructor() {
    super('interaction-patterns');
  }

  protected async doExtract(): Promise<InteractionPatterns> {
    const infiniteScroll = this.detectInfiniteScroll();
    const lazyLoading = this.detectLazyLoading();
    const modals = this.detectModals();
    const dropdowns = this.detectDropdowns();
    const tabPanels = this.detectTabPanels();
    const accordions = this.detectAccordions();
    const carousels = this.detectCarousels();
    const toasts = this.detectToasts();
    const searchAutocomplete = this.detectSearchAutocomplete();
    const filterSort = this.detectFilterSort();
    const dragDrop = this.detectDragDrop();
    const fileUpload = this.detectFileUpload();
    const steppers = this.detectSteppers();

    return {
      infiniteScroll,
      lazyLoading,
      modals,
      dropdowns,
      tabPanels,
      accordions,
      carousels,
      toasts,
      searchAutocomplete,
      filterSort,
      dragDrop,
      fileUpload,
      steppers,
    };
  }

  private detectInfiniteScroll(): InteractionPatterns['infiniteScroll'] {
    let detected = false;
    let containerSelector = '';
    let sentinelSelector = '';
    let loadingIndicator = '';

    // Check for common infinite scroll patterns
    // 1. Sentinel elements (empty divs at the bottom used by IntersectionObserver)
    const sentinelCandidates = document.querySelectorAll(
      '[data-sentinel], [data-infinite-scroll], .infinite-scroll-sentinel, .load-more-sentinel, ' +
      '.infinite-scroll-trigger, [data-testid*="sentinel"], [data-testid*="infinite"]'
    );
    if (sentinelCandidates.length > 0) {
      detected = true;
      sentinelSelector = buildSelector(sentinelCandidates[0]);
    }

    // 2. Check for scroll-based loading indicators
    const loaders = document.querySelectorAll(
      '.infinite-scroll-component, [data-infinite], .infinite-loader, ' +
      '.scroll-loading, .load-more, .loading-more, [class*="infinite-scroll"]'
    );
    if (loaders.length > 0) {
      detected = true;
      containerSelector = buildSelector(loaders[0]);
    }

    // 3. Check scripts for infinite scroll libraries
    const scripts = document.querySelectorAll('script[src]');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].getAttribute('src') || '';
      if (src.includes('infinite-scroll') || src.includes('infinitescroll')) {
        detected = true;
        break;
      }
    }

    // 4. Check for loading spinners near the bottom
    const spinners = document.querySelectorAll(
      '.spinner, .loading-spinner, [class*="spinner"], [class*="loader"], [role="progressbar"]'
    );
    for (let i = 0; i < spinners.length; i++) {
      const rect = spinners[i].getBoundingClientRect();
      const pageHeight = document.documentElement.scrollHeight;
      if (rect.top > pageHeight * 0.8) {
        loadingIndicator = buildSelector(spinners[i]);
        detected = true;
        break;
      }
    }

    return { detected, containerSelector, sentinelSelector, loadingIndicator };
  }

  private detectLazyLoading(): InteractionPatterns['lazyLoading'] {
    const lazyElements: InteractionPatterns['lazyLoading']['lazyElements'] = [];
    let method: InteractionPatterns['lazyLoading']['method'] = 'none';

    // 1. Native loading="lazy"
    const nativeLazy = document.querySelectorAll('img[loading="lazy"], iframe[loading="lazy"]');
    if (nativeLazy.length > 0) {
      method = 'native-loading';
      for (let i = 0; i < Math.min(nativeLazy.length, 20); i++) {
        lazyElements.push({
          selector: buildSelector(nativeLazy[i]),
          type: nativeLazy[i].tagName.toLowerCase(),
        });
      }
    }

    // 2. data-src pattern (common lazy loading approach)
    const dataSrcElements = document.querySelectorAll('[data-src], [data-lazy], [data-lazy-src], .lazyload, .lazy');
    if (dataSrcElements.length > 0) {
      method = method === 'none' ? 'scroll-based' : method;
      for (let i = 0; i < Math.min(dataSrcElements.length, 20); i++) {
        lazyElements.push({
          selector: buildSelector(dataSrcElements[i]),
          type: dataSrcElements[i].tagName.toLowerCase(),
        });
      }
    }

    // 3. Intersection observer pattern detection (check for common libraries)
    const lazyLibraryClasses = document.querySelectorAll(
      '.lozad, [data-lozad], .lazysizes, .lazyloaded, [data-ll-status], ' +
      '[data-was-processed], .ls-is-cached'
    );
    if (lazyLibraryClasses.length > 0) {
      method = 'intersection-observer';
      for (let i = 0; i < Math.min(lazyLibraryClasses.length, 10); i++) {
        lazyElements.push({
          selector: buildSelector(lazyLibraryClasses[i]),
          type: lazyLibraryClasses[i].tagName.toLowerCase(),
        });
      }
    }

    const detected = lazyElements.length > 0;
    return { detected, method, lazyElements: lazyElements.slice(0, 30) };
  }

  private detectModals(): InteractionPatterns['modals'] {
    const modals: InteractionPatterns['modals'] = [];

    // Find modal/dialog elements
    const modalElements = document.querySelectorAll(
      '[role="dialog"], [role="alertdialog"], dialog, .modal, .dialog, ' +
      '[class*="modal"], [class*="dialog"], [class*="overlay"], [class*="popup"], ' +
      '[data-modal], [data-dialog], [aria-modal="true"]'
    );

    for (let i = 0; i < Math.min(modalElements.length, 10); i++) {
      const modal = modalElements[i];
      const triggers: { selector: string; text: string }[] = [];

      // Find potential triggers (buttons/links with matching aria-controls or data attributes)
      const modalId = modal.id;
      if (modalId) {
        const triggerElements = document.querySelectorAll(
          `[aria-controls="${modalId}"], [data-target="#${modalId}"], ` +
          `[data-modal-target="${modalId}"], [href="#${modalId}"]`
        );
        for (let j = 0; j < triggerElements.length; j++) {
          triggers.push({
            selector: buildSelector(triggerElements[j]),
            text: getElementText(triggerElements[j]),
          });
        }
      }

      // Determine overlay type
      let overlayType: 'full-screen' | 'centered' | 'drawer' | 'bottom-sheet' = 'centered';
      try {
        const style = getCachedStyle(modal);
        const classes = typeof modal.className === 'string' ? modal.className.toLowerCase() : '';

        if (classes.includes('drawer') || classes.includes('slide')) {
          overlayType = 'drawer';
        } else if (classes.includes('bottom-sheet') || classes.includes('action-sheet')) {
          overlayType = 'bottom-sheet';
        } else if (classes.includes('fullscreen') || classes.includes('full-screen') ||
                   (style.width === '100vw' || style.width === '100%') &&
                   (style.height === '100vh' || style.height === '100%')) {
          overlayType = 'full-screen';
        }
      } catch {
        // Keep default
      }

      // Detect close methods
      const closeMethod: string[] = [];
      const closeButtons = modal.querySelectorAll(
        '[aria-label*="close"], [aria-label*="Close"], .close, .modal-close, ' +
        '[class*="close"], button[data-dismiss], [data-close]'
      );
      if (closeButtons.length > 0) closeMethod.push('close-button');

      if (modal.hasAttribute('aria-modal')) closeMethod.push('escape-key');
      if (modal.tagName === 'DIALOG') closeMethod.push('escape-key');

      const overlay = modal.querySelector('.overlay, .backdrop, [class*="backdrop"]');
      if (overlay) closeMethod.push('backdrop-click');

      modals.push({
        triggers,
        overlayType,
        closeMethod: closeMethod.length > 0 ? closeMethod : ['close-button'],
      });
    }

    return modals;
  }

  private detectDropdowns(): InteractionPatterns['dropdowns'] {
    const dropdowns: InteractionPatterns['dropdowns'] = [];

    // Find dropdown triggers
    const triggers = document.querySelectorAll(
      '[aria-haspopup], [data-toggle="dropdown"], [class*="dropdown-toggle"], ' +
      '[class*="dropdown-trigger"], .dropdown > button, .dropdown > a, ' +
      'select, [role="combobox"], [role="listbox"]'
    );

    for (let i = 0; i < Math.min(triggers.length, 15); i++) {
      const trigger = triggers[i];
      const triggerSelector = buildSelector(trigger);

      // Try to find the associated content
      let contentSelector = '';
      let type: 'menu' | 'select' | 'popover' | 'mega-menu' = 'menu';
      let triggerEvent: 'click' | 'hover' = 'click';

      // Check for select elements
      if (trigger.tagName === 'SELECT') {
        type = 'select';
        contentSelector = triggerSelector;
      } else {
        // Look for dropdown content
        const parent = trigger.parentElement;
        if (parent) {
          const content = parent.querySelector(
            '[role="menu"], [role="listbox"], .dropdown-menu, .dropdown-content, ' +
            '[class*="dropdown-menu"], [class*="dropdown-content"], [class*="dropdown-panel"]'
          );
          if (content) {
            contentSelector = buildSelector(content);

            // Check if mega menu
            const contentChildren = content.children;
            if (contentChildren.length > 5 || content.querySelector('[class*="column"], [class*="grid"]')) {
              type = 'mega-menu';
            }
          }
        }

        // Check aria-controls
        const controls = trigger.getAttribute('aria-controls');
        if (controls && !contentSelector) {
          const controlled = document.getElementById(controls);
          if (controlled) {
            contentSelector = `#${controls}`;
          }
        }

        // Detect hover triggers
        const classes = typeof trigger.className === 'string' ? trigger.className.toLowerCase() : '';
        if (classes.includes('hover') || trigger.closest('[class*="hover"]')) {
          triggerEvent = 'hover';
        }
      }

      dropdowns.push({
        triggerSelector,
        contentSelector,
        type,
        triggerEvent,
      });
    }

    return dropdowns;
  }

  private detectTabPanels(): InteractionPatterns['tabPanels'] {
    const tabPanels: InteractionPatterns['tabPanels'] = [];

    // Find tab containers
    const tabLists = document.querySelectorAll(
      '[role="tablist"], .tabs, .tab-list, [class*="tab-list"], [class*="tabs-nav"], ' +
      '[class*="tab-bar"], nav[class*="tab"]'
    );

    for (let i = 0; i < Math.min(tabLists.length, 10); i++) {
      const tabList = tabLists[i];
      const tabs = tabList.querySelectorAll('[role="tab"], .tab, [class*="tab-item"], [class*="tab-link"]');
      if (tabs.length < 2) continue;

      const container = tabList.parentElement;
      const containerSelector = container ? buildSelector(container) : buildSelector(tabList);

      // Find active tab
      let activeTabSelector = '';
      for (let j = 0; j < tabs.length; j++) {
        const tab = tabs[j];
        const isActive = tab.getAttribute('aria-selected') === 'true' ||
          tab.classList.contains('active') ||
          tab.classList.contains('selected') ||
          (typeof tab.className === 'string' && (tab.className.includes('active') || tab.className.includes('selected')));

        if (isActive) {
          activeTabSelector = buildSelector(tab);
          break;
        }
      }

      // Detect content switch method
      let contentSwitchMethod = 'visibility';
      const firstTab = tabs[0];
      if (firstTab) {
        const controls = firstTab.getAttribute('aria-controls');
        if (controls) contentSwitchMethod = 'aria-controls';
        else if (firstTab.getAttribute('href')?.startsWith('#')) contentSwitchMethod = 'hash-link';
      }

      tabPanels.push({
        containerSelector,
        tabCount: tabs.length,
        activeTabSelector,
        contentSwitchMethod,
      });
    }

    return tabPanels;
  }

  private detectAccordions(): InteractionPatterns['accordions'] {
    const accordions: InteractionPatterns['accordions'] = [];

    // Find accordion containers
    const containers = document.querySelectorAll(
      '.accordion, [class*="accordion"], [role="tablist"][aria-multiselectable], ' +
      'details, [class*="collapse-group"], [class*="expandable"], [class*="faq"]'
    );

    for (let i = 0; i < Math.min(containers.length, 10); i++) {
      const container = containers[i];

      // Count items
      const items = container.querySelectorAll(
        '.accordion-item, [class*="accordion-item"], details, [class*="collapse-item"], ' +
        '[class*="expandable-item"], [role="tab"]'
      );
      if (items.length < 2) continue;

      // Detect multi-open
      const multiOpen = container.getAttribute('aria-multiselectable') === 'true' ||
        container.tagName === 'DETAILS' || // details elements are independently openable
        container.querySelectorAll('[open], .open, .expanded, [aria-expanded="true"]').length > 1;

      // Detect animation
      let animationType = 'none';
      try {
        const firstItem = items[0];
        const content = firstItem.querySelector(
          '.accordion-content, [class*="accordion-body"], [class*="collapse-content"], [class*="panel-body"]'
        );
        if (content) {
          const style = getCachedStyle(content);
          if (style.transition && style.transition !== 'none' && style.transition !== 'all 0s ease 0s') {
            animationType = 'css-transition';
          } else if (style.animationName && style.animationName !== 'none') {
            animationType = 'css-animation';
          }
        }
      } catch {
        // Keep default
      }

      accordions.push({
        containerSelector: buildSelector(container),
        itemCount: items.length,
        multiOpen,
        animationType,
      });
    }

    return accordions;
  }

  private detectCarousels(): InteractionPatterns['carousels'] {
    const carousels: InteractionPatterns['carousels'] = [];

    // Find carousel/slider containers
    const containers = document.querySelectorAll(
      '.carousel, .slider, .swiper, .slick-slider, .glide, .splide, ' +
      '[class*="carousel"], [class*="slider"], [class*="swiper"], ' +
      '[role="region"][aria-roledescription="carousel"], [data-carousel], [data-slider]'
    );

    for (let i = 0; i < Math.min(containers.length, 10); i++) {
      const container = containers[i];

      // Count slides
      const slides = container.querySelectorAll(
        '.slide, .swiper-slide, .slick-slide, .carousel-item, .glide__slide, .splide__slide, ' +
        '[class*="slide"], [role="group"][aria-roledescription="slide"]'
      );

      const slideCount = slides.length || container.children.length;

      // Detect auto-play
      const autoPlay = container.hasAttribute('data-autoplay') ||
        container.getAttribute('data-autoplay') === 'true' ||
        container.hasAttribute('data-auto-play') ||
        (typeof container.className === 'string' && container.className.includes('auto'));

      // Detect navigation
      const hasArrows = container.querySelectorAll(
        '.prev, .next, [class*="arrow"], [class*="prev"], [class*="next"], ' +
        '[aria-label*="previous"], [aria-label*="next"], [class*="nav-btn"]'
      ).length >= 2;

      const hasDots = container.querySelectorAll(
        '.dot, [class*="dot"], [class*="indicator"], [class*="pagination"], ' +
        '[role="tab"], .swiper-pagination-bullet, .slick-dots'
      ).length > 0;

      // Detect transition type
      let transitionType = 'slide';
      const classes = typeof container.className === 'string' ? container.className.toLowerCase() : '';
      if (classes.includes('fade')) transitionType = 'fade';
      else if (classes.includes('coverflow')) transitionType = 'coverflow';
      else if (classes.includes('cube')) transitionType = 'cube';

      carousels.push({
        containerSelector: buildSelector(container),
        slideCount,
        autoPlay,
        hasArrows,
        hasDots,
        transitionType,
      });
    }

    return carousels;
  }

  private detectToasts(): InteractionPatterns['toasts'] {
    const toasts: InteractionPatterns['toasts'] = [];

    const containers = document.querySelectorAll(
      '[role="alert"], [role="status"], .toast, .notification, .snackbar, ' +
      '[class*="toast"], [class*="notification"], [class*="snackbar"], ' +
      '[class*="alert-container"], [aria-live="polite"], [aria-live="assertive"]'
    );

    for (let i = 0; i < Math.min(containers.length, 5); i++) {
      const container = containers[i];

      // Determine position
      let position = 'top-right';
      try {
        const style = getCachedStyle(container);
        const classes = typeof container.className === 'string' ? container.className.toLowerCase() : '';

        if (classes.includes('bottom')) position = 'bottom';
        if (classes.includes('top')) position = 'top';
        if (classes.includes('left')) position += '-left';
        if (classes.includes('right')) position += '-right';
        if (classes.includes('center')) position = position.split('-')[0] + '-center';

        // If no class-based detection, use computed position
        if (position === 'top-right') {
          if (style.position === 'fixed' || style.position === 'absolute') {
            const top = parseFloat(style.top);
            const bottom = parseFloat(style.bottom);
            const left = parseFloat(style.left);
            const right = parseFloat(style.right);

            if (!isNaN(bottom) && bottom < 100) position = 'bottom';
            else if (!isNaN(top) && top < 100) position = 'top';
            if (!isNaN(right) && right < 100) position += '-right';
            else if (!isNaN(left) && left < 100) position += '-left';
          }
        }
      } catch {
        // Keep default
      }

      // Check for auto-dismiss
      const autoDismiss = container.hasAttribute('data-auto-dismiss') ||
        container.hasAttribute('data-timeout') ||
        container.hasAttribute('data-delay') ||
        (typeof container.className === 'string' && container.className.includes('auto'));

      toasts.push({
        containerSelector: buildSelector(container),
        position,
        autoDismiss,
      });
    }

    return toasts;
  }

  private detectSearchAutocomplete(): InteractionPatterns['searchAutocomplete'] {
    const results: InteractionPatterns['searchAutocomplete'] = [];

    // Find search inputs
    const searchInputs = document.querySelectorAll(
      'input[type="search"], input[role="searchbox"], input[aria-autocomplete], ' +
      'input[list], input[class*="search"], input[name*="search"], input[name*="query"], ' +
      '[class*="search-input"], [class*="search-bar"]'
    );

    for (let i = 0; i < Math.min(searchInputs.length, 5); i++) {
      const input = searchInputs[i];
      const inputSelector = buildSelector(input);

      // Find associated suggestions container
      let suggestionsSelector = '';
      const listId = input.getAttribute('list');
      if (listId) {
        suggestionsSelector = `#${listId}`;
      }

      const ariaOwns = input.getAttribute('aria-owns') || input.getAttribute('aria-controls');
      if (ariaOwns) {
        suggestionsSelector = `#${ariaOwns}`;
      }

      // Check siblings / nearby elements
      if (!suggestionsSelector) {
        const parent = input.parentElement;
        if (parent) {
          const suggestions = parent.querySelector(
            '[role="listbox"], .suggestions, .autocomplete, [class*="suggest"], ' +
            '[class*="autocomplete"], [class*="dropdown"], [class*="results"]'
          );
          if (suggestions) {
            suggestionsSelector = buildSelector(suggestions);
          }
        }
      }

      // Estimate debounce (can't directly observe, use heuristic)
      const debounceMs = 300; // Standard debounce

      results.push({
        inputSelector,
        suggestionsSelector,
        debounceMs,
      });
    }

    return results;
  }

  private detectFilterSort(): InteractionPatterns['filterSort'] {
    const results: InteractionPatterns['filterSort'] = [];

    // Detect filter UI
    const filterContainers = document.querySelectorAll(
      '[class*="filter"], [class*="facet"], [role="search"], ' +
      '[class*="sidebar-filter"], [class*="product-filter"], [data-filter]'
    );

    for (let i = 0; i < Math.min(filterContainers.length, 5); i++) {
      const container = filterContainers[i];
      const classes = typeof container.className === 'string' ? container.className.toLowerCase() : '';

      let filterType: InteractionPatterns['filterSort'][0]['filterType'] = 'dropdown';
      if (classes.includes('sidebar')) filterType = 'sidebar';
      else if (classes.includes('top') || classes.includes('bar') || classes.includes('toolbar')) filterType = 'top-bar';
      else if (classes.includes('modal') || classes.includes('sheet')) filterType = 'modal';

      // Find filter controls
      const controls: { label: string; type: string; selector: string }[] = [];
      const inputs = container.querySelectorAll('input, select, [role="checkbox"], [role="radio"], [role="combobox"]');

      for (let j = 0; j < Math.min(inputs.length, 15); j++) {
        const input = inputs[j];
        const label = input.getAttribute('aria-label') ||
          input.closest('label')?.textContent?.trim().slice(0, 50) ||
          input.getAttribute('placeholder') ||
          input.getAttribute('name') || '';

        const type = input.getAttribute('type') || input.tagName.toLowerCase();

        controls.push({
          label,
          type,
          selector: buildSelector(input),
        });
      }

      // Find sort options
      const sortOptions: string[] = [];
      const sortSelects = container.querySelectorAll('select[class*="sort"], select[name*="sort"]');
      if (sortSelects.length > 0) {
        const options = sortSelects[0].querySelectorAll('option');
        for (let j = 0; j < options.length; j++) {
          const text = options[j].textContent?.trim();
          if (text) sortOptions.push(text);
        }
      }

      // Also check for sort buttons/links
      const sortButtons = document.querySelectorAll('[class*="sort"] a, [class*="sort"] button');
      for (let j = 0; j < sortButtons.length; j++) {
        const text = sortButtons[j].textContent?.trim();
        if (text) sortOptions.push(text);
      }

      if (controls.length > 0 || sortOptions.length > 0) {
        results.push({
          filterType,
          filterControls: controls,
          sortOptions: [...new Set(sortOptions)].slice(0, 10),
        });
      }
    }

    return results;
  }

  private detectDragDrop(): InteractionPatterns['dragDrop'] {
    const results: InteractionPatterns['dragDrop'] = [];

    // Check for draggable elements
    const draggables = document.querySelectorAll(
      '[draggable="true"], [class*="draggable"], [class*="sortable"], ' +
      '[class*="drag-handle"], [data-draggable], [data-sortable]'
    );

    if (draggables.length > 0) {
      // Try to detect the library
      let library = 'native-html5';
      const scripts = document.querySelectorAll('script[src]');
      for (let i = 0; i < scripts.length; i++) {
        const src = (scripts[i].getAttribute('src') || '').toLowerCase();
        if (src.includes('sortablejs') || src.includes('sortable')) library = 'SortableJS';
        else if (src.includes('react-dnd')) library = 'react-dnd';
        else if (src.includes('dnd-kit') || src.includes('dndkit')) library = '@dnd-kit';
        else if (src.includes('beautiful-dnd') || src.includes('react-beautiful')) library = 'react-beautiful-dnd';
        else if (src.includes('interact')) library = 'interact.js';
        else if (src.includes('draggable')) library = 'Shopify Draggable';
      }

      // Check for drop zones
      const dropZones = document.querySelectorAll(
        '[class*="drop-zone"], [class*="dropzone"], [class*="drop-target"], ' +
        '[data-drop], [data-droppable]'
      );

      results.push({
        draggableSelector: buildSelector(draggables[0]),
        dropZoneSelector: dropZones.length > 0 ? buildSelector(dropZones[0]) : '',
        library,
      });
    }

    return results;
  }

  private detectFileUpload(): InteractionPatterns['fileUpload'] {
    const results: InteractionPatterns['fileUpload'] = [];

    // Find file inputs
    const fileInputs = document.querySelectorAll('input[type="file"]');

    for (let i = 0; i < Math.min(fileInputs.length, 5); i++) {
      const input = fileInputs[i] as HTMLInputElement;
      const inputSelector = buildSelector(input);

      // Find associated drop zone
      let dropZoneSelector = '';
      const parent = input.closest(
        '[class*="upload"], [class*="drop"], [class*="dropzone"], [class*="file-input"]'
      );
      if (parent) {
        dropZoneSelector = buildSelector(parent);
      }

      results.push({
        inputSelector,
        dropZoneSelector,
        acceptedTypes: input.getAttribute('accept') || '*',
        multipleFiles: input.hasAttribute('multiple'),
      });
    }

    // Also check for drag-and-drop upload zones without file inputs
    const dropZones = document.querySelectorAll(
      '[class*="dropzone"], [class*="drop-zone"], [class*="upload-area"], ' +
      '[class*="file-drop"], [data-upload], [data-dropzone]'
    );

    for (let i = 0; i < Math.min(dropZones.length, 3); i++) {
      const zone = dropZones[i];
      // Check if we already captured this via file input
      const hasFileInput = zone.querySelector('input[type="file"]');
      if (hasFileInput) continue;

      results.push({
        inputSelector: '',
        dropZoneSelector: buildSelector(zone),
        acceptedTypes: zone.getAttribute('data-accept') || '*',
        multipleFiles: zone.hasAttribute('data-multiple') || zone.hasAttribute('multiple'),
      });
    }

    return results;
  }

  private detectSteppers(): InteractionPatterns['steppers'] {
    const results: InteractionPatterns['steppers'] = [];

    // Find stepper/wizard containers
    const containers = document.querySelectorAll(
      '[class*="stepper"], [class*="wizard"], [class*="step-indicator"], ' +
      '[class*="progress-steps"], [class*="multi-step"], [role="progressbar"], ' +
      '[class*="step-nav"], [class*="steps"], ol[class*="step"]'
    );

    for (let i = 0; i < Math.min(containers.length, 5); i++) {
      const container = containers[i];
      const classes = typeof container.className === 'string' ? container.className.toLowerCase() : '';

      // Count steps
      const steps = container.querySelectorAll(
        '.step, [class*="step-item"], [class*="wizard-step"], li, ' +
        '[class*="step-circle"], [role="listitem"]'
      );

      const stepCount = steps.length;
      if (stepCount < 2) continue;

      // Detect current step
      let currentStep = 1;
      for (let j = 0; j < steps.length; j++) {
        const stepClasses = typeof steps[j].className === 'string' ? steps[j].className.toLowerCase() : '';
        if (stepClasses.includes('active') || stepClasses.includes('current') ||
            steps[j].getAttribute('aria-current') === 'step') {
          currentStep = j + 1;
          break;
        }
      }

      // Detect orientation
      let orientation: 'horizontal' | 'vertical' = 'horizontal';
      if (classes.includes('vertical') || classes.includes('vert')) {
        orientation = 'vertical';
      } else {
        try {
          const style = getCachedStyle(container);
          if (style.flexDirection === 'column') orientation = 'vertical';
        } catch {
          // Keep default
        }
      }

      // Detect completion indicator
      let completionIndicator = 'number';
      if (container.querySelector('.check, [class*="check"], [class*="complete"]')) {
        completionIndicator = 'checkmark';
      } else if (container.querySelector('[class*="circle"], [class*="dot"]')) {
        completionIndicator = 'circle';
      }

      results.push({
        containerSelector: buildSelector(container),
        stepCount,
        currentStep,
        orientation,
        completionIndicator,
      });
    }

    return results;
  }

  protected emptyResult(): InteractionPatterns {
    return {
      infiniteScroll: { detected: false, containerSelector: '', sentinelSelector: '', loadingIndicator: '' },
      lazyLoading: { detected: false, method: 'none', lazyElements: [] },
      modals: [],
      dropdowns: [],
      tabPanels: [],
      accordions: [],
      carousels: [],
      toasts: [],
      searchAutocomplete: [],
      filterSort: [],
      dragDrop: [],
      fileUpload: [],
      steppers: [],
    };
  }
}
