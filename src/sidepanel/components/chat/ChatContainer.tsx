import React, { useState, useCallback } from 'react';
import { useClaudeChat } from '../../hooks/useClaudeChat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestionChips } from './SuggestionChips';
import { ErrorBanner } from '../common/ErrorBanner';
import { MSG } from '@shared/message-types';

// ===== Action Card Types =====
export type ActionCardType = 'scrape-url' | 'compare' | 'generate-personas' | 'ab-test';

export interface ActionCardData {
  type: ActionCardType;
  title: string;
  description: string;
  payload?: Record<string, unknown>;
}

// ===== Action Card Component =====
const ActionCard: React.FC<{
  action: ActionCardData;
  onExecute: (action: ActionCardData) => void;
  executing?: boolean;
}> = ({ action, onExecute, executing = false }) => {
  const iconMap: Record<ActionCardType, React.ReactNode> = {
    'scrape-url': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
    compare: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
    'generate-personas': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
    'ab-test': (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  };

  const colorMap: Record<ActionCardType, string> = {
    'scrape-url': 'border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10',
    compare: 'border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10',
    'generate-personas': 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10',
    'ab-test': 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10',
  };

  const iconColorMap: Record<ActionCardType, string> = {
    'scrape-url': 'text-brand-400',
    compare: 'text-purple-400',
    'generate-personas': 'text-emerald-400',
    'ab-test': 'text-amber-400',
  };

  return (
    <button
      onClick={() => onExecute(action)}
      disabled={executing}
      className={`w-full flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 ${colorMap[action.type]} ${
        executing ? 'opacity-50 cursor-wait' : 'cursor-pointer'
      }`}
    >
      <div className={`flex-shrink-0 ${iconColorMap[action.type]}`}>
        {executing ? (
          <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
        ) : (
          iconMap[action.type]
        )}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-xs font-medium text-gray-200">{action.title}</p>
        <p className="text-[10px] text-gray-500 mt-0.5">{action.description}</p>
      </div>
      <svg className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  );
};

// ===== Parse action cards from message content =====
function parseActionCards(content: string): { cleanContent: string; actions: ActionCardData[] } {
  const actions: ActionCardData[] = [];
  const actionRegex = /\[action:(\w[\w-]*)\|([^|]*)\|([^\]]*)\]/g;
  let match;

  while ((match = actionRegex.exec(content)) !== null) {
    const type = match[1] as ActionCardType;
    const title = match[2];
    const description = match[3];
    if (['scrape-url', 'compare', 'generate-personas', 'ab-test'].includes(type)) {
      actions.push({ type, title, description });
    }
  }

  const cleanContent = content.replace(actionRegex, '').trim();
  return { cleanContent, actions };
}

// ===== Main Container =====
export const ChatContainer: React.FC = () => {
  const { messages, isStreaming, error, sendMessage, clearError } = useClaudeChat();
  const [prefill, setPrefill] = useState('');
  const [executingAction, setExecutingAction] = useState<ActionCardType | null>(null);

  const handleChipSelect = useCallback((text: string) => {
    setPrefill(text);
  }, []);

  const handlePrefillConsumed = useCallback(() => {
    setPrefill('');
  }, []);

  const handleActionExecute = useCallback(async (action: ActionCardData) => {
    setExecutingAction(action.type);
    try {
      switch (action.type) {
        case 'scrape-url':
          await chrome.runtime.sendMessage({
            type: MSG.START_SCRAPE,
            payload: action.payload || {},
          });
          break;
        case 'compare':
          await chrome.runtime.sendMessage({
            type: MSG.MULTI_SITE_SCRAPE,
            payload: action.payload || {},
          });
          break;
        case 'generate-personas':
          await chrome.runtime.sendMessage({
            type: MSG.GENERATE_PERSONAS,
            payload: action.payload || {},
          });
          break;
        case 'ab-test':
          await chrome.runtime.sendMessage({
            type: MSG.GENERATE_AB_TESTS,
            payload: action.payload || {},
          });
          break;
      }
    } catch {
      // Error handled by streaming
    }
    setExecutingAction(null);
  }, []);

  // Process messages for action cards
  const processedMessages = messages.map((msg) => {
    if (msg.role === 'assistant' && msg.content) {
      const { cleanContent, actions } = parseActionCards(msg.content);
      return { ...msg, content: cleanContent, _actions: actions };
    }
    return { ...msg, _actions: [] as ActionCardData[] };
  });

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {error && <ErrorBanner message={error} onDismiss={clearError} />}
      <MessageList messages={messages} isStreaming={isStreaming} />

      {/* Action cards from the last assistant message */}
      {!isStreaming && processedMessages.length > 0 && (() => {
        const lastMsg = processedMessages[processedMessages.length - 1];
        if (lastMsg.role === 'assistant' && lastMsg._actions.length > 0) {
          return (
            <div className="px-4 pb-3 space-y-2 animate-in">
              {lastMsg._actions.map((action, i) => (
                <ActionCard
                  key={`${action.type}-${i}`}
                  action={action}
                  onExecute={handleActionExecute}
                  executing={executingAction === action.type}
                />
              ))}
            </div>
          );
        }
        return null;
      })()}

      {messages.length === 0 && !isStreaming && (
        <SuggestionChips onSelect={handleChipSelect} />
      )}
      <ChatInput
        onSend={sendMessage}
        disabled={isStreaming}
        prefill={prefill}
        onPrefillConsumed={handlePrefillConsumed}
      />
    </div>
  );
};
