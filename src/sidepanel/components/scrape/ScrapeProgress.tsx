import React from 'react';
import { useStore } from '../../store';
import { ScrapeStepCard } from './ScrapeStepCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface PipelineStep {
  id: string;
  name: string;
  wave: number;
}

const PIPELINE_STEPS: PipelineStep[] = [
  // Wave 1: Injection & Setup
  { id: 'inject', name: 'Content Script Injection', wave: 1 },

  // Wave 2: DOM-Based Extraction (parallel)
  { id: 'design-tokens', name: 'Design Tokens', wave: 2 },
  { id: 'typography', name: 'Typography System', wave: 2 },
  { id: 'icons', name: 'Icon Extraction', wave: 2 },
  { id: 'grid-layout', name: 'Grid & Layout', wave: 2 },
  { id: 'navigation', name: 'Navigation Structure', wave: 2 },
  { id: 'copy-analysis', name: 'Copy & Microcopy', wave: 2 },
  { id: 'accessibility', name: 'Accessibility Audit', wave: 2 },
  { id: 'third-party', name: 'Third-Party Stack', wave: 2 },
  { id: 'dark-mode', name: 'Dark Mode Detection', wave: 2 },
  { id: 'image-assets', name: 'Image Assets', wave: 2 },
  { id: 'conversion', name: 'Conversion Patterns', wave: 2 },

  // Wave 3: Interactive & CDP-based
  { id: 'components', name: 'Component Extraction', wave: 3 },
  { id: 'animations', name: 'Animation Analysis', wave: 3 },
  { id: 'scroll-behavior', name: 'Scroll Behavior', wave: 3 },
  { id: 'flow-analysis', name: 'User Flow Analysis', wave: 3 },

  // Wave 4: Screenshots
  { id: 'screenshots-375', name: 'Screenshot (375px)', wave: 4 },
  { id: 'screenshots-768', name: 'Screenshot (768px)', wave: 4 },
  { id: 'screenshots-1280', name: 'Screenshot (1280px)', wave: 4 },
  { id: 'screenshots-1920', name: 'Screenshot (1920px)', wave: 4 },

  // Wave 5: API & External Data
  { id: 'lighthouse', name: 'Lighthouse Audit', wave: 5 },
  { id: 'wayback', name: 'Wayback Snapshots', wave: 5 },
  { id: 'heatmaps', name: 'Heatmap Data', wave: 5 },
];

const WAVE_LABELS: Record<number, string> = {
  1: 'Setup',
  2: 'DOM Extraction',
  3: 'Interactive Analysis',
  4: 'Screenshots',
  5: 'External Data',
};

export const ScrapeProgress: React.FC = () => {
  const steps = useStore((s) => s.steps);
  const isRunning = useStore((s) => s.isRunning);
  const currentUrl = useStore((s) => s.currentUrl);

  const totalSteps = PIPELINE_STEPS.length;
  const completedSteps = PIPELINE_STEPS.filter(
    (s) => steps[s.id]?.status === 'complete'
  ).length;
  const errorSteps = PIPELINE_STEPS.filter(
    (s) => steps[s.id]?.status === 'error'
  ).length;
  const overallProgress = totalSteps > 0 ? ((completedSteps + errorSteps) / totalSteps) * 100 : 0;

  const waves = Array.from(new Set(PIPELINE_STEPS.map((s) => s.wave))).sort();

  if (!isRunning && Object.keys(steps).length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Active Scrape</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Navigate to a website and start a scrape from the Chat tab, or use the suggestion chips to begin.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-dark-3/50 bg-dark-0/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-gray-200">Scrape Pipeline</h2>
            {currentUrl && (
              <p className="mt-0.5 truncate text-[11px] text-gray-500">{currentUrl}</p>
            )}
          </div>
          {isRunning && <LoadingSpinner size="sm" />}
        </div>

        {/* Overall progress bar */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
            <span>{completedSteps} of {totalSteps} steps</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-dark-3/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {errorSteps > 0 && (
          <p className="mt-1.5 text-[10px] text-red-400">
            {errorSteps} step{errorSteps > 1 ? 's' : ''} failed
          </p>
        )}
      </div>

      {/* Steps by wave */}
      <div className="px-3 py-3 space-y-4">
        {waves.map((wave) => {
          const waveSteps = PIPELINE_STEPS.filter((s) => s.wave === wave);
          return (
            <div key={wave}>
              <div className="flex items-center gap-2 mb-2 px-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
                  Wave {wave}
                </span>
                <span className="text-[10px] text-gray-600">{WAVE_LABELS[wave]}</span>
                <div className="flex-1 h-px bg-dark-3/30" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {waveSteps.map((step) => {
                  const state = steps[step.id];
                  return (
                    <ScrapeStepCard
                      key={step.id}
                      stepId={step.id}
                      name={step.name}
                      status={state?.status ?? 'pending'}
                      progress={state?.progress ?? 0}
                      duration={state?.duration}
                      error={state?.error}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
