// frontend/src/components/AIChatPanel.tsx
//
// Floating AI assistant chat panel — bottom-right corner.
// Visible to ADMIN and PM roles.

import { useEffect, useRef, useState } from 'react';
import { useAIChat, type ChatMessage } from '../hooks/useAI';

const SUGGESTED_QUESTIONS = [
  'Which project has the most overdue tasks?',
  'What is the overall completion rate across all projects?',
  'Which developers have the most tasks assigned?',
  'Summarize the current project health.',
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`ai-chat__bubble ai-chat__bubble--${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="ai-chat__avatar">
          <span>✦</span>
        </div>
      )}
      <div className="ai-chat__text">{msg.content}</div>
    </div>
  );
}

export function AIChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, isLoading, error, send, clearHistory } = useAIChat();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    setInput('');
    send(msg);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        type="button"
        id="ai-chat-toggle"
        className={`ai-chat__fab ${isOpen ? 'ai-chat__fab--open' : ''}`}
        onClick={() => setIsOpen((v) => !v)}
        title="AI Project Assistant"
        aria-label="Toggle AI chat"
      >
        {isOpen ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <span className="ai-chat__fab-icon">✦</span>
        )}
        {!isOpen && messages.length === 0 && (
          <span className="ai-chat__fab-pulse" />
        )}
      </button>

      {/* Chat panel */}
      <div className={`ai-chat__panel ${isOpen ? 'ai-chat__panel--open' : ''}`} role="dialog" aria-label="AI Assistant">
        {/* Header */}
        <div className="ai-chat__header">
          <div className="ai-chat__header-left">
            <div className="ai-chat__header-icon">✦</div>
            <div>
              <div className="ai-chat__header-title">Velozity AI</div>
              <div className="ai-chat__header-sub">Project intelligence assistant</div>
            </div>
          </div>
          <div className="ai-chat__header-actions">
            {messages.length > 0 && (
              <button
                type="button"
                className="ai-chat__clear"
                onClick={clearHistory}
                title="Clear chat"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="ai-chat__close-btn"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="ai-chat__messages">
          {messages.length === 0 && !isLoading && (
            <div className="ai-chat__empty">
              <div className="ai-chat__empty-icon">✦</div>
              <p className="ai-chat__empty-title">Ask me anything about your projects</p>
              <div className="ai-chat__suggestions">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    className="ai-chat__suggestion"
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}

          {isLoading && (
            <div className="ai-chat__bubble ai-chat__bubble--ai ai-chat__bubble--typing">
              <div className="ai-chat__avatar"><span>✦</span></div>
              <div className="ai-chat__typing-dots">
                <span /><span /><span />
              </div>
            </div>
          )}

          {error && (
            <div className="ai-chat__error-msg">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="ai-chat__input-row">
          <input
            ref={inputRef}
            type="text"
            className="ai-chat__input"
            placeholder="Ask about projects, tasks, team…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            maxLength={1000}
            aria-label="Chat message"
          />
          <button
            type="button"
            className="ai-chat__send"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            title="Send"
            aria-label="Send message"
          >
            {isLoading ? (
              <span className="spinner spinner--xs" />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
