import type { StateCreator } from 'zustand';
import type { ScrapeStepStatus } from '@shared/types';

export interface StepState {
  status: ScrapeStepStatus;
  progress: number;
  data: unknown;
  duration?: number;
  error?: string;
}

export interface ScrapeSlice {
  steps: Record<string, StepState>;
  isRunning: boolean;
  currentUrl: string;
  startScrape: (url: string, stepIds: string[]) => void;
  updateStep: (stepId: string, update: Partial<StepState>) => void;
  completeScrape: () => void;
  reset: () => void;
}

export const createScrapeSlice: StateCreator<ScrapeSlice, [], [], ScrapeSlice> = (set) => ({
  steps: {},
  isRunning: false,
  currentUrl: '',

  startScrape: (url, stepIds) => {
    const initial: Record<string, StepState> = {};
    for (const id of stepIds) {
      initial[id] = { status: 'pending', progress: 0, data: null };
    }
    set({ steps: initial, isRunning: true, currentUrl: url });
  },

  updateStep: (stepId, update) =>
    set((state) => ({
      steps: {
        ...state.steps,
        [stepId]: {
          ...state.steps[stepId],
          ...update,
        } as StepState,
      },
    })),

  completeScrape: () => set({ isRunning: false }),

  reset: () => set({ steps: {}, isRunning: false, currentUrl: '' }),
});
