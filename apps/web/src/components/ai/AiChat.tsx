'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

import { SUBJECT_META } from '@/components/chat/constants';
import { detectSubject } from '@/services/chat/subjectUtils';
import { useAiHealth } from '@/hooks/chat/useAiHealth';
import { useChatHistory } from '@/hooks/chat/useChatHistory';
import { useChatStream } from '@/hooks/chat/useChatStream';
import { useMic } from '@/hooks/chat/useMic';

import { ChatHeader } from '@/components/chat/ChatHeader';
import { ModeSelector } from '@/components/chat/ModeSelector';
import { BrainPanel } from '@/components/chat/BrainPanel';
import { MessageList } from '@/components/chat/MessageList';
import { ChatInput } from '@/components/chat/ChatInput';
import { VoicePanel } from '@/components/chat/VoicePanel';
import { LangQuickBar } from '@/components/chat/LangQuickBar';
import { HomeworkPanel } from '@/components/chat/HomeworkPanel';
import { useHomework } from '@/hooks/chat/useHomework';

import type { Message, Mode } from '@/components/chat/types';

export function AiChat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showBrain, setShowBrain] = useState(false);
  const [mode, setMode] = useState<Mode>('tutor');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const voiceMode = mode === 'voice';

  const subject = detectSubject(pathname);
  const meta = SUBJECT_META[subject];
  const ttsLang = subject === 'language' ? 'en-US' : 'vi-VN';

  const { aiOk, aiLabel } = useAiHealth();

  const { historyLoading, clearHistory } = useChatHistory({
    open, minimized, subject, messages, setMessages,
  });

  const { streaming, sendMessage, handleStop, brainKey } = useChatStream({
    messages,
    setMessages: setMessages as React.Dispatch<React.SetStateAction<Message[]>>,
    subject,
    mode,
    setMode,
  });

  const { micListening, micAvailable, handleMic } = useMic({
    subject,
    onResult: t => setInput(prev => prev ? `${prev} ${t}` : t),
  });

  const { homeworkResult, homeworkLoading, homeworkError, submitHomework, clearHomeworkResult } =
    useHomework({ subject });

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, open, minimized]);

  useEffect(() => {
    if (open && !minimized) inputRef.current?.focus();
  }, [open, minimized]);

  const handleRetry = useCallback(() => {
    const lastUser = [...messages].reverse().find(m => m.role === 'user');
    if (lastUser) {
      setMessages(messages.slice(0, -1));
      sendMessage(lastUser.content);
    }
  }, [messages, sendMessage]);

  // ─── Collapsed FAB ──────────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="AI Trợ lý học tập"
        className={cn(
          'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
          'h-14 w-14 rounded-2xl shadow-lg flex items-center justify-center',
          'bg-gradient-to-br', meta.color,
          'hover:scale-105 active:scale-95 transition-all duration-200',
          aiOk === false && 'opacity-60',
        )}
      >
        <Bot className="h-6 w-6 text-white" />
        {aiOk && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-400 border-2 border-white" />
        )}
      </button>
    );
  }

  // ─── Chat Window ────────────────────────────────────────────────────────────
  return (
    <div className={cn(
      'fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50',
      'flex flex-col bg-white rounded-2xl shadow-2xl border border-gray-100',
      'w-[360px] sm:w-[400px] transition-all duration-200',
      minimized ? 'h-[52px]' : 'h-[560px]',
    )}>
      <ChatHeader
        label={meta.label}
        color={meta.color}
        minimized={minimized}
        showBrain={showBrain}
        aiOk={aiOk}
        aiLabel={aiLabel}
        onToggleMinimize={() => setMinimized(m => !m)}
        onToggleBrain={e => { e.stopPropagation(); setShowBrain(b => !b); }}
        onClose={e => { e.stopPropagation(); setOpen(false); handleStop(); }}
      />

      {!minimized && (
        <>
          {showBrain && (
            <div className="border-b border-gray-100 bg-gray-50 shrink-0 max-h-48 overflow-y-auto">
              <BrainPanel
                key={brainKey}
                subject={subject}
                onSendMessage={text => { setShowBrain(false); sendMessage(text); }}
              />
            </div>
          )}

          <ModeSelector mode={mode} onModeChange={setMode} />

          {voiceMode ? (
            <VoicePanel
              subject={subject}
              color={meta.color}
              messages={messages}
              streaming={streaming}
              onTranscript={(text) => { sendMessage(text); }}
            />
          ) : (
            <>
              <MessageList
                messages={messages}
                streaming={streaming}
                subject={subject}
                mode={mode}
                avatarColor={meta.color}
                ttsLang={ttsLang}
                historyLoading={historyLoading}
                label={meta.label}
                color={meta.color}
                bottomRef={bottomRef}
                onSendMessage={sendMessage}
                onSetInput={setInput}
                onRetry={handleRetry}
              />

              {/* Language Tutor quick actions — persistent bar */}
              {subject === 'language' && messages.length > 0 && (
                <LangQuickBar onSetInput={setInput} />
              )}

              {/* Homework 2.0+ — rubric panel */}
              {mode === 'homework' && (
                <HomeworkPanel
                  color={meta.color}
                  loading={homeworkLoading}
                  result={homeworkResult}
                  error={homeworkError}
                  onSubmit={submitHomework}
                  onClear={clearHomeworkResult}
                />
              )}

              <ChatInput
                input={input}
                mode={mode}
                streaming={streaming}
                aiOk={aiOk}
                micListening={micListening}
                micAvailable={micAvailable}
                color={meta.color}
                hasMessages={messages.length > 0}
                inputRef={inputRef}
                onInputChange={setInput}
                onSend={() => { sendMessage(input); setInput(''); }}
                onStop={handleStop}
                onMic={handleMic}
                onClearHistory={clearHistory}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
