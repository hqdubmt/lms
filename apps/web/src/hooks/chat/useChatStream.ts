'use client';

import { useCallback, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { fetchChatStream } from '@/services/chat/chatApi';
import { inferMode } from '@/services/chat/subjectUtils';
import { recordLearningEvent } from '@/services/analytics';
import type { Message, Subject, Mode, Source } from '@/components/chat/types';

interface Options {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  subject: Subject;
  mode: Mode;
  setMode: (m: Mode) => void;
  aiLabel?: string;
}

export function useChatStream({ messages, setMessages, subject, mode, setMode, aiLabel }: Options) {
  const [streaming, setStreaming] = useState(false);
  const [brainKey, setBrainKey] = useState(0);
  const [streamChars, setStreamChars] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const getValidToken = useCallback(async (): Promise<string | null> => {
    const current = api.getToken();
    if (current) return current;
    try {
      const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' });
      if (!res.ok) return null;
      const { accessToken: newToken } = await res.json();
      if (newToken) {
        api.setToken(newToken);
        useAuthStore.getState().setToken(newToken);
      }
      return newToken ?? null;
    } catch {
      return null;
    }
  }, []);

  const sendMessage = useCallback(async (text: string, historyOverride?: Message[]) => {
    if (!text.trim() || streaming) return;

    const inferred = inferMode(text);
    const effectiveMode = inferred ?? mode;
    if (inferred && inferred !== mode) setMode(inferred);

    const sentAt = Date.now();
    const baseHistory = historyOverride ?? messages;
    const newMessages: Message[] = [...baseHistory, { role: 'user', content: text.trim(), timestamp: sentAt }];
    setMessages([...newMessages, { role: 'assistant', content: '', loading: true }]);
    setStreaming(true);
    setStreamChars(0);
    let streamStartAt = 0;

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      // 'voice' là UI-only mode — backend nhận 'tutor'
      const backendMode = effectiveMode === 'voice' ? 'tutor' : effectiveMode;
      const token = api.getToken();
      let res = await fetchChatStream({
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        subject,
        mode: backendMode,
        token,
        signal: ctrl.signal,
      });

      if (res.status === 401) {
        const newToken = await getValidToken();
        if (!newToken) throw new Error('AUTH_EXPIRED');
        res = await fetchChatStream({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          subject,
          mode: backendMode,
          token: newToken,
          signal: ctrl.signal,
        });
      }

      if (!res.ok || !res.body) throw new Error('Lỗi kết nối');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let aiContent = '';
      let isStreamError = false;
      let metaData: {
        suggestions?: string[];
        sources?: Source[];
        langIntent?: string | null;
        validation?: string[] | null;
        activeAgents?: string[];
        provider?: string;
      } = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) { aiContent = parsed.error; isStreamError = true; break; }
            if (parsed.type === 'meta') {
              metaData = {
                suggestions: parsed.suggestions,
                sources: parsed.sources,
                langIntent: parsed.langIntent,
                validation: parsed.validation,
                activeAgents: parsed.activeAgents,
                provider: aiLabel || parsed.provider,
              };
              // Emit metadata immediately — show live while streaming
              setMessages([...newMessages, {
                role: 'assistant',
                content: aiContent,
                loading: !aiContent,
                sources: metaData.sources,
                langIntent: metaData.langIntent,
                activeAgents: metaData.activeAgents,
                provider: metaData.provider,
              }]);
              continue;
            }
            if (parsed.token) {
              if (!streamStartAt) streamStartAt = Date.now();
              aiContent += parsed.token;
              setStreamChars(aiContent.length);
              setMessages([...newMessages, {
                role: 'assistant',
                content: aiContent,
                loading: false,
                sources: metaData.sources,
                langIntent: metaData.langIntent,
                activeAgents: metaData.activeAgents,
                provider: metaData.provider,
              }]);
            }
          } catch { /* skip malformed */ }
        }
      }

      if (!aiContent) aiContent = 'Xin lỗi, tôi không thể trả lời lúc này.';

      const finishedAt = Date.now();
      setMessages([...newMessages, isStreamError ? {
        role: 'assistant',
        content: aiContent,
        loading: false,
        error: true,
      } : {
        id: `msg_${finishedAt}_${Math.random().toString(36).slice(2, 8)}`,
        role: 'assistant',
        content: aiContent,
        loading: false,
        sources: metaData.sources,
        suggestions: metaData.suggestions,
        langIntent: metaData.langIntent,
        validationWarnings: metaData.validation,
        activeAgents: metaData.activeAgents,
        timestamp: finishedAt,
        latencyMs: streamStartAt ? finishedAt - streamStartAt : undefined,
        provider: aiLabel || undefined,
        subject,
        mode: effectiveMode,
      }]);
      setBrainKey(k => k + 1);
      recordLearningEvent({ type: 'chat_session', subject });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        const msg = err.message === 'AUTH_EXPIRED'
          ? 'Phiên đăng nhập hết hạn. Vui lòng tải lại trang.'
          : 'Không thể kết nối tới AI. Vui lòng thử lại.';
        setMessages([...newMessages, { role: 'assistant', content: msg, error: true }]);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [messages, streaming, subject, mode, setMode, getValidToken]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  return { streaming, sendMessage, handleStop, brainKey, streamChars };
}
