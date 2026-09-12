// frontend/src/hooks/useAI.ts
//
// Lightweight hook wrappers around the AI endpoints.
// Each function returns { data, isLoading, error } via local state.

import { useState } from 'react';
import { apiClient } from '../lib/api';

// ── Project Summary ───────────────────────────────────────────────────────────

interface SummaryResult {
  summary: string;
  provider: string;
}

export function useProjectSummary() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(projectId: string) {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    try {
      const { data } = await apiClient.post<SummaryResult>(
        `/api/ai/project-summary/${projectId}`
      );
      setSummary(data.summary);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.message ??
        'AI summary failed.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setSummary(null);
    setError(null);
  }

  return { summary, isLoading, error, generate, reset };
}

// ── Task Description ──────────────────────────────────────────────────────────

interface DescriptionResult {
  description: string;
}

export function useTaskDescriptionAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate(title: string, projectName?: string): Promise<string | null> {
    if (!title.trim()) return null;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await apiClient.post<DescriptionResult>(
        '/api/ai/task-description',
        { title, projectName }
      );
      return data.description;
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.message ??
        'AI description failed.';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, error, generate };
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatResult {
  reply: string;
  provider: string;
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(userMessage: string) {
    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await apiClient.post<ChatResult>('/api/ai/chat', {
        message: userMessage,
        history: messages, // send history before the new message
      });

      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.message ??
        'AI chat failed.';
      setError(msg);
      // Keep user message visible even if AI fails
    } finally {
      setIsLoading(false);
    }
  }

  function clearHistory() {
    setMessages([]);
    setError(null);
  }

  return { messages, isLoading, error, send, clearHistory };
}
