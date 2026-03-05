import React, { useState, useCallback } from 'react';
import { MSG } from '@shared/message-types';

type ExportFormat =
  | 'claude-code'
  | 'figma-tokens'
  | 'storybook'
  | 'prototype'
  | 'moodboard'
  | 'competitive-report'
  | 'supabase'
  | 'image-prompts';

interface ExportFormatCard {
  id: ExportFormat;
  title: string;
  description: string;
  estimatedSize: string;
  icon: React.ReactNode;
  color: string;
}

type ExportStatus = 'idle' | 'exporting' | 'done' | 'error';

interface ExportPanelProps {
  hasData?: boolean;
  onExport?: (format: ExportFormat) => Promise<void>;
}

const exportFormats: ExportFormatCard[] = [
  {
    id: 'claude-code',
    title: 'Claude Code Package',
    description: 'Full Desktop folder with tokens, prompts, screenshots, and analysis',
    estimatedSize: '~5-15 MB',
    color: '#5c7cfa',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
      </svg>
    ),
  },
  {
    id: 'figma-tokens',
    title: 'Figma Tokens',
    description: 'Figma Tokens plugin compatible JSON with all design tokens',
    estimatedSize: '~50-200 KB',
    color: '#a259ff',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.354-3.019-3.019-3.019h-3.117V7.51zm0 .002"/>
        <path d="M8.148 24c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v4.49c0 2.476-2.014 4.49-4.588 4.49zm0-7.51a3.023 3.023 0 0 0-3.019 3.019 3.023 3.023 0 0 0 3.019 3.019c1.665 0 3.117-1.354 3.117-3.019v-3.019H8.148z"/>
        <path d="M8.148 15.02H3.56c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zm-4.588-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.019 3.019 3.019h3.117V7.51H3.56z"/>
        <path d="M8.148 8.981H3.56C1.084 8.981-.93 6.967-.93 4.49S1.084 0 3.56 0h4.588v8.981zM3.56 1.471c-1.665 0-3.019 1.354-3.019 3.019s1.354 3.019 3.019 3.019h3.117V1.471H3.56z"/>
        <path d="M15.852 15.02c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49 4.49 2.014 4.49 4.49-2.014 4.49-4.49 4.49zm0-7.51c-1.665 0-3.019 1.354-3.019 3.019s1.354 3.019 3.019 3.019 3.019-1.354 3.019-3.019-1.354-3.019-3.019-3.019z"/>
      </svg>
    ),
  },
  {
    id: 'storybook',
    title: 'Storybook Stories',
    description: 'Component stories for all reconstructed components',
    estimatedSize: '~100-500 KB',
    color: '#ff4785',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    id: 'prototype',
    title: 'Interactive Prototype',
    description: 'Self-contained HTML file with click navigation and responsive views',
    estimatedSize: '~200-800 KB',
    color: '#20c997',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0a4.5 4.5 0 0 1 .9-2.7L5.737 5.1a3.375 3.375 0 0 1 2.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 0 1 .9 2.7m0 0a3 3 0 0 1-3 3m0 3h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Zm-3 6h.008v.008h-.008v-.008Zm0-6h.008v.008h-.008v-.008Z" />
      </svg>
    ),
  },
  {
    id: 'moodboard',
    title: 'Moodboard',
    description: 'Visual moodboard with screenshots, colors, fonts, and prompts as HTML',
    estimatedSize: '~1-3 MB',
    color: '#fcc419',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 0 0 2.25-2.25V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
      </svg>
    ),
  },
  {
    id: 'competitive-report',
    title: 'Competitive Report',
    description: 'Markdown report with scores, SWOT, tech stack, and category winners',
    estimatedSize: '~20-80 KB',
    color: '#ff922b',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    id: 'supabase',
    title: 'Full Supabase Sync',
    description: 'Sync all scraped data, tokens, and analysis to your Supabase instance',
    estimatedSize: 'Cloud sync',
    color: '#3ECF8E',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
      </svg>
    ),
  },
  {
    id: 'image-prompts',
    title: 'Image Prompts',
    description: 'Midjourney, DALL-E, and Stable Diffusion prompts as markdown',
    estimatedSize: '~10-30 KB',
    color: '#cc5de8',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
  },
];

export const ExportPanel: React.FC<ExportPanelProps> = ({ hasData = false, onExport }) => {
  const [exportStatus, setExportStatus] = useState<Record<ExportFormat, ExportStatus>>({
    'claude-code': 'idle',
    'figma-tokens': 'idle',
    storybook: 'idle',
    prototype: 'idle',
    moodboard: 'idle',
    'competitive-report': 'idle',
    supabase: 'idle',
    'image-prompts': 'idle',
  });
  const [exportingAll, setExportingAll] = useState(false);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExportStatus((prev) => ({ ...prev, [format]: 'exporting' }));
      try {
        if (onExport) {
          await onExport(format);
        } else {
          // Default: send message to background
          await chrome.runtime.sendMessage({
            type: MSG.GENERATE_OUTPUT,
            payload: { format },
          });
        }
        setExportStatus((prev) => ({ ...prev, [format]: 'done' }));
        setTimeout(() => {
          setExportStatus((prev) => ({ ...prev, [format]: 'idle' }));
        }, 3000);
      } catch {
        setExportStatus((prev) => ({ ...prev, [format]: 'error' }));
        setTimeout(() => {
          setExportStatus((prev) => ({ ...prev, [format]: 'idle' }));
        }, 3000);
      }
    },
    [onExport]
  );

  const handleExportAll = useCallback(async () => {
    setExportingAll(true);
    for (const format of exportFormats) {
      await handleExport(format.id);
    }
    setExportingAll(false);
  }, [handleExport]);

  if (!hasData) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">Nothing to Export</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Complete a scrape session first to export design data in multiple formats.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-3/30">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Export Formats
        </h3>
        <button
          onClick={handleExportAll}
          disabled={exportingAll}
          className="flex items-center gap-1.5 rounded-lg bg-brand-500/20 px-3 py-1.5 text-[10px] font-medium text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-50"
        >
          {exportingAll ? (
            <div className="w-3 h-3 rounded-full border border-brand-400 border-t-transparent animate-spin" />
          ) : (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          )}
          Export All
        </button>
      </div>

      {/* Format cards grid */}
      <div className="px-4 py-4 space-y-3">
        {exportFormats.map((format, i) => {
          const status = exportStatus[format.id];
          return (
            <div
              key={format.id}
              className="rounded-xl border border-dark-3/30 bg-dark-1/80 backdrop-blur-sm overflow-hidden hover:border-dark-3/50 transition-all duration-200 animate-in"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex items-center gap-3 p-3">
                {/* Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0"
                  style={{ backgroundColor: `${format.color}15`, color: format.color }}
                >
                  {format.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-gray-200">{format.title}</h4>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">
                    {format.description}
                  </p>
                  <span className="text-[9px] text-gray-600 mt-0.5 inline-block">
                    {format.estimatedSize}
                  </span>
                </div>

                {/* Export button */}
                <button
                  onClick={() => handleExport(format.id)}
                  disabled={status === 'exporting'}
                  className={`flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 ${
                    status === 'done'
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : status === 'error'
                      ? 'bg-red-500/15 text-red-400'
                      : status === 'exporting'
                      ? 'bg-brand-500/15 text-brand-400'
                      : 'bg-dark-3/30 text-gray-400 hover:bg-dark-3/50 hover:text-gray-200'
                  }`}
                >
                  {status === 'exporting' ? (
                    <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : status === 'done' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : status === 'error' ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
