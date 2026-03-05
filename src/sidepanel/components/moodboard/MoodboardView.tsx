import React, { useState, useMemo, useCallback } from 'react';
import type { FullScrapeResult, ScreenshotData, IconData } from '@shared/types';
import type { ImagePrompt } from '../../../generators/image-prompt-generator';

interface MoodboardViewProps {
  scrapeResult: FullScrapeResult | null;
  imagePrompts?: ImagePrompt[];
}

type MoodboardItem = {
  id: string;
  type: 'screenshot' | 'color-palette' | 'typography' | 'icon-grid' | 'prompt-card' | 'inspiration';
  content: React.ReactNode;
  span?: number; // masonry column span
};

const MasonryCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  index: number;
}> = ({ children, className = '', index }) => (
  <div
    className={`rounded-xl border border-dark-3/30 bg-dark-1/80 backdrop-blur-sm overflow-hidden break-inside-avoid mb-3 animate-in ${className}`}
    style={{ animationDelay: `${index * 60}ms` }}
  >
    {children}
  </div>
);

export const MoodboardView: React.FC<MoodboardViewProps> = ({
  scrapeResult,
  imagePrompts = [],
}) => {
  const [exportingHtml, setExportingHtml] = useState(false);

  if (!scrapeResult) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Moodboard Data</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Complete a scrape session to generate a visual moodboard from the design system.
        </p>
      </div>
    );
  }

  const { designTokens, typography, icons, screenshots } = scrapeResult;
  const topColors = designTokens.colors.slice(0, 16);
  const topFonts = typography.fontFamilies.slice(0, 3);

  const handleExportHtml = useCallback(() => {
    setExportingHtml(true);

    const htmlContent = generateMoodboardHtml(scrapeResult, imagePrompts);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `moodboard-${scrapeResult.projectName || 'design'}.html`;
    link.click();
    URL.revokeObjectURL(url);

    setTimeout(() => setExportingHtml(false), 1500);
  }, [scrapeResult, imagePrompts]);

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-3/30">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Moodboard
        </h3>
        <button
          onClick={handleExportHtml}
          disabled={exportingHtml}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500/15 px-3 py-1.5 text-[10px] font-medium text-brand-400 hover:bg-brand-500/25 transition-colors disabled:opacity-50"
        >
          {exportingHtml ? (
            <div className="w-3 h-3 rounded-full border border-brand-400 border-t-transparent animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          {exportingHtml ? 'Exporting...' : 'Export HTML'}
        </button>
      </div>

      {/* Masonry layout */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
        <div className="columns-1 gap-3" style={{ columnCount: 1 }}>
          {/* Screenshots */}
          {screenshots.slice(0, 4).map((ss, i) => (
            <MasonryCard key={`ss-${i}`} index={i}>
              <div className="relative">
                <img
                  src={ss.dataUrl}
                  alt={`Screenshot at ${ss.breakpoint}px`}
                  className="w-full h-auto"
                  loading="lazy"
                />
                <div className="absolute bottom-2 left-2 rounded-full bg-dark-0/80 backdrop-blur-sm px-2 py-0.5 text-[9px] text-gray-400 font-medium">
                  {ss.breakpoint}px
                </div>
              </div>
            </MasonryCard>
          ))}

          {/* Color Palette Strip */}
          <MasonryCard index={screenshots.length}>
            <div className="p-3">
              <h4 className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                Color Palette
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {topColors.map((color, i) => (
                  <div key={i} className="group relative">
                    <div
                      className="w-10 h-10 rounded-lg border border-dark-3/30 transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: color.value }}
                      title={`${color.value} (${color.count}x)`}
                    />
                    <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block text-[7px] text-gray-500 whitespace-nowrap bg-dark-1 px-1 rounded z-10">
                      {color.value}
                    </div>
                  </div>
                ))}
              </div>
              {/* Gradient strip */}
              <div className="mt-3 h-6 rounded-lg overflow-hidden flex">
                {topColors.slice(0, 8).map((color, i) => (
                  <div key={i} className="flex-1" style={{ backgroundColor: color.value }} />
                ))}
              </div>
            </div>
          </MasonryCard>

          {/* Typography Samples */}
          <MasonryCard index={screenshots.length + 1}>
            <div className="p-3 space-y-3">
              <h4 className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">
                Typography
              </h4>
              {topFonts.map((font, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[9px] text-gray-600">{font.family} / {font.usage.join(', ')}</p>
                  <p
                    className="text-lg text-gray-200 leading-tight"
                    style={{ fontFamily: font.family }}
                  >
                    The quick brown fox jumps
                  </p>
                  <p
                    className="text-xs text-gray-400"
                    style={{ fontFamily: font.family }}
                  >
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ
                  </p>
                  <p
                    className="text-xs text-gray-400"
                    style={{ fontFamily: font.family }}
                  >
                    abcdefghijklmnopqrstuvwxyz 0123456789
                  </p>
                  <div className="flex gap-2 mt-1">
                    {typography.fontWeights.slice(0, 4).map((w, wi) => (
                      <span
                        key={wi}
                        className="text-[10px] text-gray-500"
                        style={{ fontFamily: font.family, fontWeight: parseInt(w.weight) || 400 }}
                      >
                        {w.weight}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </MasonryCard>

          {/* Icon Grid */}
          {icons.length > 0 && (
            <MasonryCard index={screenshots.length + 2}>
              <div className="p-3">
                <h4 className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 mb-2">
                  Icons ({icons.length})
                </h4>
                <div className="grid grid-cols-6 gap-2">
                  {icons.slice(0, 18).map((icon, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-dark-2/50 border border-dark-3/20 p-1.5"
                      title={icon.category}
                    >
                      <div
                        className="w-full h-full text-gray-400"
                        dangerouslySetInnerHTML={{ __html: icon.svg.slice(0, 500) }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </MasonryCard>
          )}

          {/* Image Prompt Cards */}
          {imagePrompts.slice(0, 4).map((prompt, i) => (
            <MasonryCard key={`prompt-${i}`} index={screenshots.length + 3 + i}>
              <div className="p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[8px] text-purple-400 font-semibold uppercase tracking-wider">
                    {prompt.category}
                  </span>
                  <span className="text-[8px] text-gray-600">{prompt.aspectRatio}</span>
                </div>
                <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-4">
                  {prompt.prompt.slice(0, 200)}...
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {prompt.tags.slice(0, 3).map((tag, ti) => (
                    <span
                      key={ti}
                      className="rounded bg-dark-3/30 px-1.5 py-0.5 text-[7px] text-gray-600"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </MasonryCard>
          ))}

          {/* Design inspiration placeholder */}
          <MasonryCard index={screenshots.length + 7}>
            <div className="p-3 flex flex-col items-center text-center">
              <svg className="w-6 h-6 text-gray-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
              <p className="text-[10px] text-gray-500">
                Design inspiration sourced from{' '}
                <span className="text-brand-400 font-medium">
                  {scrapeResult.targetUrl}
                </span>
              </p>
              <p className="text-[8px] text-gray-600 mt-1">
                {scrapeResult.components.length} components / {topColors.length} colors / {topFonts.length} fonts
              </p>
            </div>
          </MasonryCard>
        </div>
      </div>
    </div>
  );
};

// ===== HTML Export =====
function generateMoodboardHtml(
  scrapeResult: FullScrapeResult,
  imagePrompts: ImagePrompt[]
): string {
  const { designTokens, typography, icons, screenshots } = scrapeResult;
  const topColors = designTokens.colors.slice(0, 16);
  const topFonts = typography.fontFamilies.slice(0, 3);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Moodboard — ${scrapeResult.projectName || 'Design'}</title>
  ${topFonts[0] ? `<link href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(topFonts[0].family)}:wght@300;400;500;600;700&display=swap" rel="stylesheet">` : ''}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #1a1b1e; color: #e9ecef; font-family: ${topFonts[0]?.family || 'system-ui'}, sans-serif; padding: 24px; }
    .moodboard { columns: 2; column-gap: 16px; max-width: 900px; margin: 0 auto; }
    @media (max-width: 600px) { .moodboard { columns: 1; } }
    .card { break-inside: avoid; margin-bottom: 16px; border-radius: 12px; border: 1px solid #373a4030; background: #25262b; overflow: hidden; }
    .card-body { padding: 16px; }
    .label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: #495057; font-weight: 600; margin-bottom: 8px; }
    .color-grid { display: flex; flex-wrap: wrap; gap: 6px; }
    .color-swatch { width: 40px; height: 40px; border-radius: 8px; border: 1px solid #373a4030; }
    .gradient-strip { height: 24px; border-radius: 8px; overflow: hidden; display: flex; margin-top: 12px; }
    .gradient-strip div { flex: 1; }
    .typo-sample { font-size: 18px; color: #e9ecef; line-height: 1.3; margin-bottom: 4px; }
    .typo-chars { font-size: 11px; color: #495057; }
    .prompt-tag { display: inline-block; background: #373a4040; border-radius: 4px; padding: 2px 6px; font-size: 8px; color: #495057; margin-right: 4px; margin-top: 4px; }
    .prompt-text { font-size: 10px; color: #dee2e6; line-height: 1.5; }
    .prompt-category { display: inline-block; background: #cc5de815; color: #cc5de8; border-radius: 12px; padding: 2px 8px; font-size: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; text-align: center; }
    .subtitle { font-size: 12px; color: #495057; text-align: center; margin-bottom: 24px; }
    img { width: 100%; height: auto; display: block; }
    .screenshot-label { font-size: 9px; color: #495057; padding: 8px 16px; }
  </style>
</head>
<body>
  <h1>Moodboard</h1>
  <p class="subtitle">${scrapeResult.projectName || scrapeResult.targetUrl} — ${new Date().toLocaleDateString()}</p>
  <div class="moodboard">
    ${screenshots.slice(0, 3).map((ss) => `<div class="card"><img src="${ss.dataUrl}" alt="Screenshot ${ss.breakpoint}px" /><div class="screenshot-label">${ss.breakpoint}px viewport</div></div>`).join('\n')}
    <div class="card"><div class="card-body">
      <div class="label">Color Palette</div>
      <div class="color-grid">${topColors.map((c) => `<div class="color-swatch" style="background:${c.value}" title="${c.value}"></div>`).join('')}</div>
      <div class="gradient-strip">${topColors.slice(0, 8).map((c) => `<div style="background:${c.value}"></div>`).join('')}</div>
    </div></div>
    <div class="card"><div class="card-body">
      <div class="label">Typography</div>
      ${topFonts.map((f) => `<div style="margin-bottom:12px;"><p class="typo-sample" style="font-family:${f.family}">${f.family}</p><p class="typo-chars" style="font-family:${f.family}">ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789</p></div>`).join('')}
    </div></div>
    ${imagePrompts.slice(0, 6).map((p) => `<div class="card"><div class="card-body"><div class="prompt-category">${p.category}</div><p class="prompt-text">${p.prompt.slice(0, 200)}...</p><div>${p.tags.map((t) => `<span class="prompt-tag">#${t}</span>`).join('')}</div></div></div>`).join('\n')}
  </div>
</body>
</html>`;
}
