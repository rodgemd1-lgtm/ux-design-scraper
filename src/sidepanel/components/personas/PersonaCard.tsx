import React, { useState } from 'react';
import type { GeneratedPersona, PersonaJourneyMap, JourneyStage } from '@shared/types';

interface PersonaCardProps {
  persona: GeneratedPersona;
  index: number;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

const AVATAR_COLORS = ['#5c7cfa', '#51cf66', '#fcc419', '#ff6b6b', '#cc5de8', '#20c997', '#ff922b', '#845ef7'];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function techDots(level: string): number {
  switch (level) {
    case 'expert': return 5;
    case 'high': return 4;
    case 'medium': return 3;
    case 'low': return 2;
    default: return 1;
  }
}

const JOURNEY_STAGES: (keyof PersonaJourneyMap)[] = ['discover', 'evaluate', 'convert', 'retain'];
const JOURNEY_LABELS: Record<string, string> = {
  discover: 'Discover',
  evaluate: 'Evaluate',
  convert: 'Convert',
  retain: 'Retain',
};
const JOURNEY_EMOJIS: Record<string, string> = {
  discover: '',
  evaluate: '',
  convert: '',
  retain: '',
};

export const PersonaCard: React.FC<PersonaCardProps> = ({
  persona,
  index,
  expanded = false,
  onToggleExpand,
}) => {
  const [showJourney, setShowJourney] = useState(false);
  const [activeStage, setActiveStage] = useState<keyof PersonaJourneyMap>('discover');
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const dots = techDots(persona.techSavviness);

  const stageData: JourneyStage = persona.journeyMap[activeStage];

  return (
    <div
      className={`rounded-xl border border-dark-3/30 bg-dark-1/80 backdrop-blur-sm overflow-hidden transition-all duration-300 animate-in ${
        expanded ? 'min-w-[320px]' : 'min-w-[260px] max-w-[280px]'
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-dark-2/30">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 16px ${color}30` }}
        >
          {getInitials(persona.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-200 truncate">{persona.name}</h4>
          <p className="text-[10px] text-gray-500">
            {persona.ageRange} / {persona.occupation}
          </p>
        </div>
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="flex-shrink-0 p-1 rounded-md hover:bg-dark-3/30 transition-colors"
          >
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d={expanded ? 'M6 18L18 6M6 6l12 12' : 'M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15'} />
            </svg>
          </button>
        )}
      </div>

      {/* Quote */}
      <div className="px-4 py-2 border-b border-dark-3/20">
        <p className="text-[11px] italic text-gray-400 leading-relaxed">
          &ldquo;{persona.quote}&rdquo;
        </p>
      </div>

      {/* Goals & Frustrations */}
      <div className="px-4 py-3 space-y-3">
        {/* Goals */}
        <div>
          <h5 className="text-[9px] uppercase tracking-wider font-semibold text-emerald-400/80 mb-1.5">
            Goals
          </h5>
          <div className="space-y-1">
            {persona.goals.slice(0, expanded ? undefined : 3).map((goal, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 leading-relaxed">{goal}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Frustrations */}
        <div>
          <h5 className="text-[9px] uppercase tracking-wider font-semibold text-red-400/80 mb-1.5">
            Frustrations
          </h5>
          <div className="space-y-1">
            {persona.frustrations.slice(0, expanded ? undefined : 3).map((f, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                <span className="text-[10px] text-gray-400 leading-relaxed">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tech savviness */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">
            Tech Savviness
          </span>
          <div className="flex items-center gap-1" title={persona.techSavviness}>
            {[1, 2, 3, 4, 5].map((d) => (
              <div
                key={d}
                className={`w-2 h-2 rounded-full transition-colors ${
                  d <= dots ? 'bg-brand-400' : 'bg-dark-3/50'
                }`}
              />
            ))}
          </div>
        </div>

        {expanded && (
          <>
            {/* Bio */}
            {persona.bio && (
              <div className="pt-2 border-t border-dark-3/20">
                <h5 className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 mb-1">Bio</h5>
                <p className="text-[10px] text-gray-400 leading-relaxed">{persona.bio}</p>
              </div>
            )}

            {/* Device preferences */}
            {persona.devicePreferences.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
                {persona.devicePreferences.map((d, i) => (
                  <span
                    key={i}
                    className="rounded-full bg-dark-3/30 border border-dark-3/30 px-2 py-0.5 text-[9px] text-gray-500"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}

            {/* Jobs to be done */}
            {persona.jobsToBeDone.length > 0 && (
              <div className="pt-2 border-t border-dark-3/20">
                <h5 className="text-[9px] uppercase tracking-wider font-semibold text-gray-500 mb-1.5">
                  Jobs to Be Done
                </h5>
                <div className="space-y-1">
                  {persona.jobsToBeDone.map((job, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <svg className="w-3 h-3 text-brand-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                      <span className="text-[10px] text-gray-400">{job}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Journey Map (horizontal stepper) */}
      <div className="border-t border-dark-3/20">
        <button
          onClick={() => setShowJourney(!showJourney)}
          className="w-full flex items-center justify-between px-4 py-2 hover:bg-dark-2/30 transition-colors"
        >
          <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-500">
            Journey Map
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${showJourney ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showJourney && (
          <div className="px-4 pb-3 animate-in">
            {/* Stage tabs */}
            <div className="flex gap-1 mb-3">
              {JOURNEY_STAGES.map((stage, si) => (
                <button
                  key={stage}
                  onClick={() => setActiveStage(stage)}
                  className={`relative flex-1 py-1.5 text-[9px] font-medium rounded-md transition-all ${
                    activeStage === stage
                      ? 'bg-brand-500/15 text-brand-400'
                      : 'text-gray-500 hover:text-gray-300 hover:bg-dark-2'
                  }`}
                >
                  {JOURNEY_LABELS[stage]}
                  {si < JOURNEY_STAGES.length - 1 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[4px] border-l-dark-3/30" />
                  )}
                </button>
              ))}
            </div>

            {/* Horizontal stepper line */}
            <div className="relative flex items-center justify-between mb-3">
              <div className="absolute left-0 right-0 h-0.5 bg-dark-3/30 top-1/2 -translate-y-1/2" />
              {JOURNEY_STAGES.map((stage, si) => (
                <div
                  key={stage}
                  className={`relative z-10 w-3 h-3 rounded-full border-2 transition-colors ${
                    activeStage === stage
                      ? 'bg-brand-500 border-brand-400'
                      : si <= JOURNEY_STAGES.indexOf(activeStage)
                      ? 'bg-brand-500/50 border-brand-400/50'
                      : 'bg-dark-3 border-dark-3'
                  }`}
                />
              ))}
            </div>

            {/* Stage content */}
            <div className="space-y-2 text-[10px]">
              {stageData.actions.length > 0 && (
                <div>
                  <span className="text-gray-500 font-semibold">Actions:</span>
                  <span className="text-gray-400 ml-1">{stageData.actions.join(', ')}</span>
                </div>
              )}
              {stageData.thoughts.length > 0 && (
                <div>
                  <span className="text-gray-500 font-semibold">Thinks:</span>
                  <span className="text-gray-400 ml-1 italic">{stageData.thoughts.join('; ')}</span>
                </div>
              )}
              {stageData.painPoints.length > 0 && (
                <div>
                  <span className="text-red-400/70 font-semibold">Pain points:</span>
                  <span className="text-gray-400 ml-1">{stageData.painPoints.join('; ')}</span>
                </div>
              )}
              {stageData.opportunities.length > 0 && (
                <div>
                  <span className="text-emerald-400/70 font-semibold">Opportunities:</span>
                  <span className="text-gray-400 ml-1">{stageData.opportunities.join('; ')}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
