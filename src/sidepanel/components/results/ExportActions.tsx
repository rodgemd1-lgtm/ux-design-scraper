import React, { useState } from 'react';
import { MSG } from '@shared/message-types';
import { createLogger } from '@shared/logger';

const log = createLogger('ExportActions');

type ExportStatus = 'idle' | 'loading' | 'success' | 'error';

interface ActionButton {
  id: string;
  label: string;
  messageType: string;
  icon: React.ReactNode;
}

const actions: ActionButton[] = [
  {
    id: 'desktop',
    label: 'Export to Desktop',
    messageType: MSG.GENERATE_OUTPUT,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    id: 'supabase',
    label: 'Sync to Supabase',
    messageType: MSG.SYNC_TO_SUPABASE,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
      </svg>
    ),
  },
  {
    id: 'claude-code',
    label: 'Open in Claude Code',
    messageType: MSG.GENERATE_OUTPUT,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
];

export const ExportActions: React.FC = () => {
  const [statuses, setStatuses] = useState<Record<string, ExportStatus>>({});

  const handleAction = async (action: ActionButton) => {
    setStatuses((prev) => ({ ...prev, [action.id]: 'loading' }));

    try {
      await chrome.runtime.sendMessage({
        type: action.messageType,
        payload: { target: action.id },
      });
      setStatuses((prev) => ({ ...prev, [action.id]: 'success' }));
      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [action.id]: 'idle' }));
      }, 3000);
    } catch (err) {
      log.error(`Export action failed: ${action.id}`, err);
      setStatuses((prev) => ({ ...prev, [action.id]: 'error' }));
      setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [action.id]: 'idle' }));
      }, 3000);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 px-1">
        Export & Sync
      </h3>
      <div className="space-y-1.5">
        {actions.map((action) => {
          const status = statuses[action.id] || 'idle';
          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={status === 'loading'}
              className={`
                flex w-full items-center gap-3 rounded-lg border px-3 py-2.5
                text-sm font-medium transition-all duration-200
                ${
                  status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : status === 'error'
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-dark-3/50 bg-dark-2/50 text-gray-300 hover:border-brand-500/30 hover:bg-brand-500/5'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {status === 'loading' ? (
                <div className="w-4 h-4 border-2 border-gray-500 border-t-brand-500 rounded-full animate-spin" />
              ) : status === 'success' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              ) : (
                action.icon
              )}
              <span className="flex-1 text-left text-xs">{action.label}</span>
              {status === 'success' && (
                <span className="text-[10px] text-emerald-500">Done</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
