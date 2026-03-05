import type {
  FullScrapeResult,
  ReconstructedComponent,
  DesignTokens,
  TypographySystem,
  AnimationData,
  ComponentData,
} from '../shared/types';

export interface PrototypeConfig {
  title: string;
  includeToolbar: boolean;
  includeAnimations: boolean;
  darkMode: boolean;
}

function tokensToCSS(tokens: DesignTokens): string {
  const colorVars = tokens.colors
    .slice(0, 30)
    .map((c, i) => `  --color-${i}: ${c.value};`)
    .join('\n');

  const spacingVars = tokens.spacing
    .slice(0, 15)
    .map((s, i) => `  --space-${i}: ${s.value};`)
    .join('\n');

  const shadowVars = tokens.shadows
    .slice(0, 8)
    .map((s, i) => `  --shadow-${i}: ${s.value};`)
    .join('\n');

  const radiusVars = tokens.borderRadii
    .slice(0, 8)
    .map((r, i) => `  --radius-${i}: ${r.value};`)
    .join('\n');

  return `:root {\n${colorVars}\n${spacingVars}\n${shadowVars}\n${radiusVars}\n}`;
}

function typographyToCSS(typography: TypographySystem): string {
  const families = typography.fontFamilies
    .slice(0, 3)
    .map((f, i) => `  --font-${i === 0 ? 'primary' : i === 1 ? 'secondary' : 'mono'}: ${f.family};`)
    .join('\n');

  const sizes = typography.fontSizes
    .slice(0, 10)
    .map((s) => `.text-${s.element.replace(/[^a-zA-Z0-9]/g, '-')} { font-size: ${s.size}; }`)
    .join('\n');

  return `:root {\n${families}\n}\n${sizes}`;
}

function animationsToCSS(animations: AnimationData): string {
  const transitions = animations.cssTransitions
    .slice(0, 10)
    .map(
      (t) =>
        `[data-animate="${t.selector.replace(/[^a-zA-Z0-9-]/g, '')}"] { transition: ${t.property} ${t.duration} ${t.easing}; }`
    )
    .join('\n');

  const keyframeBlocks = animations.cssAnimations
    .slice(0, 6)
    .map((a) => {
      return `@keyframes ${a.name.replace(/[^a-zA-Z0-9-_]/g, '')} {\n  ${a.keyframes.slice(0, 500)}\n}\n[data-anim="${a.name.replace(/[^a-zA-Z0-9-]/g, '')}"] { animation: ${a.name.replace(/[^a-zA-Z0-9-_]/g, '')} ${a.duration} ${a.easing}; }`;
    })
    .join('\n\n');

  return `${transitions}\n\n${keyframeBlocks}`;
}

function buildComponentHTML(components: ComponentData[]): string {
  return components
    .slice(0, 20)
    .map((c) => {
      const safeId = c.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      return `
      <!-- Component: ${c.name} (${c.type}) -->
      <div class="proto-component" data-component="${safeId}" data-type="${c.type}">
        ${c.html.slice(0, 5000)}
      </div>`;
    })
    .join('\n');
}

function buildComponentCSS(components: ComponentData[]): string {
  return components
    .slice(0, 20)
    .map((c) => {
      const safeId = c.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      return `/* ${c.name} */\n[data-component="${safeId}"] {\n  ${c.css.slice(0, 3000)}\n}`;
    })
    .join('\n\n');
}

function buildReconstructedHTML(reconstructed: ReconstructedComponent[]): string {
  return reconstructed
    .slice(0, 15)
    .map((rc) => {
      const safeId = rc.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      // Extract the render return from the TSX (between return ( and the closing ); )
      const renderMatch = rc.tsx.match(/return\s*\(([\s\S]*?)\);?\s*\}/);
      const html = renderMatch
        ? renderMatch[1]
            .replace(/className=/g, 'class=')
            .replace(/\{[^}]*\}/g, '')
            .trim()
        : `<div class="placeholder">Component: ${rc.name}</div>`;
      return `
      <!-- Reconstructed: ${rc.name} -->
      <section class="proto-section" data-rc="${safeId}" id="section-${safeId}">
        ${html}
      </section>`;
    })
    .join('\n');
}

export function generatePrototype(
  scrapeResult: FullScrapeResult,
  reconstructedComponents: ReconstructedComponent[] = [],
  config: Partial<PrototypeConfig> = {}
): string {
  const {
    title = scrapeResult.projectName || 'Interactive Prototype',
    includeToolbar = true,
    includeAnimations = true,
    darkMode = scrapeResult.darkMode.hasDarkMode,
  } = config;

  const { designTokens, typography, animations, components, screenshots } = scrapeResult;

  const tokenCSS = tokensToCSS(designTokens);
  const typoCSS = typographyToCSS(typography);
  const animCSS = includeAnimations ? animationsToCSS(animations) : '';
  const componentCSS = buildComponentCSS(components);

  const primaryColor = designTokens.colors[0]?.value || '#5c7cfa';
  const bgColor = darkMode ? '#1a1b1e' : '#ffffff';
  const textColor = darkMode ? '#e9ecef' : '#1a1b1e';
  const surfaceColor = darkMode ? '#25262b' : '#f8f9fa';
  const borderColor = darkMode ? '#373a40' : '#dee2e6';

  const primaryFont = typography.fontFamilies[0]?.family || 'system-ui, sans-serif';

  const hasReconstructions = reconstructedComponents.length > 0;
  const contentHTML = hasReconstructions
    ? buildReconstructedHTML(reconstructedComponents)
    : buildComponentHTML(components);

  // Build page sections for navigation
  const sectionNames = hasReconstructions
    ? reconstructedComponents.slice(0, 15).map((rc) => ({
        id: rc.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
        label: rc.name,
        type: rc.originalType,
      }))
    : components.slice(0, 20).map((c) => ({
        id: c.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase(),
        label: c.name,
        type: c.type,
      }));

  // Group sections into pages
  const pageSize = 4;
  const pages: { name: string; sections: typeof sectionNames }[] = [];
  for (let i = 0; i < sectionNames.length; i += pageSize) {
    const chunk = sectionNames.slice(i, i + pageSize);
    pages.push({
      name: `Page ${pages.length + 1}`,
      sections: chunk,
    });
  }
  if (pages.length === 0) {
    pages.push({ name: 'Page 1', sections: [] });
  }

  const toolbarHTML = includeToolbar
    ? `
    <!-- Prototype Toolbar -->
    <nav id="proto-toolbar">
      <div class="proto-toolbar-inner">
        <div class="proto-toolbar-brand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${primaryColor}" stroke-width="2">
            <path d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"/>
          </svg>
          <span class="proto-title">${title}</span>
        </div>
        <div class="proto-toolbar-pages" id="page-nav">
          ${pages.map((p, i) => `<button class="proto-page-btn${i === 0 ? ' active' : ''}" data-page="${i}" onclick="switchPage(${i})">${p.name}</button>`).join('')}
        </div>
        <div class="proto-toolbar-actions">
          <button class="proto-action-btn" onclick="toggleGrid()" title="Toggle Grid">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </button>
          <button class="proto-action-btn" onclick="toggleOutlines()" title="Toggle Outlines">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </button>
          <select class="proto-viewport-select" onchange="changeViewport(this.value)">
            <option value="100%">Desktop</option>
            <option value="768px">Tablet</option>
            <option value="375px">Mobile</option>
          </select>
        </div>
      </div>
    </nav>`
    : '';

  const toolbarCSS = includeToolbar
    ? `
    #proto-toolbar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 99999;
      background: ${darkMode ? 'rgba(26, 27, 30, 0.95)' : 'rgba(255, 255, 255, 0.95)'};
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-top: 1px solid ${borderColor};
      padding: 0 16px;
      height: 48px;
      font-family: ${primaryFont};
    }
    .proto-toolbar-inner {
      max-width: 1440px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 100%;
      gap: 16px;
    }
    .proto-toolbar-brand {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .proto-title {
      font-size: 12px;
      font-weight: 600;
      color: ${textColor};
      opacity: 0.8;
    }
    .proto-toolbar-pages {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .proto-toolbar-pages::-webkit-scrollbar { display: none; }
    .proto-page-btn {
      padding: 6px 12px;
      border: 1px solid ${borderColor};
      border-radius: 6px;
      background: transparent;
      color: ${textColor};
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .proto-page-btn:hover {
      background: ${primaryColor}15;
      border-color: ${primaryColor}40;
    }
    .proto-page-btn.active {
      background: ${primaryColor}20;
      border-color: ${primaryColor};
      color: ${primaryColor};
    }
    .proto-toolbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .proto-action-btn {
      width: 32px;
      height: 32px;
      border: 1px solid ${borderColor};
      border-radius: 6px;
      background: transparent;
      color: ${textColor};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }
    .proto-action-btn:hover {
      background: ${primaryColor}15;
      border-color: ${primaryColor}40;
    }
    .proto-viewport-select {
      padding: 6px 8px;
      border: 1px solid ${borderColor};
      border-radius: 6px;
      background: transparent;
      color: ${textColor};
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
    }`
    : '';

  return `<!DOCTYPE html>
<html lang="en" data-theme="${darkMode ? 'dark' : 'light'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — Interactive Prototype</title>
  ${typography.fontFamilies[0] ? `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(typography.fontFamilies[0].family)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">` : ''}
  <style>
    /* ===== Reset ===== */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }

    /* ===== Design Tokens ===== */
    ${tokenCSS}

    /* ===== Typography ===== */
    ${typoCSS}

    /* ===== Base ===== */
    body {
      font-family: ${primaryFont};
      background-color: ${bgColor};
      color: ${textColor};
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      ${includeToolbar ? 'padding-bottom: 56px;' : ''}
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    img { max-width: 100%; height: auto; display: block; }
    a { color: ${primaryColor}; text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ===== Prototype Layout ===== */
    .proto-container {
      max-width: 1440px;
      margin: 0 auto;
      padding: 0 24px;
    }

    .proto-page {
      display: none;
      animation: protoFadeIn 0.35s ease-out;
    }
    .proto-page.active { display: block; }

    @keyframes protoFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .proto-section {
      padding: 48px 0;
      border-bottom: 1px solid ${borderColor}20;
    }
    .proto-section:last-child { border-bottom: none; }

    .proto-component {
      margin: 24px 0;
      padding: 16px;
      border-radius: ${designTokens.borderRadii[0]?.value || '8px'};
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .proto-component:hover {
      transform: translateY(-2px);
      box-shadow: ${designTokens.shadows[0]?.value || '0 4px 24px rgba(0,0,0,0.1)'};
    }

    /* ===== Hover & Interaction Effects ===== */
    button, [role="button"], .clickable {
      cursor: pointer;
      transition: all 0.2s ease;
    }
    button:hover, [role="button"]:hover, .clickable:hover {
      opacity: 0.85;
      transform: scale(1.02);
    }
    button:active, [role="button"]:active, .clickable:active {
      transform: scale(0.98);
    }

    /* ===== Component CSS ===== */
    ${componentCSS}

    /* ===== Animations ===== */
    ${animCSS}

    /* ===== Grid Overlay ===== */
    .grid-overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 99998;
      pointer-events: none;
    }
    .grid-overlay.visible { display: block; }
    .grid-overlay-inner {
      max-width: 1440px;
      margin: 0 auto;
      height: 100%;
      display: grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 24px;
      padding: 0 24px;
    }
    .grid-col {
      background: ${primaryColor}08;
      border-left: 1px solid ${primaryColor}15;
      border-right: 1px solid ${primaryColor}15;
    }

    /* ===== Outline Mode ===== */
    .outline-mode .proto-component,
    .outline-mode .proto-section,
    .outline-mode [data-component],
    .outline-mode [data-rc] {
      outline: 1px dashed ${primaryColor}50;
      outline-offset: 2px;
    }

    /* ===== Responsive ===== */
    @media (max-width: 1280px) {
      .proto-container { padding: 0 20px; }
    }
    @media (max-width: 768px) {
      .proto-container { padding: 0 16px; }
      .proto-section { padding: 32px 0; }
      .proto-toolbar-pages { max-width: 140px; }
    }
    @media (max-width: 375px) {
      .proto-container { padding: 0 12px; }
      .proto-section { padding: 24px 0; }
    }

    /* ===== Viewport Simulation ===== */
    .viewport-wrapper {
      transition: max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      margin: 0 auto;
    }

    /* ===== Scroll Reveal ===== */
    .scroll-reveal {
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.6s ease, transform 0.6s ease;
    }
    .scroll-reveal.revealed {
      opacity: 1;
      transform: translateY(0);
    }

    /* ===== Placeholder images ===== */
    .proto-placeholder-img {
      background: linear-gradient(135deg, ${primaryColor}15, ${primaryColor}05);
      border: 1px dashed ${borderColor};
      border-radius: ${designTokens.borderRadii[0]?.value || '8px'};
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${textColor}60;
      font-size: 12px;
      min-height: 200px;
    }

    /* ===== Toolbar ===== */
    ${toolbarCSS}
  </style>
</head>
<body>
  <div class="grid-overlay" id="grid-overlay">
    <div class="grid-overlay-inner">
      ${Array(12).fill('<div class="grid-col"></div>').join('')}
    </div>
  </div>

  <div class="viewport-wrapper" id="viewport-wrapper">
    <div class="proto-container">
      ${pages
        .map(
          (page, pi) => `
        <div class="proto-page${pi === 0 ? ' active' : ''}" data-page-index="${pi}" id="proto-page-${pi}">
          ${page.sections.length > 0
            ? page.sections
                .map(
                  (s) => `
            <section class="proto-section scroll-reveal" id="section-${s.id}">
              <div class="section-label" style="font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:${textColor}40;margin-bottom:16px;">${s.type} / ${s.label}</div>
              <div data-component="${s.id}">
                ${components.find((c) => c.name.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase() === s.id)?.html.slice(0, 5000) || `<div class="proto-placeholder-img">${s.label}</div>`}
              </div>
            </section>`
                )
                .join('')
            : `<section class="proto-section"><div class="proto-placeholder-img" style="min-height:400px;">No components available for this page</div></section>`
          }
        </div>`
        )
        .join('')}
    </div>
  </div>

  ${toolbarHTML}

  <script>
    // ===== Page Navigation =====
    let currentPage = 0;
    const totalPages = ${pages.length};

    function switchPage(index) {
      if (index < 0 || index >= totalPages) return;
      document.querySelectorAll('.proto-page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.proto-page-btn').forEach(b => b.classList.remove('active'));
      const targetPage = document.getElementById('proto-page-' + index);
      if (targetPage) {
        targetPage.classList.add('active');
        // Re-trigger scroll reveals
        targetPage.querySelectorAll('.scroll-reveal').forEach(el => {
          el.classList.remove('revealed');
          requestAnimationFrame(() => observeElement(el));
        });
      }
      const targetBtn = document.querySelector('[data-page="' + index + '"]');
      if (targetBtn) targetBtn.classList.add('active');
      currentPage = index;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // ===== Grid Toggle =====
    function toggleGrid() {
      document.getElementById('grid-overlay')?.classList.toggle('visible');
    }

    // ===== Outline Toggle =====
    function toggleOutlines() {
      document.body.classList.toggle('outline-mode');
    }

    // ===== Viewport Simulation =====
    function changeViewport(width) {
      const wrapper = document.getElementById('viewport-wrapper');
      if (wrapper) {
        wrapper.style.maxWidth = width;
      }
    }

    // ===== Scroll Reveal =====
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    function observeElement(el) {
      observer.observe(el);
    }

    document.querySelectorAll('.scroll-reveal').forEach(observeElement);

    // ===== Keyboard Navigation =====
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        switchPage(currentPage + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        switchPage(currentPage - 1);
      } else if (e.key === 'g') {
        toggleGrid();
      } else if (e.key === 'o') {
        toggleOutlines();
      }
    });

    // ===== Click Navigation =====
    document.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      });
    });

    // ===== Touch/Swipe Support =====
    let touchStartX = 0;
    document.addEventListener('touchstart', (e) => { touchStartX = e.touches[0].clientX; });
    document.addEventListener('touchend', (e) => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 80) {
        if (diff > 0) switchPage(currentPage + 1);
        else switchPage(currentPage - 1);
      }
    });

    console.log('[Prototype] Loaded: ${title} — ${pages.length} pages, ${sectionNames.length} sections');
  </script>
</body>
</html>`;
}
