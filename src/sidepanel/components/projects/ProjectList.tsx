import React from 'react';
import { useStore } from '../../store';
import { ProjectCard } from './ProjectCard';
import { useProjects } from '../../hooks/useProjects';

export const ProjectList: React.FC = () => {
  const projects = useStore((s) => s.projects);
  const currentProject = useStore((s) => s.currentProject);
  const setCurrentProject = useStore((s) => s.setCurrentProject);
  const { isLoading } = useProjects();

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 border-2 border-dark-3 border-t-brand-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-500">Loading projects...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
          <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
          </svg>
        </div>
        <h3 className="text-sm font-semibold text-gray-300">No Projects</h3>
        <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
          Completed scrape sessions will appear here. Start a scrape from the Chat tab.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 overflow-y-auto scrollbar-thin">
      <div className="sticky top-0 z-10 border-b border-dark-3/50 bg-dark-0/95 backdrop-blur-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Projects</h2>
          <span className="text-[10px] text-gray-600">{projects.length} total</span>
        </div>
      </div>
      <div className="px-3 py-3 space-y-2">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            isActive={currentProject?.id === project.id}
            onClick={() => setCurrentProject(project)}
          />
        ))}
      </div>
    </div>
  );
};
