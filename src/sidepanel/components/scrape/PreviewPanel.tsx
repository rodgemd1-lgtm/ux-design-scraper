import React, { useState } from 'react';
import { useStore } from '../../store';
import type { DesignTokens, TypographySystem, ScreenshotData } from '@shared/types';

type PreviewTab = 'tokens' | 'typography' | 'screenshots';

export const PreviewPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PreviewTab>('tokens');
  const steps = useStore((s) => s.steps);

  const designTokens = steps['design-tokens']?.data as DesignTokens | undefined;
  const typography = steps['typography']?.data as TypographySystem | undefined;

  const screenshotStepIds = ['screenshots-375', 'screenshots-768', 'screenshots-1280', 'screenshots-1920'];
  const screenshots = screenshotStepIds
    .map((id) => steps[id]?.data as ScreenshotData | undefined)
    .filter((s): s is ScreenshotData => !!s);

  const tabs: { id: PreviewTab; label: string; count?: number }[] = [
    { id: 'tokens', label: 'Tokens', count: designTokens ? designTokens.colors.length : 0 },
    { id: 'typography', label: 'Type', count: typography ? typography.fontFamilies.length : 0 },
    { id: 'screenshots', label: 'Screens', count: screenshots.length },
  ];

  return (
    <div className="border-t border-dark-3/50 bg-dark-1/50">
      {/* Tab switcher */}
      <div className="flex border-b border-dark-3/30 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-3 py-2 text-[11px] font-medium transition-colors relative
              ${activeTab === tab.id ? 'text-brand-400' : 'text-gray-500 hover:text-gray-300'}
            `}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1 text-[9px] text-gray-600">({tab.count})</span>
            )}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-48 overflow-y-auto scrollbar-thin p-3">
        {activeTab === 'tokens' && (
          <TokensPreview tokens={designTokens} />
        )}
        {activeTab === 'typography' && (
          <TypographyPreview typography={typography} />
        )}
        {activeTab === 'screenshots' && (
          <ScreenshotsPreview screenshots={screenshots} />
        )}
      </div>
    </div>
  );
};

const TokensPreview: React.FC<{ tokens?: DesignTokens }> = ({ tokens }) => {
  if (!tokens || tokens.colors.length === 0) {
    return <EmptyPreview label="Color tokens will appear here as they are extracted." />;
  }

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
        Colors ({tokens.colors.length})
      </p>
      <div className="flex flex-wrap gap-1.5">
        {tokens.colors.slice(0, 32).map((token, idx) => (
          <div key={idx} className="group relative">
            <div
              className="h-7 w-7 rounded-md border border-dark-3/30 transition-transform hover:scale-110 cursor-pointer"
              style={{ backgroundColor: token.value }}
              title={`${token.value} (${token.count}x)`}
            />
            <div className="
              absolute -top-8 left-1/2 -translate-x-1/2 px-1.5 py-0.5
              rounded bg-dark-0 border border-dark-3 text-[9px] text-gray-300
              opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none
              whitespace-nowrap z-10
            ">
              {token.value}
            </div>
          </div>
        ))}
      </div>

      {tokens.shadows.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-2">
            Shadows ({tokens.shadows.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {tokens.shadows.slice(0, 8).map((shadow, idx) => (
              <div
                key={idx}
                className="h-10 w-10 rounded-lg bg-dark-2"
                style={{ boxShadow: shadow.value }}
                title={shadow.value}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TypographyPreview: React.FC<{ typography?: TypographySystem }> = ({ typography }) => {
  if (!typography || typography.fontFamilies.length === 0) {
    return <EmptyPreview label="Typography data will appear here as it is extracted." />;
  }

  return (
    <div className="space-y-3">
      {/* Font families */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
          Fonts
        </p>
        {typography.fontFamilies.slice(0, 6).map((f, idx) => (
          <div key={idx} className="flex items-baseline justify-between py-1">
            <span
              className="text-sm text-gray-200 truncate"
              style={{ fontFamily: f.family }}
            >
              {f.family}
            </span>
            <span className="text-[10px] text-gray-600 flex-shrink-0 ml-2">
              {f.count}x
            </span>
          </div>
        ))}
      </div>

      {/* Font sizes scale */}
      <div>
        <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1.5">
          Scale
        </p>
        <div className="flex flex-wrap gap-2">
          {typography.fontSizes.slice(0, 10).map((fs, idx) => (
            <div
              key={idx}
              className="rounded bg-dark-2 px-2 py-1 text-gray-300"
              style={{ fontSize: fs.size }}
              title={`${fs.size} (${fs.count}x)`}
            >
              Aa
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ScreenshotsPreview: React.FC<{ screenshots: ScreenshotData[] }> = ({ screenshots }) => {
  if (screenshots.length === 0) {
    return <EmptyPreview label="Screenshots will appear here as they are captured." />;
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {screenshots.map((ss, idx) => (
        <div key={idx} className="group relative">
          <img
            src={ss.dataUrl}
            alt={`Screenshot ${ss.breakpoint}px`}
            className="w-full rounded-md border border-dark-3/30 object-cover object-top"
            style={{ maxHeight: '120px' }}
          />
          <div className="
            absolute bottom-1 left-1 rounded bg-dark-0/80 px-1.5 py-0.5
            text-[9px] text-gray-300 backdrop-blur-sm
          ">
            {ss.breakpoint}px
          </div>
        </div>
      ))}
    </div>
  );
};

const EmptyPreview: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center justify-center py-6">
    <p className="text-xs text-gray-600 text-center">{label}</p>
  </div>
);
