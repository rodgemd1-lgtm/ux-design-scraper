import type { StateCreator } from 'zustand';
import type { WorkflowSession, WorkflowPhaseId, PhaseStatus } from '@shared/workflow-types';

export interface WorkflowSlice {
  workflowSession: WorkflowSession | null;
  isWorkflowActive: boolean;
  currentPhaseId: WorkflowPhaseId | null;
  phaseStepProgress: Record<string, number>;

  setWorkflowSession: (session: WorkflowSession | null) => void;
  updatePhaseStatus: (phaseId: WorkflowPhaseId, status: PhaseStatus) => void;
  updateStepProgress: (stepId: string, progress: number) => void;
  setCurrentPhase: (phaseId: WorkflowPhaseId) => void;
  clearWorkflow: () => void;
}

export const createWorkflowSlice: StateCreator<WorkflowSlice, [], [], WorkflowSlice> = (set) => ({
  workflowSession: null,
  isWorkflowActive: false,
  currentPhaseId: null,
  phaseStepProgress: {},

  setWorkflowSession: (session) => set({
    workflowSession: session,
    isWorkflowActive: session?.status === 'active',
    currentPhaseId: session?.currentPhase ?? null,
  }),

  updatePhaseStatus: (phaseId, status) => set((state) => {
    if (!state.workflowSession) return state;
    return {
      workflowSession: {
        ...state.workflowSession,
        phases: {
          ...state.workflowSession.phases,
          [phaseId]: { ...state.workflowSession.phases[phaseId], status },
        },
      },
    };
  }),

  updateStepProgress: (stepId, progress) => set((state) => ({
    phaseStepProgress: { ...state.phaseStepProgress, [stepId]: progress },
  })),

  setCurrentPhase: (phaseId) => set({ currentPhaseId: phaseId }),

  clearWorkflow: () => set({
    workflowSession: null,
    isWorkflowActive: false,
    currentPhaseId: null,
    phaseStepProgress: {},
  }),
});
