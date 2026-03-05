import React, { useState } from 'react';
import type { PhaseArtifacts } from '@shared/workflow-types';
import type { GateArtifacts, DefineArtifacts, DiscoverArtifacts } from '@shared/workflow-types';

interface GateReviewProps {
  discoverArtifacts: DiscoverArtifacts;
  defineArtifacts: DefineArtifacts;
  gateArtifacts: GateArtifacts;
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
}

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  accentColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, icon, children, accentColor = 'brand' }) => (
  <div className="rounded-lg bg-dark-2/60 border border-dark-3/30 p-3">
    <div className="flex items-center gap-2 mb-2">
      <div className={`flex h-5 w-5 items-center justify-center rounded-md bg-${accentColor}-500/15`}>
        {icon}
      </div>
      <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{title}</h4>
    </div>
    {children}
  </div>
);

export const GateReview: React.FC<GateReviewProps> = ({
  discoverArtifacts,
  defineArtifacts,
  gateArtifacts,
  onApprove,
  onReject,
}) => {
  const [notes, setNotes] = useState('');

  const qualityValidation = gateArtifacts.qualityValidation;
  const readinessScore = qualityValidation?.readinessScore ?? 0;

  const researchFindings = discoverArtifacts.researchSynthesis?.keyFindings?.length ?? 0;
  const personas = defineArtifacts.personas ?? [];
  const designBrief = defineArtifacts.designBrief;
  const a11y = defineArtifacts.accessibilityRequirements;

  const scoreColor =
    readinessScore >= 80 ? 'text-emerald-400' :
    readinessScore >= 60 ? 'text-amber-400' :
    'text-red-400';

  const scoreBg =
    readinessScore >= 80 ? 'bg-emerald-500' :
    readinessScore >= 60 ? 'bg-amber-500' :
    'bg-red-500';

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-3/30">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/15">
            <svg className="h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-200">Gate Review</h2>
            <p className="text-[10px] text-gray-500">Review BB1 outputs before entering Design Space</p>
          </div>
        </div>

        {/* Readiness Score */}
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between text-[9px] mb-1">
              <span className="text-gray-500 font-medium">Readiness</span>
              <span className={`font-bold tabular-nums ${scoreColor}`}>{readinessScore}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-dark-3/40">
              <div
                className={`h-full rounded-full ${scoreBg} transition-all duration-700 ease-out`}
                style={{ width: `${readinessScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* Warnings */}
        {qualityValidation?.warnings && qualityValidation.warnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {qualityValidation.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400/80">
                <svg className="w-3 h-3 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-2.5">
        {/* Research Findings */}
        <SummaryCard
          title="Research Findings"
          icon={
            <svg className="h-3 w-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
          }
        >
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-gray-200 tabular-nums">{researchFindings}</span>
            <span className="text-[10px] text-gray-500">key findings identified</span>
          </div>
          {discoverArtifacts.researchSynthesis?.keyFindings && (
            <ul className="mt-2 space-y-1">
              {discoverArtifacts.researchSynthesis.keyFindings.slice(0, 3).map((finding, i) => (
                <li key={i} className="text-[10px] text-gray-400 leading-relaxed flex items-start gap-1.5">
                  <span className="text-brand-500 mt-0.5 flex-shrink-0">--</span>
                  <span className="line-clamp-2">{finding}</span>
                </li>
              ))}
              {discoverArtifacts.researchSynthesis.keyFindings.length > 3 && (
                <li className="text-[9px] text-gray-600">
                  +{discoverArtifacts.researchSynthesis.keyFindings.length - 3} more findings
                </li>
              )}
            </ul>
          )}
        </SummaryCard>

        {/* Personas */}
        <SummaryCard
          title="Generated Personas"
          icon={
            <svg className="h-3 w-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          }
        >
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-lg font-bold text-gray-200 tabular-nums">{personas.length}</span>
            <span className="text-[10px] text-gray-500">personas created</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {personas.map((p, i) => (
              <span key={i} className="rounded-full bg-dark-3/40 px-2 py-0.5 text-[10px] text-gray-300 font-medium">
                {p.name}
              </span>
            ))}
          </div>
        </SummaryCard>

        {/* Design Brief */}
        {designBrief && (
          <SummaryCard
            title="Design Brief"
            icon={
              <svg className="h-3 w-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
          >
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <span className="text-[9px] text-gray-600 w-12 flex-shrink-0 uppercase font-semibold">Goal</span>
                <span className="text-[10px] text-gray-300 line-clamp-2">{designBrief.goal}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[9px] text-gray-600 w-12 flex-shrink-0 uppercase font-semibold">Scope</span>
                <span className="text-[10px] text-gray-300">{designBrief.scope.length} items</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[9px] text-gray-600 w-12 flex-shrink-0 uppercase font-semibold">KPIs</span>
                <span className="text-[10px] text-gray-300">{designBrief.successMetrics.length} success metrics</span>
              </div>
            </div>
          </SummaryCard>
        )}

        {/* Accessibility Requirements */}
        {a11y && (
          <SummaryCard
            title="Accessibility"
            icon={
              <svg className="h-3 w-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            }
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400">
                  WCAG {a11y.wcagLevel}
                </span>
                <span className="text-[10px] text-gray-500">compliance target</span>
              </div>
              <p className="text-[10px] text-gray-400">
                {a11y.specificNeeds.length} specific needs, {a11y.assistiveTechSupport.length} AT requirements
              </p>
            </div>
          </SummaryCard>
        )}

        {/* Quality Checks */}
        {gateArtifacts.reviewPackage?.qualityChecks && (
          <SummaryCard
            title="Quality Checks"
            icon={
              <svg className="h-3 w-3 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            }
          >
            <div className="space-y-1.5">
              {gateArtifacts.reviewPackage.qualityChecks.map((check, i) => (
                <div key={i} className="flex items-center gap-2">
                  {check.passed ? (
                    <svg className="w-3 h-3 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={`text-[10px] ${check.passed ? 'text-gray-300' : 'text-red-400'}`}>
                    {check.check}
                  </span>
                </div>
              ))}
            </div>
          </SummaryCard>
        )}

        {/* Notes */}
        <div className="pt-2">
          <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            Review Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add review notes, feedback, or revision requests..."
            rows={4}
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-dark-3/30 space-y-2 flex-shrink-0">
        <button
          onClick={() => onApprove(notes)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500/15 px-4 py-2.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/25 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Approve -- Enter Design Space (BB2)
        </button>
        <button
          onClick={() => onReject(notes)}
          disabled={!notes.trim()}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
          </svg>
          Reject -- Revise Research
        </button>
      </div>
    </div>
  );
};
