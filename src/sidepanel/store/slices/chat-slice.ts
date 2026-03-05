import type { StateCreator } from 'zustand';
import type { ChatMessage } from '@shared/types';
import { generateId } from '@shared/utils';

export interface ChatSlice {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentSessionId: string;
  addMessage: (role: ChatMessage['role'], content: string, metadata?: ChatMessage['metadata']) => void;
  appendToLastMessage: (chunk: string) => void;
  setStreaming: (streaming: boolean) => void;
  clearMessages: () => void;
}

export const createChatSlice: StateCreator<ChatSlice, [], [], ChatSlice> = (set) => ({
  messages: [],
  isStreaming: false,
  currentSessionId: generateId(),

  addMessage: (role, content, metadata) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: generateId(),
          role,
          content,
          timestamp: Date.now(),
          metadata,
        },
      ],
    })),

  appendToLastMessage: (chunk) =>
    set((state) => {
      const messages = [...state.messages];
      const last = messages[messages.length - 1];
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + chunk,
        };
      }
      return { messages };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  clearMessages: () =>
    set({
      messages: [],
      currentSessionId: generateId(),
    }),
});
