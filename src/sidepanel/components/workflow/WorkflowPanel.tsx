import React, { useState, useCallback } from 'react';
import { useStore } from '../../store';
import { MSG } from '@shared/message-types';
import type { WorkflowPhaseId } from '@shared/workflow-types';
import type { DiscoverArtifacts, DefineArtifacts, GateArtifacts } from '@shared/workflow-types';
import { WorkflowSetup } from './WorkflowSetup';
import { PhaseTimeline } from './PhaseTimeline';
import { PhaseDetail } from './PhaseDetail';
import { GateReview } from './GateReview';

export const WorkflowPanel: React.FC = () => {
  const workflowSession = useStore((s) => s.workflowSession);
  const currentPhaseId = useStore((s) => s.currentPhaseId);
  const phaseStepProgress = useStore((s) => s.phaseStepProgress);
  const setCurrentPhase = useStore((s) => s.setCurrentPhase);

  const [selectedPhaseId, setSelectedPhaseId] = useState<WorkflowPhaseId | null>(null);

  const viewingPhaseId = selectedPhaseId ?? currentPhaseId;

  const handleSelectPhase = useCallback((id: WorkflowPhaseId) => {
    setSelectedPhaseId(id);
    setCurrentPhase(id);
  }, [setCurrentPhase]);

  const handleApprove = useCallback((notes?: string) => {
    if (!workflowSession || !viewingPhaseId) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_APPROVE,
      payload: {
        sessionId: workflowSession.id,
        phaseId: viewingPhaseId,
        notes,
      },
    });
  }, [workflowSession, viewingPhaseId]);

  const handleReject = useCallback((notes: string) => {
    if (!workflowSession || !viewingPhaseId) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_REJECT,
      payload: {
        sessionId: workflowSession.id,
        phaseId: viewingPhaseId,
        notes,
      },
    });
  }, [workflowSession, viewingPhaseId]);

  const handleRerun = useCallback(() => {
    if (!workflowSession || !viewingPhaseId) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_START,
      payload: {
        sessionId: workflowSession.id,
        phaseId: viewingPhaseId,
      },
    });
  }, [workflowSession, viewingPhaseId]);

  const handlePause = useCallback(() => {
    if (!workflowSession) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PAUSE,
      payload: { sessionId: workflowSession.id },
    });
  }, [workflowSession]);

  const handleRun = useCallback(() => {
    if (!workflowSession || !viewingPhaseId) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_START,
      payload: {
        sessionId: workflowSession.id,
        phaseId: viewingPhaseId,
      },
    });
  }, [workflowSession, viewingPhaseId]);

  const handleGateApprove = useCallback((notes: string) => {
    if (!workflowSession) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_APPROVE,
      payload: {
        sessionId: workflowSession.id,
        phaseId: 'gate',
        notes,
      },
    });
  }, [workflowSession]);

  const handleGateReject = useCallback((notes: string) => {
    if (!workflowSession) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_PHASE_REJECT,
      payload: {
        sessionId: workflowSession.id,
        phaseId: 'gate',
        notes,
      },
    });
  }, [workflowSession]);

  const handleAbort = useCallback(() => {
    if (!workflowSession) return;
    chrome.runtime.sendMessage({
      type: MSG.WORKFLOW_ABORT,
      payload: { sessionId: workflowSession.id },
    });
  }, [workflowSession]);

  // No active session - show setup
  if (!workflowSession) {
    return <WorkflowSetup />;
  }

  const viewingPhase = viewingPhaseId ? workflowSession.phases[viewingPhaseId] : null;
  const isGateReviewing = viewingPhaseId === 'gate' && viewingPhase?.status === 'reviewing';

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Project Header */}
      <div className="px-4 py-2 border-b border-dark-3/30 flex items-center justify-between flex-shrink-0">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-gray-300 truncate">{workflowSession.projectName}</h2>
          <p className="text-[9px] text-gray-600 truncate">
            {workflowSession.targetUrls[0]}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {workflowSession.status === 'active' && (
            <span className="flex items-center gap-1 rounded-full bg-brand-500/15 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[9px] text-brand-400 font-medium">Active</span>
            </span>
          )}
          {workflowSession.status === 'paused' && (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              <span className="text-[9px] text-amber-400 font-medium">Paused</span>
            </span>
          )}
          {workflowSession.status === 'completed' && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] text-emerald-400 font-medium">Complete</span>
            </span>
          )}
          <button
            onClick={handleAbort}
            className="p-1 rounded-md hover:bg-red-500/10 transition-colors"
            title="Abort workflow"
          >
            <svg className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Phase Timeline */}
      <PhaseTimeline
        session={workflowSession}
        currentPhaseId={viewingPhaseId ?? workflowSession.currentPhase}
        onSelectPhase={handleSelectPhase}
      />

      {/* Phase Content */}
      <div className="flex flex-1 flex-col min-h-0">
        {isGateReviewing ? (
          <GateReview
            discoverArtifacts={workflowSession.phases.discover.artifacts as DiscoverArtifacts}
            defineArtifacts={workflowSession.phases.define.artifacts as DefineArtifacts}
            gateArtifacts={workflowSession.phases.gate.artifacts as GateArtifacts}
            onApprove={handleGateApprove}
            onReject={handleGateReject}
          />
        ) : viewingPhase ? (
          <PhaseDetail
            phase={viewingPhase}
            stepProgress={phaseStepProgress}
            onApprove={handleApprove}
            onReject={handleReject}
            onRerun={handleRerun}
            onPause={handlePause}
            onRun={handleRun}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-gray-500">Select a phase to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};
