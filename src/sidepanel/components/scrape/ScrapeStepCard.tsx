import React from 'react';
import type { ScrapeStepStatus } from '@shared/types';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ScrapeStepCardProps {
  name: string;
  stepId: string;
  status: ScrapeStepStatus;
  progress: number;
  duration?: number;
  error?: string;
}

const statusConfig: Record<ScrapeStepStatus, { color: string; bgColor: string; borderColor: string }> = {
  pending: { color: 'text-gray-500', bgColor: 'bg-dark-2/50', borderColor: 'border-dark-3/30' },
  running: { color: 'text-brand-400', bgColor: 'bg-brand-500/5', borderColor: 'border-brand-500/30' },
  complete: { color: 'text-emerald-400', bgColor: 'bg-emerald-500/5', borderColor: 'border-emerald-500/20' },
  error: { color: 'text-red-400', bgColor: 'bg-red-500/5', borderColor: 'border-red-500/20' },
  skipped: { color: 'text-gray-600', bgColor: 'bg-dark-2/30', borderColor: 'border-dark-3/20' },
};

const StatusIcon: React.FC<{ status: ScrapeStepStatus }> = ({ status }) => {
  switch (status) {
    case 'pending':
      return (
        <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="10" strokeDasharray="4 4" />
        </svg>
      );
    case 'running':
      return <LoadingSpinner size="sm" />;
    case 'complete':
      return (
        <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-3.5 h-3.5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      );
    case 'skipped':
      return (
        <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061A1.125 1.125 0 0 1 3 16.811V8.69ZM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 0 1 0 1.954l-7.108 4.061a1.125 1.125 0 0 1-1.683-.977V8.69Z" />
        </svg>
      );
  }
};

export const ScrapeStepCard: React.FC<ScrapeStepCardProps> = ({
  name,
  status,
  progress,
  duration,
  error,
}) => {
  const config = statusConfig[status];

  return (
    <div
      className={`
        rounded-lg border p-2.5 transition-all duration-300
        ${config.bgColor} ${config.borderColor}
        ${status === 'running' ? 'glow-brand' : ''}
      `}
      title={error || undefined}
    >
      <div className="flex items-center gap-2">
        <StatusIcon status={status} />
        <span className={`flex-1 truncate text-xs font-medium ${config.color}`}>
          {name}
        </span>
        {duration !== undefined && status !== 'pending' && (
          <span className="flex-shrink-0 text-[10px] text-gray-600 tabular-nums">
            {(duration / 1000).toFixed(1)}s
          </span>
        )}
      </div>

      {status === 'running' && progress > 0 && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-dark-3/50">
          <div
            className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}

      {status === 'error' && error && (
        <p className="mt-1 truncate text-[10px] text-red-400/70">{error}</p>
      )}
    </div>
  );
};
