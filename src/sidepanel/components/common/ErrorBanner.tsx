import React, { useState } from 'react';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  details?: string;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss, details }) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="mx-3 my-2 animate-in rounded-lg border border-red-500/30 bg-red-500/10 p-3">
      <div className="flex items-start gap-2">
        <svg
          className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-red-300">{message}</p>
          {details && (
            <>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="mt-1 text-xs text-red-400/70 hover:text-red-300 transition-colors"
              >
                {showDetails ? 'Hide details' : 'Show details'}
              </button>
              {showDetails && (
                <pre className="mt-1 text-xs text-red-400/60 whitespace-pre-wrap font-mono bg-red-500/5 rounded p-2">
                  {details}
                </pre>
              )}
            </>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 text-red-400/50 hover:text-red-300 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};
