import React from 'react';

export const StreamingIndicator: React.FC = () => {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-1 rounded-xl bg-dark-2 px-4 py-2.5">
        <span className="streaming-dot" />
        <span className="streaming-dot" />
        <span className="streaming-dot" />
      </div>
      <span className="text-xs text-gray-500">Claude is thinking...</span>
    </div>
  );
};
