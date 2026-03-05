import { useEffect, useCallback, useState } from 'react';
import { useStore } from '../store';
import { MSG } from '@shared/message-types';
import { createLogger } from '@shared/logger';

const log = createLogger('useClaudeChat');

export function useClaudeChat() {
  const messages = useStore((s) => s.messages);
  const isStreaming = useStore((s) => s.isStreaming);
  const addMessage = useStore((s) => s.addMessage);
  const appendToLastMessage = useStore((s) => s.appendToLastMessage);
  const setStreaming = useStore((s) => s.setStreaming);
  const clearMessages = useStore((s) => s.clearMessages);

  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Listen for streaming chunks and completion
  useEffect(() => {
    const listener = (
      message: { type: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ) => {
      switch (message.type) {
        case MSG.CHAT_STREAM_CHUNK: {
          const chunk = message.payload as string;
          appendToLastMessage(chunk);
          break;
        }
        case MSG.CHAT_STREAM_DONE: {
          setStreaming(false);
          const metadata = message.payload as { braveResults?: unknown[] } | undefined;
          if (metadata?.braveResults) {
            // Update the last message's metadata
            const state = useStore.getState();
            const msgs = [...state.messages];
            const last = msgs[msgs.length - 1];
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = {
                ...last,
                metadata: {
                  ...last.metadata,
                  braveResults: metadata.braveResults as never[],
                },
              };
              useStore.setState({ messages: msgs });
            }
          }
          break;
        }
        case MSG.CHAT_ERROR: {
          const errMsg = (message.payload as { message: string })?.message || 'An error occurred';
          setStreaming(false);
          setError(errMsg);
          log.error('Chat error', errMsg);
          break;
        }
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [appendToLastMessage, setStreaming]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      setError(null);
      addMessage('user', content);
      addMessage('assistant', '');
      setStreaming(true);

      try {
        await chrome.runtime.sendMessage({
          type: MSG.CHAT_SEND,
          payload: { content },
        });
      } catch (err) {
        setStreaming(false);
        const message =
          err instanceof Error
            ? err.message.includes('Extension context invalidated')
              ? 'Extension was reloaded. Please refresh the side panel.'
              : err.message
            : 'Failed to send message';
        setError(message);
        log.error('Failed to send chat message', err);
      }
    },
    [addMessage, setStreaming, isStreaming]
  );

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    clearMessages,
    clearError,
  };
}
