import React from 'react';

interface SuggestionChipsProps {
  onSelect: (text: string) => void;
}

const suggestions = [
  'Scrape this page',
  'Find luxury designs',
  'Analyze onboarding flow',
  'Compare competitors',
  'Extract design tokens',
];

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2">
      {suggestions.map((text) => (
        <button
          key={text}
          onClick={() => onSelect(text)}
          className="
            rounded-full border border-dark-3/70 bg-dark-2/50 px-3 py-1.5
            text-xs text-gray-400 transition-all duration-200
            hover:border-brand-500/40 hover:bg-brand-500/10 hover:text-brand-300
            active:scale-95
          "
        >
          {text}
        </button>
      ))}
    </div>
  );
};
