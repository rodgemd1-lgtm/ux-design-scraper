import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  prefill?: string;
  onPrefillConsumed?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false, prefill, onPrefillConsumed }) => {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (prefill) {
      setValue(prefill);
      onPrefillConsumed?.();
      textareaRef.current?.focus();
    }
  }, [prefill, onPrefillConsumed]);

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  return (
    <div className="border-t border-dark-3/50 bg-dark-1/80 backdrop-blur-sm p-3">
      <div className="flex items-end gap-2 rounded-xl border border-dark-3/70 bg-dark-2/50 px-3 py-2 focus-within:border-brand-500/50 transition-colors">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Claude about UX design..."
          disabled={disabled}
          rows={1}
          className="
            flex-1 resize-none bg-transparent text-sm text-gray-200
            placeholder:text-gray-500 border-0 outline-none
            disabled:opacity-50 leading-relaxed
          "
        />
        <button
          onClick={handleSend}
          disabled={disabled || !value.trim()}
          className="
            flex-shrink-0 rounded-lg bg-brand-600 p-2 text-white
            transition-all duration-200
            hover:bg-brand-500 active:scale-95
            disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-brand-600
          "
          aria-label="Send message"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};
