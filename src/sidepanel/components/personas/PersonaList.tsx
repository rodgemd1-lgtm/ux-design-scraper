import React, { useState, useRef, useCallback } from 'react';
import type { GeneratedPersona } from '@shared/types';
import { PersonaCard } from './PersonaCard';

interface PersonaListProps {
  personas: GeneratedPersona[];
  loading?: boolean;
}

export const PersonaList: React.FC<PersonaListProps> = ({ personas, loading = false }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleToggleExpand = useCallback(
    (index: number) => {
      setExpandedIndex((prev) => (prev === index ? null : index));
    },
    []
  );

  const scrollLeft = useCallback(() => {
    scrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' });
  }, []);

  const scrollRight = useCallback(() => {
    scrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' });
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-dark-3/30" />
          <div className="absolute inset-0 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-sm font-semibold text-gray-300">Generating Personas</h3>
        <p className="mt-1.5 text-xs text-gray-500">
          AI is creating user personas based on the scraped data...
        </p>
      </div>
    );
  }

  if (personas.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Personas Generated</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Generate AI personas based on your scraped data to understand your target users better.
        </p>
      </div>
    );
  }

  // If a card is expanded, show it in full view
  if (expandedIndex !== null) {
    return (
      <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Persona {expandedIndex + 1} of {personas.length}
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpandedIndex(Math.max(0, expandedIndex - 1))}
              disabled={expandedIndex === 0}
              className="p-1 rounded-md hover:bg-dark-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => setExpandedIndex(Math.min(personas.length - 1, expandedIndex + 1))}
              disabled={expandedIndex === personas.length - 1}
              className="p-1 rounded-md hover:bg-dark-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
        <PersonaCard
          persona={personas[expandedIndex]}
          index={expandedIndex}
          expanded
          onToggleExpand={() => handleToggleExpand(expandedIndex)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-3/30">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {personas.length} Persona{personas.length !== 1 ? 's' : ''}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={scrollLeft}
            className="p-1 rounded-md hover:bg-dark-2 transition-colors"
            title="Scroll left"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={scrollRight}
            className="p-1 rounded-md hover:bg-dark-2 transition-colors"
            title="Scroll right"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto scrollbar-thin p-4"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {personas.map((persona, i) => (
          <div key={i} style={{ scrollSnapAlign: 'start' }}>
            <PersonaCard
              persona={persona}
              index={i}
              onToggleExpand={() => handleToggleExpand(i)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
