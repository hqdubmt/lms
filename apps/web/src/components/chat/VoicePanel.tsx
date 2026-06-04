'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Volume2, Loader2, Bot, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Message, Subject } from './types';
import { useVoiceConversation } from '@/hooks/chat/useVoiceConversation';
import { recordLearningEvent } from '@/services/analytics';

interface VoicePanelProps {
  subject: Subject;
  color: string;
  messages: Message[];
  streaming: boolean;
  onTranscript: (text: string) => void;
  onAiResponseRef?: (fn: (text: string) => void) => void;
}

const STATE_LABEL: Record<string, string> = {
  idle: 'Nhấn để nói',
  listening: 'Đang nghe...',
  thinking: 'Đang suy nghĩ...',
  speaking: 'Đang trả lời...',
};

export function VoicePanel({
  subject, color, messages, streaming, onTranscript, onAiResponseRef,
}: VoicePanelProps) {
  const [autoConversation, setAutoConversation] = useState(false);
  const { voiceState, lastTranscript, available, startListening, stopAll, onAiResponse } =
    useVoiceConversation({ subject, onTranscript, messages, autoConversation });
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onAiResponseRef?.(onAiResponse);
  }, [onAiResponse, onAiResponseRef]);

  // Auto-speak when last AI message arrives and not streaming
  const prevStreamingRef = useRef(streaming);
  useEffect(() => {
    if (prevStreamingRef.current && !streaming) {
      const last = [...messages].reverse().find(m => m.role === 'assistant' && !m.error && !m.loading);
      if (last?.content) {
        onAiResponse(last.content);
        recordLearningEvent({ type: 'voice_session', subject });
      }
    }
    prevStreamingRef.current = streaming;
  }, [streaming, messages, onAiResponse, subject]);

  // Scroll to bottom when messages update
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, lastTranscript]);

  const isActive = voiceState === 'listening';
  const isBusy = voiceState === 'thinking' || voiceState === 'speaking' || streaming;

  // Visible messages: filter out loading/empty, strip markdown for voice display
  const visibleMessages = messages.filter(m => m.content && !m.loading);
  const hasHistory = visibleMessages.length > 0;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ── Voice History ─────────────────────────────────────────── */}
      <div
        ref={historyRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0"
      >
        {!hasHistory && !lastTranscript && (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-6 text-center">
            <div className={cn('h-12 w-12 rounded-2xl flex items-center justify-center bg-gradient-to-br', color)}>
              <Mic className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-medium text-gray-600">Chế độ giọng nói</p>
            <p className="text-xs text-gray-400 max-w-[200px]">
              {available ? 'Nhấn nút micro bên dưới để bắt đầu nói chuyện với AI' : 'Thiết bị không hỗ trợ ghi âm'}
            </p>
            {subject === 'language' && (
              <p className="text-xs text-blue-500 max-w-[200px]">
                Nói tiếng Anh — AI sẽ đánh giá và hướng dẫn phát âm
              </p>
            )}
          </div>
        )}

        {visibleMessages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const preview = msg.role === 'assistant'
            ? msg.content.replace(/\*\*/g, '').replace(/#{1,6}\s/g, '').replace(/`[^`]+`/g, '').trim()
            : msg.content;

          return (
            <div key={i} className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser && (
                <div className={cn('h-6 w-6 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', color)}>
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={cn(
                'px-3 py-2 rounded-2xl text-xs max-w-[80%] leading-relaxed',
                isUser
                  ? 'bg-gray-100 text-gray-700 rounded-br-sm'
                  : `bg-gradient-to-br ${color} text-white rounded-bl-sm`,
              )}>
                {preview}
              </div>
            </div>
          );
        })}

        {/* Pending user transcript (not yet in messages) */}
        {lastTranscript && (voiceState === 'thinking' || streaming) && (
          <div className="flex justify-end">
            <div className="bg-gray-100 rounded-2xl rounded-br-sm px-3 py-2 text-xs text-gray-500 italic max-w-[80%]">
              {lastTranscript}
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {(streaming || voiceState === 'thinking') && (
          <div className="flex gap-2 justify-start">
            <div className={cn('h-6 w-6 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br mt-0.5', color)}>
              <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
            </div>
            <div className={cn('px-3 py-2 rounded-2xl rounded-bl-sm text-xs text-white bg-gradient-to-br opacity-70', color)}>
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Mic Controls ──────────────────────────────────────────── */}
      <div className="shrink-0 flex flex-col items-center gap-3 py-4 border-t border-gray-100">
        <button
          onClick={isBusy ? stopAll : startListening}
          disabled={!available}
          className={cn(
            'relative h-16 w-16 rounded-full flex items-center justify-center transition-all duration-200',
            'shadow-lg disabled:opacity-40',
            isActive
              ? 'bg-red-500 hover:bg-red-600 scale-110'
              : isBusy
              ? `bg-gradient-to-br ${color} opacity-80 cursor-not-allowed`
              : `bg-gradient-to-br ${color} hover:scale-105 active:scale-95`,
          )}
        >
          {isActive && (
            <>
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
              <span className="absolute inset-[-6px] rounded-full border-2 border-red-300 animate-pulse opacity-40" />
            </>
          )}
          {voiceState === 'speaking' && (
            <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse" />
          )}
          {isBusy && !isActive
            ? voiceState === 'thinking' || streaming
              ? <Loader2 className="h-7 w-7 text-white animate-spin" />
              : <Volume2 className="h-7 w-7 text-white" />
            : isActive
            ? <MicOff className="h-7 w-7 text-white" />
            : <Mic className="h-7 w-7 text-white" />
          }
        </button>
        <span className="text-xs font-medium text-gray-500">{STATE_LABEL[voiceState]}</span>

        {/* Auto-conversation toggle */}
        <button
          onClick={() => setAutoConversation(v => !v)}
          disabled={!available}
          className={cn(
            'flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-all',
            autoConversation
              ? 'bg-green-50 border-green-300 text-green-700'
              : 'border-gray-200 text-gray-400 hover:text-gray-600',
          )}
          title="Chế độ hội thoại tự động — AI nói xong sẽ tự bắt đầu nghe lại"
        >
          <RefreshCw className={cn('h-3 w-3', autoConversation && 'animate-spin')} />
          Tự động {autoConversation ? 'BẬT' : 'TẮT'}
        </button>

        {hasHistory && (
          <span className="text-[10px] text-gray-400">{visibleMessages.length} tin nhắn</span>
        )}
      </div>
    </div>
  );
}
