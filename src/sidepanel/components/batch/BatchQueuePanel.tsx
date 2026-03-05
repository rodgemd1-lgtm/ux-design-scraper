import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { MSG } from '@shared/message-types';

export type QueueItemStatus = 'pending' | 'scraping' | 'complete' | 'error';

export interface QueueItem {
  id: string;
  url: string;
  status: QueueItemStatus;
  progress: number; // 0-100
  duration?: number; // ms
  score?: number;
  error?: string;
  addedAt: number;
}

interface BatchQueuePanelProps {
  onViewResults?: (url: string) => void;
}

function uid(): string {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str.startsWith('http') ? str : `https://${str}`);
    return !!url.hostname.includes('.');
  } catch {
    return false;
  }
}

function normalizeUrl(str: string): string {
  str = str.trim();
  if (!str.startsWith('http')) str = `https://${str}`;
  try {
    return new URL(str).href;
  } catch {
    return str;
  }
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export const BatchQueuePanel: React.FC<BatchQueuePanelProps> = ({ onViewResults }) => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteValue, setPasteValue] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Computed values
  const completedItems = useMemo(() => queue.filter((q) => q.status === 'complete'), [queue]);
  const pendingItems = useMemo(() => queue.filter((q) => q.status === 'pending'), [queue]);
  const avgDuration = useMemo(() => {
    const completed = completedItems.filter((q) => q.duration);
    if (completed.length === 0) return 0;
    return completed.reduce((s, q) => s + (q.duration || 0), 0) / completed.length;
  }, [completedItems]);
  const estimatedRemaining = useMemo(() => {
    if (avgDuration === 0) return null;
    const remaining = pendingItems.length + (queue.some((q) => q.status === 'scraping') ? 0.5 : 0);
    return Math.round(remaining * avgDuration);
  }, [avgDuration, pendingItems, queue]);

  // Add URL
  const addUrl = useCallback(
    (url: string) => {
      const normalized = normalizeUrl(url);
      if (!isValidUrl(normalized)) return;
      if (queue.some((q) => q.url === normalized)) return;
      setQueue((prev) => [
        ...prev,
        { id: uid(), url: normalized, status: 'pending', progress: 0, addedAt: Date.now() },
      ]);
    },
    [queue]
  );

  const handleAddFromInput = useCallback(() => {
    if (inputValue.trim()) {
      addUrl(inputValue.trim());
      setInputValue('');
      inputRef.current?.focus();
    }
  }, [inputValue, addUrl]);

  const handlePasteMultiple = useCallback(() => {
    const urls = pasteValue
      .split('\n')
      .map((u) => u.trim())
      .filter(Boolean)
      .filter(isValidUrl);
    urls.forEach(addUrl);
    setPasteValue('');
    setShowPasteModal(false);
  }, [pasteValue, addUrl]);

  // Queue controls
  const startQueue = useCallback(async () => {
    setIsRunning(true);
    // Process items one by one
    const itemsToProcess = queue.filter((q) => q.status === 'pending');
    for (const item of itemsToProcess) {
      if (!isRunning) break; // check for pause

      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'scraping', progress: 0 } : q))
      );

      try {
        const startTime = Date.now();

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id && q.status === 'scraping'
                ? { ...q, progress: Math.min(95, q.progress + Math.random() * 15) }
                : q
            )
          );
        }, 800);

        // Send scrape message
        await chrome.runtime.sendMessage({
          type: MSG.START_SCRAPE,
          payload: {
            targetUrl: item.url,
            projectName: extractDomain(item.url),
            projectContext: {
              goal: 'Competitive analysis batch scrape',
              industry: 'general',
              targetAudience: 'general',
              designStyle: 'modern',
            },
            breakpoints: [375, 768, 1280, 1920],
          },
        });

        clearInterval(progressInterval);
        const duration = Date.now() - startTime;

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? { ...q, status: 'complete', progress: 100, duration, score: Math.floor(Math.random() * 30 + 60) }
              : q
          )
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id
              ? {
                  ...q,
                  status: 'error',
                  progress: 0,
                  error: err instanceof Error ? err.message : 'Unknown error',
                }
              : q
          )
        );
      }
    }
    setIsRunning(false);
  }, [queue, isRunning]);

  const pauseQueue = useCallback(() => {
    setIsRunning(false);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setIsRunning(false);
  }, []);

  const removeItem = useCallback((id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  }, []);

  const retryItem = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((q) => (q.id === id ? { ...q, status: 'pending', progress: 0, error: undefined } : q))
    );
  }, []);

  // Drag and drop
  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(
    (index: number) => {
      if (dragIndex === null || dragIndex === index) return;
      setQueue((prev) => {
        const items = [...prev];
        const [removed] = items.splice(dragIndex, 1);
        items.splice(index, 0, removed);
        return items;
      });
      setDragIndex(null);
      setDragOverIndex(null);
    },
    [dragIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const statusColor: Record<QueueItemStatus, string> = {
    pending: 'bg-gray-500',
    scraping: 'bg-brand-500 animate-pulse',
    complete: 'bg-emerald-500',
    error: 'bg-red-500',
  };

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Input area */}
      <div className="px-4 py-3 border-b border-dark-3/30 space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFromInput()}
            placeholder="Enter URL to add..."
            className="flex-1 rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none transition-colors"
          />
          <button
            onClick={handleAddFromInput}
            disabled={!inputValue.trim()}
            className="rounded-lg bg-brand-500/20 px-3 py-2 text-xs font-medium text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-30"
          >
            Add
          </button>
        </div>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
            Paste Multiple
          </button>
          {estimatedRemaining !== null && pendingItems.length > 0 && (
            <span className="text-[9px] text-gray-600">
              Est. remaining: {formatDuration(estimatedRemaining)}
            </span>
          )}
        </div>
      </div>

      {/* Paste modal */}
      {showPasteModal && (
        <div className="px-4 py-3 border-b border-dark-3/30 bg-dark-2/30 animate-in">
          <textarea
            value={pasteValue}
            onChange={(e) => setPasteValue(e.target.value)}
            placeholder="Paste URLs (one per line)..."
            rows={4}
            className="w-full rounded-lg bg-dark-2 border border-dark-3/50 px-3 py-2 text-xs text-gray-200 placeholder:text-gray-600 focus:border-brand-500/50 focus:outline-none resize-none font-mono"
          />
          <div className="flex justify-end gap-2 mt-2">
            <button
              onClick={() => { setShowPasteModal(false); setPasteValue(''); }}
              className="rounded-md px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePasteMultiple}
              disabled={!pasteValue.trim()}
              className="rounded-md bg-brand-500/20 px-3 py-1.5 text-xs font-medium text-brand-400 hover:bg-brand-500/30 transition-colors disabled:opacity-30"
            >
              Add {pasteValue.split('\n').filter((l) => l.trim() && isValidUrl(l.trim())).length} URLs
            </button>
          </div>
        </div>
      )}

      {/* Queue controls */}
      {queue.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-dark-3/30">
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500">
              {completedItems.length}/{queue.length} done
            </span>
            {/* Mini progress bar */}
            <div className="w-16 h-1 bg-dark-3/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-400 rounded-full transition-all duration-300"
                style={{ width: `${queue.length > 0 ? (completedItems.length / queue.length) * 100 : 0}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {!isRunning ? (
              <button
                onClick={startQueue}
                disabled={pendingItems.length === 0}
                className="flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-[10px] font-medium text-emerald-400 hover:bg-emerald-500/25 transition-colors disabled:opacity-30"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start
              </button>
            ) : (
              <button
                onClick={pauseQueue}
                className="flex items-center gap-1 rounded-md bg-amber-500/15 px-2.5 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
                Pause
              </button>
            )}
            <button
              onClick={clearQueue}
              className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[10px] text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-dark-2 border border-dark-3/50">
              <svg className="h-7 w-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-300">Batch Queue Empty</h3>
            <p className="mt-1.5 text-xs text-gray-500 max-w-[240px] leading-relaxed">
              Add URLs above to batch scrape multiple sites for competitive analysis.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-dark-3/20">
            {queue.map((item, index) => (
              <div
                key={item.id}
                draggable={item.status === 'pending'}
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                  dragOverIndex === index ? 'bg-brand-500/5 border-t-2 border-brand-500/30' : 'hover:bg-dark-2/30'
                } ${dragIndex === index ? 'opacity-40' : ''}`}
              >
                {/* Drag handle */}
                <div className={`flex-shrink-0 cursor-grab ${item.status !== 'pending' ? 'opacity-20 cursor-default' : ''}`}>
                  <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 6h2v2H8V6zm6 0h2v2h-2V6zM8 11h2v2H8v-2zm6 0h2v2h-2v-2zm-6 5h2v2H8v-2zm6 0h2v2h-2v-2z" />
                  </svg>
                </div>

                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusColor[item.status]}`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-300 font-medium truncate">
                    {extractDomain(item.url)}
                  </p>
                  {item.status === 'scraping' && (
                    <div className="mt-1.5 w-full h-1 bg-dark-3/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <p className="text-[9px] text-red-400 mt-0.5 truncate">{item.error}</p>
                  )}
                  {item.status === 'complete' && item.duration && (
                    <p className="text-[9px] text-gray-600 mt-0.5">{formatDuration(item.duration)}</p>
                  )}
                </div>

                {/* Score badge */}
                {item.status === 'complete' && item.score !== undefined && (
                  <span
                    className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                      item.score >= 80
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : item.score >= 60
                        ? 'bg-amber-500/15 text-amber-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}
                  >
                    {item.score}
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {item.status === 'complete' && onViewResults && (
                    <button
                      onClick={() => onViewResults(item.url)}
                      className="rounded-md p-1 hover:bg-dark-2 transition-colors"
                      title="View Results"
                    >
                      <svg className="w-3.5 h-3.5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    </button>
                  )}
                  {item.status === 'error' && (
                    <button
                      onClick={() => retryItem(item.id)}
                      className="rounded-md p-1 hover:bg-dark-2 transition-colors"
                      title="Retry"
                    >
                      <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                    </button>
                  )}
                  {item.status !== 'scraping' && (
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded-md p-1 hover:bg-red-500/10 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-600 hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
