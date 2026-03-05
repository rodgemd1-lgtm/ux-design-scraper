import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { STORAGE_KEYS } from '@shared/constants';
import { createLogger } from '@shared/logger';
import type { Project } from '../store/slices/project-slice';

const log = createLogger('useProjects');

export function useProjects() {
  const projects = useStore((s) => s.projects);
  const setProjects = useStore((s) => s.setProjects);
  const addProject = useStore((s) => s.addProject);
  const currentProject = useStore((s) => s.currentProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);

  const [isLoading, setIsLoading] = useState(true);

  // Load projects from chrome.storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const result = await chrome.storage.local.get(STORAGE_KEYS.PROJECT_CACHE);
        const cached = result[STORAGE_KEYS.PROJECT_CACHE] as Project[] | undefined;
        if (cached && Array.isArray(cached)) {
          setProjects(cached);
          log.info(`Loaded ${cached.length} projects from cache`);
        }
      } catch (err) {
        log.error('Failed to load projects', err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [setProjects]);

  const saveProjectsToStorage = useCallback(async (projectList: Project[]) => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.PROJECT_CACHE]: projectList });
      log.debug('Projects saved to storage');
    } catch (err) {
      log.error('Failed to save projects to storage', err);
    }
  }, []);

  const createProject = useCallback(
    async (name: string, url: string) => {
      const project: Project = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        name,
        url,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        status: 'pending',
      };
      addProject(project);

      const updated = [project, ...projects];
      await saveProjectsToStorage(updated);

      return project;
    },
    [addProject, projects, saveProjectsToStorage]
  );

  const updateProject = useCallback(
    async (id: string, updates: Partial<Project>) => {
      const updated = projects.map((p) =>
        p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
      );
      setProjects(updated);
      await saveProjectsToStorage(updated);

      if (currentProject?.id === id) {
        const updatedProject = updated.find((p) => p.id === id);
        if (updatedProject) setCurrentProject(updatedProject);
      }
    },
    [projects, setProjects, saveProjectsToStorage, currentProject, setCurrentProject]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      const updated = projects.filter((p) => p.id !== id);
      setProjects(updated);
      await saveProjectsToStorage(updated);

      if (currentProject?.id === id) {
        setCurrentProject(null);
      }
    },
    [projects, setProjects, saveProjectsToStorage, currentProject, setCurrentProject]
  );

  return {
    projects,
    currentProject,
    isLoading,
    createProject,
    updateProject,
    deleteProject,
    setCurrentProject,
  };
}
