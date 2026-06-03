'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Message, Subject } from '@/components/chat/types';

interface Options {
  open: boolean;
  minimized: boolean;
  subject: Subject;
  messages: Message[];
  setMessages: (msgs: Message[]) => void;
}

export function useChatHistory({ open, minimized, subject, messages, setMessages }: Options) {
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyLoadedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open || minimized) return;
    if (historyLoadedRef.current === subject) return;
    historyLoadedRef.current = subject;
    setHistoryLoading(true);
    api.get<{ messages: Array<{ role: string; content: string }> }>(`/ai/history?subject=${subject}`)
      .then(data => {
        if (data.messages.length > 0 && messages.length === 0) {
          setMessages(data.messages.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [open, subject]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearHistory = () => {
    setMessages([]);
    historyLoadedRef.current = null;
    api.delete(`/ai/history?subject=${subject}`).catch(() => {});
  };

  return { historyLoading, historyLoadedRef, clearHistory };
}
