import React, { useState } from 'react';
import type { DesignTokens } from '@shared/types';

interface TokenPreviewProps {
  tokens: DesignTokens | null;
}

type TokenTab = 'colors' | 'spacing' | 'shadows' | 'radii';

export const TokenPreview: React.FC<TokenPreviewProps> = ({ tokens }) => {
  const [activeTab, setActiveTab] = useState<TokenTab>('colors');

  if (!tokens) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs text-gray-600">No design tokens available.</p>
      </div>
    );
  }

  const tabs: { id: TokenTab; label: string; count: number }[] = [
    { id: 'colors', label: 'Colors', count: tokens.colors.length },
    { id: 'spacing', label: 'Spacing', count: tokens.spacing.length },
    { id: 'shadows', label: 'Shadows', count: tokens.shadows.length },
    { id: 'radii', label: 'Radii', count: tokens.borderRadii.length },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors
              ${
                activeTab === tab.id
                  ? 'bg-brand-500/15 text-brand-400'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2'
              }
            `}
          >
            {tab.label}
            <span className="ml-1 text-[9px] text-gray-600">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'colors' && (
        <div className="grid grid-cols-5 gap-2">
          {tokens.colors.map((token, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1">
              <div
                className="h-10 w-full rounded-lg border border-dark-3/30 transition-transform hover:scale-105"
                style={{ backgroundColor: token.value }}
              />
              <span className="text-[9px] text-gray-500 truncate w-full text-center font-mono">
                {token.value}
              </span>
              <span className="text-[8px] text-gray-600">{token.count}x</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'spacing' && (
        <div className="space-y-2">
          {tokens.spacing.map((token, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div
                className="h-4 rounded-sm bg-brand-500/30 flex-shrink-0"
                style={{ width: `${Math.min(parseInt(token.value) || 8, 200)}px` }}
              />
              <span className="text-xs text-gray-400 font-mono">{token.value}</span>
              <span className="text-[10px] text-gray-600">{token.count}x</span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'shadows' && (
        <div className="grid grid-cols-3 gap-3">
          {tokens.shadows.map((token, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className="h-14 w-full rounded-lg bg-dark-2"
                style={{ boxShadow: token.value }}
              />
              <span className="text-[9px] text-gray-500 truncate w-full text-center font-mono">
                {token.count}x
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'radii' && (
        <div className="grid grid-cols-4 gap-3">
          {tokens.borderRadii.map((token, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5">
              <div
                className="h-12 w-12 border-2 border-brand-500/40 bg-brand-500/10"
                style={{ borderRadius: token.value }}
              />
              <span className="text-[9px] text-gray-500 font-mono">{token.value}</span>
              <span className="text-[8px] text-gray-600">{token.count}x</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
