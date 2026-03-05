import React, { useState } from 'react';
import type { PhaseState, PhaseStep, PhaseStatus } from '@shared/workflow-types';
import { ArtifactPreview } from './ArtifactPreview';

interface PhaseDetailProps {
  phase: PhaseState;
  stepProgress: Record<string, number>;
  onApprove: (notes?: string) => void;
  onReject: (notes: string) => void;
  onRerun: () => void;
  onPause: () => void;
  onRun: () => void;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

const STEP_STATUS_CONFIG: Record<PhaseStatus, { icon: React.ReactNode; color: string; bg: string }> = {
  pending: {
    icon: (
      <div className="h-3.5 w-3.5 rounded-full border border-gray-600" />
    ),
    color: 'text-gray-500',
    bg: 'bg-gray-600/20',
  },
  active: {
    icon: (
      <div className="h-3.5 w-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
    ),
    color: 'text-brand-400',
    bg: 'bg-brand-500/20',
  },
  reviewing: {
    icon: (
      <svg className="h-3.5 w-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
    color: 'text-amber-400',
    bg: 'bg-amber-500/20',
  },
  approved: {
    icon: (
      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  completed: {
    icon: (
      <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
  },
  failed: {
    icon: (
      <svg className="h-3.5 w-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
    ),
    color: 'text-red-400',
    bg: 'bg-red-500/20',
  },
  skipped: {
    icon: (
      <svg className="h-3.5 w-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
      </svg>
    ),
    color: 'text-gray-600',
    bg: 'bg-gray-700/20',
  },
};

const StepRow: React.FC<{ step: PhaseStep; overrideProgress?: number }> = ({ step, overrideProgress }) => {
  const config = STEP_STATUS_CONFIG[step.status];
  const progress = overrideProgress ?? step.progress;
  const duration = step.completedAt && step.startedAt ? step.completedAt - step.startedAt : null;

  return (
    <div className="flex items-start gap-2.5 py-2 px-3 rounded-lg hover:bg-dark-2/30 transition-colors">
      <div className="flex-shrink-0 mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium ${config.color}`}>{step.name}</span>
          {duration !== null && (
            <span className="text-[9px] text-gray-600 tabular-nums flex-shrink-0">
              {formatDuration(duration)}
            </span>
          )}
        </div>
        {step.status === 'active' && (
          <div className="mt-1.5">
            <div className="h-1 overflow-hidden rounded-full bg-dark-3/40">
              <div
                className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[9px] text-gray-600 mt-0.5 block">{Math.round(progress)}%</span>
          </div>
        )}
        {step.error && (
          <p className="text-[10px] text-red-400 mt-1 leading-relaxed">{step.error}</p>
        )}
      </div>
    </div>
  );
};

export const PhaseDetail: React.FC<PhaseDetailProps> = ({
  phase,
  stepProgress,
  onApprove,
  onReject,
  onRerun,
  onPause,
  onRun,
}) => {
  const [showArtifacts, setShowArtifacts] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const completedSteps = phase.steps.filter(
    (s) => s.status === 'completed' || s.status === 'approved'
  ).length;
  const totalSteps = phase.steps.length;
  const overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const artifactKeys = Object.keys(phase.artifacts).filter(
    (k) => phase.artifacts[k] !== undefined && phase.artifacts[k] !== null
  );
  const hasArtifacts = artifactKeys.length > 0;

  const bbLabel =
    phase.blackBox === 1 ? 'Black Box 1' :
    phase.blackBox === 2 ? 'Black Box 2' :
    phase.blackBox === 'gate' ? 'Gate Checkpoint' :
    'Post-Ship';

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Phase Header */}
      <div className="px-4 py-3 border-b border-dark-3/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest font-semibold text-gray-600">
              {bbLabel}
            </span>
            <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
              phase.status === 'active' ? 'bg-brand-500/20 text-brand-400' :
              phase.status === 'completed' || phase.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
              phase.status === 'reviewing' ? 'bg-amber-500/20 text-amber-400' :
              phase.status === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-dark-3/30 text-gray-600'
            }`}>
              {phase.status}
            </span>
          </div>
        </div>
        <h2 className="text-sm font-semibold text-gray-200">{phase.name}</h2>
        <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{phase.description}</p>

        {/* Phase progress bar */}
        {totalSteps > 0 && (
          <div className="mt-2.5">
            <div className="flex items-center justify-between text-[9px] text-gray-600 mb-1">
              <span>{completedSteps} of {totalSteps} steps</span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-dark-3/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Steps List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="px-1 py-2">
          <div className="flex items-center gap-2 px-3 mb-1">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">
              Steps
            </span>
            <div className="flex-1 h-px bg-dark-3/30" />
          </div>
          {phase.steps.map((step) => (
            <StepRow
              key={step.id}
              step={step}
              overrideProgress={stepProgress[step.id]}
            />
          ))}
        </div>

        {/* Artifacts Section */}
        {hasArtifacts && (
          <div className="px-3 py-2 border-t border-dark-3/20">
            <button
              onClick={() => setShowArtifacts(!showArtifacts)}
              className="flex items-center justify-between w-full px-1 py-1.5 text-left group"
            >
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-600">
                  Artifacts
                </span>
                <span className="rounded-full bg-brand-500/15 px-1.5 py-0.5 text-[8px] font-bold text-brand-400 tabular-nums">
                  {artifactKeys.length}
                </span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-200 ${showArtifacts ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showArtifacts && (
              <div className="mt-2 space-y-3">
                {artifactKeys.map((key) => (
                  <div key={key} className="rounded-lg bg-dark-2/50 border border-dark-3/30 p-3">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </h4>
                    <ArtifactPreview artifactKey={key} data={phase.artifacts[key]} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Review Notes Input (for reviewing status) */}
        {phase.status === 'reviewing' && (
          <div className="px-4 py-3 border-t border-dark-3/20">
            <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Review Notes
            </label>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="Add review notes or revision requests..."
              rows={3}
              className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none resize-none"
            />
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-dark-3/30 flex items-center gap-2 flex-shrink-0">
        {phase.status === 'pending' && (
          <button
            onClick={onRun}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-brand-500/20 px-3 py-2 text-xs font-medium text-brand-400 hover:bg-brand-500/30 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            Run Phase
          </button>
        )}
        {phase.status === 'active' && (
          <button
            onClick={onPause}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
            Pause
          </button>
        )}
        {(phase.status === 'completed' || phase.status === 'approved' || phase.status === 'failed') && (
          <button
            onClick={onRerun}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-dark-3/30 px-3 py-2 text-xs font-medium text-gray-400 hover:bg-dark-3/50 hover:text-gray-200 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Re-run Phase
          </button>
        )}
        {phase.status === 'reviewing' && (
          <>
            <button
              onClick={() => onReject(reviewNotes)}
              disabled={!reviewNotes.trim()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
              Request Revision
            </button>
            <button
              onClick={() => onApprove(reviewNotes || undefined)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Approve & Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
};
