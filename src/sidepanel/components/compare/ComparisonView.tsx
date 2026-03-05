import React, { useState, useMemo } from 'react';
import type { FullScrapeResult, SiteRanking } from '@shared/types';
import { ComparisonTable, type ComparisonColumn, type ComparisonRow } from './ComparisonTable';
import { ScoreRadar, type RadarSeries } from './ScoreRadar';

type CompareTab = 'overview' | 'tokens' | 'components' | 'performance' | 'accessibility';

interface ComparisonViewProps {
  results: FullScrapeResult[];
}

const SITE_COLORS = ['#5c7cfa', '#51cf66', '#fcc419', '#ff6b6b', '#cc5de8'];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ results }) => {
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');

  const columns: ComparisonColumn[] = useMemo(
    () =>
      results.map((r, i) => ({
        id: r.targetUrl,
        label: extractDomain(r.targetUrl),
        color: SITE_COLORS[i % SITE_COLORS.length],
      })),
    [results]
  );

  const tabs: { id: CompareTab; label: string; icon: JSX.Element }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
        </svg>
      ),
    },
    {
      id: 'tokens',
      label: 'Tokens',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z" />
        </svg>
      ),
    },
    {
      id: 'components',
      label: 'Components',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      ),
    },
    {
      id: 'performance',
      label: 'Performance',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
    },
    {
      id: 'accessibility',
      label: 'A11y',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      ),
    },
  ];

  if (results.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Sites to Compare</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Scrape 2 or more sites to see a side-by-side comparison of their design systems, performance, and UX patterns.
        </p>
      </div>
    );
  }

  // Build radar chart data
  const radarSeries: RadarSeries[] = results.map((r, i) => ({
    label: extractDomain(r.targetUrl),
    color: SITE_COLORS[i % SITE_COLORS.length],
    data: [
      { axis: 'Accessibility', value: r.accessibility.overallScore },
      { axis: 'Performance', value: r.lighthouse.performanceScore },
      { axis: 'Visual', value: Math.min(100, 50 + r.designTokens.colors.length * 3 + r.components.length * 2) },
      { axis: 'Conversion', value: Math.min(100, 30 + r.conversionPatterns.ctas.length * 10 + r.conversionPatterns.socialProof.length * 8) },
      { axis: 'Innovation', value: Math.min(100, 30 + r.animations.cssAnimations.length * 8 + (r.darkMode.hasDarkMode ? 20 : 0)) },
      { axis: 'Mobile', value: Math.min(100, r.lighthouse.performanceScore * 0.5 + r.gridLayout.breakpointBehaviors.length * 15) },
    ],
  }));

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 flex gap-1 border-b border-dark-3/50 bg-dark-0/95 backdrop-blur-sm px-3 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-brand-500/15 text-brand-400'
                : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Site legend */}
        <div className="flex flex-wrap gap-2">
          {results.map((r, i) => (
            <div
              key={r.targetUrl}
              className="flex items-center gap-1.5 rounded-lg border border-dark-3/30 bg-dark-2/50 px-2.5 py-1.5"
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }}
              />
              <span className="text-[10px] text-gray-300 font-medium truncate max-w-[100px]">
                {extractDomain(r.targetUrl)}
              </span>
            </div>
          ))}
        </div>

        {activeTab === 'overview' && (
          <>
            {/* Radar chart */}
            <div className="flex justify-center">
              <ScoreRadar series={radarSeries} size={220} />
            </div>

            {/* Overall scores */}
            <ComparisonTable
              title="Overall Scores"
              columns={columns}
              rows={[
                {
                  metric: 'Accessibility',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.overallScore])),
                  format: 'score',
                },
                {
                  metric: 'Performance',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.performanceScore])),
                  format: 'score',
                },
                {
                  metric: 'Components',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.components.length])),
                  format: 'number',
                },
                {
                  metric: 'CTAs',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.conversionPatterns.ctas.length])),
                  format: 'number',
                },
                {
                  metric: 'WCAG Level',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.wcagLevel])),
                  format: 'text',
                },
              ]}
            />

            {/* Winner badges */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Category Winners
              </h4>
              <div className="space-y-2">
                {['Accessibility', 'Performance', 'Components'].map((category) => {
                  let winnerId = '';
                  let winnerVal = -1;
                  results.forEach((r) => {
                    let val = 0;
                    if (category === 'Accessibility') val = r.accessibility.overallScore;
                    else if (category === 'Performance') val = r.lighthouse.performanceScore;
                    else val = r.components.length;
                    if (val > winnerVal) {
                      winnerVal = val;
                      winnerId = r.targetUrl;
                    }
                  });
                  const winnerIndex = results.findIndex((r) => r.targetUrl === winnerId);
                  const color = SITE_COLORS[winnerIndex % SITE_COLORS.length];

                  return (
                    <div
                      key={category}
                      className="flex items-center justify-between rounded-lg border border-dark-3/30 bg-dark-2/30 px-3 py-2"
                    >
                      <span className="text-xs text-gray-400">{category}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-xs font-semibold" style={{ color }}>
                          {extractDomain(winnerId)}
                        </span>
                        <span className="text-[10px] text-gray-500 tabular-nums">
                          ({category === 'Components' ? winnerVal : `${winnerVal}/100`})
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {activeTab === 'tokens' && (
          <>
            {/* Color palette comparison */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Color Palettes
              </h4>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={r.targetUrl}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SITE_COLORS[i % SITE_COLORS.length] }}
                      />
                      <span className="text-[10px] text-gray-400 font-medium">
                        {extractDomain(r.targetUrl)}
                      </span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {r.designTokens.colors.slice(0, 12).map((color, ci) => (
                        <div
                          key={ci}
                          className="group relative w-7 h-7 rounded-md border border-dark-3/30 cursor-pointer transition-transform hover:scale-110"
                          style={{ backgroundColor: color.value }}
                          title={color.value}
                        >
                          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 hidden group-hover:block text-[8px] text-gray-400 whitespace-nowrap bg-dark-1 px-1 rounded z-10">
                            {color.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography comparison */}
            <ComparisonTable
              title="Typography"
              columns={columns}
              rows={[
                {
                  metric: 'Font Families',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.typography.fontFamilies.length])),
                  format: 'number',
                },
                {
                  metric: 'Font Weights',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.typography.fontWeights.length])),
                  format: 'number',
                },
                {
                  metric: 'Font Sizes',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.typography.fontSizes.length])),
                  format: 'number',
                },
                {
                  metric: 'Primary Font',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.typography.fontFamilies[0]?.family || '-'])),
                  format: 'text',
                },
              ]}
            />

            <ComparisonTable
              title="Design Tokens"
              columns={columns}
              rows={[
                {
                  metric: 'Colors',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.designTokens.colors.length])),
                },
                {
                  metric: 'Spacing Values',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.designTokens.spacing.length])),
                },
                {
                  metric: 'Shadows',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.designTokens.shadows.length])),
                },
                {
                  metric: 'Border Radii',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.designTokens.borderRadii.length])),
                },
                {
                  metric: 'Dark Mode',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.darkMode.hasDarkMode ? 'Yes' : 'No'])),
                  format: 'text',
                },
              ]}
            />
          </>
        )}

        {activeTab === 'components' && (
          <>
            <ComparisonTable
              title="Component Inventory"
              columns={columns}
              rows={(() => {
                const allTypes = [...new Set(results.flatMap((r) => r.components.map((c) => c.type)))].sort();
                return allTypes.map((type) => ({
                  metric: type,
                  values: Object.fromEntries(
                    results.map((r) => [
                      r.targetUrl,
                      r.components.filter((c) => c.type === type).length,
                    ])
                  ),
                  format: 'number' as const,
                }));
              })()}
            />

            <ComparisonTable
              title="Interaction Metrics"
              columns={columns}
              rows={[
                {
                  metric: 'CSS Animations',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.animations.cssAnimations.length])),
                },
                {
                  metric: 'CSS Transitions',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.animations.cssTransitions.length])),
                },
                {
                  metric: 'Scroll Animations',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.scrollBehavior.scrollAnimations.length])),
                },
                {
                  metric: 'Sticky Elements',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.scrollBehavior.stickyElements.length])),
                },
              ]}
            />
          </>
        )}

        {activeTab === 'performance' && (
          <>
            <ComparisonTable
              title="Core Web Vitals"
              columns={columns}
              rows={[
                {
                  metric: 'Performance Score',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.performanceScore])),
                  format: 'score',
                },
                {
                  metric: 'LCP',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.lcp])),
                  format: 'duration',
                  higherIsBetter: false,
                },
                {
                  metric: 'CLS',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, parseFloat(r.lighthouse.cls.toFixed(3))])),
                  higherIsBetter: false,
                },
                {
                  metric: 'INP',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.inp])),
                  format: 'duration',
                  higherIsBetter: false,
                },
                {
                  metric: 'FCP',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.fcp])),
                  format: 'duration',
                  higherIsBetter: false,
                },
                {
                  metric: 'Speed Index',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.speedIndex])),
                  format: 'duration',
                  higherIsBetter: false,
                },
                {
                  metric: 'TBT',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.totalBlockingTime])),
                  format: 'duration',
                  higherIsBetter: false,
                },
              ]}
            />

            {/* Score bars */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Performance Score Comparison
              </h4>
              <div className="space-y-2">
                {results.map((r, i) => (
                  <div key={r.targetUrl} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-[70px] truncate">
                      {extractDomain(r.targetUrl)}
                    </span>
                    <div className="flex-1 h-4 bg-dark-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${r.lighthouse.performanceScore}%`,
                          backgroundColor: SITE_COLORS[i % SITE_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-gray-300 w-8 text-right">
                      {r.lighthouse.performanceScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'accessibility' && (
          <>
            <ComparisonTable
              title="Accessibility Audit"
              columns={columns}
              rows={[
                {
                  metric: 'Overall Score',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.overallScore])),
                  format: 'score',
                },
                {
                  metric: 'WCAG Level',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.wcagLevel])),
                  format: 'text',
                },
                {
                  metric: 'Contrast Issues',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.contrastIssues.length])),
                  higherIsBetter: false,
                },
                {
                  metric: 'Missing Alt Text',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.missingAltText.length])),
                  higherIsBetter: false,
                },
                {
                  metric: 'Missing ARIA',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.missingAriaLabels.length])),
                  higherIsBetter: false,
                },
                {
                  metric: 'Tab Order Issues',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.accessibility.tabOrderIssues.length])),
                  higherIsBetter: false,
                },
                {
                  metric: 'Lighthouse A11y',
                  values: Object.fromEntries(results.map((r) => [r.targetUrl, r.lighthouse.accessibilityScore])),
                  format: 'score',
                },
              ]}
            />

            {/* A11y score bars */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Accessibility Score
              </h4>
              <div className="space-y-2">
                {results.map((r, i) => {
                  const score = r.accessibility.overallScore;
                  const barColor =
                    score >= 80 ? '#51cf66' : score >= 60 ? '#fcc419' : '#ff6b6b';
                  return (
                    <div key={r.targetUrl} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-[70px] truncate">
                        {extractDomain(r.targetUrl)}
                      </span>
                      <div className="flex-1 h-4 bg-dark-2 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${score}%`, backgroundColor: barColor }}
                        />
                      </div>
                      <span className="text-xs font-bold tabular-nums text-gray-300 w-8 text-right">
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
