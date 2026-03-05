import type { StateCreator } from 'zustand';

export interface Project {
  id: string;
  name: string;
  url: string;
  createdAt: number;
  updatedAt: number;
  status: 'pending' | 'scraping' | 'complete' | 'error';
  compositeScore?: number;
  stepsCompleted?: number;
  totalSteps?: number;
}

export interface ProjectSlice {
  projects: Project[];
  currentProject: Project | null;
  setProjects: (projects: Project[]) => void;
  addProject: (project: Project) => void;
  setCurrentProject: (project: Project | null) => void;
}

export const createProjectSlice: StateCreator<ProjectSlice, [], [], ProjectSlice> = (set) => ({
  projects: [],
  currentProject: null,

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  setCurrentProject: (project) => set({ currentProject: project }),
});
