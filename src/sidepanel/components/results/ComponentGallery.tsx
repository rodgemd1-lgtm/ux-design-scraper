import React, { useState } from 'react';
import type { ComponentData } from '@shared/types';

interface ComponentGalleryProps {
  components: ComponentData[];
}

const typeBadgeColors: Record<string, string> = {
  button: 'bg-blue-500/15 text-blue-400',
  card: 'bg-purple-500/15 text-purple-400',
  form: 'bg-amber-500/15 text-amber-400',
  input: 'bg-cyan-500/15 text-cyan-400',
  nav: 'bg-emerald-500/15 text-emerald-400',
  header: 'bg-emerald-500/15 text-emerald-400',
  footer: 'bg-emerald-500/15 text-emerald-400',
  hero: 'bg-pink-500/15 text-pink-400',
  modal: 'bg-orange-500/15 text-orange-400',
  table: 'bg-teal-500/15 text-teal-400',
  list: 'bg-indigo-500/15 text-indigo-400',
};

function getBadgeColor(type: string): string {
  return typeBadgeColors[type] || 'bg-gray-500/15 text-gray-400';
}

export const ComponentGallery: React.FC<ComponentGalleryProps> = ({ components }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [codeTab, setCodeTab] = useState<'html' | 'css'>('html');

  if (components.length === 0) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-xs text-gray-600">No components extracted yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {components.map((comp, idx) => {
        const isExpanded = expandedId === `${comp.name}-${idx}`;
        const compId = `${comp.name}-${idx}`;

        return (
          <div
            key={compId}
            className={`
              rounded-xl border transition-all duration-200
              ${isExpanded ? 'border-brand-500/30 bg-dark-1' : 'border-dark-3/30 bg-dark-2/50 hover:border-dark-3'}
            `}
          >
            <button
              onClick={() => setExpandedId(isExpanded ? null : compId)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              {/* Mini preview */}
              {comp.screenshot ? (
                <img
                  src={comp.screenshot}
                  alt={comp.name}
                  className="h-10 w-14 rounded border border-dark-3/30 object-cover flex-shrink-0"
                />
              ) : (
                <div className="flex h-10 w-14 items-center justify-center rounded border border-dark-3/30 bg-dark-0 flex-shrink-0">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                  </svg>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-200 truncate">
                    {comp.name}
                  </span>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${getBadgeColor(comp.type)}`}>
                    {comp.type}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-gray-600 truncate font-mono">
                  {comp.selector}
                </p>
              </div>

              <svg
                className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>

            {isExpanded && (
              <div className="border-t border-dark-3/30 px-3 py-3 animate-in">
                {/* Code tabs */}
                <div className="flex gap-1 mb-2">
                  <button
                    onClick={() => setCodeTab('html')}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      codeTab === 'html' ? 'bg-brand-500/15 text-brand-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    HTML
                  </button>
                  <button
                    onClick={() => setCodeTab('css')}
                    className={`rounded px-2 py-1 text-[10px] font-medium ${
                      codeTab === 'css' ? 'bg-brand-500/15 text-brand-400' : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    CSS
                  </button>
                </div>

                <pre className="max-h-48 overflow-auto scrollbar-thin rounded-lg bg-dark-0 border border-dark-3/30 p-3 text-[11px] text-gray-400 font-mono leading-relaxed">
                  {codeTab === 'html' ? comp.html : comp.css}
                </pre>

                {/* State variants */}
                {Object.keys(comp.stateVariants).length > 0 && (
                  <div className="mt-2">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500 mb-1">
                      State Variants
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(comp.stateVariants).map((state) => (
                        <span
                          key={state}
                          className="rounded-full bg-dark-3/30 px-2 py-0.5 text-[9px] text-gray-400"
                        >
                          :{state}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
