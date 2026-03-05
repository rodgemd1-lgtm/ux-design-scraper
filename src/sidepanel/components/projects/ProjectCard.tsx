import React from 'react';
import type { Project } from '../../store/slices/project-slice';

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
  isActive: boolean;
}

const statusConfig: Record<Project['status'], { label: string; color: string; dot: string }> = {
  pending: { label: 'Pending', color: 'text-gray-500', dot: 'bg-gray-500' },
  scraping: { label: 'Scraping', color: 'text-brand-400', dot: 'bg-brand-500 animate-pulse' },
  complete: { label: 'Complete', color: 'text-emerald-400', dot: 'bg-emerald-500' },
  error: { label: 'Error', color: 'text-red-400', dot: 'bg-red-500' },
};

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onClick, isActive }) => {
  const status = statusConfig[project.status];
  const date = new Date(project.createdAt);
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left rounded-xl border p-3 transition-all duration-200
        ${
          isActive
            ? 'border-brand-500/40 bg-brand-500/5 glow-brand'
            : 'border-dark-3/30 bg-dark-2/50 hover:border-dark-3 hover:bg-dark-2'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-xs font-semibold text-gray-200 truncate">
            {project.name}
          </h4>
          <p className="mt-0.5 text-[10px] text-gray-500 truncate">{project.url}</p>
        </div>

        {project.compositeScore !== undefined && (
          <div className="flex-shrink-0 rounded-md bg-dark-0 px-2 py-1 text-center">
            <span className="text-sm font-bold text-brand-400 tabular-nums">
              {Math.round(project.compositeScore)}
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          <span className={`text-[10px] font-medium ${status.color}`}>{status.label}</span>
        </div>
        <span className="text-[10px] text-gray-600">{dateStr} {timeStr}</span>
      </div>

      {project.stepsCompleted !== undefined && project.totalSteps !== undefined && project.status === 'scraping' && (
        <div className="mt-2">
          <div className="h-1 overflow-hidden rounded-full bg-dark-3/50">
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500"
              style={{ width: `${(project.stepsCompleted / project.totalSteps) * 100}%` }}
            />
          </div>
          <p className="mt-0.5 text-[9px] text-gray-600">
            {project.stepsCompleted} / {project.totalSteps} steps
          </p>
        </div>
      )}
    </button>
  );
};
