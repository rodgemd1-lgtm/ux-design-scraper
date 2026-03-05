import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, BraveSearchResult } from '@shared/types';

interface MessageBubbleProps {
  message: ChatMessage;
}

const UrlCard: React.FC<{ result: BraveSearchResult }> = ({ result }) => (
  <a
    href={result.url}
    target="_blank"
    rel="noopener noreferrer"
    className="
      flex gap-3 rounded-lg border border-dark-3/50 bg-dark-2/50 p-2.5
      transition-all duration-200 hover:border-brand-500/30 hover:bg-dark-2
      group
    "
  >
    {result.thumbnail && (
      <img
        src={result.thumbnail}
        alt=""
        className="h-10 w-10 rounded object-cover flex-shrink-0"
      />
    )}
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-medium text-brand-300 group-hover:text-brand-200">
        {result.title}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[11px] text-gray-500">
        {result.description}
      </p>
      <p className="mt-1 truncate text-[10px] text-gray-600">{result.url}</p>
    </div>
  </a>
);

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const braveResults = message.metadata?.braveResults;

  return (
    <div className={`flex animate-in ${isUser ? 'justify-end' : 'justify-start'} px-4 py-1`}>
      <div
        className={`
          max-w-[88%] rounded-2xl px-3.5 py-2.5
          ${
            isUser
              ? 'bg-brand-600 text-white rounded-br-md'
              : 'bg-dark-2 text-gray-200 rounded-bl-md border border-dark-3/30'
          }
        `}
      >
        <div
          className={`
            prose prose-sm max-w-none
            ${
              isUser
                ? 'prose-invert prose-p:text-white/90 prose-headings:text-white prose-strong:text-white prose-code:text-brand-100'
                : 'prose-invert prose-p:text-gray-300 prose-headings:text-gray-100 prose-strong:text-gray-200 prose-code:text-brand-300'
            }
            prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1
            prose-li:my-0 prose-pre:my-2 prose-pre:bg-dark-0 prose-pre:border prose-pre:border-dark-3/50
            prose-code:text-xs prose-code:font-mono prose-code:bg-dark-0/50 prose-code:px-1 prose-code:py-0.5 prose-code:rounded
            prose-a:text-brand-300 prose-a:no-underline hover:prose-a:underline
            text-sm leading-relaxed
          `}
        >
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {braveResults && braveResults.length > 0 && (
          <div className="mt-2.5 space-y-1.5 border-t border-white/10 pt-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
              Search Results
            </p>
            {braveResults.map((result, idx) => (
              <UrlCard key={idx} result={result} />
            ))}
          </div>
        )}

        <time className={`mt-1 block text-[10px] ${isUser ? 'text-white/40' : 'text-gray-600'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </time>
      </div>
    </div>
  );
};
