import React, { useState, useCallback } from 'react';
import { useStore } from '../../store';
import { ScoreCard } from './ScoreCard';
import { TokenPreview } from './TokenPreview';
import { ComponentGallery } from './ComponentGallery';
import { ExportActions } from './ExportActions';
import { MSG } from '@shared/message-types';
import type {
  DesignTokens,
  TypographySystem,
  AccessibilityAudit,
  LighthouseData,
  ComponentData,
  ConversionPatterns,
  CopyAnalysis,
  AnimationData,
  FlowAnalysis,
} from '@shared/types';

type ResultsTab =
  | 'overview'
  | 'tokens'
  | 'components'
  | 'accessibility'
  | 'performance'
  | 'seo'
  | 'interactions'
  | 'copy'
  | 'critique'
  | 'export';

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  messageType: string;
  color: string;
}

export const ResultsOverview: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ResultsTab>('overview');
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const steps = useStore((s) => s.steps);
  const isRunning = useStore((s) => s.isRunning);

  const tokens = steps['design-tokens']?.data as DesignTokens | null;
  const typography = steps['typography']?.data as TypographySystem | null;
  const accessibility = steps['accessibility']?.data as AccessibilityAudit | null;
  const lighthouse = steps['lighthouse']?.data as LighthouseData | null;
  const components = (steps['components']?.data as ComponentData[] | null) || [];
  const conversion = steps['conversion']?.data as ConversionPatterns | null;
  const copyData = steps['copy']?.data as CopyAnalysis | null;
  const animations = steps['animations']?.data as AnimationData | null;
  const flow = steps['flow']?.data as FlowAnalysis | null;

  const hasData = Object.keys(steps).length > 0;

  const handleQuickAction = useCallback(async (messageType: string) => {
    setRunningAction(messageType);
    try {
      await chrome.runtime.sendMessage({ type: messageType, payload: {} });
    } catch {
      // Error handled elsewhere
    }
    setTimeout(() => setRunningAction(null), 2000);
  }, []);

  if (!hasData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Results Yet</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Complete a scrape session to see detailed design analysis results here.
        </p>
      </div>
    );
  }

  const tabs: { id: ResultsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'tokens', label: 'Tokens' },
    { id: 'components', label: 'Components' },
    { id: 'accessibility', label: 'A11y' },
    { id: 'performance', label: 'Perf' },
    { id: 'interactions', label: 'Motion' },
    { id: 'copy', label: 'Copy' },
    { id: 'critique', label: 'Critique' },
    { id: 'export', label: 'Export' },
  ];

  const quickActions: QuickAction[] = [
    {
      label: 'Reconstruct',
      messageType: MSG.RECONSTRUCT_COMPONENTS,
      color: 'brand',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
        </svg>
      ),
    },
    {
      label: 'Critique',
      messageType: MSG.CRITIQUE_DESIGN,
      color: 'amber',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      ),
    },
    {
      label: 'Personas',
      messageType: MSG.GENERATE_PERSONAS,
      color: 'emerald',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
        </svg>
      ),
    },
    {
      label: 'A/B Tests',
      messageType: MSG.GENERATE_AB_TESTS,
      color: 'purple',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      ),
    },
  ];

  const totalTokens =
    (tokens?.colors.length || 0) +
    (tokens?.spacing.length || 0) +
    (tokens?.shadows.length || 0) +
    (tokens?.borderRadii.length || 0);
  const totalComponents = components.length;
  const totalFonts = typography?.fontFamilies.length || 0;
  const ctaCount = conversion?.ctas.length || 0;

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      {/* Sub-tab navigation */}
      <div className="sticky top-0 z-10 border-b border-dark-3/50 bg-dark-0/95 backdrop-blur-sm px-2 py-2">
        <div className="flex gap-0.5 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap rounded-md px-2 py-1.5 text-[10px] font-medium transition-colors flex-shrink-0
                ${
                  activeTab === tab.id
                    ? 'bg-brand-500/15 text-brand-400'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
          {isRunning && (
            <span className="ml-auto flex items-center text-[10px] text-amber-400 flex-shrink-0">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              In progress
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Quick Actions row */}
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-gray-600 mb-2">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-1.5">
              {quickActions.map((action) => (
                <button
                  key={action.messageType}
                  onClick={() => handleQuickAction(action.messageType)}
                  disabled={runningAction === action.messageType}
                  className={`flex items-center gap-1.5 rounded-lg border border-dark-3/30 bg-dark-2/30 px-2.5 py-2 text-[10px] font-medium text-gray-400 hover:text-gray-200 hover:bg-dark-2/50 transition-all duration-200 disabled:opacity-50`}
                >
                  {runningAction === action.messageType ? (
                    <div className="w-3.5 h-3.5 rounded-full border border-gray-400 border-t-transparent animate-spin" />
                  ) : (
                    action.icon
                  )}
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'overview' && (
          <>
            {/* Score cards */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Scores
              </h3>
              <div className="grid grid-cols-3 gap-2">
                <ScoreCard label="Accessibility" score={accessibility?.overallScore || 0} size="sm" />
                <ScoreCard label="Performance" score={lighthouse?.performanceScore || 0} size="sm" />
                <ScoreCard label="A11y (LH)" score={lighthouse?.accessibilityScore || 0} size="sm" />
              </div>
            </div>

            {/* Key stats */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                Key Stats
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Design Tokens" value={totalTokens} />
                <StatCard label="Components" value={totalComponents} />
                <StatCard label="Font Families" value={totalFonts} />
                <StatCard label="CTAs Found" value={ctaCount} />
              </div>
            </div>

            {/* WCAG Level */}
            {accessibility && (
              <div className="rounded-xl border border-dark-3/30 bg-dark-2/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">WCAG Compliance</span>
                  <span
                    className={`
                      rounded-full px-2.5 py-0.5 text-xs font-bold
                      ${
                        accessibility.wcagLevel === 'AAA'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : accessibility.wcagLevel === 'AA'
                          ? 'bg-blue-500/15 text-blue-400'
                          : accessibility.wcagLevel === 'A'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                      }
                    `}
                  >
                    {accessibility.wcagLevel}
                  </span>
                </div>
                {accessibility.contrastIssues.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-gray-600">
                    {accessibility.contrastIssues.length} contrast issue{accessibility.contrastIssues.length !== 1 ? 's' : ''} detected
                  </p>
                )}
              </div>
            )}

            {/* Lighthouse metrics */}
            {lighthouse && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
                  Core Web Vitals
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <MetricCard label="LCP" value={`${(lighthouse.lcp / 1000).toFixed(1)}s`} good={lighthouse.lcp < 2500} />
                  <MetricCard label="CLS" value={lighthouse.cls.toFixed(3)} good={lighthouse.cls < 0.1} />
                  <MetricCard label="INP" value={`${lighthouse.inp}ms`} good={lighthouse.inp < 200} />
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'tokens' && <TokenPreview tokens={tokens} />}
        {activeTab === 'components' && <ComponentGallery components={components} />}

        {activeTab === 'accessibility' && accessibility && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="Overall Score" value={accessibility.overallScore} />
              <StatCard label="Contrast Issues" value={accessibility.contrastIssues.length} />
              <StatCard label="Missing Alt Text" value={accessibility.missingAltText.length} />
              <StatCard label="Missing ARIA" value={accessibility.missingAriaLabels.length} />
            </div>
            {accessibility.semanticIssues.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Semantic Issues</h4>
                <div className="space-y-1">
                  {accessibility.semanticIssues.slice(0, 10).map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-400">
                      <span className="text-amber-400 mt-0.5">-</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {accessibility.tabOrderIssues.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Tab Order Issues</h4>
                <div className="space-y-1">
                  {accessibility.tabOrderIssues.slice(0, 10).map((issue, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[10px] text-gray-400">
                      <span className="text-red-400 mt-0.5">-</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'performance' && lighthouse && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <MetricCard label="Perf Score" value={`${lighthouse.performanceScore}`} good={lighthouse.performanceScore >= 80} />
              <MetricCard label="LCP" value={`${(lighthouse.lcp / 1000).toFixed(1)}s`} good={lighthouse.lcp < 2500} />
              <MetricCard label="CLS" value={lighthouse.cls.toFixed(3)} good={lighthouse.cls < 0.1} />
              <MetricCard label="INP" value={`${lighthouse.inp}ms`} good={lighthouse.inp < 200} />
              <MetricCard label="FCP" value={`${(lighthouse.fcp / 1000).toFixed(1)}s`} good={lighthouse.fcp < 1800} />
              <MetricCard label="SI" value={`${(lighthouse.speedIndex / 1000).toFixed(1)}s`} good={lighthouse.speedIndex < 3400} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2">Total Blocking Time</h4>
              <div className={`rounded-lg border p-2.5 ${lighthouse.totalBlockingTime < 200 ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <p className={`text-lg font-bold tabular-nums ${lighthouse.totalBlockingTime < 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {lighthouse.totalBlockingTime}ms
                </p>
                <p className="text-[10px] text-gray-500">Target: &lt; 200ms</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'interactions' && animations && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="CSS Transitions" value={animations.cssTransitions.length} />
              <StatCard label="CSS Animations" value={animations.cssAnimations.length} />
              <StatCard label="Scroll Triggers" value={animations.scrollTriggered.length} />
            </div>
            {animations.cssTransitions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Transitions</h4>
                <div className="space-y-1">
                  {animations.cssTransitions.slice(0, 8).map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-dark-2/30 border border-dark-3/20 px-2.5 py-1.5">
                      <span className="text-[10px] text-gray-400 font-mono truncate max-w-[120px]">{t.property}</span>
                      <span className="text-[9px] text-gray-500">{t.duration} {t.easing}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {animations.cssAnimations.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Keyframe Animations</h4>
                <div className="space-y-1">
                  {animations.cssAnimations.slice(0, 6).map((a, i) => (
                    <div key={i} className="rounded-lg bg-dark-2/30 border border-dark-3/20 px-2.5 py-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-brand-400 font-mono">{a.name}</span>
                        <span className="text-[9px] text-gray-500">{a.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'copy' && copyData && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <StatCard label="CTAs" value={conversion?.ctas.length || 0} />
              <StatCard label="Error Messages" value={copyData.errorMessages.length} />
              <StatCard label="Placeholders" value={copyData.placeholders.length} />
              <StatCard label="Microcopy" value={copyData.microcopy.length} />
            </div>
            {copyData.toneKeywords.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">Tone Keywords</h4>
                <div className="flex flex-wrap gap-1">
                  {copyData.toneKeywords.map((kw, i) => (
                    <span key={i} className="rounded-full bg-brand-500/10 border border-brand-500/20 px-2 py-0.5 text-[9px] text-brand-400">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {conversion?.ctas && conversion.ctas.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">CTA Labels</h4>
                <div className="space-y-1">
                  {conversion.ctas.slice(0, 10).map((cta, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-dark-2/30 border border-dark-3/20 px-2.5 py-1.5">
                      <span className="text-[10px] text-gray-300 font-medium">{cta.text}</span>
                      <span className="text-[9px] text-gray-600">{cta.position}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'critique' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <svg className="h-8 w-8 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
            <p className="text-xs text-gray-400 mb-3">
              Use the Critique tab in the sidebar for a full AI design critique.
            </p>
            <button
              onClick={() => handleQuickAction(MSG.CRITIQUE_DESIGN)}
              disabled={runningAction === MSG.CRITIQUE_DESIGN}
              className="rounded-lg bg-brand-500/20 px-4 py-2 text-xs font-medium text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
            >
              {runningAction === MSG.CRITIQUE_DESIGN ? 'Generating...' : 'Generate Critique'}
            </button>
          </div>
        )}

        {activeTab === 'export' && <ExportActions />}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-lg border border-dark-3/30 bg-dark-2/50 p-3">
    <p className="text-lg font-bold text-gray-200 tabular-nums">{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; good: boolean }> = ({ label, value, good }) => (
  <div className={`rounded-lg border p-2.5 ${good ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
    <p className={`text-sm font-bold tabular-nums ${good ? 'text-emerald-400' : 'text-amber-400'}`}>{value}</p>
    <p className="text-[10px] text-gray-500">{label}</p>
  </div>
);
