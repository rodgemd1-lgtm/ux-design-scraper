import React from 'react';
import type { WorkflowSession, WorkflowPhaseId, PhaseStatus } from '@shared/workflow-types';
import { PHASE_ORDER } from '@shared/workflow-constants';

interface PhaseTimelineProps {
  session: WorkflowSession;
  currentPhaseId: WorkflowPhaseId;
  onSelectPhase: (id: WorkflowPhaseId) => void;
}

const STATUS_STYLES: Record<PhaseStatus, { dot: string; text: string; ring: string }> = {
  pending: {
    dot: 'bg-gray-600',
    text: 'text-gray-600',
    ring: 'ring-gray-600/30',
  },
  active: {
    dot: 'bg-brand-500 animate-pulse',
    text: 'text-brand-400',
    ring: 'ring-brand-500/40',
  },
  reviewing: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    ring: 'ring-amber-500/40',
  },
  approved: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
  },
  completed: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/40',
  },
  failed: {
    dot: 'bg-red-500',
    text: 'text-red-400',
    ring: 'ring-red-500/40',
  },
  skipped: {
    dot: 'bg-gray-700',
    text: 'text-gray-600 line-through',
    ring: 'ring-gray-700/30',
  },
};

const PHASE_NUMBERS: Record<WorkflowPhaseId, string> = {
  discover: '01',
  define: '02',
  gate: '03',
  diverge: '04',
  develop: '05',
  deliver: '06',
  measure: '07',
};

const StatusIcon: React.FC<{ status: PhaseStatus; isGate: boolean }> = ({ status, isGate }) => {
  const styles = STATUS_STYLES[status];

  if (isGate) {
    const isLocked = status === 'pending' || status === 'active' || status === 'reviewing';
    return (
      <div className={`relative flex h-6 w-6 items-center justify-center rounded-md ring-2 ${styles.ring} ${styles.dot}`}>
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          {isLocked ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          )}
        </svg>
      </div>
    );
  }

  if (status === 'completed' || status === 'approved') {
    return (
      <div className={`flex h-5 w-5 items-center justify-center rounded-full ring-2 ${styles.ring} ${styles.dot}`}>
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className={`flex h-5 w-5 items-center justify-center rounded-full ring-2 ${styles.ring} ${styles.dot}`}>
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`h-5 w-5 rounded-full ring-2 ${styles.ring} ${styles.dot}`} />
  );
};

export const PhaseTimeline: React.FC<PhaseTimelineProps> = ({
  session,
  currentPhaseId,
  onSelectPhase,
}) => {
  const bb1Phases: WorkflowPhaseId[] = ['discover', 'define'];
  const gatePhase: WorkflowPhaseId = 'gate';
  const bb2Phases: WorkflowPhaseId[] = ['diverge', 'develop', 'deliver'];
  const measurePhase: WorkflowPhaseId = 'measure';

  const renderPhaseNode = (phaseId: WorkflowPhaseId) => {
    const phase = session.phases[phaseId];
    const isSelected = currentPhaseId === phaseId;
    const isGate = phaseId === 'gate';
    const styles = STATUS_STYLES[phase.status];

    return (
      <button
        key={phaseId}
        onClick={() => onSelectPhase(phaseId)}
        className={`
          flex flex-col items-center gap-1 px-1.5 py-1.5 rounded-lg transition-all duration-200 min-w-0
          ${isSelected ? 'bg-dark-3/50 ring-1 ring-brand-500/30' : 'hover:bg-dark-2/50'}
        `}
        title={`${phase.name} - ${phase.status}`}
      >
        <StatusIcon status={phase.status} isGate={isGate} />
        <span className={`text-[8px] font-bold tabular-nums ${styles.text}`}>
          {PHASE_NUMBERS[phaseId]}
        </span>
        <span className={`text-[9px] font-medium leading-tight text-center ${styles.text}`}>
          {phase.name}
        </span>
      </button>
    );
  };

  const renderConnector = (fromId: WorkflowPhaseId, toId: WorkflowPhaseId) => {
    const from = session.phases[fromId];
    const isCompleted = from.status === 'completed' || from.status === 'approved';
    return (
      <div
        className={`h-px flex-1 min-w-[4px] max-w-[12px] self-center mt-[-10px] transition-colors duration-300 ${
          isCompleted ? 'bg-emerald-500/50' : 'bg-dark-3/40'
        }`}
      />
    );
  };

  return (
    <div className="px-3 py-3 border-b border-dark-3/30">
      {/* BB Labels */}
      <div className="flex items-center justify-between mb-1.5 px-1">
        <span className="text-[8px] uppercase tracking-widest font-semibold text-gray-600">
          BB1 Research
        </span>
        <span className="text-[8px] uppercase tracking-widest font-semibold text-gray-600">
          BB2 Design
        </span>
      </div>

      {/* Timeline */}
      <div className="flex items-start justify-between gap-0">
        {/* BB1 Phases */}
        {bb1Phases.map((id, i) => (
          <React.Fragment key={id}>
            {renderPhaseNode(id)}
            {i < bb1Phases.length - 1 && renderConnector(bb1Phases[i], bb1Phases[i + 1])}
          </React.Fragment>
        ))}

        {renderConnector('define', 'gate')}

        {/* Gate */}
        {renderPhaseNode(gatePhase)}

        {renderConnector('gate', 'diverge')}

        {/* BB2 Phases */}
        {bb2Phases.map((id, i) => (
          <React.Fragment key={id}>
            {renderPhaseNode(id)}
            {i < bb2Phases.length - 1 && renderConnector(bb2Phases[i], bb2Phases[i + 1])}
          </React.Fragment>
        ))}

        {renderConnector('deliver', 'measure')}

        {/* Measure */}
        {renderPhaseNode(measurePhase)}
      </div>

      {/* Overall Progress */}
      <div className="mt-2 px-1">
        <div className="flex items-center justify-between text-[9px] text-gray-600 mb-1">
          <span>
            Phase {PHASE_ORDER.indexOf(session.currentPhase) + 1} of {PHASE_ORDER.length}
          </span>
          <span className="capitalize">{session.status}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-dark-3/40">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-700 ease-out"
            style={{
              width: `${((PHASE_ORDER.indexOf(session.currentPhase) + (session.phases[session.currentPhase].status === 'completed' || session.phases[session.currentPhase].status === 'approved' ? 1 : 0.5)) / PHASE_ORDER.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};
